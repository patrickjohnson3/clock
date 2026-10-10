export function clampSoundVolume(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function normalizeState(state) {
  const normalized = {
    ...state,
    leadingZero: Boolean(state.leadingZero),
    hideSeconds: Boolean(state.hideSeconds),
    clockScale: Number.isFinite(state.clockScale)
      ? Math.max(100, Math.min(200, state.clockScale))
      : 100,
    soundVolume: clampSoundVolume(state.soundVolume),
    wakeLock: Boolean(state.wakeLock),
  };

  // Display mode is exclusive and matrix mode enforces matrix visual pairing.
  if (normalized.matrixMode) {
    normalized.lightMode = false;
    normalized.matrix = true;
    normalized.neon = true;
  }

  if (normalized.lightMode) {
    normalized.matrixMode = false;
  }

  return normalized;
}
