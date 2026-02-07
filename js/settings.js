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
      localStorage.setItem(storageKey, JSON.stringify(persistedState));
    } catch {
      // Ignore storage failures.
    }
  }

  return { load, save };
}
