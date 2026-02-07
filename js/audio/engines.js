function clampVolume(value) {
  return Math.max(0, Math.min(1, value));
}

export function createBrownNoiseEngine(config) {
  let audioContext = null;
  let gainNode = null;
  let sourceNode = null;
  let volume = 1;

  function ensureContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    gainNode = audioContext.createGain();
    gainNode.gain.value = config.baseVolume * volume;
    gainNode.connect(audioContext.destination);

    return audioContext;
  }

  function createBuffer(context) {
    const length = Math.floor(context.sampleRate * config.bufferSeconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let lastOut = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + config.drift * white) / config.damping;
      channel[i] = lastOut * config.boost;
    }

    return buffer;
  }

  function start() {
    const context = ensureContext();
    if (!context || sourceNode) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    sourceNode = context.createBufferSource();
    sourceNode.buffer = createBuffer(context);
    sourceNode.loop = true;
    sourceNode.connect(gainNode);
    sourceNode.start();
    sourceNode.addEventListener("ended", () => {
      sourceNode = null;
    });
  }

  function stop() {
    if (!sourceNode) {
      return;
    }
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
  }

  function setVolume(nextVolume) {
    volume = clampVolume(nextVolume);
    if (gainNode) {
      gainNode.gain.value = config.baseVolume * volume;
    }
  }

  return { start, stop, setVolume };
}

export function createPinkNoiseEngine(config) {
  let audioContext = null;
  let gainNode = null;
  let sourceNode = null;
  let volume = 1;

  function ensureContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    gainNode = audioContext.createGain();
    gainNode.gain.value = config.baseVolume * volume;
    gainNode.connect(audioContext.destination);

    return audioContext;
  }

  function createBuffer(context) {
    const length = Math.floor(context.sampleRate * config.bufferSeconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      channel[i] = pink * config.gain;
    }

    return buffer;
  }

  function start() {
    const context = ensureContext();
    if (!context || sourceNode) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const highShelf = context.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = config.shelfFrequency;
    highShelf.gain.value = config.shelfGain;

    sourceNode = context.createBufferSource();
    sourceNode.buffer = createBuffer(context);
    sourceNode.loop = true;
    sourceNode.connect(highShelf);
    highShelf.connect(gainNode);
    sourceNode.start();
    sourceNode.addEventListener("ended", () => {
      sourceNode = null;
    });
  }

  function stop() {
    if (!sourceNode) {
      return;
    }
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
  }

  function setVolume(nextVolume) {
    volume = clampVolume(nextVolume);
    if (gainNode) {
      gainNode.gain.value = config.baseVolume * volume;
    }
  }

  return { start, stop, setVolume };
}

export function createRainStormEngine(config) {
  let audioContext = null;
  let masterGain = null;
  let bodyGain = null;
  let textureGain = null;
  let bodySource = null;
  let textureSource = null;
  let variationTimerId = null;
  let volume = 1;

  function ensureContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = config.baseVolume * volume;
    masterGain.connect(audioContext.destination);

    bodyGain = audioContext.createGain();
    bodyGain.gain.value = config.bodyGain;
    bodyGain.connect(masterGain);

    textureGain = audioContext.createGain();
    textureGain.gain.value = config.textureGain;
    textureGain.connect(masterGain);

    return audioContext;
  }

  function createPinkishBuffer(context, seconds) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      channel[i] = pink * 0.11;
    }

    return buffer;
  }

  function createTextureBuffer(context, seconds) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let envelope = 0;
    let stepsUntilNextEnvelope = 0;

    for (let i = 0; i < length; i += 1) {
      if (stepsUntilNextEnvelope <= 0) {
        envelope = 0.04 + Math.random() * 0.2;
        stepsUntilNextEnvelope = Math.floor(
          context.sampleRate * (0.04 + Math.random() * 0.18),
        );
      }

      const white = Math.random() * 2 - 1;
      channel[i] = white * envelope * 0.28;
      stepsUntilNextEnvelope -= 1;
    }

    return buffer;
  }

  function startVariation() {
    if (!audioContext || !bodyGain || !textureGain) {
      return;
    }

    if (variationTimerId !== null) {
      window.clearTimeout(variationTimerId);
    }

    const schedule = () => {
      if (!audioContext || !bodyGain || !textureGain) {
        return;
      }

      const now = audioContext.currentTime;
      const nextBody = 0.8 + Math.random() * 0.35;
      const nextTexture = 0.08 + Math.random() * 0.16;
      bodyGain.gain.setTargetAtTime(nextBody, now, 0.4);
      textureGain.gain.setTargetAtTime(nextTexture, now, 0.2);
      variationTimerId = window.setTimeout(
        schedule,
        600 + Math.random() * 1300,
      );
    };

    schedule();
  }

  function stopVariation() {
    if (variationTimerId !== null) {
      window.clearTimeout(variationTimerId);
      variationTimerId = null;
    }
  }

  function start() {
    const context = ensureContext();
    if (!context || bodySource || textureSource) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const bodyFilter = context.createBiquadFilter();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = config.bodyLowpassFrequency;
    bodyFilter.Q.value = config.bodyLowpassQ;

    const roofFilter = context.createBiquadFilter();
    roofFilter.type = "bandpass";
    roofFilter.frequency.value = config.roofBandpassFrequency;
    roofFilter.Q.value = config.roofBandpassQ;

    bodySource = context.createBufferSource();
    bodySource.buffer = createPinkishBuffer(context, 5);
    bodySource.loop = true;
    bodySource.connect(bodyFilter);
    bodyFilter.connect(bodyGain);

    textureSource = context.createBufferSource();
    textureSource.buffer = createTextureBuffer(context, 4);
    textureSource.loop = true;
    textureSource.connect(roofFilter);
    roofFilter.connect(textureGain);

    bodySource.start();
    textureSource.start();
    startVariation();

    bodySource.addEventListener("ended", () => {
      bodySource = null;
    });
    textureSource.addEventListener("ended", () => {
      textureSource = null;
    });
  }

  function stop() {
    stopVariation();

    if (bodySource) {
      bodySource.stop();
      bodySource.disconnect();
      bodySource = null;
    }

    if (textureSource) {
      textureSource.stop();
      textureSource.disconnect();
      textureSource = null;
    }
  }

  function setVolume(nextVolume) {
    volume = clampVolume(nextVolume);
    if (masterGain) {
      masterGain.gain.value = config.baseVolume * volume;
    }
  }

  return { start, stop, setVolume };
}

