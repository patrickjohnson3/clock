import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import {
  DEFAULTS,
  STORAGE_ENABLED_KEY,
  STORAGE_KEY,
  SYSTEM_FONT,
} from "../js/config.js";
import {
  createAudioContext,
  createWindow,
  installGlobals,
} from "./helpers/audio.js";

function createAppEnvironment(t, savedSettings, { renderers = false } = {}) {
  const context = createAudioContext();
  context.state = "suspended";
  let contextCount = 0;
  const window = createWindow();
  window.requestAnimationFrame = () => 0;
  window.AudioContext = function () {
    contextCount += 1;
    return context;
  };
  const calls = {
    bodyClasses: 0,
    styleReads: 0,
    canvasClears: 0,
    clockRenders: 0,
    checkboxWrites: 0,
  };
  const controls = new Map(
    [
      "fontSelect",
      "modeSelect",
      "soundVolumeSlider",
      "clockScaleSlider",
      ...Object.keys(DEFAULTS)
        .filter(
          (key) =>
            typeof DEFAULTS[key] === "boolean" &&
            key !== "lightMode" &&
            key !== "matrixMode",
        )
        .map((key) =>
          key === "persistStorage" ? "storageToggle" : `${key}Toggle`,
        ),
    ].map((id) => [id, new EventTarget()]),
  );
  for (const control of controls.values()) {
    let checked = false;
    Object.defineProperty(control, "checked", {
      get: () => checked,
      set(value) {
        checked = value;
        calls.checkboxWrites += 1;
      },
    });
  }
  controls.set("wakeLockStatus", { textContent: "" });
  controls.set("storageStatus", { textContent: "" });
  function createElement(tagName) {
    return Object.assign(new EventTarget(), {
      tagName,
      dataset: {},
      classList: { add() {}, remove() {} },
      setAttribute() {},
      removeAttribute() {},
      remove() {},
    });
  }
  if (renderers) {
    window.innerWidth = 800;
    window.innerHeight = 600;
    controls.set("matrix", {
      getContext: () => ({
        clearRect() {
          calls.canvasClears += 1;
        },
        fillRect() {},
        save() {},
        restore() {},
        fillText() {},
      }),
    });
    controls.set("clock", {
      setAttribute() {},
      style: {
        setProperty() {
          calls.clockRenders += 1;
        },
      },
      appendChild() {},
    });
  }
  const stylesheets = [];
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    getElementById: (id) => controls.get(id) ?? null,
    createElement,
    head: { appendChild: (element) => stylesheets.push(element) },
    body: {
      classList: {
        toggle() {
          calls.bodyClasses += 1;
        },
      },
      style: {},
    },
  });
  const saved = new Map([
    [STORAGE_ENABLED_KEY, JSON.stringify(Boolean(savedSettings))],
    [STORAGE_KEY, JSON.stringify(savedSettings)],
  ]);
  const storageWrites = [];
  installGlobals(t, {
    window,
    document,
    navigator: {},
    getComputedStyle: () => {
      calls.styleReads += 1;
      return { getPropertyValue: () => "" };
    },
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem(key, value) {
        storageWrites.push(key);
        saved.set(key, value);
      },
      removeItem(key) {
        storageWrites.push(key);
        saved.delete(key);
      },
    },
  });
  return {
    context,
    window,
    document,
    stylesheets,
    saved,
    storageWrites,
    calls,
    resetCalls() {
      for (const key in calls) calls[key] = 0;
    },
    getContextCount: () => contextCount,
    setToggle(key, checked) {
      const toggle = controls.get(`${key}Toggle`);
      toggle.checked = checked;
      toggle.dispatchEvent(new Event("change"));
    },
  };
}

test("optional fonts load once when a custom font is selected, not for System", async (t) => {
  const { document, stylesheets } = createAppEnvironment(t, null);
  await import("../js/main.js?optional-fonts");
  assert.equal(stylesheets.length, 0);

  const select = document.getElementById("fontSelect");
  for (const font of [
    "'Fira Mono', monospace",
    SYSTEM_FONT,
    "'Space Mono', monospace",
  ]) {
    select.value = font;
    select.dispatchEvent(new Event("change"));
    assert.equal(document.body.style.fontFamily, font);
    assert.equal(stylesheets.length, 1);
  }
  assert.equal(stylesheets[0].rel, "stylesheet");
  assert.equal(new URL(stylesheets[0].href).hostname, "fonts.googleapis.com");
});

