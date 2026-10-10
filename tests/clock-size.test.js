import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS, STORAGE_ENABLED_KEY, STORAGE_KEY } from "../js/config.js";
import { createSettings } from "../js/settings.js";
import { normalizeState } from "../js/state.js";
import { installGlobals } from "./helpers/audio.js";

test("clock size defaults to 100 percent and stays within 100-200 percent", () => {
  assert.equal(DEFAULTS.clockScale, 100);
  for (const [value, expected] of [
    [100, 100],
    [150, 150],
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
  const settings = createSettings({
    defaults: DEFAULTS,
    storageKey: STORAGE_KEY,
    storageEnabledKey: STORAGE_ENABLED_KEY,
    normalizeState,
  });

  assert.equal(settings.load().clockScale, 100);
  settings.save({ ...DEFAULTS, persistStorage: true, clockScale: 200 });
  assert.equal(settings.load().clockScale, 200);

  for (const clockScale of [undefined, "200", null, 250]) {
    saved.set(STORAGE_KEY, JSON.stringify({ clockScale }));
    assert.equal(settings.load().clockScale, clockScale === 250 ? 200 : 100);
  }

  settings.save({ ...DEFAULTS, persistStorage: false, clockScale: 200 });
  assert.equal(saved.has(STORAGE_KEY), false);
  assert.equal(settings.load().clockScale, 100);
});
