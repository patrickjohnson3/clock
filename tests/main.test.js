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
  const fontSelect = new EventTarget();
  const stylesheets = [];
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    getElementById: (id) => (id === "fontSelect" ? fontSelect : null),
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

test("restored audio resumes on pointer or keyboard interaction without restarting sources", async (t) => {
  const { context, window, getContextCount } = createAppEnvironment(t, {
    brownNoise: true,
  });
  await import("../js/main.js?restored-audio");
  assert.equal(context.state, "suspended");
  const playingSources = [...context.activeSources];
  assert.ok(playingSources.length > 0);

  context.allowResume = true;
  for (const event of ["pointerup", "keydown"]) {
    context.state = "suspended";
    window.dispatchEvent(new Event(event));
    assert.equal(context.state, "running");
    assert.deepEqual(context.activeSources, playingSources);
  }
  assert.equal(getContextCount(), 1);
});

test("interacting with sound disabled does not create an AudioContext", async (t) => {
  const { window, getContextCount } = createAppEnvironment(t, null);
  await import("../js/main.js?sound-disabled");
  window.dispatchEvent(new Event("pointerup"));
  window.dispatchEvent(new Event("keydown"));
  assert.equal(getContextCount(), 0);
});
