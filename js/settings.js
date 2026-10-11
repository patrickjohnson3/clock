import { DEFAULTS, STORAGE_ENABLED_KEY, STORAGE_KEY } from "./config.js";
import { normalizeState } from "./state.js";

function loadStoragePreference() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_ENABLED_KEY));
    return typeof saved === "boolean" ? saved : DEFAULTS.persistStorage;
  } catch {
    return DEFAULTS.persistStorage;
  }
}

export function loadSettings() {
  const persistStorage = loadStoragePreference();
  if (!persistStorage) {
    return normalizeState({
      ...DEFAULTS,
      persistStorage,
    });
  }

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    saved = {};
  }

  return normalizeState({
    glitch: typeof saved.glitch === "boolean" ? saved.glitch : DEFAULTS.glitch,
    glyph: typeof saved.glyph === "boolean" ? saved.glyph : DEFAULTS.glyph,
    hour24:
      typeof saved.hour24 === "boolean"
        ? saved.hour24
        : typeof saved.hour12 === "boolean"
          ? !saved.hour12
          : DEFAULTS.hour24,
    showAmPm:
      typeof saved.showAmPm === "boolean"
        ? saved.showAmPm
        : typeof saved.hideAmPm === "boolean"
          ? !saved.hideAmPm
          : DEFAULTS.showAmPm,
    leadingZero:
      typeof saved.leadingZero === "boolean"
        ? saved.leadingZero
        : DEFAULTS.leadingZero,
    hideSeconds:
      typeof saved.hideSeconds === "boolean"
        ? saved.hideSeconds
        : DEFAULTS.hideSeconds,
    clockScale: Number.isFinite(saved.clockScale)
      ? saved.clockScale
      : DEFAULTS.clockScale,
    matrix: typeof saved.matrix === "boolean" ? saved.matrix : DEFAULTS.matrix,
    glow: typeof saved.glow === "boolean" ? saved.glow : DEFAULTS.glow,
    neon: typeof saved.neon === "boolean" ? saved.neon : DEFAULTS.neon,
    brownNoise:
      typeof saved.brownNoise === "boolean"
        ? saved.brownNoise
        : DEFAULTS.brownNoise,
    pinkNoise:
      typeof saved.pinkNoise === "boolean"
        ? saved.pinkNoise
        : DEFAULTS.pinkNoise,
    rainStorm:
      typeof saved.rainStorm === "boolean"
        ? saved.rainStorm
        : DEFAULTS.rainStorm,
    aircraftCabin:
      typeof saved.aircraftCabin === "boolean"
        ? saved.aircraftCabin
        : DEFAULTS.aircraftCabin,
    dubTechno:
      typeof saved.dubTechno === "boolean"
        ? saved.dubTechno
        : DEFAULTS.dubTechno,
    soundVolume: Number.isFinite(saved.soundVolume)
      ? saved.soundVolume
      : DEFAULTS.soundVolume,
    lightMode:
      typeof saved.lightMode === "boolean"
        ? saved.lightMode
        : DEFAULTS.lightMode,
    matrixMode:
      typeof saved.matrixMode === "boolean"
        ? saved.matrixMode
        : DEFAULTS.matrixMode,
    font: typeof saved.font === "string" ? saved.font : DEFAULTS.font,
    fullscreen: false,
    wakeLock:
      typeof saved.wakeLock === "boolean" ? saved.wakeLock : DEFAULTS.wakeLock,
    persistStorage,
  });
}

export function saveSettings(state) {
  try {
    localStorage.setItem(
      STORAGE_ENABLED_KEY,
      JSON.stringify(state.persistStorage),
    );

    if (!state.persistStorage) {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }

    const persistedState = { ...state };
    delete persistedState.persistStorage;
    delete persistedState.fullscreen;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    return true;
  } catch {
    return false;
  }
}
