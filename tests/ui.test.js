import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULTS } from "../js/config.js";
import { createUI } from "../js/ui.js";
import { installGlobals } from "./helpers/audio.js";

test("the toggle map covers the HTML checkboxes and synchronizes every state key", async (t) => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const toggles = new Map();
  for (const [tag] of html.matchAll(/<input\b[^>]*>/g)) {
    if (tag.includes('type="checkbox"')) {
      const id = tag.match(/\bid="([^"]+)"/)[1];
      toggles.set(id, { id, checked: false });
    }
  }
  installGlobals(t, {
    document: { getElementById: (id) => toggles.get(id) ?? null },
  });
  const ui = createUI();
  assert.deepEqual(
    Object.values(ui.refs.toggles)
      .map((toggle) => toggle?.id)
      .sort(),
    [...toggles.keys()].sort(),
  );
  for (const checked of [true, false]) {
    const state = { ...DEFAULTS };
    for (const key of Object.keys(ui.refs.toggles)) state[key] = checked;
    ui.setControlsFromState(state);
    for (const [key, toggle] of Object.entries(ui.refs.toggles)) {
      assert.equal(toggle.checked, state[key], key);
    }
  }
});

test("wake lock status updates do not repeat an unchanged accessible message", (t) => {
  let textContent = "";
  let writes = 0;
  const status = {
    get textContent() {
      return textContent;
    },
    set textContent(value) {
      textContent = value;
      writes += 1;
    },
  };
  installGlobals(t, {
    document: {
      getElementById: (id) => (id === "wakeLockStatus" ? status : null),
    },
  });
  const ui = createUI();
  ui.setWakeLockStatus("Screen wake lock active.");
  ui.setWakeLockStatus("Screen wake lock active.");
  assert.equal(status.textContent, "Screen wake lock active.");
  assert.equal(writes, 1);
  ui.setWakeLockStatus("Screen wake lock is off.");
  assert.equal(status.textContent, "Screen wake lock is off.");
  assert.equal(writes, 2);
});
