export function createSoundManager(enginesByKey) {
  const entries = Object.entries(enginesByKey);

  function setGlobalVolume(volume) {
    for (const [, engine] of entries) {
      engine.setVolume(volume);
    }
  }

  function sync(state, canStart = true) {
    for (const [stateKey, engine] of entries) {
      if (state[stateKey]) {
        if (canStart) {
          engine.start();
        }
      } else {
        engine.stop();
      }
    }
  }

  function hasEnabledSounds(state) {
    return entries.some(([stateKey]) => state[stateKey]);
  }

  function stopAll() {
    for (const [, engine] of entries) {
      engine.stop();
    }
  }

  return {
    setGlobalVolume,
    sync,
    hasEnabledSounds,
    stopAll,
  };
}
