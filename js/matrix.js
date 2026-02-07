export function createMatrix({ canvas, chars, tuning }) {
  const ctx = canvas.getContext("2d");

  let columns = 0;
  let drops = [];
  let timerId = null;

  function rebuildDrops() {
    const previous = drops;
    columns = Math.floor(canvas.width / tuning.fontSize);
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
    const matrixTrail =
      getComputedStyle(document.body).getPropertyValue("--matrix-trail").trim() ||
      "rgba(0, 0, 0, 0.05)";

    ctx.fillStyle = matrixTrail;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fg = getComputedStyle(document.body).getPropertyValue("--fg").trim() || "#fff";
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
    if (timerId !== null) {
      return;
    }
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
  };
}
