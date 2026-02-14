function getPhaseDurationMs(state, phase) {
  if (phase === "shortBreak") {
    return state.pomodoroShortBreakMinutes * 60 * 1000;
  }
  if (phase === "longBreak") {
    return state.pomodoroLongBreakMinutes * 60 * 1000;
  }
  return state.pomodoroWorkMinutes * 60 * 1000;
}

function nextPhase(state) {
  if (state.pomodoroPhase !== "work") {
    return {
      phase: "work",
      completedWorkSessions: state.pomodoroCompletedWorkSessions,
    };
  }

  const completedWorkSessions = state.pomodoroCompletedWorkSessions + 1;
  const phase =
    completedWorkSessions % state.pomodoroCyclesBeforeLongBreak === 0
      ? "longBreak"
      : "shortBreak";

  return { phase, completedWorkSessions };
}

export function createPomodoro({ now = () => Date.now() } = {}) {
  function createInitialRuntimeState(state) {
    return {
      pomodoroPhase: "work",
      pomodoroRemainingMs: getPhaseDurationMs(state, "work"),
      pomodoroRunning: false,
      pomodoroCompletedWorkSessions: 0,
      pomodoroLastTickMs: null,
    };
  }

  function reconcileState(previousState, nextState) {
    const configChanged =
      previousState.pomodoroWorkMinutes !== nextState.pomodoroWorkMinutes ||
      previousState.pomodoroShortBreakMinutes !==
        nextState.pomodoroShortBreakMinutes ||
      previousState.pomodoroLongBreakMinutes !== nextState.pomodoroLongBreakMinutes ||
      previousState.pomodoroCyclesBeforeLongBreak !==
        nextState.pomodoroCyclesBeforeLongBreak;

    if (configChanged) {
      return {
        ...nextState,
        ...createInitialRuntimeState(nextState),
      };
    }

    if (nextState.timerMode !== "pomodoro" && nextState.pomodoroLastTickMs !== null) {
      return {
        ...nextState,
        pomodoroRunning: false,
        pomodoroLastTickMs: null,
      };
    }

    return nextState;
  }

  function start(state) {
    if (state.pomodoroRunning) {
      return state;
    }
    return {
      ...state,
      pomodoroRunning: true,
      pomodoroLastTickMs: now(),
    };
  }

  function pause(state) {
    if (!state.pomodoroRunning) {
      return state;
    }
    return {
      ...state,
      pomodoroRunning: false,
      pomodoroLastTickMs: null,
    };
  }

  function reset(state) {
    return {
      ...state,
      ...createInitialRuntimeState(state),
    };
  }

  function skip(state) {
    const { phase, completedWorkSessions } = nextPhase(state);
    return {
      ...state,
      pomodoroPhase: phase,
      pomodoroRemainingMs: getPhaseDurationMs(state, phase),
      pomodoroCompletedWorkSessions: completedWorkSessions,
      pomodoroLastTickMs: state.pomodoroRunning ? now() : null,
    };
  }

  function tick(state) {
    if (!state.pomodoroRunning) {
      return state;
    }

    const nowMs = now();
    const elapsed = Math.max(0, nowMs - (state.pomodoroLastTickMs ?? nowMs));
    let remainingMs = state.pomodoroRemainingMs - elapsed;
    let phase = state.pomodoroPhase;
    let completedWorkSessions = state.pomodoroCompletedWorkSessions;

    while (remainingMs <= 0) {
      const result = nextPhase({
        ...state,
        pomodoroPhase: phase,
        pomodoroCompletedWorkSessions: completedWorkSessions,
      });
      phase = result.phase;
      completedWorkSessions = result.completedWorkSessions;
      remainingMs += getPhaseDurationMs(state, phase);
    }

    return {
      ...state,
      pomodoroPhase: phase,
      pomodoroRemainingMs: remainingMs,
      pomodoroCompletedWorkSessions: completedWorkSessions,
      pomodoroLastTickMs: nowMs,
    };
  }

  function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return {
    createInitialRuntimeState,
    reconcileState,
    start,
    pause,
    reset,
    skip,
    tick,
    formatRemaining,
  };
}
