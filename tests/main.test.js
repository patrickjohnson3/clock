import assert from "node:assert/strict";
import test from "node:test";
import { STORAGE_ENABLED_KEY, STORAGE_KEY } from "../js/config.js";
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
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    getElementById: () => null,
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
  return { context, window, getContextCount: () => contextCount };
}

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
