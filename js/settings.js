export function createSettings({
  defaults,
  storageKey,
  storageEnabledKey,
  normalizeState,
}) {
  function loadStoragePreference() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageEnabledKey));
      return typeof saved === "boolean" ? saved : defaults.persistStorage;
    } catch {
      return defaults.persistStorage;
    }
  }

  function load() {
    const persistStorage = loadStoragePreference();
    if (!persistStorage) {
      return normalizeState({
        ...defaults,
        persistStorage,
      });
    }

    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      saved = {};
    }

    return normalizeState({
      timerMode:
        saved.timerMode === "pomodoro" || saved.timerMode === "clock"
          ? saved.timerMode
          : defaults.timerMode,
      glitch:
        typeof saved.glitch === "boolean" ? saved.glitch : defaults.glitch,
      glyph: typeof saved.glyph === "boolean" ? saved.glyph : defaults.glyph,
      hour24:
        typeof saved.hour24 === "boolean"
          ? saved.hour24
          : typeof saved.hour12 === "boolean"
            ? !saved.hour12
            : defaults.hour24,
      showAmPm:
        typeof saved.showAmPm === "boolean"
          ? saved.showAmPm
          : typeof saved.hideAmPm === "boolean"
            ? !saved.hideAmPm
            : defaults.showAmPm,
      matrix:
        typeof saved.matrix === "boolean" ? saved.matrix : defaults.matrix,
      glow: typeof saved.glow === "boolean" ? saved.glow : defaults.glow,
      neon: typeof saved.neon === "boolean" ? saved.neon : defaults.neon,
      brownNoise:
        typeof saved.brownNoise === "boolean"
          ? saved.brownNoise
          : defaults.brownNoise,
      pinkNoise:
        typeof saved.pinkNoise === "boolean"
          ? saved.pinkNoise
          : defaults.pinkNoise,
      rainStorm:
        typeof saved.rainStorm === "boolean"
          ? saved.rainStorm
          : defaults.rainStorm,
      aircraftCabin:
        typeof saved.aircraftCabin === "boolean"
          ? saved.aircraftCabin
          : defaults.aircraftCabin,
      dubTechno:
        typeof saved.dubTechno === "boolean"
          ? saved.dubTechno
          : defaults.dubTechno,
      soundVolume: Number.isFinite(saved.soundVolume)
        ? saved.soundVolume
        : defaults.soundVolume,
      lightMode:
        typeof saved.lightMode === "boolean"
          ? saved.lightMode
          : defaults.lightMode,
      matrixMode:
        typeof saved.matrixMode === "boolean"
          ? saved.matrixMode
          : defaults.matrixMode,
      font: typeof saved.font === "string" ? saved.font : defaults.font,
      pomodoroWorkMinutes: Number.isFinite(saved.pomodoroWorkMinutes)
        ? saved.pomodoroWorkMinutes
        : defaults.pomodoroWorkMinutes,
      pomodoroShortBreakMinutes: Number.isFinite(saved.pomodoroShortBreakMinutes)
        ? saved.pomodoroShortBreakMinutes
        : defaults.pomodoroShortBreakMinutes,
      pomodoroLongBreakMinutes: Number.isFinite(saved.pomodoroLongBreakMinutes)
        ? saved.pomodoroLongBreakMinutes
        : defaults.pomodoroLongBreakMinutes,
      pomodoroCyclesBeforeLongBreak: Number.isFinite(
        saved.pomodoroCyclesBeforeLongBreak,
      )
        ? saved.pomodoroCyclesBeforeLongBreak
        : defaults.pomodoroCyclesBeforeLongBreak,
      pomodoroPhase: defaults.pomodoroPhase,
      pomodoroRemainingMs: defaults.pomodoroRemainingMs,
      pomodoroRunning: false,
      pomodoroCompletedWorkSessions: 0,
      pomodoroLastTickMs: null,
      fullscreen: false,
      persistStorage,
    });
  }

  function save(state) {
    try {
      localStorage.setItem(
        storageEnabledKey,
        JSON.stringify(state.persistStorage),
      );

      if (!state.persistStorage) {
        localStorage.removeItem(storageKey);
        return;
      }

      const persistedState = { ...state };
      delete persistedState.persistStorage;
      delete persistedState.fullscreen;
      delete persistedState.pomodoroPhase;
      delete persistedState.pomodoroRemainingMs;
      delete persistedState.pomodoroRunning;
      delete persistedState.pomodoroCompletedWorkSessions;
      delete persistedState.pomodoroLastTickMs;
      localStorage.setItem(storageKey, JSON.stringify(persistedState));
    } catch {
      // Ignore storage failures.
    }
  }

  return { load, save };
}
