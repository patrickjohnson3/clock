export const CHARS =
  "アァイゥエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const STORAGE_KEY = "matrixClockSettings";
export const STORAGE_ENABLED_KEY = "matrixClockStorageEnabled";

export const SYSTEM_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export const DEFAULTS = {
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
  font: SYSTEM_FONT,
  fullscreen: false,
  persistStorage: false,
};

export const TUNING = {
  matrix: {
    fontSize: 16,
    intervalMs: 50,
    resetChance: 0.975,
    alphaMin: 0.3,
    alphaRange: 0.7,
  },
  clock: {
    glyphChance: 0.2,
    glitchChance: 0.15,
    hoverGlitchMs: 300,
  },
  audio: {
    brownNoise: {
      baseVolume: 0.18,
      bufferSeconds: 2,
      drift: 0.02,
      damping: 1.02,
      boost: 3.5,
    },
    pinkNoise: {
      baseVolume: 0.13,
      bufferSeconds: 3,
      gain: 0.12,
      shelfFrequency: 1900,
      shelfGain: 2.8,
    },
    rainStorm: {
      baseVolume: 0.14,
      bodyGain: 0.9,
      textureGain: 0.12,
      bodyLowpassFrequency: 2800,
      bodyLowpassQ: 0.3,
      roofBandpassFrequency: 3600,
      roofBandpassQ: 0.8,
    },
    aircraftCabin: {
      baseVolume: 0.13,
      bodyGain: 0.75,
      hissGain: 0.08,
      bodyLowpassFrequency: 1600,
      bodyLowpassQ: 0.45,
      hissBandpassFrequency: 3400,
      hissBandpassQ: 1.2,
      rumbleBandpassFrequency: 120,
      rumbleBandpassQ: 0.9,
    },
    dubTechno: {
      baseVolume: 0.11,
      bpm: 108,
      scheduleAheadTime: 0.2,
      lookaheadMs: 50,
      padGain: 0.17,
      hatGain: 0.085,
      padLowpassFrequency: 900,
      padLowpassQ: 0.4,
      lfoFrequency: 0.045,
      lfoDepth: 120,
    },
  },
};
