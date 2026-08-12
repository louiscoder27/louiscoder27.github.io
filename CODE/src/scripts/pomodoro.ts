// Shared Pomodoro engine — a single client-side singleton that every page binds
// to (the full Focus panel on the home page, the floating corner widget on all
// pages). State lives in localStorage and the running clock is timestamp-based
// (`endsAt`), so the countdown keeps going across page navigations and survives
// clicking into a post or leaving the Focus screen. No audio / Spotify.

export type Mode = 'focus' | 'short' | 'long';
export type NumKey = 'focus' | 'short' | 'long' | 'interval';

export interface Settings {
  focus: number;
  short: number;
  long: number;
  interval: number;
  auto: boolean;
}
export interface Task {
  id: string;
  text: string;
  done: boolean;
}
export interface Snapshot {
  settings: Settings;
  tasks: Task[];
  mode: Mode;
  running: boolean;
  remaining: number; // seconds left in the current session (live)
  completed: number; // finished focus sessions
  round: number; // current focus round
  rev: number; // bumped on structural changes (mode/tasks/settings/round) — NOT on plain ticks
}

const STORE = 'louis.pomodoro.v1';

const DEFAULTS: Settings = { focus: 25, short: 5, long: 15, interval: 4, auto: false };
const LABELS: Record<Mode, string> = {
  focus: 'Time to focus.',
  short: 'Take a short break.',
  long: 'Take a long break.',
};
const LIMITS: Record<Mode, [number, number]> = {
  focus: [1, 120],
  short: [1, 60],
  long: [1, 60],
};

interface PersistState {
  settings: Settings;
  tasks: Task[];
  mode: Mode;
  running: boolean;
  endsAt: number | null; // ms timestamp when the running session ends
  remaining: number; // seconds — authoritative while paused
  completed: number;
  round: number;
}

const isBrowser = typeof window !== 'undefined';

let settings: Settings = { ...DEFAULTS };
let tasks: Task[] = [];
let mode: Mode = 'focus';
let running = false;
let endsAt: number | null = null;
let remaining = DEFAULTS.focus * 60;
let completed = 0;
let round = 1;
let rev = 0;

let timer: number | undefined;
const listeners = new Set<(s: Snapshot) => void>();

const dur = (m: Mode) => settings[m] * 60;
const clampNum = (k: NumKey, n: number) => {
  const [min, max] = k === 'interval' ? [2, 12] : LIMITS[k as Mode];
  return Math.max(min, Math.min(max, Math.round(n)));
};

const computeRemaining = () =>
  running && endsAt !== null ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : remaining;

const load = () => {
  if (!isBrowser) return;
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<PersistState>;
    if (s.settings) settings = { ...DEFAULTS, ...s.settings };
    if (Array.isArray(s.tasks)) tasks = s.tasks;
    if (s.mode === 'focus' || s.mode === 'short' || s.mode === 'long') mode = s.mode;
    completed = Number(s.completed) || 0;
    round = Number(s.round) || 1;
    running = !!s.running;
    endsAt = typeof s.endsAt === 'number' ? s.endsAt : null;
    remaining = typeof s.remaining === 'number' ? s.remaining : dur(mode);
    if (running && endsAt === null) running = false; // guard against corrupt state
  } catch {
    /* ignore corrupt storage */
  }
};

const persist = () => {
  if (!isBrowser) return;
  const data: PersistState = {
    settings,
    tasks,
    mode,
    running,
    endsAt,
    remaining: computeRemaining(),
    completed,
    round,
  };
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
  } catch {
    /* quota */
  }
};

const snapshot = (): Snapshot => ({
  settings: { ...settings },
  tasks: tasks.map((t) => ({ ...t })),
  mode,
  running,
  remaining: computeRemaining(),
  completed,
  round,
  rev,
});

const notify = () => {
  const s = snapshot();
  listeners.forEach((cb) => cb(s));
};

const ensureTicking = () => {
  if (!isBrowser) return;
  if (running && timer === undefined) {
    timer = window.setInterval(tick, 250);
  }
};
const stopTicking = () => {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
};

// Advance to the next session (natural completion when countFocus=true, or Skip
// when false). A long break replaces the short one every `interval` pomodoros.
const advance = (countFocus: boolean) => {
  running = false;
  endsAt = null;
  if (mode === 'focus') {
    if (countFocus) completed += 1;
    round += 1;
    const long = completed > 0 && completed % settings.interval === 0;
    mode = long ? 'long' : 'short';
  } else {
    mode = 'focus';
  }
  remaining = dur(mode);
  rev += 1;
  if (settings.auto) {
    start();
  } else {
    stopTicking();
    persist();
    notify();
  }
};

function tick() {
  if (!running) {
    stopTicking();
    return;
  }
  if (computeRemaining() <= 0) {
    advance(true); // handles auto-start / stop + persist + notify
    return;
  }
  notify();
}

function start() {
  if (running) return;
  if (computeRemaining() <= 0) remaining = dur(mode);
  running = true;
  endsAt = Date.now() + computeRemaining() * 1000;
  ensureTicking();
  persist();
  notify();
}

const pause = () => {
  if (!running) return;
  remaining = computeRemaining();
  running = false;
  endsAt = null;
  stopTicking();
  persist();
  notify();
};

const api = {
  get: snapshot,
  labelFor: (m: Mode) => LABELS[m],
  format: (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,

  subscribe(cb: (s: Snapshot) => void) {
    listeners.add(cb);
    cb(snapshot());
    return () => listeners.delete(cb);
  },

  start,
  pause,
  toggle() {
    running ? pause() : start();
  },
  reset() {
    running = false;
    endsAt = null;
    remaining = dur(mode);
    rev += 1;
    stopTicking();
    persist();
    notify();
  },
  skip() {
    advance(false);
  },
  setMode(m: Mode, autostart = false) {
    running = false;
    endsAt = null;
    stopTicking();
    mode = m;
    remaining = dur(m);
    rev += 1;
    if (autostart) start();
    else {
      persist();
      notify();
    }
  },
  // Quick −/+ stepper on the current mode's length. Idle only.
  adjust(delta: number) {
    if (running) return;
    const [min, max] = LIMITS[mode];
    const next = Math.max(min, Math.min(max, settings[mode] + delta));
    if (next === settings[mode]) return;
    settings[mode] = next;
    remaining = dur(mode);
    rev += 1;
    persist();
    notify();
  },
  setSetting(k: keyof Settings, value: number | boolean) {
    if (k === 'auto') {
      settings.auto = !!value;
    } else {
      settings[k] = clampNum(k, Number(value));
      if (!running && k === mode) remaining = dur(mode);
    }
    rev += 1;
    persist();
    notify();
  },
  addTask(text: string) {
    const t = text.trim();
    if (!t) return;
    tasks.push({ id: Math.random().toString(36).slice(2, 9), text: t, done: false });
    rev += 1;
    persist();
    notify();
  },
  toggleTask(id: string) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    rev += 1;
    persist();
    notify();
  },
  removeTask(id: string) {
    tasks = tasks.filter((x) => x.id !== id);
    rev += 1;
    persist();
    notify();
  },
};

if (isBrowser) {
  load();
  // Resume a session that was running when the previous page unloaded. If it has
  // already elapsed, tick() will settle it on the first fire.
  if (running) {
    if (computeRemaining() <= 0) advance(true);
    else ensureTicking();
  }
  // Keep tabs in sync — another tab may start/stop/adjust the same timer.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE) return;
    load();
    running ? ensureTicking() : stopTicking();
    notify();
  });
}

export const pomodoro = api;
