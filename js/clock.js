export function createClock({ container, chars, tuning }) {
  const spans = [];
  const formatterByHourMode = new Map();

  function getFormatter(hour24) {
    const key = hour24 ? "24" : "12";
    if (formatterByHourMode.has(key)) {
      return formatterByHourMode.get(key);
    }
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: !hour24,
    });
    formatterByHourMode.set(key, formatter);
    return formatter;
  }

  function formatTime(now, state) {
    const formatter = getFormatter(state.hour24);
    if (state.showAmPm) {
      return formatter.format(now);
    }

    const parts = formatter.formatToParts(now);
    return parts
      .filter((part) => part.type !== "dayPeriod")
      .map((part) => part.value)
      .join("")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function applyDigitEffects(span, char, state) {
    span.classList.remove("glyph-swap", "glitch");
    span.removeAttribute("data-glyph");

    if (char === ":") {
      return;
    }

    if (state.glyph && Math.random() < tuning.glyphChance) {
      span.classList.add("glyph-swap");
      span.setAttribute(
        "data-glyph",
        chars[Math.floor(Math.random() * chars.length)],
      );
    }

    if (state.glitch && Math.random() < tuning.glitchChance) {
      span.classList.add("glitch");
    }
  }

  function ensureSpan(index) {
    if (!container) {
      return null;
    }
    if (spans[index]) {
      return spans[index];
    }

    const span = document.createElement("span");
    span.className = "digit";
    span.addEventListener("mouseenter", () => {
      if (span.dataset.glitchEnabled === "true") {
        span.classList.add("glitch");
        window.setTimeout(
          () => span.classList.remove("glitch"),
          tuning.hoverGlitchMs,
        );
      }
    });

    spans[index] = span;
    container.appendChild(span);
    return span;
  }

  function trimSpans(keepLength) {
    if (!container) {
      spans.length = 0;
      return;
    }
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
      if (!span) {
        return;
      }

      if (span.textContent !== char) {
        span.textContent = char;
      }

      span.dataset.glitchEnabled = state.glitch ? "true" : "false";
      applyDigitEffects(span, char, state);
    }

    trimSpans(time.length);
  }

  return {
    render,
    formatTime,
  };
}