test("a restored custom font requests the optional stylesheet", async (t) => {
  const font = "'JetBrains Mono', monospace";
  const { document, stylesheets } = createAppEnvironment(t, { font });
  await import("../js/main.js?restored-font");
  assert.equal(stylesheets.length, 1);
  assert.equal(document.body.style.fontFamily, font);
});

test("an unlisted saved font falls back consistently before reaching the UI", async (t) => {
  const { window, document, stylesheets } = createAppEnvironment(t, {
    font: "serif",
  });
  await import("../js/main.js?unlisted-font");
  assert.equal(window.matrixClock.getState().font, SYSTEM_FONT);
  assert.equal(document.getElementById("fontSelect").value, SYSTEM_FONT);
  assert.equal(document.body.style.fontFamily, SYSTEM_FONT);
  assert.equal(stylesheets.length, 0);
});

test("restored audio waits for playback permission and resumes without restarting sources", async (t) => {
  const { context, window, getContextCount } = createAppEnvironment(t, {
    brownNoise: true,
  });
  await import("../js/main.js?restored-audio");
  assert.equal(context.state, "suspended");
  assert.equal(context.activeSources.length, 0);
  assert.equal(context.bufferCount, 0);

  context.allowResume = true;
  let playingSources;
  for (const event of ["pointerup", "keydown"]) {
    context.state = "suspended";
    window.dispatchEvent(new Event(event));
    assert.equal(context.state, "running");
    assert.equal(context.activeSources.length, 1);
    assert.equal(context.bufferCount, 1);
    playingSources ??= [...context.activeSources];
    assert.deepEqual(context.activeSources, playingSources);
  }
  assert.equal(getContextCount(), 1);
});

test("all restored sounds remain uninitialized while autoplay is blocked", async (t) => {
  const { context, window, setToggle, getContextCount } = createAppEnvironment(
    t,
    {
      brownNoise: true,
      pinkNoise: true,
      rainStorm: true,
      aircraftCabin: true,
      dubTechno: true,
    },
  );
  await import("../js/main.js?blocked-mixed-audio");
  for (const event of ["pointerup", "keydown"]) {
    window.dispatchEvent(new Event(event));
    assert.equal(context.state, "suspended");
    assert.equal(context.activeSources.length, 0);
    assert.equal(context.bufferCount, 0);
  }

  setToggle("brownNoise", false);
  context.allowResume = true;
  window.dispatchEvent(new Event("pointerup"));
  assert.equal(context.state, "running");
  assert.ok(context.activeSources.length > 0);
  assert.equal(context.bufferCount, 7);
  const playingSources = [...context.activeSources];
  window.dispatchEvent(new Event("keydown"));
  assert.deepEqual(context.activeSources, playingSources);
  assert.equal(context.bufferCount, 7);
  assert.equal(getContextCount(), 1);
});

test("restored sounds start immediately when playback is already permitted", async (t) => {
  const { context } = createAppEnvironment(t, { brownNoise: true });
  context.state = "running";
  await import("../js/main.js?permitted-audio");
  assert.equal(context.activeSources.length, 1);
  assert.equal(context.bufferCount, 1);
  const playingSources = [...context.activeSources];
  context.dispatchEvent(new Event("statechange"));
  assert.deepEqual(context.activeSources, playingSources);
  assert.equal(context.bufferCount, 1);
});

test("saved sounds do not prevent startup when Web Audio is unavailable", async (t) => {
  const { window, getContextCount } = createAppEnvironment(t, {
    brownNoise: true,
  });
  delete window.AudioContext;
  await import("../js/main.js?unsupported-audio");
  window.dispatchEvent(new Event("pointerup"));
  assert.equal(window.matrixClock.getState().brownNoise, true);
  assert.equal(getContextCount(), 0);
});

