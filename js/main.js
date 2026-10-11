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
  try {
    sharedAudioContext = new AudioContextClass();
  } catch {
    // Audio is optional; browsers can reject construction at their context limit.
    return null;
  }
  sharedAudioContext.addEventListener("statechange", () => renderAudio(state));
  return sharedAudioContext;
}

function syncSharedAudioContext() {
  if (!sharedAudioContext) {
    return;
  }
  const soundsEnabled = soundManager.hasEnabledSounds(state);
  if (soundsEnabled && sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(updateSoundStatus);
  } else if (!soundsEnabled && sharedAudioContext.state === "running") {
    sharedAudioContext.suspend().catch(() => {});
  }
}

function updateSoundStatus() {
  let message;
  if (!soundManager.hasEnabledSounds(state)) {
    message = "Sound is off.";
  } else if (!sharedAudioContext) {
    message =
      window.AudioContext || window.webkitAudioContext
        ? "Sound could not start. Toggle a sound off and on to retry."
        : "Sound is unavailable in this browser.";
  } else if (sharedAudioContext.state === "closed") {
    message = "Sound is unavailable. Reload the page to retry.";
  } else if (sharedAudioContext.state !== "running") {
    message =
      "Sound is paused by the browser. Click or press a key to try playback.";
  } else {
    message =
      state.soundVolume === 0
        ? "Sound is muted (volume is 0%)."
        : "Sound is playing.";
  }
  ui.setSoundStatus(
    message,
    soundManager.hasEnabledSounds(state) &&
      sharedAudioContext?.state !== "running",
  );
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
  updateSoundStatus();
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
    ui.setWakeLockStatus(
      !nextState.wakeLock
        ? "Screen wake lock is off."
        : "Screen wake lock paused while this page is hidden.",
    );
    await releaseWakeLock();
    return;
  }

  if (wakeLockSentinel || wakeLockRequest) {
    return;
  }

  if (!navigator.wakeLock) {
    ui.setWakeLockStatus(
      "Screen wake lock unavailable in this browser; the screen may sleep.",
      true,
    );
    return;
  }

  ui.setWakeLockStatus("Requesting screen wake lock...");
  try {
    wakeLockRequest = navigator.wakeLock.request("screen");
    const sentinel = await wakeLockRequest;
    wakeLockSentinel = sentinel;
    if (!state.wakeLock || document.hidden) {
      await releaseWakeLock();
      return;
    }
    sentinel.addEventListener("release", () => {
      if (wakeLockSentinel !== sentinel) return;
      wakeLockSentinel = null;
      ui.setWakeLockStatus(
        "Screen wake lock released; the screen may sleep. Toggle off and on to retry.",
        true,
      );
    });
    ui.setWakeLockStatus("Screen wake lock active.");
  } catch {
    wakeLockSentinel = null;
    if (state.wakeLock && !document.hidden) {
      ui.setWakeLockStatus(
        "Screen wake lock request failed; the screen may sleep. Toggle off and on to retry.",
        true,
      );
    }
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
  ui.setStorageStatus(
    saveSettings(state)
      ? ""
      : "Could not update saved settings. Reloading may restore older preferences. Check browser storage permissions, then change a setting to retry.",
  );
}

function scheduleSave() {
  if (saveTimerId !== null) {
    window.clearTimeout(saveTimerId);
  }
  saveTimerId = window.setTimeout(flushSave, 120);
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
    flushSave();
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
