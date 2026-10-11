import assert from "node:assert/strict";
import process from "node:process";
import test from "node:test";
import { createClock } from "../js/clock.js";
import { DEFAULTS } from "../js/config.js";
import { installGlobals } from "./helpers/audio.js";

test("the clock exposes one complete time and hides decorative digits across updates", (t) => {
  const originalTimeZone = process.env.TZ;
  process.env.TZ = "UTC";
  t.after(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });
  const NativeDate = Date;
  let now = NativeDate.UTC(2026, 0, 2, 13, 5, 9);
  const children = [];
  const attributes = new Map();
  const container = {
    style: { setProperty() {} },
    setAttribute: (name, value) => attributes.set(name, value),
    appendChild: (span) => children.push(span),
  };
  installGlobals(t, {
    Date: class extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [now]));
      }
    },
    document: {
      createElement() {
        const attributes = new Map();
        const classes = new Set();
        const span = Object.assign(new EventTarget(), {
          dataset: {},
          classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            contains: (name) => classes.has(name),
          },
          setAttribute: (name, value) => attributes.set(name, value),
          getAttribute: (name) => attributes.get(name) ?? null,
          removeAttribute: (name) => attributes.delete(name),
          remove: () => children.splice(children.indexOf(span), 1),
        });
        return span;
      },
    },
  });
  t.mock.method(Math, "random", () => 0);
  const clock = createClock({
    container,
    chars: "X",
    tuning: { glyphChance: 1, glitchChance: 1 },
  });

  for (const [options, expected] of [
    [{ glyph: true, glitch: true }, "1:05:09"],
    [{ leadingZero: true, hideSeconds: true, showAmPm: true }, "01:06 am"],
    [{ hour24: true }, "1:06:10"],
    [{ hideSeconds: true, glyph: true }, "1:06"],
  ]) {
    clock.render({ ...DEFAULTS, ...options });
    assert.equal(children.map((span) => span.textContent).join(""), expected);
    assert.equal(attributes.get("aria-label"), expected);
    assert.ok(
      children.every((span) => span.getAttribute("aria-hidden") === "true"),
    );
    assert.equal(
      children.some((span) => span.getAttribute("data-glyph") === "X"),
      options.glyph === true,
    );
    assert.equal(
      children.some((span) => span.classList.contains("glitch")),
      options.glitch === true,
    );
    now = NativeDate.UTC(2026, 0, 2, 1, 6, 10);
  }
});

test("cached clock formats follow the current local timezone without a reload", (t) => {
  const originalTimeZone = process.env.TZ;
  t.after(() => {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  });
  const clock = createClock({});
  const winter = new Date("2026-01-02T01:05:09Z");
  const summer = new Date("2026-07-02T01:05:09Z");

  for (const timeZone of [
    "UTC",
    "Asia/Tokyo",
    "America/New_York",
    "America/Lima",
    "UTC",
  ]) {
    process.env.TZ = timeZone;
    // New York and Lima share a winter offset but have different summer rules.
    for (const date of [summer, winter]) {
      for (const hour24 of [false, true]) {
        for (const leadingZero of [false, true]) {
          for (const hideSeconds of [false, true]) {
            const options = {
              hour: leadingZero ? "2-digit" : "numeric",
              minute: "2-digit",
              hour12: !hour24,
              timeZone,
            };
            if (!hideSeconds) options.second = "2-digit";
            const expected = new Intl.DateTimeFormat("en-GB", options);
            for (const showAmPm of [false, true]) {
              const state = {
                ...DEFAULTS,
                hour24,
                leadingZero,
                hideSeconds,
                showAmPm,
              };
              const result = showAmPm
                ? expected.format(date)
                : expected
                    .formatToParts(date)
                    .filter((part) => part.type !== "dayPeriod")
                    .map((part) => part.value)
                    .join("")
                    .trim();
              assert.equal(
                clock.formatTime(date, state),
                result,
                `${timeZone}, ${date.toISOString()}, ${JSON.stringify({ ...options, showAmPm })}`,
              );
            }
          }
        }
      }
    }
  }
});