for (const constructorName of ["AudioContext", "webkitAudioContext"]) {
  test(`${constructorName} construction failure does not stop the clock or prevent a later retry`, async (t) => {
    const { window, context, calls, getContextCount, setToggle } =
      createAppEnvironment(t, { brownNoise: true }, { renderers: true });
    const AudioContextClass = window.AudioContext;
    delete window.AudioContext;
    let attempts = 0;
    window[constructorName] = function () {
      attempts += 1;
      throw new DOMException("Context limit reached", "NotSupportedError");
    };

    await import(`../js/main.js?failed-${constructorName}`);

    assert.equal(window.matrixClock.getState().brownNoise, true);
    assert.equal(calls.clockRenders, 1);
    assert.equal(context.bufferCount, 0);
    assert.equal(window.pendingTimerCount, 1);
    window.advanceTime(1000);
    assert.equal(calls.clockRenders, 2);
    window.dispatchEvent(new Event("pointerup"));
    window.dispatchEvent(new Event("keydown"));
    assert.equal(attempts, 1);

    window[constructorName] = AudioContextClass;
    setToggle("brownNoise", false);
    setToggle("brownNoise", true);
    context.allowResume = true;
    window.dispatchEvent(new Event("pointerup"));
    assert.equal(getContextCount(), 1);
    assert.equal(context.activeSources.length, 1);
    window.dispatchEvent(new Event("beforeunload"));
    assert.equal(context.activeSources.length, 0);
  });
}

test("interacting with sound disabled does not create an AudioContext", async (t) => {
  const { window, getContextCount } = createAppEnvironment(t, null);
  await import("../js/main.js?sound-disabled");
  window.dispatchEvent(new Event("pointerup"));
  window.dispatchEvent(new Event("keydown"));
  assert.equal(getContextCount(), 0);
});

test("turning all sounds off suspends audio until a sound is enabled again", async (t) => {
  const { context, document, window, getContextCount, setToggle } =
    createAppEnvironment(t, null);
  await import("../js/main.js?idle-audio");
  context.allowResume = true;
  setToggle("brownNoise", true);
  setToggle("pinkNoise", true);
  assert.equal(context.state, "running");
  assert.equal(context.activeSources.length, 2);

  setToggle("brownNoise", false);
  assert.equal(context.state, "running");
  assert.equal(context.activeSources.length, 1);
  setToggle("pinkNoise", false);
  assert.equal(context.state, "suspended");
  assert.equal(context.activeSources.length, 0);

  window.dispatchEvent(new Event("pointerup"));
  window.dispatchEvent(new Event("keydown"));
  assert.equal(context.state, "suspended");

  setToggle("brownNoise", true);
  assert.equal(context.state, "running");
  assert.equal(context.activeSources.length, 1);
  assert.equal(getContextCount(), 1);
  const volume = document.getElementById("soundVolumeSlider");
  volume.value = "0";
  volume.dispatchEvent(new Event("input"));
  assert.equal(context.state, "running");
  assert.equal(context.activeSources.length, 1);
});

test("audio recovers when a sound is enabled during a pending suspension", async (t) => {
  const { context, setToggle } = createAppEnvironment(t, null);
  await import("../js/main.js?pending-suspension");
  context.allowResume = true;
  setToggle("brownNoise", true);
  let finishSuspension;
  context.suspend = () =>
    new Promise((resolve) => {
      finishSuspension = () => {
        context.state = "suspended";
        context.dispatchEvent(new Event("statechange"));
        resolve();
      };
    });

  setToggle("brownNoise", false);
  assert.equal(typeof finishSuspension, "function");
  setToggle("brownNoise", true);
  finishSuspension();
  assert.equal(context.state, "running");
  assert.equal(context.activeSources.length, 1);
});

test("a late resume cannot leave audio running after all sounds are disabled", async (t) => {
  const { context, setToggle } = createAppEnvironment(t, null);
  await import("../js/main.js?pending-resume");
  let finishResume;
  context.resume = () =>
    new Promise((resolve) => {
      finishResume = () => {
        context.state = "running";
        context.dispatchEvent(new Event("statechange"));
        resolve();
      };
    });
  setToggle("brownNoise", true);
  setToggle("brownNoise", false);
  finishResume();
  assert.equal(context.state, "suspended");
  assert.equal(context.activeSources.length, 0);
});