export function createAircraftCabinEngine(config) {
  let audioContext = null;
  let masterGain = null;
  let bodyGain = null;
  let hissGain = null;
  let rumbleGain = null;
  let bodySource = null;
  let hissSource = null;
  let rumbleSource = null;
  let movementTimerId = null;
  let volume = 1;

  function ensureContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = config.baseVolume * volume;
    masterGain.connect(audioContext.destination);

    bodyGain = audioContext.createGain();
    bodyGain.gain.value = config.bodyGain;
    bodyGain.connect(masterGain);

    hissGain = audioContext.createGain();
    hissGain.gain.value = config.hissGain;
    hissGain.connect(masterGain);

    rumbleGain = audioContext.createGain();
    rumbleGain.gain.value = 0;
    rumbleGain.connect(masterGain);

    return audioContext;
  }

  function createBrownishBuffer(context, seconds) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let lastOut = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.018 * white) / 1.018;
      channel[i] = lastOut * 3.1;
    }

    return buffer;
  }

  function createHissBuffer(context, seconds) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      channel[i] = white * 0.12;
    }

    return buffer;
  }

  function startMovement() {
    if (!audioContext || !bodyGain || !hissGain || !rumbleGain) {
      return;
    }

    if (movementTimerId !== null) {
      window.clearTimeout(movementTimerId);
    }

    const schedule = () => {
      if (!audioContext || !bodyGain || !hissGain || !rumbleGain) {
        return;
      }

      const now = audioContext.currentTime;
      const bodyTarget = 0.65 + Math.random() * 0.22;
      const hissTarget = 0.05 + Math.random() * 0.09;
      const turbulenceChance = Math.random();
      const rumbleTarget =
        turbulenceChance < 0.24 ? 0.09 + Math.random() * 0.1 : 0;

      bodyGain.gain.setTargetAtTime(bodyTarget, now, 0.9);
      hissGain.gain.setTargetAtTime(hissTarget, now, 0.6);
      rumbleGain.gain.setTargetAtTime(
        rumbleTarget,
        now,
        turbulenceChance < 0.24 ? 0.18 : 0.9,
      );

      movementTimerId = window.setTimeout(schedule, 900 + Math.random() * 2600);
    };

    schedule();
  }

  function stopMovement() {
    if (movementTimerId !== null) {
      window.clearTimeout(movementTimerId);
      movementTimerId = null;
    }
  }

  function start() {
    const context = ensureContext();
    if (!context || bodySource || hissSource || rumbleSource) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const bodyFilter = context.createBiquadFilter();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = config.bodyLowpassFrequency;
    bodyFilter.Q.value = config.bodyLowpassQ;

    const hissFilter = context.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = config.hissBandpassFrequency;
    hissFilter.Q.value = config.hissBandpassQ;

    const rumbleFilter = context.createBiquadFilter();
    rumbleFilter.type = "bandpass";
    rumbleFilter.frequency.value = config.rumbleBandpassFrequency;
    rumbleFilter.Q.value = config.rumbleBandpassQ;

    bodySource = context.createBufferSource();
    bodySource.buffer = createBrownishBuffer(context, 6);
    bodySource.loop = true;
    bodySource.connect(bodyFilter);
    bodyFilter.connect(bodyGain);

    hissSource = context.createBufferSource();
    hissSource.buffer = createHissBuffer(context, 5);
    hissSource.loop = true;
    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);

    rumbleSource = context.createBufferSource();
    rumbleSource.buffer = createBrownishBuffer(context, 4);
    rumbleSource.loop = true;
    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);

    bodySource.start();
    hissSource.start();
    rumbleSource.start();
    startMovement();

    bodySource.addEventListener("ended", () => {
      bodySource = null;
    });
    hissSource.addEventListener("ended", () => {
      hissSource = null;
    });
    rumbleSource.addEventListener("ended", () => {
      rumbleSource = null;
    });
  }

  function stop() {
    stopMovement();

    if (bodySource) {
      bodySource.stop();
      bodySource.disconnect();
      bodySource = null;
    }
    if (hissSource) {
      hissSource.stop();
      hissSource.disconnect();
      hissSource = null;
    }
    if (rumbleSource) {
      rumbleSource.stop();
      rumbleSource.disconnect();
      rumbleSource = null;
    }
  }

  function setVolume(nextVolume) {
    volume = clampVolume(nextVolume);
    if (masterGain) {
      masterGain.gain.value = config.baseVolume * volume;
    }
  }

  return { start, stop, setVolume };
}

