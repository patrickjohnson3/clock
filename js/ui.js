export function createUI() {
  const refs = {
    canvas: document.getElementById("matrix"),
    clock: document.getElementById("clock"),
    controls: document.getElementById("controls"),
    collapseBtn: document.getElementById("collapseBtn"),
    panelTab: document.getElementById("panelTab"),
    wakeLockStatus: document.getElementById("wakeLockStatus"),
    storageStatus: document.getElementById("storageStatus"),
    matrixModeHint: document.getElementById("matrixModeHint"),
    showAmPmHint: document.getElementById("showAmPmHint"),
    soundStatus: document.getElementById("soundStatus"),
    toggles: {
      glitch: document.getElementById("glitchToggle"),
      glyph: document.getElementById("glyphToggle"),
      hour24: document.getElementById("hour24Toggle"),
      showAmPm: document.getElementById("showAmPmToggle"),
      leadingZero: document.getElementById("leadingZeroToggle"),
      hideSeconds: document.getElementById("hideSecondsToggle"),
      matrix: document.getElementById("matrixToggle"),
      glow: document.getElementById("glowToggle"),
      neon: document.getElementById("neonToggle"),
      brownNoise: document.getElementById("brownNoiseToggle"),
      pinkNoise: document.getElementById("pinkNoiseToggle"),
      rainStorm: document.getElementById("rainStormToggle"),
      aircraftCabin: document.getElementById("aircraftCabinToggle"),
      dubTechno: document.getElementById("dubTechnoToggle"),
      fullscreen: document.getElementById("fullscreenToggle"),
      wakeLock: document.getElementById("wakeLockToggle"),
      persistStorage: document.getElementById("storageToggle"),
    },
    fontSelect: document.getElementById("fontSelect"),
    modeSelect: document.getElementById("modeSelect"),
    soundVolumeSlider: document.getElementById("soundVolumeSlider"),
    clockScaleSlider: document.getElementById("clockScaleSlider"),
    soundVolumeOutput: document.getElementById("soundVolumeOutput"),
    clockScaleOutput: document.getElementById("clockScaleOutput"),
  };

  function setChecked(el, value) {
    if (el && el.checked !== value) {
      el.checked = value;
    }
  }

  function setValue(el, value) {
    if (el && el.value !== value) {
      el.value = value;
    }
  }

  function setHidden(el, hidden) {
    if (el && el.hidden !== hidden) {
      el.hidden = hidden;
      updateScrollHint();
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

  function setWakeLockStatus(message) {
    const status = refs.wakeLockStatus;
    if (status && status.textContent !== message) {
      status.textContent = message;
      updateScrollHint();
    }
  }

  function setStorageStatus(message) {
    const status = refs.storageStatus;
    if (status && status.textContent !== message) {
      status.textContent = message;
      updateScrollHint();
    }
  }

  function setSoundStatus(message) {
    const status = refs.soundStatus;
    if (status && status.textContent !== message) {
      status.textContent = message;
      updateScrollHint();
    }
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
    for (const [key, toggle] of Object.entries(refs.toggles)) {
      setChecked(toggle, state[key]);
    }
    if (refs.toggles.matrix) refs.toggles.matrix.disabled = state.matrixMode;
    if (refs.toggles.neon) refs.toggles.neon.disabled = state.matrixMode;
    if (refs.toggles.showAmPm) refs.toggles.showAmPm.disabled = state.hour24;
    setHidden(refs.matrixModeHint, !state.matrixMode);
    setHidden(refs.showAmPmHint, !state.hour24);
    setValue(refs.soundVolumeSlider, String(state.soundVolume));
    setValue(refs.clockScaleSlider, String(state.clockScale));
    setValue(refs.soundVolumeOutput, `${state.soundVolume}%`);
    setValue(refs.clockScaleOutput, `${state.clockScale}%`);

    setValue(refs.fontSelect, state.font);

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
      refs.controls.inert = collapsed;
      refs.controls.classList.toggle("collapsed", collapsed);
      if (refs.panelTab) {
        refs.panelTab.inert = !collapsed;
      }
      const focusTarget = collapsed ? refs.panelTab : refs.collapseBtn;
      focusTarget?.focus({ preventScroll: true });
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
    if (!controlsEl) {
      return;
    }

    if (controlsEl.classList.contains("collapsed")) {
      controlsEl.classList.remove("show-scroll-hint");
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
    setWakeLockStatus,
    setStorageStatus,
    setSoundStatus,
    bindCollapse,
    bindScrollHint,
    updateScrollHint,
  };
}