test("volume and clock size changes do not reconcile unrelated renderers", async (t) => {
  const { context, document, window, calls, resetCalls, setToggle } =
    createAppEnvironment(t, null, { renderers: true });
  let wakeRequests = 0;
  navigator.wakeLock = {
    request() {
      wakeRequests += 1;
      return Promise.reject(new Error("Denied"));
    },
  };
  await import("../js/main.js?targeted-updates");
  await Promise.resolve();
  context.allowResume = true;
  setToggle("brownNoise", true);
  await Promise.resolve();
  const requestsBefore = wakeRequests;
  const playing = [...context.activeSources];
  resetCalls();

  const volume = document.getElementById("soundVolumeSlider");
  volume.value = "50";
  volume.dispatchEvent(new Event("input"));
  assert.equal(window.matrixClock.getState().soundVolume, 50);
  assert.equal(context.nodes[0].gain.value, 0.09);
  assert.deepEqual(context.activeSources, playing);
  assert.deepEqual(calls, {
    bodyClasses: 0,
    styleReads: 0,
    canvasClears: 0,
    clockRenders: 0,
    checkboxWrites: 0,
  });
  assert.equal(wakeRequests, requestsBefore);

  let gainWrites = 0;
  const gain = context.nodes[0].gain;
  const value = gain.value;
  Object.defineProperty(gain, "value", {
    get: () => value,
    set() {
      gainWrites += 1;
    },
  });
  const size = document.getElementById("clockScaleSlider");
  size.value = "150";
  size.dispatchEvent(new Event("input"));
  assert.equal(window.matrixClock.getState().clockScale, 150);
  assert.equal(calls.clockRenders, 1);
  assert.equal(calls.styleReads, 0);
  assert.equal(calls.canvasClears, 0);
  assert.equal(calls.bodyClasses, 0);
  assert.equal(calls.checkboxWrites, 0);
  assert.equal(gainWrites, 0);
  assert.equal(wakeRequests, requestsBefore);
});

function mockWakeLock() {
  const requests = [];
  navigator.wakeLock = {
    request(type) {
      assert.equal(type, "screen");
      return new Promise((resolve, reject) =>
        requests.push({ resolve, reject }),
      );
    },
  };
  return requests;
}

function createWakeLockSentinel() {
  return Object.assign(new EventTarget(), {
    released: false,
    releaseCalls: 0,
    release() {
      this.releaseCalls += 1;
      this.released = true;
      this.dispatchEvent(new Event("release"));
      return Promise.resolve();
    },
  });
}

test("an unsupported wake lock is reported without changing the requested preference", async (t) => {
  const { document, window, setToggle } = createAppEnvironment(t, null);
  await import("../js/main.js?unsupported-wake-status");
  const status = document.getElementById("wakeLockStatus");
  assert.match(status.textContent, /unavailable.*browser/i);
  assert.equal(window.matrixClock.getState().wakeLock, true);
  assert.equal(document.getElementById("wakeLockToggle").checked, true);
  setToggle("wakeLock", false);
  assert.match(status.textContent, /is off\.$/i);
});

test("wake lock denial reports failure and allows an explicit retry without changing the preference", async (t) => {
  const { document, window, saved, storageWrites, setToggle } =
    createAppEnvironment(t, { wakeLock: true });
  const requests = mockWakeLock();
  await import("../js/main.js?denied-wake-status");
  const status = document.getElementById("wakeLockStatus");
  assert.match(status.textContent, /requesting/i);
  requests[0].reject(new DOMException("Denied", "NotAllowedError"));
  await new Promise(setImmediate);
  assert.match(status.textContent, /failed.*may sleep/i);
  assert.match(status.textContent, /retry/i);
  assert.equal(window.matrixClock.getState().wakeLock, true);
  assert.equal(document.getElementById("wakeLockToggle").checked, true);
  assert.equal(storageWrites.length, 0);
  assert.equal(JSON.parse(saved.get(STORAGE_KEY)).wakeLock, true);
  window.advanceTime(5000);
  setToggle("hour24", true);
  assert.equal(requests.length, 1);

  setToggle("wakeLock", false);
  assert.match(status.textContent, /is off\.$/i);
  setToggle("wakeLock", true);
  assert.equal(requests.length, 2);
  assert.match(status.textContent, /requesting/i);
  requests[1].resolve(createWakeLockSentinel());
  await new Promise(setImmediate);
  assert.match(status.textContent, /active/i);
});

