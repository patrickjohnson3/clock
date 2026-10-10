import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULTS, FONT_FAMILIES, SYSTEM_FONT } from "../js/config.js";
import { normalizeState } from "../js/state.js";

test("unsupported fonts normalize to System", () => {
  for (const font of [
    undefined,
    null,
    42,
    "",
    "serif",
    "'Old Font', monospace",
  ]) {
    assert.equal(normalizeState({ ...DEFAULTS, font }).font, SYSTEM_FONT);
  }
});

test("every HTML font choice survives normalization", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const select = html.match(/<select id="fontSelect">([\s\S]*?)<\/select>/)[1];
  const fonts = [...select.matchAll(/value="([^"]*)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(fonts, FONT_FAMILIES);
  assert.ok(fonts.includes(SYSTEM_FONT));
  for (const font of fonts) {
    assert.equal(normalizeState({ ...DEFAULTS, font }).font, font);
  }
});
