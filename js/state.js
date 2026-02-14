export function clampSoundVolume(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function clampMinutes(value, min, max, fallback) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, numeric));
}

function clampMs(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.round(numeric));
}

export function normalizeState(state) {
  const workMinutes = clampMinutes(state.pomodoroWorkMinutes, 1, 90, 25);
  const shortBreakMinutes = clampMinutes(state.pomodoroShortBreakMinutes, 1, 30, 5);
  const longBreakMinutes = clampMinutes(state.pomodoroLongBreakMinutes, 5, 60, 15);
  const cyclesBeforeLongBreak = clampMinutes(
    state.pomodoroCyclesBeforeLongBreak,
    2,
    8,
    4,
  );
  const phase =
    state.pomodoroPhase === "shortBreak" || state.pomodoroPhase === "longBreak"
      ? state.pomodoroPhase
      : "work";

  const normalized = {
    ...state,
    timerMode: state.timerMode === "pomodoro" ? "pomodoro" : "clock",
    soundVolume: clampSoundVolume(state.soundVolume),
    pomodoroWorkMinutes: workMinutes,
    pomodoroShortBreakMinutes: shortBreakMinutes,
    pomodoroLongBreakMinutes: longBreakMinutes,
    pomodoroCyclesBeforeLongBreak: cyclesBeforeLongBreak,
    pomodoroPhase: phase,
    pomodoroRemainingMs: clampMs(state.pomodoroRemainingMs, workMinutes * 60 * 1000),
    pomodoroRunning: Boolean(state.pomodoroRunning),
    pomodoroCompletedWorkSessions: Math.max(
      0,
      Math.round(Number(state.pomodoroCompletedWorkSessions) || 0),
    ),
    pomodoroLastTickMs: Number.isFinite(state.pomodoroLastTickMs)
      ? state.pomodoroLastTickMs
      : null,
  };

  // Display mode is exclusive and matrix mode enforces matrix visual pairing.
  if (normalized.matrixMode) {
    normalized.lightMode = false;
    normalized.matrix = true;
    normalized.neon = true;
  }

  if (normalized.lightMode) {
    normalized.matrixMode = false;
  }

  return normalized;
}