export function createDubTechnoEngine(config) {
  let audioContext = null;
  let masterGain = null;
  let duckGain = null;
  let padGain = null;
  let hatGain = null;
  let padFilter = null;
  let lfo = null;
  let lfoDepth = null;
  let padOscA = null;
  let padOscB = null;
  let noiseBuffer = null;
  let schedulerId = null;
  let nextStepTime = 0;
  let stepIndex = 0;
  let volume = 1;

  function ensureContext() {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();

    masterGain = audioContext.createGain();
    masterGain.gain.value = config.baseVolume * volume;
    masterGain.connect(audioContext.destination);

    duckGain = audioContext.createGain();
    duckGain.gain.value = 1;
    duckGain.connect(masterGain);

    padGain = audioContext.createGain();
    padGain.gain.value = config.padGain;
    padGain.connect(duckGain);

    hatGain = audioContext.createGain();
    hatGain.gain.value = config.hatGain;
    hatGain.connect(duckGain);

    padFilter = audioContext.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = config.padLowpassFrequency;
    padFilter.Q.value = config.padLowpassQ;
    padFilter.connect(padGain);

    lfoDepth = audioContext.createGain();
    lfoDepth.gain.value = config.lfoDepth;
    lfoDepth.connect(padFilter.frequency);

    lfo = audioContext.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = config.lfoFrequency;
    lfo.connect(lfoDepth);
    lfo.start();

    const length = Math.floor(audioContext.sampleRate * 2);
    noiseBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }

    return audioContext;
  }

  function createPadOsc(frequency, detune) {
    const osc = audioContext.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    osc.connect(padFilter);
    osc.start();
    return osc;
  }

  function scheduleKick(time) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const kickFilter = audioContext.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(90, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.2);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.42, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

    kickFilter.type = "lowpass";
    kickFilter.frequency.value = 220;
    kickFilter.Q.value = 0.5;

    osc.connect(kickFilter);
    kickFilter.connect(gain);
    gain.connect(duckGain);

    osc.start(time);
    osc.stop(time + 0.28);

    duckGain.gain.cancelScheduledValues(time);
    duckGain.gain.setValueAtTime(duckGain.gain.value, time);
    duckGain.gain.setTargetAtTime(0.62, time, 0.015);
    duckGain.gain.setTargetAtTime(1, time + 0.18, 0.2);
  }

  function scheduleHat(time) {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const brightness = 2500 + Math.random() * 2200;

    source.buffer = noiseBuffer;

    filter.type = "bandpass";
    filter.frequency.value = brightness;
    filter.Q.value = 0.9;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.06, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(hatGain);

    source.start(time);
    source.stop(time + 0.14);
  }

  function schedule() {
    if (!audioContext) {
      return;
    }

    const stepDuration = 60 / config.bpm / 2;
    while (nextStepTime < audioContext.currentTime + config.scheduleAheadTime) {
      if (stepIndex % 2 === 0) {
        scheduleKick(nextStepTime);
      }
      if (stepIndex % 2 === 1 || Math.random() < 0.16) {
        scheduleHat(nextStepTime);
      }
      stepIndex += 1;
      nextStepTime += stepDuration;
    }
  }

  function start() {
    const context = ensureContext();
    if (!context || schedulerId !== null) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    if (!padOscA) {
      padOscA = createPadOsc(82.41, -6);
    }
    if (!padOscB) {
      padOscB = createPadOsc(123.47, 5);
    }

    stepIndex = 0;
    nextStepTime = context.currentTime + 0.05;
    schedulerId = window.setInterval(schedule, config.lookaheadMs);
  }

  function stop() {
    if (schedulerId !== null) {
      window.clearInterval(schedulerId);
      schedulerId = null;
    }

    if (padOscA) {
      padOscA.stop();
      padOscA.disconnect();
      padOscA = null;
    }
    if (padOscB) {
      padOscB.stop();
      padOscB.disconnect();
      padOscB = null;
    }
  }

  function setVolume(nextVolume) {
    volume = clampVolume(nextVolume);
    if (masterGain) {
      masterGain.gain.value = config.baseVolume * volume;
    }
  }

  return { start, stop, setVolume };
}
