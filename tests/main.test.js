import assert from "node:assert/strict";
import test from "node:test";
import { STORAGE_ENABLED_KEY, STORAGE_KEY, SYSTEM_FONT } from "../js/config.js";
import {
  createAudioContext,
  createWindow,
  installGlobals,
} from "./helpers/audio.js";

function createAppEnvironment(t, savedSettings) {
  const context = createAudioContext();
  context.state = "suspended";
  let contextCount = 0;
  const window = createWindow();
  window.requestAnimationFrame = () => 0;
  window.AudioContext = function () {
    contextCount += 1;
    return context;
  };
  const controls = new Map(
    [
      "fontSelect",
      "brownNoiseToggle",
      "pinkNoiseToggle",
      "rainStormToggle",
      "aircraftCabinToggle",
      "dubTechnoToggle",
      "soundVolumeSlider",
    ].map((id) => [id, new EventTarget()]),
  );
  const stylesheets = [];
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    getElementById: (id) => controls.get(id) ?? null,
    createElement: (tagName) => ({ tagName }),
    head: { appendChild: (element) => stylesheets.push(element) },
    body: { classList: { toggle() {} }, style: {} },
  });
  const saved = new Map([
    [STORAGE_ENABLED_KEY, JSON.stringify(Boolean(savedSettings))],
    [STORAGE_KEY, JSON.stringify(savedSettings)],
  ]);
  installGlobals(t, {
    window,
    document,
    navigator: {},
    localStorage: { getItem: (key) => saved.get(key) ?? null },
  });
  return {
    context,
    window,
    document,
    stylesheets,
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
