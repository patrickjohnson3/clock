(() => {
  const chars = 'アァイゥエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const storageKey = 'matrixClockSettings';
  const storageEnabledKey = 'matrixClockStorageEnabled';
  const systemFont = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

  const defaults = {
    glitch: false,
    glyph: false,
    hour24: false,
    showAmPm: false,
    matrix: false,
    glow: false,
    neon: false,
    brownNoise: false,
    pinkNoise: false,
    rainStorm: false,
    aircraftCabin: false,
    dubTechno: false,
    soundVolume: 100,
    lightMode: false,
    matrixMode: false,
    font: systemFont,
    persistStorage: true
  };

  const ui = (() => {
    const refs = {
      canvas: document.getElementById('matrix'),
      clock: document.getElementById('clock'),
      controls: document.getElementById('controls'),
      collapseBtn: document.getElementById('collapseBtn'),
      panelTab: document.getElementById('panelTab'),
      toggles: {
        glitch: document.getElementById('glitchToggle'),
        glyph: document.getElementById('glyphToggle'),
        hour24: document.getElementById('hour24Toggle'),
        showAmPm: document.getElementById('showAmPmToggle'),
        matrix: document.getElementById('matrixToggle'),
        glow: document.getElementById('glowToggle'),
        neon: document.getElementById('neonToggle'),
        brownNoise: document.getElementById('brownNoiseToggle'),
        pinkNoise: document.getElementById('pinkNoiseToggle'),
        rainStorm: document.getElementById('rainStormToggle'),
        aircraftCabin: document.getElementById('aircraftCabinToggle'),
        dubTechno: document.getElementById('dubTechnoToggle'),
        persistStorage: document.getElementById('storageToggle')
      },
      fontSelect: document.getElementById('fontSelect'),
      modeSelect: document.getElementById('modeSelect'),
      soundVolumeSlider: document.getElementById('soundVolumeSlider')
    };

    function bindToggle(toggleEl, onChange) {
      toggleEl.addEventListener('change', (event) => {
        onChange(event.target.checked);
      });
    }

    function bindSelect(selectEl, onChange) {
      selectEl.addEventListener('change', (event) => {
        onChange(event.target.value);
      });
    }

    function bindRange(rangeEl, onChange) {
      rangeEl.addEventListener('input', (event) => {
        onChange(event.target.value);
      });
    }

    function setControlsFromState(state) {
      refs.toggles.glitch.checked = state.glitch;
      refs.toggles.glyph.checked = state.glyph;
      refs.toggles.hour24.checked = state.hour24;
      refs.toggles.showAmPm.checked = state.showAmPm;
      refs.toggles.matrix.checked = state.matrix;
      refs.toggles.glow.checked = state.glow;
      refs.toggles.neon.checked = state.neon;
      refs.toggles.brownNoise.checked = state.brownNoise;
      refs.toggles.pinkNoise.checked = state.pinkNoise;
      refs.toggles.rainStorm.checked = state.rainStorm;
      refs.toggles.aircraftCabin.checked = state.aircraftCabin;
      refs.toggles.dubTechno.checked = state.dubTechno;
      refs.toggles.persistStorage.checked = state.persistStorage;
      refs.soundVolumeSlider.value = String(state.soundVolume);

      refs.fontSelect.value = state.font;
      if (refs.fontSelect.value !== state.font) {
        refs.fontSelect.value = defaults.font;
      }

      refs.modeSelect.value = state.matrixMode ? 'matrix' : (state.lightMode ? 'light' : 'dark');
    }

    function bindCollapse() {
      function setCollapsed(collapsed) {
        refs.controls.classList.toggle('collapsed', collapsed);
      }

      refs.collapseBtn.addEventListener('click', () => {
        setCollapsed(true);
      });

      refs.panelTab.addEventListener('click', () => {
        setCollapsed(false);
      });
    }

    return {
      refs,
      bindToggle,
      bindSelect,
      bindRange,
      setControlsFromState,
      bindCollapse
    };
  })();

  const settings = (() => {
    function loadStoragePreference() {
      try {
        const saved = JSON.parse(localStorage.getItem(storageEnabledKey));
        return typeof saved === 'boolean' ? saved : defaults.persistStorage;
      } catch {
        return defaults.persistStorage;
      }
    }

    function load() {
      const persistStorage = loadStoragePreference();
      if (!persistStorage) {
        return {
          ...defaults,
          persistStorage
        };
      }

      let saved = {};
      try {
        saved = JSON.parse(localStorage.getItem(storageKey)) || {};
      } catch {
        saved = {};
      }

      return {
        glitch: typeof saved.glitch === 'boolean' ? saved.glitch : defaults.glitch,
        glyph: typeof saved.glyph === 'boolean' ? saved.glyph : defaults.glyph,
        hour24: typeof saved.hour24 === 'boolean'
          ? saved.hour24
          : (typeof saved.hour12 === 'boolean' ? !saved.hour12 : defaults.hour24),
        showAmPm: typeof saved.showAmPm === 'boolean'
          ? saved.showAmPm
          : (typeof saved.hideAmPm === 'boolean' ? !saved.hideAmPm : defaults.showAmPm),
        matrix: typeof saved.matrix === 'boolean' ? saved.matrix : defaults.matrix,
        glow: typeof saved.glow === 'boolean' ? saved.glow : defaults.glow,
        neon: typeof saved.neon === 'boolean' ? saved.neon : defaults.neon,
        brownNoise: typeof saved.brownNoise === 'boolean' ? saved.brownNoise : defaults.brownNoise,
        pinkNoise: typeof saved.pinkNoise === 'boolean' ? saved.pinkNoise : defaults.pinkNoise,
        rainStorm: typeof saved.rainStorm === 'boolean' ? saved.rainStorm : defaults.rainStorm,
        aircraftCabin: typeof saved.aircraftCabin === 'boolean' ? saved.aircraftCabin : defaults.aircraftCabin,
        dubTechno: typeof saved.dubTechno === 'boolean' ? saved.dubTechno : defaults.dubTechno,
        soundVolume: Number.isFinite(saved.soundVolume)
          ? Math.max(0, Math.min(100, saved.soundVolume))
          : defaults.soundVolume,
        lightMode: typeof saved.lightMode === 'boolean' ? saved.lightMode : defaults.lightMode,
        matrixMode: typeof saved.matrixMode === 'boolean' ? saved.matrixMode : defaults.matrixMode,
        font: typeof saved.font === 'string' ? saved.font : defaults.font,
        persistStorage
      };
    }

    function save(state) {
      try {
        localStorage.setItem(storageEnabledKey, JSON.stringify(state.persistStorage));

        if (!state.persistStorage) {
          localStorage.removeItem(storageKey);
          return;
        }

        const { persistStorage, ...persistedState } = state;
        localStorage.setItem(storageKey, JSON.stringify(persistedState));
      } catch {
        // Ignore storage failures.
      }
    }

    return { load, save };
  })();

  const matrix = (() => {
    const canvas = ui.refs.canvas;
    const ctx = canvas.getContext('2d');
    const fontSize = 16;

    let columns = 0;
    let drops = [];
    let timerId = null;

    function rebuildDrops() {
      const previous = drops;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, (_, index) => previous[index] || 1);
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      rebuildDrops();
    }

    function clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function draw() {
      const matrixTrail = getComputedStyle(document.body).getPropertyValue('--matrix-trail').trim() || 'rgba(0, 0, 0, 0.05)';
      ctx.fillStyle = matrixTrail;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fg = getComputedStyle(document.body).getPropertyValue('--fg').trim() || '#fff';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i += 1) {
        const alpha = 0.3 + Math.random() * 0.7;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fg;
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        ctx.restore();

        if (drops[i] * fontSize > canvas.height || Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 1;
      }
    }

    function start() {
      if (timerId !== null) {
        return;
      }
      timerId = window.setInterval(draw, 50);
    }

    function stop() {
      if (timerId === null) {
        return;
      }
      window.clearInterval(timerId);
      timerId = null;
    }

    return {
      resize,
      clear,
      start,
      stop
    };
  })();

  const clock = (() => {
    const container = ui.refs.clock;
    const spans = [];

    function formatTime(now, state) {
      const format = new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: !state.hour24
      });

      if (state.showAmPm) {
        return format.format(now);
      }

      const parts = format.formatToParts(now);
      return parts
        .filter((part) => part.type !== 'dayPeriod')
        .map((part) => part.value)
        .join('')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    function applyDigitEffects(span, char, state) {
      span.classList.remove('glyph-swap', 'glitch');
      span.removeAttribute('data-glyph');

      if (char === ':') {
        return;
      }

      if (state.glyph && Math.random() < 0.2) {
        span.classList.add('glyph-swap');
        span.setAttribute('data-glyph', chars[Math.floor(Math.random() * chars.length)]);
      }

      if (state.glitch && Math.random() < 0.15) {
        span.classList.add('glitch');
      }
    }

    function ensureSpan(index) {
      if (spans[index]) {
        return spans[index];
      }

      const span = document.createElement('span');
      span.className = 'digit';
      span.addEventListener('mouseenter', () => {
        if (span.dataset.glitchEnabled === 'true') {
          span.classList.add('glitch');
          window.setTimeout(() => span.classList.remove('glitch'), 300);
        }
      });
      spans[index] = span;
      container.appendChild(span);
      return span;
    }

    function trimSpans(keepLength) {
      while (spans.length > keepLength) {
        const span = spans.pop();
        span.remove();
      }
    }

    function render(state) {
      const time = formatTime(new Date(), state);

      for (let i = 0; i < time.length; i += 1) {
        const char = time[i];
        const span = ensureSpan(i);

        if (span.textContent !== char) {
          span.textContent = char;
        }

        span.dataset.glitchEnabled = state.glitch ? 'true' : 'false';
        applyDigitEffects(span, char, state);
      }

      trimSpans(time.length);
    }

    return {
      render,
      formatTime
    };
  })();

  const brownNoise = (() => {
    let audioContext = null;
    let gainNode = null;
    let sourceNode = null;
    const baseVolume = 0.18;
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
      gainNode.gain.value = baseVolume * volume;
      gainNode.connect(audioContext.destination);

      return audioContext;
    }

    function createBuffer(context) {
      const length = Math.floor(context.sampleRate * 2);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      let lastOut = 0;

      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        channel[i] = lastOut * 3.5;
      }

      return buffer;
    }

    function start() {
      const context = ensureContext();
      if (!context || sourceNode) {
        return;
      }

      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      sourceNode = context.createBufferSource();
      sourceNode.buffer = createBuffer(context);
      sourceNode.loop = true;
      sourceNode.connect(gainNode);
      sourceNode.start();
      sourceNode.addEventListener('ended', () => {
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
      volume = Math.max(0, Math.min(1, nextVolume));
      if (gainNode) {
        gainNode.gain.value = baseVolume * volume;
      }
    }

    return { start, stop, setVolume };
  })();

  const pinkNoise = (() => {
    let audioContext = null;
    let gainNode = null;
    let sourceNode = null;
    const baseVolume = 0.13;
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
      gainNode.gain.value = baseVolume * volume;
      gainNode.connect(audioContext.destination);

      return audioContext;
    }

    function createBuffer(context) {
      const length = Math.floor(context.sampleRate * 3);
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
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        channel[i] = pink * 0.12;
      }

      return buffer;
    }

    function start() {
      const context = ensureContext();
      if (!context || sourceNode) {
        return;
      }

      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      const highShelf = context.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 1900;
      highShelf.gain.value = 2.8;

      sourceNode = context.createBufferSource();
      sourceNode.buffer = createBuffer(context);
      sourceNode.loop = true;
      sourceNode.connect(highShelf);
      highShelf.connect(gainNode);
      sourceNode.start();
      sourceNode.addEventListener('ended', () => {
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
      volume = Math.max(0, Math.min(1, nextVolume));
      if (gainNode) {
        gainNode.gain.value = baseVolume * volume;
      }
    }

    return { start, stop, setVolume };
  })();

  const rainStorm = (() => {
    let audioContext = null;
    let masterGain = null;
    let bodyGain = null;
    let textureGain = null;
    let bodySource = null;
    let textureSource = null;
    let variationTimerId = null;
    const baseVolume = 0.14;
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
      masterGain.gain.value = baseVolume * volume;
      masterGain.connect(audioContext.destination);

      bodyGain = audioContext.createGain();
      bodyGain.gain.value = 0.9;
      bodyGain.connect(masterGain);

      textureGain = audioContext.createGain();
      textureGain.gain.value = 0.12;
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
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
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
          stepsUntilNextEnvelope = Math.floor(context.sampleRate * (0.04 + Math.random() * 0.18));
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
        variationTimerId = window.setTimeout(schedule, 600 + Math.random() * 1300);
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

      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      const bodyFilter = context.createBiquadFilter();
      bodyFilter.type = 'lowpass';
      bodyFilter.frequency.value = 2800;
      bodyFilter.Q.value = 0.3;

      const roofFilter = context.createBiquadFilter();
      roofFilter.type = 'bandpass';
      roofFilter.frequency.value = 3600;
      roofFilter.Q.value = 0.8;

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

      bodySource.addEventListener('ended', () => {
        bodySource = null;
      });
      textureSource.addEventListener('ended', () => {
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
      volume = Math.max(0, Math.min(1, nextVolume));
      if (masterGain) {
        masterGain.gain.value = baseVolume * volume;
      }
    }

    return { start, stop, setVolume };
  })();

  const aircraftCabin = (() => {
    let audioContext = null;
    let masterGain = null;
    let bodyGain = null;
    let hissGain = null;
    let rumbleGain = null;
    let bodySource = null;
    let hissSource = null;
    let rumbleSource = null;
    let movementTimerId = null;
    const baseVolume = 0.13;
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
      masterGain.gain.value = baseVolume * volume;
      masterGain.connect(audioContext.destination);

      bodyGain = audioContext.createGain();
      bodyGain.gain.value = 0.75;
      bodyGain.connect(masterGain);

      hissGain = audioContext.createGain();
      hissGain.gain.value = 0.08;
      hissGain.connect(masterGain);

      rumbleGain = audioContext.createGain();
      rumbleGain.gain.value = 0.0;
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
        const rumbleTarget = turbulenceChance < 0.24 ? 0.09 + Math.random() * 0.1 : 0.0;

        bodyGain.gain.setTargetAtTime(bodyTarget, now, 0.9);
        hissGain.gain.setTargetAtTime(hissTarget, now, 0.6);
        rumbleGain.gain.setTargetAtTime(rumbleTarget, now, turbulenceChance < 0.24 ? 0.18 : 0.9);

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

      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      const bodyFilter = context.createBiquadFilter();
      bodyFilter.type = 'lowpass';
      bodyFilter.frequency.value = 1600;
      bodyFilter.Q.value = 0.45;

      const hissFilter = context.createBiquadFilter();
      hissFilter.type = 'bandpass';
      hissFilter.frequency.value = 3400;
      hissFilter.Q.value = 1.2;

      const rumbleFilter = context.createBiquadFilter();
      rumbleFilter.type = 'bandpass';
      rumbleFilter.frequency.value = 120;
      rumbleFilter.Q.value = 0.9;

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

      bodySource.addEventListener('ended', () => {
        bodySource = null;
      });
      hissSource.addEventListener('ended', () => {
        hissSource = null;
      });
      rumbleSource.addEventListener('ended', () => {
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
      volume = Math.max(0, Math.min(1, nextVolume));
      if (masterGain) {
        masterGain.gain.value = baseVolume * volume;
      }
    }

    return { start, stop, setVolume };
  })();

  const dubTechno = (() => {
    const bpm = 108;
    const scheduleAheadTime = 0.2;
    const lookaheadMs = 50;
    const baseVolume = 0.11;

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
      masterGain.gain.value = baseVolume * volume;
      masterGain.connect(audioContext.destination);

      duckGain = audioContext.createGain();
      duckGain.gain.value = 1;
      duckGain.connect(masterGain);

      padGain = audioContext.createGain();
      padGain.gain.value = 0.17;
      padGain.connect(duckGain);

      hatGain = audioContext.createGain();
      hatGain.gain.value = 0.085;
      hatGain.connect(duckGain);

      padFilter = audioContext.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 900;
      padFilter.Q.value = 0.4;
      padFilter.connect(padGain);

      lfoDepth = audioContext.createGain();
      lfoDepth.gain.value = 120;
      lfoDepth.connect(padFilter.frequency);

      lfo = audioContext.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.045;
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
      osc.type = 'sawtooth';
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

      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, time);
      osc.frequency.exponentialRampToValueAtTime(46, time + 0.2);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.42, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

      kickFilter.type = 'lowpass';
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

      filter.type = 'bandpass';
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

      const stepDuration = (60 / bpm) / 2;
      while (nextStepTime < audioContext.currentTime + scheduleAheadTime) {
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

      if (context.state === 'suspended') {
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
      schedulerId = window.setInterval(schedule, lookaheadMs);
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
      volume = Math.max(0, Math.min(1, nextVolume));
      if (masterGain) {
        masterGain.gain.value = baseVolume * volume;
      }
    }

    return { start, stop, setVolume };
  })();

  let state = settings.load();
  if (state.matrixMode && (!state.matrix || !state.neon)) {
    state = { ...state, matrix: true, neon: true };
    settings.save(state);
  }
  ui.setControlsFromState(state);

  function render() {
    const globalSoundVolume = Math.max(0, Math.min(1, state.soundVolume / 100));

    document.body.classList.toggle('light-mode', state.lightMode);
    document.body.classList.toggle('matrix-mode', state.matrixMode);
    document.body.classList.toggle('glow-on', state.glow);
    document.body.classList.toggle('neon-on', state.neon);
    document.body.style.fontFamily = state.font;

    if (state.matrix) {
      matrix.start();
    } else {
      matrix.stop();
      matrix.clear();
    }

    brownNoise.setVolume(globalSoundVolume);
    pinkNoise.setVolume(globalSoundVolume);
    rainStorm.setVolume(globalSoundVolume);
    aircraftCabin.setVolume(globalSoundVolume);
    dubTechno.setVolume(globalSoundVolume);

    if (state.brownNoise) {
      brownNoise.start();
    } else {
      brownNoise.stop();
    }

    if (state.pinkNoise) {
      pinkNoise.start();
    } else {
      pinkNoise.stop();
    }

    if (state.rainStorm) {
      rainStorm.start();
    } else {
      rainStorm.stop();
    }

    if (state.aircraftCabin) {
      aircraftCabin.start();
    } else {
      aircraftCabin.stop();
    }

    if (state.dubTechno) {
      dubTechno.start();
    } else {
      dubTechno.stop();
    }

    clock.render(state);
  }

  function updateState(partial) {
    state = { ...state, ...partial };
    render();
    settings.save(state);
  }

  ui.bindToggle(ui.refs.toggles.glitch, (checked) => updateState({ glitch: checked }));
  ui.bindToggle(ui.refs.toggles.glyph, (checked) => updateState({ glyph: checked }));
  ui.bindToggle(ui.refs.toggles.hour24, (checked) => updateState({ hour24: checked }));
  ui.bindToggle(ui.refs.toggles.showAmPm, (checked) => updateState({ showAmPm: checked }));
  ui.bindToggle(ui.refs.toggles.matrix, (checked) => updateState({ matrix: checked }));
  ui.bindToggle(ui.refs.toggles.glow, (checked) => updateState({ glow: checked }));
  ui.bindToggle(ui.refs.toggles.neon, (checked) => updateState({ neon: checked }));
  ui.bindToggle(ui.refs.toggles.brownNoise, (checked) => updateState({ brownNoise: checked }));
  ui.bindToggle(ui.refs.toggles.pinkNoise, (checked) => updateState({ pinkNoise: checked }));
  ui.bindToggle(ui.refs.toggles.rainStorm, (checked) => updateState({ rainStorm: checked }));
  ui.bindToggle(ui.refs.toggles.aircraftCabin, (checked) => updateState({ aircraftCabin: checked }));
  ui.bindToggle(ui.refs.toggles.dubTechno, (checked) => updateState({ dubTechno: checked }));
  ui.bindRange(ui.refs.soundVolumeSlider, (value) => updateState({ soundVolume: Number(value) }));
  ui.bindSelect(ui.refs.modeSelect, (mode) => updateState({
    lightMode: mode === 'light',
    matrixMode: mode === 'matrix',
    matrix: mode === 'matrix' ? true : state.matrix,
    neon: mode === 'matrix' ? true : state.neon
  }));
  ui.bindToggle(ui.refs.toggles.persistStorage, (checked) => updateState({ persistStorage: checked }));
  ui.bindSelect(ui.refs.fontSelect, (font) => updateState({ font }));
  ui.bindCollapse();

  matrix.resize();
  window.addEventListener('resize', () => {
    matrix.resize();
    if (!state.matrix) {
      matrix.clear();
    }
  });

  render();
  window.setInterval(() => clock.render(state), 1000);

  // Exported for easy console testing.
  window.matrixClock = {
    getState: () => ({ ...state }),
    formatTime: clock.formatTime
  };
})();
