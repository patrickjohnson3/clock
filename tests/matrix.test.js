import assert from "node:assert/strict";
import test from "node:test";
import { createMatrix } from "../js/matrix.js";
import { createWindow, installGlobals } from "./helpers/audio.js";

test("Matrix draws visible falling glyphs, not just background frames", (t) => {
  const window = createWindow();
  window.innerWidth = 32;
  window.innerHeight = 64;
  const glyphs = [];
  const backgrounds = [];
  const context = {
    fillRect(x, y, width, height) {
      backgrounds.push({ x, y, width, height, color: this.fillStyle });
    },
    fillText(text, x, y) {
      glyphs.push({
        text,
        x,
        y,
        color: this.fillStyle,
        alpha: this.globalAlpha,
      });
    },
    save() {},
    restore() {},
  };
  const canvas = { getContext: () => context };
  const colors = {
    "--fg": "#00ff00",
    "--matrix-trail": "rgba(0, 0, 0, 0.05)",
  };
  installGlobals(t, {
    window,
    document: { body: {} },
    getComputedStyle: () => ({
      getPropertyValue: (name) => colors[name] ?? "",
    }),
  });
  t.mock.method(Math, "random", () => 0.5);
  const matrix = createMatrix({
    canvas,
    chars: "AB",
    tuning: {
      fontSize: 16,
      intervalMs: 50,
      resetChance: 1,
      alphaMin: 0.5,
      alphaRange: 0.5,
    },
  });
  matrix.resize();
  assert.equal(canvas.width, 32);
  assert.equal(canvas.height, 64);
  matrix.start();
  window.advanceTime(50);
  assert.deepEqual(
    glyphs.map(({ text, x, y }) => [text, x, y]),
    [
      ["B", 0, 16],
      ["B", 16, 16],
    ],
  );
  window.advanceTime(50);
  assert.deepEqual(
    glyphs.map(({ text, x, y }) => [text, x, y]),
    [
      ["B", 0, 16],
      ["B", 16, 16],
      ["B", 0, 32],
      ["B", 16, 32],
    ],
  );
  for (const glyph of glyphs) {
    assert.equal(glyph.color, "#00ff00");
    assert.equal(glyph.alpha, 0.75);
  }
  assert.deepEqual(backgrounds, [
    { x: 0, y: 0, width: 32, height: 64, color: colors["--matrix-trail"] },
    { x: 0, y: 0, width: 32, height: 64, color: colors["--matrix-trail"] },
  ]);
  matrix.stop();
  window.advanceTime(100);
  assert.equal(glyphs.length, 4);
  assert.equal(backgrounds.length, 2);
  assert.equal(window.pendingTimerCount, 0);
});
