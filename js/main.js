import { createClock } from "./clock.js";
import {
  CHARS,
  DEFAULTS,
  STORAGE_ENABLED_KEY,
  STORAGE_KEY,
  TUNING,
} from "./config.js";
import {
  createAircraftCabinEngine,
  createBrownNoiseEngine,
  createDubTechnoEngine,
  createPinkNoiseEngine,
  createRainStormEngine,
} from "./audio/engines.js";
import { createSoundManager } from "./audio/manager.js";
import { createMatrix } from "./matrix.js";
import { createSettings } from "./settings.js";
import { normalizeState } from "./state.js";
import { createUI } from "./ui.js";

const ui = createUI(DEFAULTS);
const settings = createSettings({
  defaults: DEFAULTS,
  storageKey: STORAGE_KEY,
  storageEnabledKey: STORAGE_ENABLED_KEY,
  normalizeState,
});

let sharedAudioContext = null;
function getSharedAudioContext() {
  if (sharedAudioContext) {
    return sharedAudioContext;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

const matrix = createMatrix({
  canvas: ui.refs.canvas,
  chars: CHARS,
  tuning: TUNING.matrix,
});

const clock = createClock({
  container: ui.refs.clock,
  chars: CHARS,
  tuning: TUNING.clock,
});

const soundManager = createSoundManager({
  brownNoise: createBrownNoiseEngine(TUNING.audio.brownNoise, {
    getContext: getSharedAudioContext,
  }),
  pinkNoise: createPinkNoiseEngine(TUNING.audio.pinkNoise, {
    getContext: getSharedAudioContext,
  }),
  rainStorm: createRainStormEngine(TUNING.audio.rainStorm, {
    getContext: getSharedAudioContext,
  }),
  aircraftCabin: createAircraftCabinEngine(TUNING.audio.aircraftCabin, {
    getContext: getSharedAudioContext,
  }),
  dubTechno: createDubTechnoEngine(TUNING.audio.dubTechno, {
    getContext: getSharedAudioContext,
  }),
});

let state = settings.load();
let saveTimerId = null;
let clockTimerId = null;
ui.setControlsFromState(state);

function renderVisuals(nextState) {
  document.body.classList.toggle("light-mode", nextState.lightMode);
  document.body.classList.toggle("matrix-mode", nextState.matrixMode);
  document.body.classList.toggle("glow-on", nextState.glow);
  document.body.classList.toggle("neon-on", nextState.neon);
  document.body.style.fontFamily = nextState.font;
  matrix.refreshStyles();

  if (nextState.matrix && !document.hidden) {
    matrix.start();
  } else {
    matrix.stop();
    matrix.clear();
  }
}

function renderAudio(nextState) {
  const globalSoundVolume = Math.max(
    0,
    Math.min(1, nextState.soundVolume / 100),
  );
  soundManager.setGlobalVolume(globalSoundVolume);
  soundManager.sync(nextState);
}

function renderClock(nextState) {
  clock.render(nextState);
}

async function setFullscreen(enabled) {
  if (enabled) {
    if (document.fullscreenElement) {
      return true;
    }
    const root = document.documentElement;
    if (!root.requestFullscreen) {
      return false;
    }
    try {
      await root.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }

  if (!document.fullscreenElement || !document.exitFullscreen) {
    return true;
  }
  try {
    await document.exitFullscreen();
    return true;
  } catch {
    return false;
  }
}

function render() {
  renderVisuals(state);
  renderAudio(state);
  renderClock(state);
}

function flushSave() {
  if (saveTimerId !== null) {
    window.clearTimeout(saveTimerId);
    saveTimerId = null;
  }
  settings.save(state);
}

function scheduleSave() {
  if (saveTimerId !== null) {
    window.clearTimeout(saveTimerId);
  }
  saveTimerId = window.setTimeout(() => {
    saveTimerId = null;
    settings.save(state);
  }, 120);
}

function updateState(partial) {
  state = normalizeState({ ...state, ...partial });
  render();
  ui.setControlsFromState(state);
  scheduleSave();
}

ui.bindToggle(ui.refs.toggles.glitch, (checked) =>
  updateState({ glitch: checked }),
);
ui.bindToggle(ui.refs.toggles.glyph, (checked) =>
  updateState({ glyph: checked }),
);
ui.bindToggle(ui.refs.toggles.hour24, (checked) =>
  updateState({ hour24: checked }),
);
ui.bindToggle(ui.refs.toggles.showAmPm, (checked) =>
  updateState({ showAmPm: checked }),
);
ui.bindToggle(ui.refs.toggles.matrix, (checked) =>
  updateState({ matrix: checked }),
);
ui.bindToggle(ui.refs.toggles.glow, (checked) =>
  updateState({ glow: checked }),
);
ui.bindToggle(ui.refs.toggles.neon, (checked) =>
  updateState({ neon: checked }),
);
ui.bindToggle(ui.refs.toggles.brownNoise, (checked) =>
  updateState({ brownNoise: checked }),
);
ui.bindToggle(ui.refs.toggles.pinkNoise, (checked) =>
  updateState({ pinkNoise: checked }),
);
ui.bindToggle(ui.refs.toggles.rainStorm, (checked) =>
  updateState({ rainStorm: checked }),
);
ui.bindToggle(ui.refs.toggles.aircraftCabin, (checked) =>
  updateState({ aircraftCabin: checked }),
);
ui.bindToggle(ui.refs.toggles.dubTechno, (checked) =>
  updateState({ dubTechno: checked }),
);
ui.bindToggle(ui.refs.toggles.fullscreen, async (checked) => {
  const success = await setFullscreen(checked);
  if (!success) {
    updateState({ fullscreen: Boolean(document.fullscreenElement) });
  }
});
ui.bindRange(ui.refs.soundVolumeSlider, (value) =>
  updateState({ soundVolume: Number(value) }),
);
ui.bindSelect(ui.refs.modeSelect, (mode) =>
  updateState({
    lightMode: mode === "light",
    matrixMode: mode === "matrix",
  }),
);
ui.bindToggle(ui.refs.toggles.persistStorage, (checked) =>
  updateState({ persistStorage: checked }),
);
ui.bindSelect(ui.refs.fontSelect, (font) => updateState({ font }));
ui.bindCollapse();

matrix.resize();
window.addEventListener("resize", () => {
  matrix.resize();
  if (!state.matrix) {
    matrix.clear();
  }
});

render();

function startClockTicker() {
  if (clockTimerId !== null || document.hidden) {
    return;
  }
  clockTimerId = window.setInterval(() => renderClock(state), 1000);
}

function stopClockTicker() {
  if (clockTimerId === null) {
    return;
  }
  window.clearInterval(clockTimerId);
  clockTimerId = null;
}

startClockTicker();

window.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopClockTicker();
    matrix.stop();
    return;
  }

  startClockTicker();
  if (state.matrix) {
    matrix.start();
  }
});

window.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  if (state.fullscreen !== isFullscreen) {
    updateState({ fullscreen: isFullscreen });
  }
});

window.matrixClock = {
  getState: () => ({ ...state }),
  formatTime: clock.formatTime,
};

window.addEventListener("beforeunload", () => {
  flushSave();
  soundManager.stopAll();
});
