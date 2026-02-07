export function createSoundManager(enginesByKey) {
  const entries = Object.entries(enginesByKey);

  function setGlobalVolume(volume) {
    for (const [, engine] of entries) {
      engine.setVolume(volume);
    }
  }

  function sync(state) {
    for (const [stateKey, engine] of entries) {
      if (state[stateKey]) {
        engine.start();
      } else {
        engine.stop();
      }
    }
  }

  function stopAll() {
    for (const [, engine] of entries) {
      engine.stop();
    }
  }

  return {
    setGlobalVolume,
    sync,
    stopAll,
  };
}
