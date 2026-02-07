export function createMatrix({ canvas, chars, tuning }) {
  const ctx = canvas?.getContext?.("2d") ?? null;

  let columns = 0;
  let drops = [];
  let timerId = null;
  let matrixTrail = "rgba(0, 0, 0, 0.05)";
  let fg = "#fff";

  function refreshStyles() {
    if (!ctx) {
      return;
    }
    const bodyStyle = getComputedStyle(document.body);
    matrixTrail =
      bodyStyle.getPropertyValue("--matrix-trail").trim() ||
      "rgba(0, 0, 0, 0.05)";
    fg = bodyStyle.getPropertyValue("--fg").trim() || "#fff";
  }

  function rebuildDrops() {
    if (!ctx || !canvas) {
      columns = 0;
      drops = [];
      return;
    }
    const previous = drops;
    columns = Math.floor(canvas.width / tuning.fontSize);
    drops = Array.from({ length: columns }, (_, index) => previous[index] || 1);
  }

  function resize() {
    if (!ctx || !canvas) {
      return;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    rebuildDrops();
    refreshStyles();
  }

  function clear() {
    if (!ctx || !canvas) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    if (!ctx || !canvas) {
      return;
    }
    ctx.fillStyle = matrixTrail;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${tuning.fontSize}px monospace`;

    for (let i = 0; i < drops.length; i += 1) {
      const alpha = tuning.alphaMin + Math.random() * tuning.alphaRange;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fg;
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * tuning.fontSize, drops[i] * tuning.fontSize);
      ctx.restore();

      if (
        drops[i] * tuning.fontSize > canvas.height ||
        Math.random() > tuning.resetChance
      ) {
        drops[i] = 0;
      }
      drops[i] += 1;
    }
  }

  function start() {
    if (!ctx) {
      return;
    }
    if (timerId !== null) {
      return;
    }
    refreshStyles();
    timerId = window.setInterval(draw, tuning.intervalMs);
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
    stop,
    refreshStyles,
  };
}
