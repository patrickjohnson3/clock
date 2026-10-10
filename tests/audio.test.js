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

// Evaluate only the target/step automation used by the ducking gain.
function targetValueAtTime(events, initialValue, time) {
  let timeline = [];
  for (const { method, args } of events) {
    if (method === "cancelScheduledValues") {
      timeline = timeline.filter((event) => event.args[1] < args[0]);
    } else {
      assert.ok(method === "setTargetAtTime" || method === "setValueAtTime");
      timeline.push({ method, args });
    }
  }
  timeline.sort((a, b) => a.args[1] - b.args[1]);
  let value = initialValue;
  let previousTime = 0;
  let target = null;
  let timeConstant = 1;
  function valueAfter(seconds) {
    return target === null
      ? value
      : target + (value - target) * Math.exp(-seconds / timeConstant);
  }
  for (const { method, args } of timeline) {
    if (args[1] > time) break;
    value = valueAfter(args[1] - previousTime);
    previousTime = args[1];
    if (method === "setValueAtTime") {
      value = args[0];
      target = null;
    } else {
      target = args[0];
      timeConstant = args[2];
    }
  }
  return valueAfter(time - previousTime);
}

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

test("Dub Techno ducking continues its recovery into the next kick without a gain step", (t) => {
  const context = createAudioContext();
  const window = createWindow({
    onAdvance: (milliseconds) => context.advanceTime(milliseconds / 1000),
  });
  installGlobals(t, {
    window,
    document: Object.assign(new EventTarget(), { hidden: false }),
  });
  const engine = createDubTechnoEngine(TUNING.audio.dubTechno, {
    getContext: () => context,
  });
  engine.start();
  window.advanceTime(50);
  const duck = context.nodes
    .map((node) => node.gain)
    .find((gain) =>
      gain.events.some(
        ({ method, args }) => method === "setTargetAtTime" && args[0] === 0.62,
      ),
    );
  assert.ok(duck);
  const initialValue = duck.value;
  Object.defineProperty(duck, "value", {
    get: () =>
      targetValueAtTime(duck.events, initialValue, context.currentTime),
  });
  window.advanceTime(400);

  // Independent solutions of the exponential attack/release at 108 BPM.
  for (const [time, expected] of [
    [0.05, 1],
    [0.065, 0.7597941876451481],
    [0.23, 0.6200023348006942],
    [0.6055555555555556, 0.9418871197282963],
    [0.6255555555555556, 0.7048485235566931],
  ]) {
    const actual = targetValueAtTime(duck.events, initialValue, time);
    assert.ok(Math.abs(actual - expected) < 1e-9, `${time}: ${actual}`);
  }
  engine.stop();
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

test("Dub Techno cancels active and queued percussion without stopping mixed sounds", (t) => {
  const context = createAudioContext();
  const window = createWindow({
    onAdvance: (milliseconds) => context.advanceTime(milliseconds / 1000),
  });
  installGlobals(t, {
    window,
    document: Object.assign(new EventTarget(), { hidden: false }),
  });
  const brownNoise = createBrownNoiseEngine(TUNING.audio.brownNoise, {
    getContext: () => context,
  });
  const engine = createDubTechnoEngine(TUNING.audio.dubTechno, {
    getContext: () => context,
  });
  brownNoise.start();
  const mixedSources = [...context.activeSources];

  for (let cycle = 0; cycle < 2; cycle += 1) {
    engine.start();
    window.advanceTime(50);
    const restartedSources = [...context.activeSources];
    context.finishStoppedSources();
    assert.deepEqual(context.activeSources, restartedSources);
    window.advanceTime(150);
    const percussion = context.sources.filter(
      (source) => source.stopTime > context.currentTime,
    );
    assert.ok(
      percussion.some((source) => source.startTime <= context.currentTime),
    );
    assert.ok(
      percussion.some((source) => source.startTime > context.currentTime),
    );
    const voiceNodes = percussion.flatMap((source) => {
      const filter = source.connections[0];
      return [source, filter, filter.connections[0]];
    });

    engine.stop();

    assert.deepEqual(context.activeSources, mixedSources);
    assert.ok(
      percussion.every((source) => source.stopTime <= context.currentTime),
    );
    assert.ok(voiceNodes.every((node) => node.disconnectCount === 1));
    engine.stop();
    assert.ok(voiceNodes.every((node) => node.disconnectCount === 1));
    assert.equal(window.pendingTimerCount, 0);
  }
  window.advanceTime(1000);
  context.finishStoppedSources();
  assert.deepEqual(context.activeSources, mixedSources);
  brownNoise.stop();
  assert.equal(context.activeSources.length, 0);
});

test("Dub Techno releases naturally ended percussion before a later stop", (t) => {
  const context = createAudioContext();
  const window = createWindow({
    onAdvance: (milliseconds) => context.advanceTime(milliseconds / 1000),
  });
  installGlobals(t, {
    window,
    document: Object.assign(new EventTarget(), { hidden: false }),
  });
  const engine = createDubTechnoEngine(TUNING.audio.dubTechno, {
    getContext: () => context,
  });
  engine.start();
  window.advanceTime(50);
  const percussion = context.sources.filter(
    (source) => source.stopTime !== null,
  );
  const voiceNodes = percussion.flatMap((source) => {
    const filter = source.connections[0];
    return [source, filter, filter.connections[0]];
  });
  window.advanceTime(500);
  context.finishStoppedSources();
  assert.ok(percussion.every((source) => source.ended));
  assert.ok(voiceNodes.every((node) => node.disconnectCount === 1));
  const stopTimes = percussion.map((source) => source.stopTime);

  engine.stop();
  context.finishStoppedSources();

  assert.deepEqual(
    percussion.map((source) => source.stopTime),
    stopTimes,
  );
  assert.ok(voiceNodes.every((node) => node.disconnectCount === 1));
  assert.equal(context.activeSources.length, 0);
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