test("wake lock release is reported without retrying until the page resumes", async (t) => {
  const { document, window, setToggle } = createAppEnvironment(t, null);
  const requests = mockWakeLock();
  await import("../js/main.js?released-wake-status");
  const status = document.getElementById("wakeLockStatus");
  const sentinel = createWakeLockSentinel();
  requests[0].resolve(sentinel);
  await new Promise(setImmediate);
  assert.match(status.textContent, /active/i);
  sentinel.released = true;
  sentinel.dispatchEvent(new Event("release"));
  assert.match(status.textContent, /released.*may sleep/i);
  window.advanceTime(5000);
  setToggle("hour24", true);
  assert.equal(requests.length, 1);

  document.hidden = true;
  window.dispatchEvent(new Event("visibilitychange"));
  assert.match(status.textContent, /paused.*hidden/i);
  document.hidden = false;
  window.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("visibilitychange"));
  assert.equal(requests.length, 2);
  const resumed = createWakeLockSentinel();
  requests[1].resolve(resumed);
  await new Promise(setImmediate);
  assert.match(status.textContent, /active/i);
  setToggle("wakeLock", false);
  await new Promise(setImmediate);
  assert.equal(resumed.releaseCalls, 1);
  assert.match(status.textContent, /is off\.$/i);
});

for (const hidden of [false, true]) {
  for (const rejected of [false, true]) {
    test(`a pending wake lock ${rejected ? "failure" : "success"} cannot override ${hidden ? "background" : "disabled"} status`, async (t) => {
      const { document, window, setToggle } = createAppEnvironment(t, null);
      const requests = mockWakeLock();
      await import(`../js/main.js?pending-wake-status-${hidden}-${rejected}`);
      const status = document.getElementById("wakeLockStatus");
      assert.match(status.textContent, /requesting/i);
      if (hidden) {
        document.hidden = true;
        window.dispatchEvent(new Event("visibilitychange"));
      } else {
        setToggle("wakeLock", false);
      }
      const expected = hidden ? /paused.*hidden/i : /is off\.$/i;
      assert.match(status.textContent, expected);
      const sentinel = createWakeLockSentinel();
      if (rejected)
        requests[0].reject(new DOMException("Denied", "NotAllowedError"));
      else requests[0].resolve(sentinel);
      await new Promise(setImmediate);
      assert.equal(sentinel.releaseCalls, rejected ? 0 : 1);
      assert.match(status.textContent, expected);
      assert.equal(requests.length, 1);
    });
  }
}

test("a delayed old release event cannot change the status of a new wake lock", async (t) => {
  const { document, setToggle } = createAppEnvironment(t, null);
  const requests = mockWakeLock();
  await import("../js/main.js?old-wake-release-status");
  const old = createWakeLockSentinel();
  old.release = () => Promise.resolve();
  requests[0].resolve(old);
  await new Promise(setImmediate);
  setToggle("wakeLock", false);
  setToggle("wakeLock", true);
  const current = createWakeLockSentinel();
  requests[1].resolve(current);
  await new Promise(setImmediate);
  old.dispatchEvent(new Event("release"));
  assert.match(
    document.getElementById("wakeLockStatus").textContent,
    /active/i,
  );
  setToggle("wakeLock", false);
  await new Promise(setImmediate);
  assert.equal(current.releaseCalls, 1);
});

test("normalized Matrix mode updates visuals and repairs forced controls", async (t) => {
  const { document, window, calls, resetCalls, setToggle } =
    createAppEnvironment(t, null, { renderers: true });
  await import("../js/main.js?normalized-updates");
  const mode = document.getElementById("modeSelect");
  mode.value = "matrix";
  mode.dispatchEvent(new Event("change"));
  assert.equal(window.matrixClock.getState().matrix, true);
  assert.equal(window.matrixClock.getState().neon, true);
  assert.equal(document.getElementById("matrixToggle").checked, true);
  assert.equal(document.getElementById("neonToggle").checked, true);
  resetCalls();
  setToggle("matrix", false);
  assert.equal(document.getElementById("matrixToggle").checked, true);
  assert.equal(window.matrixClock.getState().matrix, true);
  assert.equal(calls.bodyClasses, 0);
  assert.equal(calls.clockRenders, 0);
});

