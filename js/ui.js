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
      fullscreen: document.getElementById("fullscreenToggle"),
      persistStorage: document.getElementById("storageToggle"),
    },
    fontSelect: document.getElementById("fontSelect"),
    modeSelect: document.getElementById("modeSelect"),
    soundVolumeSlider: document.getElementById("soundVolumeSlider"),
  };

  function setChecked(el, value) {
    if (el) {
      el.checked = value;
    }
  }

  function setValue(el, value) {
    if (el) {
      el.value = value;
    }
  }

  function bindToggle(toggleEl, onChange) {
    if (!toggleEl) {
      return;
    }
    toggleEl.addEventListener("change", (event) => {
      onChange(event.target.checked);
    });
  }

  function bindSelect(selectEl, onChange) {
    if (!selectEl) {
      return;
    }
    selectEl.addEventListener("change", (event) => {
      onChange(event.target.value);
    });
  }

  function bindRange(rangeEl, onChange) {
    if (!rangeEl) {
      return;
    }
    rangeEl.addEventListener("input", (event) => {
      onChange(event.target.value);
    });
  }

  function setControlsFromState(state) {
    setChecked(refs.toggles.glitch, state.glitch);
    setChecked(refs.toggles.glyph, state.glyph);
    setChecked(refs.toggles.hour24, state.hour24);
    setChecked(refs.toggles.showAmPm, state.showAmPm);
    setChecked(refs.toggles.matrix, state.matrix);
    setChecked(refs.toggles.glow, state.glow);
    setChecked(refs.toggles.neon, state.neon);
    setChecked(refs.toggles.brownNoise, state.brownNoise);
    setChecked(refs.toggles.pinkNoise, state.pinkNoise);
    setChecked(refs.toggles.rainStorm, state.rainStorm);
    setChecked(refs.toggles.aircraftCabin, state.aircraftCabin);
    setChecked(refs.toggles.dubTechno, state.dubTechno);
    setChecked(refs.toggles.fullscreen, state.fullscreen);
    setChecked(refs.toggles.persistStorage, state.persistStorage);
    setValue(refs.soundVolumeSlider, String(state.soundVolume));

    if (refs.fontSelect) {
      refs.fontSelect.value = state.font;
      if (refs.fontSelect.value !== state.font) {
        refs.fontSelect.value = defaults.font;
      }
    }

    setValue(
      refs.modeSelect,
      state.matrixMode ? "matrix" : state.lightMode ? "light" : "dark",
    );
  }

  function bindCollapse() {
    function setCollapsed(collapsed) {
      if (!refs.controls) {
        return;
      }
      refs.controls.classList.toggle("collapsed", collapsed);
      window.requestAnimationFrame(updateScrollHint);
    }

    if (refs.collapseBtn) {
      refs.collapseBtn.addEventListener("click", () => {
        setCollapsed(true);
      });
    }

    if (refs.panelTab) {
      refs.panelTab.addEventListener("click", () => {
        setCollapsed(false);
      });
    }
  }

  function updateScrollHint() {
    const controlsEl = refs.controls;
    if (!controlsEl || controlsEl.classList.contains("collapsed")) {
      return;
    }

    const hasOverflow = controlsEl.scrollHeight - controlsEl.clientHeight > 2;
    const atBottom =
      controlsEl.scrollTop + controlsEl.clientHeight >=
      controlsEl.scrollHeight - 2;

    controlsEl.classList.toggle("show-scroll-hint", hasOverflow && !atBottom);
  }

  function bindScrollHint() {
    if (!refs.controls) {
      return;
    }

    refs.controls.addEventListener("scroll", updateScrollHint, {
      passive: true,
    });
    window.addEventListener("resize", updateScrollHint);
    window.requestAnimationFrame(updateScrollHint);
  }

  return {
    refs,
    bindToggle,
    bindSelect,
    bindRange,
    setControlsFromState,
    bindCollapse,
    bindScrollHint,
    updateScrollHint,
  };
}
