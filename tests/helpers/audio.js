export function installGlobals(t, values) {
  for (const [key, value] of Object.entries(values)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
    t.after(() => {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete globalThis[key];
      }
    });
  }
}

export function createWindow({ onAdvance = () => {} } = {}) {
  const window = new EventTarget();
  const timers = new Map();
  let now = 0;
  let nextTimer = 0;
  function schedule(callback, delay, repeat) {
    const id = ++nextTimer;
    const interval = Math.max(1, Number(delay) || 0);
    timers.set(id, { callback, due: now + interval, interval, repeat });
    return id;
  }
  window.setTimeout = (callback, delay) => schedule(callback, delay, false);
  window.setInterval = (callback, delay) => schedule(callback, delay, true);
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  window.advanceTime = (milliseconds) => {
    const target = now + milliseconds;
    while (timers.size) {
      const [id, timer] = [...timers].sort((a, b) => a[1].due - b[1].due)[0];
      if (timer.due > target) break;
      now = timer.due;
      onAdvance(now);
      if (timer.repeat) timer.due += timer.interval;
      else timers.delete(id);
      timer.callback();
    }
    now = target;
    onAdvance(now);
  };
  Object.defineProperty(window, "pendingTimerCount", {
    get: () => timers.size,
  });
  return window;
}

export function createAudioContext() {
  const sources = [];
  const nodes = [];
  const ended = [];
  let bufferCount = 0;
  function parameter() {
    const param = { value: 0, events: [] };
    for (const method of [
      "setValueAtTime",
      "linearRampToValueAtTime",
      "exponentialRampToValueAtTime",
      "setTargetAtTime",
      "cancelScheduledValues",
    ]) {
      param[method] = (...args) => param.events.push({ method, args });
    }
    return param;
  }
  function node() {
    const result = {
      gain: parameter(),
      frequency: parameter(),
      detune: parameter(),
      Q: parameter(),
      connect() {},
      disconnect() {},
    };
    nodes.push(result);
    return result;
  }
  function createSource() {
    const source = Object.assign(new EventTarget(), node(), {
      startTime: null,
      stopTime: null,
      ended: false,
      start(time = context.currentTime) {
        this.startTime = time;
        this.scheduledAt = context.currentTime;
      },
      stop(time = context.currentTime) {
        this.stopTime = time;
        queueEndedSources();
      },
    });
    sources.push(source);
    return source;
  }

  function queueEndedSources() {
    for (const source of sources) {
      if (
        !source.ended &&
        source.stopTime !== null &&
        source.stopTime <= context.currentTime
      ) {
        source.ended = true;
        ended.push(() => source.dispatchEvent(new Event("ended")));
      }
    }
  }

  const context = Object.defineProperties(
    new EventTarget(),
    Object.getOwnPropertyDescriptors({
      state: "running",
      allowResume: false,
      resume() {
        if (!this.allowResume) {
          return Promise.reject(new Error("User interaction required"));
        }
        this.state = "running";
        this.dispatchEvent(new Event("statechange"));
        return Promise.resolve();
      },
      suspend() {
        this.state = "suspended";
        this.dispatchEvent(new Event("statechange"));
        return Promise.resolve();
      },
      sampleRate: 100,
      currentTime: 0,
      destination: {},
      createGain: node,
      createBiquadFilter: node,
      createBuffer(_channels, length) {
        bufferCount += 1;
        return { getChannelData: () => new Float32Array(length) };
      },
      createBufferSource: createSource,
      createOscillator: createSource,
      get activeSources() {
        return sources.filter(
          (source) =>
            source.startTime !== null &&
            source.startTime <= this.currentTime &&
            (source.stopTime === null || source.stopTime > this.currentTime),
        );
      },
      sources,
      nodes,
      get bufferCount() {
        return bufferCount;
      },
      finishStoppedSources() {
        for (const finish of ended.splice(0)) {
          finish();
        }
      },
      advanceTime(seconds) {
        this.currentTime = seconds;
        queueEndedSources();
      },
    }),
  );
  return context;
}