test("clock options still render immediately without touching the background", async (t) => {
  const { window, calls, resetCalls, setToggle } = createAppEnvironment(
    t,
    null,
    {
      renderers: true,
    },
  );
  await import("../js/main.js?clock-option-updates");
  for (const key of [
    "hour24",
    "showAmPm",
    "leadingZero",
    "hideSeconds",
    "glitch",
    "glyph",
  ]) {
    resetCalls();
    setToggle(key, true);
    assert.equal(window.matrixClock.getState()[key], true);
    assert.equal(calls.clockRenders, 1);
    assert.equal(calls.bodyClasses, 0);
    assert.equal(calls.styleReads, 0);
    assert.equal(calls.canvasClears, 0);
    setToggle(key, false);
  }
});

test("every ordinary toggle updates its matching state key in both directions", async (t) => {
  const { document, window } = createAppEnvironment(t, null);
  await import("../js/main.js?ordinary-toggles");
  for (const [key, initial] of Object.entries(DEFAULTS)) {
    if (
      typeof initial !== "boolean" ||
      ["lightMode", "matrixMode", "fullscreen"].includes(key)
    )
      continue;
    const toggle = document.getElementById(
      key === "persistStorage" ? "storageToggle" : `${key}Toggle`,
    );
    assert.equal(toggle.checked, initial, key);
    for (const checked of [!initial, initial]) {
      toggle.checked = checked;
      toggle.dispatchEvent(new Event("change"));
      assert.equal(window.matrixClock.getState()[key], checked, key);
      assert.equal(toggle.checked, checked, key);
    }
  }
});

test("fullscreen stays browser-owned and restores its control after rejection", async (t) => {
  const { document, window, setToggle } = createAppEnvironment(t, null);
  let requests = 0;
  document.documentElement = {
    async requestFullscreen() {
      requests += 1;
      document.fullscreenElement = this;
      window.dispatchEvent(new Event("fullscreenchange"));
    },
  };
  document.exitFullscreen = async () => {
    document.fullscreenElement = null;
    window.dispatchEvent(new Event("fullscreenchange"));
  };
  await import("../js/main.js?fullscreen-toggle");
  setToggle("fullscreen", true);
  await new Promise(setImmediate);
  assert.equal(requests, 1);
  assert.equal(window.matrixClock.getState().fullscreen, true);
  setToggle("fullscreen", false);
  await new Promise(setImmediate);
  assert.equal(window.matrixClock.getState().fullscreen, false);

  document.documentElement.requestFullscreen = () =>
    Promise.reject(new Error("Denied"));
  setToggle("fullscreen", true);
  await new Promise(setImmediate);
  assert.equal(window.matrixClock.getState().fullscreen, false);
  assert.equal(document.getElementById("fullscreenToggle").checked, false);
});

test("settings saves are debounced and pending changes flush on unload", async (t) => {
  const { document, window, saved, storageWrites, setToggle } =
    createAppEnvironment(t, null);
  await import("../js/main.js?save-lifecycle");
  const storage = document.getElementById("storageToggle");
  storage.checked = true;
  storage.dispatchEvent(new Event("change"));
  window.advanceTime(119);
  assert.equal(storageWrites.length, 0);
  setToggle("hour24", true);
  window.advanceTime(119);
  assert.equal(storageWrites.length, 0);
  window.advanceTime(1);
  assert.equal(storageWrites.length, 2);
  assert.equal(JSON.parse(saved.get(STORAGE_KEY)).hour24, true);
  assert.equal(saved.get(STORAGE_ENABLED_KEY), "true");

  setToggle("leadingZero", true);
  window.dispatchEvent(new Event("beforeunload"));
  assert.equal(storageWrites.length, 4);
  assert.equal(JSON.parse(saved.get(STORAGE_KEY)).leadingZero, true);
  window.advanceTime(200);
  assert.equal(storageWrites.length, 4);
});

