import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS, STORAGE_KEY } from "../js/config.js";
import { loadSettings, saveSettings } from "../js/settings.js";
import { normalizeState } from "../js/state.js";
import { installGlobals } from "./helpers/audio.js";

test("clock size defaults to 100 percent and snaps to 10-percent steps within 100-200", () => {
  assert.equal(DEFAULTS.clockScale, 100);
  for (const [value, expected] of [
    [100, 100],
    [104.99, 100],
    [105, 110],
    [105.01, 110],
    [150, 150],
    [194.99, 190],
    [195, 200],
    [200, 200],
    [0, 100],
    [250, 200],
    [undefined, 100],
    [NaN, 100],
    [Infinity, 100],
    ["150", 100],
  ]) {
    assert.equal(
      normalizeState({ ...DEFAULTS, clockScale: value }).clockScale,
      expected,
    );
  }
});

test("clock size round-trips only with persistence enabled and defaults for older saves", (t) => {
  const saved = new Map();
  installGlobals(t, {
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
      removeItem: (key) => saved.delete(key),
    },
  });
  assert.equal(loadSettings().clockScale, 100);
  saveSettings({ ...DEFAULTS, persistStorage: true, clockScale: 200 });
  assert.equal(loadSettings().clockScale, 200);

  for (const clockScale of [undefined, "200", null, 250]) {
    saved.set(STORAGE_KEY, JSON.stringify({ clockScale }));
    assert.equal(loadSettings().clockScale, clockScale === 250 ? 200 : 100);
  }

  saveSettings({ ...DEFAULTS, persistStorage: false, clockScale: 200 });
  assert.equal(saved.has(STORAGE_KEY), false);
  assert.equal(loadSettings().clockScale, 100);
});
