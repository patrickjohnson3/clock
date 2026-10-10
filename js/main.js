import { createClock } from "./clock.js";
import { CHARS, SYSTEM_FONT, TUNING } from "./config.js";
import {
  createAircraftCabinEngine,
  createBrownNoiseEngine,
  createDubTechnoEngine,
  createPinkNoiseEngine,
  createRainStormEngine,
} from "./audio/engines.js";
import { createSoundManager } from "./audio/manager.js";
import { createMatrix } from "./matrix.js";
import { loadSettings, saveSettings } from "./settings.js";
import { normalizeState } from "./state.js";
import { createUI } from "./ui.js";

const ui = createUI();

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
  sharedAudioContext.addEventListener("statechange", () => renderAudio(state));
  return sharedAudioContext;
}

function syncSharedAudioContext() {
  if (!sharedAudioContext) {
    return;
  }
  const soundsEnabled = soundManager.hasEnabledSounds(state);
  if (soundsEnabled && sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  } else if (!soundsEnabled && sharedAudioContext.state === "running") {
    sharedAudioContext.suspend().catch(() => {});
  }
}

window.addEventListener("pointerup", syncSharedAudioContext);
window.addEventListener("keydown", syncSharedAudioContext);

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

let state = loadSettings();
let saveTimerId = null;
let clockTimerId = null;
let wakeLockSentinel = null;
let wakeLockRequest = null;
let webFontsRequested = false;
ui.setControlsFromState(state);
ui.updateScrollHint();

function renderVisuals(nextState) {
  if (nextState.font !== SYSTEM_FONT && !webFontsRequested) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href =
      "https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&family=IBM+Plex+Mono:wght@700&family=Roboto+Mono:wght@700&family=Source+Code+Pro:wght@700&family=JetBrains+Mono:wght@700&family=Fira+Mono:wght@700&display=swap";
    document.head.appendChild(stylesheet);
    webFontsRequested = true;
  }
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
  if (soundManager.hasEnabledSounds(nextState)) {
    getSharedAudioContext();
  }
  // Autoplay may block resume; wait before generating buffers or starting timers.
  soundManager.sync(nextState, sharedAudioContext?.state === "running");
  syncSharedAudioContext();
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

async function releaseWakeLock() {
  const sentinel = wakeLockSentinel;
  wakeLockSentinel = null;
  if (!sentinel) {
    return;
  }
  try {
    await sentinel.release();
  } catch {
    // Ignore release failures; the browser may have already dropped it.
  }
}

async function syncWakeLock(nextState) {
  if (!nextState.wakeLock || document.hidden) {
    await releaseWakeLock();
    return;
  }

  if (wakeLockSentinel || wakeLockRequest || !navigator.wakeLock) {
    return;
  }

  wakeLockRequest = navigator.wakeLock.request("screen");
  try {
    wakeLockSentinel = await wakeLockRequest;
    if (!state.wakeLock || document.hidden) {
      await releaseWakeLock();
      return;
    }
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
    });
  } catch {
    wakeLockSentinel = null;
  } finally {
    wakeLockRequest = null;
  }
}

function render() {
  renderVisuals(state);
  renderAudio(state);
  renderClock(state);
  syncWakeLock(state);
}

function flushSave() {
  if (saveTimerId === null) return;
  window.clearTimeout(saveTimerId);
  saveTimerId = null;
  saveSettings(state);
}

function scheduleSave() {
  if (saveTimerId !== null) {
    window.clearTimeout(saveTimerId);
  }
  saveTimerId = window.setTimeout(() => {
    saveTimerId = null;
    saveSettings(state);
  }, 120);
}

function updateState(partial) {
  const previous = state;
  state = normalizeState({ ...state, ...partial });

  // Normalization can change settings not present in the input (Matrix mode).
  const visualsChanged =
    state.font !== previous.font ||
    state.lightMode !== previous.lightMode ||
    state.matrixMode !== previous.matrixMode ||
    state.matrix !== previous.matrix ||
    state.glow !== previous.glow ||
    state.neon !== previous.neon;
  if (visualsChanged) {
    renderVisuals(state);
  }
  if (
    state.soundVolume !== previous.soundVolume ||
    state.brownNoise !== previous.brownNoise ||
    state.pinkNoise !== previous.pinkNoise ||
    state.rainStorm !== previous.rainStorm ||
    state.aircraftCabin !== previous.aircraftCabin ||
    state.dubTechno !== previous.dubTechno
  ) {
    renderAudio(state);
  }
  if (
    state.hour24 !== previous.hour24 ||
    state.showAmPm !== previous.showAmPm ||
    state.leadingZero !== previous.leadingZero ||
    state.hideSeconds !== previous.hideSeconds ||
    state.clockScale !== previous.clockScale ||
    state.glitch !== previous.glitch ||
    state.glyph !== previous.glyph
  ) {
    renderClock(state);
  }
  if (state.wakeLock !== previous.wakeLock) {
    syncWakeLock(state);
  }
  ui.setControlsFromState(state);
  if (visualsChanged) {
    ui.updateScrollHint();
  }
  scheduleSave();
}

for (const [key, toggle] of Object.entries(ui.refs.toggles)) {
  if (key !== "fullscreen") {
    ui.bindToggle(toggle, (checked) => updateState({ [key]: checked }));
  }
}
ui.bindToggle(ui.refs.toggles.fullscreen, async (checked) => {
  const success = await setFullscreen(checked);
  if (!success) {
    updateState({ fullscreen: Boolean(document.fullscreenElement) });
  }
});
ui.bindRange(ui.refs.soundVolumeSlider, (value) =>
  updateState({ soundVolume: Number(value) }),
);
ui.bindRange(ui.refs.clockScaleSlider, (value) =>
  updateState({ clockScale: Number(value) }),
);
ui.bindSelect(ui.refs.modeSelect, (mode) =>
  updateState({
    lightMode: mode === "light",
    matrixMode: mode === "matrix",
  }),
);
ui.bindSelect(ui.refs.fontSelect, (font) => updateState({ font }));
ui.bindCollapse();
ui.bindScrollHint();

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
    syncWakeLock(state);
    return;
  }

  startClockTicker();
  if (state.matrix) {
    matrix.start();
  }
  syncWakeLock(state);
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
  releaseWakeLock();
  soundManager.stopAll();
});