for (const failure of ["preference", "payload", "remove"]) {
  for (const event of ["timeout", "visibilitychange", "beforeunload"]) {
    test(`a ${failure} save failure is reported on ${event} and clears after a successful retry`, async (t) => {
      const { document, window, saved, setToggle } = createAppEnvironment(t, {
        hour24: false,
      });
      saved.set("unrelated", "keep");
      const method = failure === "remove" ? "removeItem" : "setItem";
      const key = failure === "preference" ? STORAGE_ENABLED_KEY : STORAGE_KEY;
      const original = localStorage[method];
      let blocked = true;
      localStorage[method] = (...args) => {
        if (blocked && args[0] === key) {
          throw new DOMException(
            "Storage quota exceeded",
            "QuotaExceededError",
          );
        }
        return original(...args);
      };
      await import(`../js/main.js?failed-save-${failure}-${event}`);
      const status = document.getElementById("storageStatus");
      const preference = document.getElementById("storageToggle");
      if (failure === "remove") {
        preference.checked = false;
        preference.dispatchEvent(new Event("change"));
      }
      setToggle("hour24", true);
      if (event === "timeout") window.advanceTime(120);
      else {
        document.hidden = event === "visibilitychange";
        window.dispatchEvent(new Event(event));
      }
      assert.match(status.textContent, /could not.*saved settings/i);
      assert.match(status.textContent, /retry/i);
      assert.equal(window.matrixClock.getState().hour24, true);
      assert.equal(preference.checked, failure !== "remove");
      assert.equal(saved.get("unrelated"), "keep");

      blocked = false;
      document.hidden = false;
      window.dispatchEvent(new Event("visibilitychange"));
      setToggle("leadingZero", true);
      window.advanceTime(120);
      assert.equal(status.textContent, "");
      assert.equal(
        saved.get(STORAGE_ENABLED_KEY),
        String(failure !== "remove"),
      );
      if (failure === "remove") assert.equal(saved.has(STORAGE_KEY), false);
      else assert.equal(JSON.parse(saved.get(STORAGE_KEY)).hour24, true);
      assert.equal(saved.get("unrelated"), "keep");
    });
  }
}

for (const optOut of [false, true]) {
  test(`backgrounding flushes a pending ${optOut ? "persistence opt-out" : "setting change"} before timers can freeze`, async (t) => {
    const { document, window, saved, storageWrites, setToggle } =
      createAppEnvironment(t, { hour24: false });
    await import(`../js/main.js?pending-background-${optOut}`);
    saved.set("unrelated", "keep");
    if (optOut) {
      const storage = document.getElementById("storageToggle");
      storage.checked = false;
      storage.dispatchEvent(new Event("change"));
    } else {
      setToggle("hour24", true);
    }
    window.advanceTime(5);
    assert.equal(storageWrites.length, 0);

    document.hidden = true;
    window.dispatchEvent(new Event("visibilitychange"));

    assert.equal(storageWrites.length, 2);
    assert.equal(saved.get(STORAGE_ENABLED_KEY), String(!optOut));
    if (optOut) assert.equal(saved.has(STORAGE_KEY), false);
    else assert.equal(JSON.parse(saved.get(STORAGE_KEY)).hour24, true);
    assert.equal(saved.get("unrelated"), "keep");
    assert.equal(window.pendingTimerCount, 0);

    document.hidden = false;
    window.dispatchEvent(new Event("visibilitychange"));
    window.advanceTime(200);
    assert.equal(storageWrites.length, 2);
  });
}

for (const event of ["beforeunload", "visibilitychange"]) {
  for (const alreadySaved of [false, true]) {
    for (const optedOut of [false, true]) {
      test(`${event} preserves another tab's ${optedOut ? "opt-out" : "settings"} ${alreadySaved ? "after saving" : "without edits"}`, async (t) => {
        const { document, window, saved, storageWrites, setToggle } =
          createAppEnvironment(t, {
            hour24: false,
          });
        await import(
          `../js/main.js?clean-${event}-${alreadySaved}-${optedOut}`
        );
        if (alreadySaved) {
          setToggle("leadingZero", true);
          window.advanceTime(120);
        }

        // Simulate a newer write from a different tab on the same origin.
        saved.set(STORAGE_ENABLED_KEY, JSON.stringify(!optedOut));
        if (optedOut) saved.delete(STORAGE_KEY);
        else saved.set(STORAGE_KEY, JSON.stringify({ hour24: true }));
        const newerSettings = new Map(saved);
        const writeCount = storageWrites.length;

        document.hidden = true;
        window.dispatchEvent(new Event(event));

        assert.equal(storageWrites.length, writeCount);
        assert.deepEqual(saved, newerSettings);
      });
    }
  }
}
