import assert from "node:assert/strict";
import process from "node:process";
import test from "node:test";
import { createClock } from "../js/clock.js";
import { DEFAULTS } from "../js/config.js";

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
