import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS, STORAGE_ENABLED_KEY, STORAGE_KEY } from "../js/config.js";
import { loadSettings, saveSettings } from "../js/settings.js";
import { installGlobals } from "./helpers/audio.js";

function installStorage(t, entries = []) {
  const saved = new Map(entries);
  installGlobals(t, {
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
      removeItem: (key) => saved.delete(key),
    },
  });
  return saved;
}

test("saved settings are ignored without an explicit boolean opt-in", (t) => {
  const saved = installStorage(t, [
    [STORAGE_KEY, JSON.stringify({ hour24: true })],
  ]);
  for (const preference of [
    null,
    "false",
    "null",
    '"true"',
    "1",
    "{}",
    "bad JSON",
  ]) {
    if (preference === null) saved.delete(STORAGE_ENABLED_KEY);
    else saved.set(STORAGE_ENABLED_KEY, preference);
    assert.deepEqual(loadSettings(), DEFAULTS);
  }
});

test("malformed and non-object payloads retain typed defaults", (t) => {
  const saved = installStorage(t, [[STORAGE_ENABLED_KEY, "true"]]);
  for (const payload of ["{", "null", "false", "1", '"text"', "[]"]) {
    saved.set(STORAGE_KEY, payload);
    assert.deepEqual(loadSettings(), { ...DEFAULTS, persistStorage: true });
  }
  const invalid = Object.fromEntries(
    Object.entries(DEFAULTS).map(([key, value]) => [
      key,
      typeof value === "boolean"
        ? "true"
        : typeof value === "number"
          ? "150"
          : 42,
    ]),
  );
  saved.set(STORAGE_KEY, JSON.stringify(invalid));
  assert.deepEqual(loadSettings(), { ...DEFAULTS, persistStorage: true });
});

test("legacy time options migrate and current options take precedence", (t) => {
  const saved = installStorage(t, [[STORAGE_ENABLED_KEY, "true"]]);
  for (const [payload, hour24, showAmPm] of [
    [{ hour12: false, hideAmPm: false }, true, true],
    [{ hour12: true, hideAmPm: true }, false, false],
    [
      { hour12: false, hour24: false, hideAmPm: false, showAmPm: false },
      false,
      false,
    ],
    [
      { hour12: true, hour24: true, hideAmPm: true, showAmPm: true },
      true,
      true,
    ],
  ]) {
    saved.set(STORAGE_KEY, JSON.stringify(payload));
    const state = loadSettings();
    assert.equal(state.hour24, hour24);
    assert.equal(state.showAmPm, showAmPm);
  }
});

test("Reduced Motion defaults off, validates saved values, and persists only by opt-in", (t) => {
  const saved = installStorage(t, [[STORAGE_ENABLED_KEY, "true"]]);
  for (const payload of [
    {},
    { reducedMotion: false },
    { reducedMotion: "true" },
    { reducedMotion: 1 },
    { reducedMotion: null },
  ]) {
    saved.set(STORAGE_KEY, JSON.stringify(payload));
    assert.equal(loadSettings().reducedMotion, false);
  }
  assert.equal(
    saveSettings({ ...DEFAULTS, reducedMotion: true, persistStorage: true }),
    true,
  );
  assert.equal(loadSettings().reducedMotion, true);
  assert.equal(
    saveSettings({ ...DEFAULTS, reducedMotion: true, persistStorage: false }),
    true,
  );
  assert.equal(loadSettings().reducedMotion, false);
});

test("loading applies mode and numeric invariants but never restores fullscreen", (t) => {
  installStorage(t, [
    [STORAGE_ENABLED_KEY, "true"],
    [
      STORAGE_KEY,
      JSON.stringify({
        matrixMode: true,
        lightMode: true,
        matrix: false,
        neon: false,
        clockScale: 250,
        soundVolume: -1,
        fullscreen: true,
        persistStorage: false,
      }),
    ],
  ]);
  const state = loadSettings();
  assert.equal(state.matrixMode, true);
  assert.equal(state.lightMode, false);
  assert.equal(state.matrix, true);
  assert.equal(state.neon, true);
  assert.equal(state.clockScale, 200);
  assert.equal(state.soundVolume, 0);
  assert.equal(state.fullscreen, false);
  assert.equal(state.persistStorage, true);
});

test("saving omits transient fields and disabling persistence removes only its payload", (t) => {
  const saved = installStorage(t, [["unrelated", "keep"]]);
  const state = {
    ...DEFAULTS,
    persistStorage: true,
    fullscreen: true,
    hour24: true,
  };
  assert.equal(saveSettings(state), true);
  assert.equal(saved.get(STORAGE_ENABLED_KEY), "true");
  const payload = JSON.parse(saved.get(STORAGE_KEY));
  assert.equal(payload.hour24, true);
  assert.equal(Object.hasOwn(payload, "fullscreen"), false);
  assert.equal(Object.hasOwn(payload, "persistStorage"), false);
  assert.equal(state.fullscreen, true);
  assert.equal(state.persistStorage, true);
  assert.equal(saveSettings({ ...state, persistStorage: false }), true);
  assert.equal(saved.has(STORAGE_KEY), false);
  assert.equal(saved.get(STORAGE_ENABLED_KEY), "false");
  assert.equal(saved.get("unrelated"), "keep");
  assert.deepEqual(loadSettings(), DEFAULTS);
});

test("unavailable storage and failures of each storage operation are tolerated", (t) => {
  installGlobals(t, { localStorage: undefined });
  assert.deepEqual(loadSettings(), DEFAULTS);
  assert.doesNotThrow(() =>
    saveSettings({ ...DEFAULTS, persistStorage: true }),
  );
  assert.equal(saveSettings({ ...DEFAULTS, persistStorage: true }), false);
  for (const operation of ["getItem", "setItem", "removeItem"]) {
    const storage = {
      getItem: () => "true",
      setItem() {},
      removeItem() {},
    };
    storage[operation] = () => {
      throw new Error("Storage blocked");
    };
    globalThis.localStorage = storage;
    assert.doesNotThrow(loadSettings);
    assert.doesNotThrow(() =>
      saveSettings({ ...DEFAULTS, persistStorage: false }),
    );
    assert.doesNotThrow(() =>
      saveSettings({ ...DEFAULTS, persistStorage: true }),
    );
    assert.equal(
      saveSettings({ ...DEFAULTS, persistStorage: false }),
      operation === "getItem",
    );
    assert.equal(
      saveSettings({ ...DEFAULTS, persistStorage: true }),
      operation !== "setItem",
    );
  }
});
