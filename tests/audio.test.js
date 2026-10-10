import assert from "node:assert/strict";
import test from "node:test";
import {
  createAircraftCabinEngine,
  createBrownNoiseEngine,
  createDubTechnoEngine,
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

for (const [key, createEngine] of Object.entries({
  ...factories,
  dubTechno: createDubTechnoEngine,
})) {
  test(`${key} leaves context playback permission to its owner`, (t) => {
    installGlobals(t, {
      window: createWindow(),
      document: Object.assign(new EventTarget(), { hidden: false }),
    });
    const context = createAudioContext();
    context.state = "suspended";
    let resumes = 0;
    context.resume = () => {
      resumes += 1;
      return Promise.resolve();
    };
    const engine = createEngine(TUNING.audio[key], {
      getContext: () => context,
    });
    engine.start();
    assert.equal(resumes, 0);
    assert.equal(context.state, "suspended");
    engine.stop();
  });

  test(`${key} can retry when the shared context is initially unavailable`, (t) => {
    const window = createWindow();
    installGlobals(t, {
      window,
      document: Object.assign(new EventTarget(), { hidden: false }),
    });
    let availableContext = null;
    const engine = createEngine(TUNING.audio[key], {
      getContext: () => availableContext,
    });
    engine.start();
    engine.stop();
    assert.equal(window.pendingTimerCount, 0);
    availableContext = createAudioContext();
    engine.start();
    assert.ok(availableContext.activeSources.length > 0);
    engine.stop();
    assert.equal(availableContext.activeSources.length, 0);
    assert.equal(window.pendingTimerCount, 0);
  });
}

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

test("Dub Techno stops every oscillator and can restart without duplicates", (t) => {
  installGlobals(t, {
    window: createWindow(),
    document: Object.assign(new EventTarget(), { hidden: false }),
  });
  const context = createAudioContext();
  const engine = createDubTechnoEngine(TUNING.audio.dubTechno, {
    getContext: () => context,
  });

  engine.stop();
  for (let cycle = 0; cycle < 2; cycle += 1) {
    engine.start();
    const playingSources = [...context.activeSources];
    assert.ok(playingSources.length > 0);
    engine.start();
    assert.deepEqual(context.activeSources, playingSources);
    engine.stop();
    engine.stop();
    context.finishStoppedSources();
    assert.equal(context.activeSources.length, 0);
  }
});

test("Dub Techno schedules percussion ahead and cancels its scheduler on stop", (t) => {
  const context = createAudioContext();
  const window = createWindow({
    onAdvance: (milliseconds) => context.advanceTime(milliseconds / 1000),
  });
  installGlobals(t, {
    window,
    document: Object.assign(new EventTarget(), { hidden: false }),
  });
  const config = TUNING.audio.dubTechno;
  const engine = createDubTechnoEngine(config, { getContext: () => context });
  engine.start();
  window.advanceTime(1000);

  const percussion = context.sources.filter(
    (source) => source.stopTime !== null,
  );
  assert.ok(percussion.some((source) => source.frequency.events.length > 0));
  assert.ok(percussion.some((source) => source.buffer));
  for (const source of percussion) {
    assert.ok(source.startTime >= source.scheduledAt - 1e-9);
    assert.ok(source.startTime < source.scheduledAt + config.scheduleAheadTime);
    assert.ok(source.stopTime > source.startTime);
  }
  const automation = context.nodes.flatMap((node) => node.gain.events);
  for (const method of [
    "setValueAtTime",
    "linearRampToValueAtTime",
    "exponentialRampToValueAtTime",
    "cancelScheduledValues",
    "setTargetAtTime",
  ]) {
    assert.ok(automation.some((event) => event.method === method));
  }

  engine.stop();
  const sourceCount = context.sources.length;
  window.advanceTime(1000);
  context.finishStoppedSources();
  assert.equal(context.sources.length, sourceCount);
  assert.equal(context.activeSources.length, 0);
  assert.equal(window.pendingTimerCount, 0);
});

test("Dub Techno pauses scheduling while hidden and returns without a catch-up burst", (t) => {
  const context = createAudioContext();
  const window = createWindow({
    onAdvance: (milliseconds) => context.advanceTime(milliseconds / 1000),
  });
  const document = Object.assign(new EventTarget(), { hidden: false });
  installGlobals(t, { window, document });
  const engine = createDubTechnoEngine(TUNING.audio.dubTechno, {
    getContext: () => context,
  });
  engine.start();
  window.advanceTime(500);
  document.hidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  const sourceCount = context.sources.length;
  window.advanceTime(10000);
  assert.equal(context.sources.length, sourceCount);
  assert.equal(window.pendingTimerCount, 0);
  assert.equal(context.activeSources.length, 3);

  const returnedAt = context.currentTime;
  document.hidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  window.advanceTime(TUNING.audio.dubTechno.lookaheadMs);
  const resumed = context.sources.slice(sourceCount);
  assert.ok(resumed.length > 0 && resumed.length <= 2);
  assert.ok(resumed.every((source) => source.startTime >= returnedAt));
  engine.stop();
  window.advanceTime(1000);
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(window.pendingTimerCount, 0);
});

for (const key of ["rainStorm", "aircraftCabin"]) {
  test(`${key} varies over time and cancels its next variation on stop`, (t) => {
    const context = createAudioContext();
    const window = createWindow({
      onAdvance: (milliseconds) => context.advanceTime(milliseconds / 1000),
    });
    installGlobals(t, { window });
    const engine = factories[key](TUNING.audio[key], {
      getContext: () => context,
    });
    const automation = () => context.nodes.flatMap((node) => node.gain.events);
    engine.start();
    const initialCount = automation().length;
    window.advanceTime(4000);
    assert.ok(automation().length > initialCount);
    assert.ok(automation().some((event) => event.args[1] > 0));
    engine.stop();
    const finalCount = automation().length;
    window.advanceTime(4000);
    assert.equal(automation().length, finalCount);
    assert.equal(window.pendingTimerCount, 0);
  });
}
