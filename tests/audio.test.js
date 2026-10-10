import assert from "node:assert/strict";
import test from "node:test";
import {
  createAircraftCabinEngine,
  createBrownNoiseEngine,
  createPinkNoiseEngine,
  createRainStormEngine,
} from "../js/audio/engines.js";
import { createSoundManager } from "../js/audio/manager.js";
import { TUNING } from "../js/config.js";
import {
  createAudioContext,
  createWindow,
  installGlobals,
} from "./helpers/audio.js";

const factories = {
  brownNoise: createBrownNoiseEngine,
  pinkNoise: createPinkNoiseEngine,
  rainStorm: createRainStormEngine,
  aircraftCabin: createAircraftCabinEngine,
};

for (const [key, createEngine] of Object.entries(factories)) {
  test(`${key} stops all sources after a rapid restart`, (t) => {
    installGlobals(t, { window: createWindow() });
    const context = createAudioContext();
    const manager = createSoundManager({
      [key]: createEngine(TUNING.audio[key], { getContext: () => context }),
    });

    manager.sync({ [key]: true });
    assert.ok(context.activeSources.length > 0);
    manager.sync({ [key]: false });
    manager.sync({ [key]: true });
    context.finishStoppedSources();
    manager.sync({ [key]: true });
    manager.sync({ [key]: false });

    assert.equal(context.activeSources.length, 0);
    manager.stopAll();
    context.finishStoppedSources();
    assert.equal(context.activeSources.length, 0);
  });
}
