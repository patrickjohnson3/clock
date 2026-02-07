export function createUI(defaults) {
  const refs = {
    canvas: document.getElementById("matrix"),
    clock: document.getElementById("clock"),
    controls: document.getElementById("controls"),
    collapseBtn: document.getElementById("collapseBtn"),
    panelTab: document.getElementById("panelTab"),
    toggles: {
      glitch: document.getElementById("glitchToggle"),
      glyph: document.getElementById("glyphToggle"),
      hour24: document.getElementById("hour24Toggle"),
      showAmPm: document.getElementById("showAmPmToggle"),
      matrix: document.getElementById("matrixToggle"),
      glow: document.getElementById("glowToggle"),
      neon: document.getElementById("neonToggle"),
      brownNoise: document.getElementById("brownNoiseToggle"),
      pinkNoise: document.getElementById("pinkNoiseToggle"),
      rainStorm: document.getElementById("rainStormToggle"),
      aircraftCabin: document.getElementById("aircraftCabinToggle"),
      dubTechno: document.getElementById("dubTechnoToggle"),
      persistStorage: document.getElementById("storageToggle"),
    },
    fontSelect: document.getElementById("fontSelect"),
    modeSelect: document.getElementById("modeSelect"),
    soundVolumeSlider: document.getElementById("soundVolumeSlider"),
  };

  function bindToggle(toggleEl, onChange) {
    toggleEl.addEventListener("change", (event) => {
      onChange(event.target.checked);
    });
  }

  function bindSelect(selectEl, onChange) {
    selectEl.addEventListener("change", (event) => {
      onChange(event.target.value);
    });
  }

  function bindRange(rangeEl, onChange) {
    rangeEl.addEventListener("input", (event) => {
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

    refs.modeSelect.value = state.matrixMode
      ? "matrix"
      : state.lightMode
        ? "light"
        : "dark";
  }

  function bindCollapse() {
    function setCollapsed(collapsed) {
      refs.controls.classList.toggle("collapsed", collapsed);
    }

    refs.collapseBtn.addEventListener("click", () => {
      setCollapsed(true);
    });

    refs.panelTab.addEventListener("click", () => {
      setCollapsed(false);
    });
  }

  return {
    refs,
    bindToggle,
    bindSelect,
    bindRange,
    setControlsFromState,
    bindCollapse,
  };
}
