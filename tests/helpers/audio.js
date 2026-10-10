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
  const parameter = () => ({ value: 0, setTargetAtTime() {} });
  const node = () => ({
    gain: parameter(),
    frequency: parameter(),
    Q: parameter(),
    connect() {},
    disconnect() {},
  });

  return {
    state: "running",
    allowResume: false,
    resume() {
      if (!this.allowResume) {
        return Promise.reject(new Error("User interaction required"));
      }
      this.state = "running";
      return Promise.resolve();
    },
    sampleRate: 100,
    currentTime: 0,
    destination: {},
    createGain: node,
    createBiquadFilter: node,
    createBuffer: (_channels, length) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource() {
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
    },
    get activeSources() {
      return sources.filter((source) => source.active);
    },
    finishStoppedSources() {
      for (const finish of ended.splice(0)) {
        finish();
      }
    },
  };
}
