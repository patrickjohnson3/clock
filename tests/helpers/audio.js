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

export function createWindow() {
  const window = new EventTarget();
  let nextTimer = 0;
  window.setTimeout = window.setInterval = () => ++nextTimer;
  window.clearTimeout = window.clearInterval = () => {};
  return window;
}

export function createAudioContext() {
  const sources = [];
  const ended = [];
  let bufferCount = 0;
  const parameter = () => ({ value: 0, setTargetAtTime() {} });
  const node = () => ({
    gain: parameter(),
    frequency: parameter(),
    detune: parameter(),
    Q: parameter(),
    connect() {},
    disconnect() {},
  });
  function createSource() {
    const source = Object.assign(new EventTarget(), node(), {
      active: false,
      start() {
        this.active = true;
      },
      stop() {
        this.active = false;
        ended.push(() => this.dispatchEvent(new Event("ended")));
      },
    });
    sources.push(source);
    return source;
  }

  return Object.defineProperties(
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
        return sources.filter((source) => source.active);
      },
      get bufferCount() {
        return bufferCount;
      },
      finishStoppedSources() {
        for (const finish of ended.splice(0)) {
          finish();
        }
      },
    }),
  );
}
