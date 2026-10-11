import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULTS } from "../js/config.js";
import { createUI } from "../js/ui.js";
import { normalizeState } from "../js/state.js";
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

test("constrained controls explain their disabled state without discarding preferences", (t) => {
  const elements = new Map(
    ["matrixToggle", "neonToggle", "showAmPmToggle"].map((id) => [
      id,
      { checked: false, disabled: false },
    ]),
  );
  elements.set("matrixModeHint", { hidden: true });
  elements.set("showAmPmHint", { hidden: true });
  installGlobals(t, {
    document: { getElementById: (id) => elements.get(id) ?? null },
  });
  const ui = createUI();
  let state = normalizeState({ ...DEFAULTS, showAmPm: true });
  ui.setControlsFromState(state);
  for (const id of ["matrixToggle", "neonToggle", "showAmPmToggle"])
    assert.equal(elements.get(id).disabled, false, id);
  assert.equal(elements.get("matrixModeHint").hidden, true);
  assert.equal(elements.get("showAmPmHint").hidden, true);

  state = normalizeState({ ...state, matrixMode: true, hour24: true });
  ui.setControlsFromState(state);
  for (const id of ["matrixToggle", "neonToggle", "showAmPmToggle"]) {
    assert.equal(elements.get(id).disabled, true, id);
    assert.equal(elements.get(id).checked, true, id);
  }
  assert.equal(elements.get("matrixModeHint").hidden, false);
  assert.equal(elements.get("showAmPmHint").hidden, false);
  assert.equal(state.showAmPm, true);

  state = normalizeState({ ...state, matrixMode: false, hour24: false });
  ui.setControlsFromState(state);
  for (const id of ["matrixToggle", "neonToggle", "showAmPmToggle"]) {
    assert.equal(elements.get(id).disabled, false, id);
    assert.equal(elements.get(id).checked, true, id);
  }
  assert.equal(elements.get("matrixModeHint").hidden, true);
  assert.equal(elements.get("showAmPmHint").hidden, true);
});

test("sound status does not repeat an unchanged accessible message", (t) => {
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
      getElementById: (id) => (id === "soundStatus" ? status : null),
    },
  });
  const ui = createUI();
  ui.setSoundStatus("Sound is paused.");
  ui.setSoundStatus("Sound is paused.");
  assert.equal(writes, 1);
  ui.setSoundStatus("Sound is playing.");
  assert.equal(status.textContent, "Sound is playing.");
  assert.equal(writes, 2);
});

test("status announcements and a collapsed-panel notice survive independently of inert controls", (t) => {
  const elements = new Map();
  let announcementWrites = 0;
  for (const key of ["wakeLock", "storage", "sound"]) {
    elements.set(`${key}Status`, { textContent: "" });
    let textContent = "";
    const classes = new Set();
    elements.set(`${key}Announcement`, {
      get textContent() {
        return textContent;
      },
      set textContent(value) {
        textContent = value;
        announcementWrites += 1;
      },
      classList: {
        toggle(name, enabled) {
          if (enabled) classes.add(name);
          else classes.delete(name);
        },
        contains: (name) => classes.has(name),
      },
    });
  }
  elements.set("panelNotice", { textContent: "" });
  installGlobals(t, {
    document: { getElementById: (id) => elements.get(id) ?? null },
  });
  const ui = createUI();
  ui.setStorageStatus("Could not save settings.");
  assert.equal(
    elements.get("storageAnnouncement").textContent,
    "Could not save settings.",
  );
  assert.match(elements.get("panelNotice").textContent, /show panel/i);
  ui.setStorageStatus("Could not save settings.");
  assert.equal(announcementWrites, 1);
  ui.setWakeLockStatus("Screen wake lock released.", true);
  ui.setStorageStatus("");
  assert.notEqual(elements.get("panelNotice").textContent, "");
  ui.setWakeLockStatus("Screen wake lock active.");
  assert.equal(elements.get("panelNotice").textContent, "");
  ui.setSoundStatus("Sound is unavailable.", true);
  assert.notEqual(elements.get("panelNotice").textContent, "");
  ui.setSoundStatus("Sound is playing.");
  assert.equal(elements.get("panelNotice").textContent, "");
});

for (const kind of ["wakeLock", "storage", "sound"]) {
  for (const scenario of [
    "moves below",
    "moves above",
    "stays visible",
    "already scrolled away",
    "focus outside",
    "panel inert",
  ]) {
    test(`${kind} feedback preserves visible focus: ${scenario}`, (t) => {
      let top = scenario === "already scrolled away" ? 220 : 100;
      const scrolls = [];
      const focused = {
        getBoundingClientRect: () => ({ top, bottom: top + 40 }),
        scrollIntoView(options) {
          scrolls.push(options);
          top = 100;
        },
      };
      const controls = {
        inert: scenario === "panel inert",
        contains: (el) => el === focused && scenario !== "focus outside",
        getBoundingClientRect: () => ({ top: 20, bottom: 200 }),
        classList: { contains: () => false, toggle() {} },
      };
      const status = {
        get textContent() {
          return "";
        },
        set textContent(value) {
          assert.equal(value, "Feedback changed.");
          if (scenario !== "stays visible")
            top = scenario === "moves above" ? 0 : 220;
        },
      };
      installGlobals(t, {
        document: {
          activeElement: focused,
          getElementById: (id) =>
            id === "controls"
              ? controls
              : id === `${kind}Status`
                ? status
                : null,
        },
      });
      createUI()[`set${kind[0].toUpperCase()}${kind.slice(1)}Status`](
        "Feedback changed.",
      );
      assert.equal(scrolls.length, scenario.startsWith("moves") ? 1 : 0);
      if (scenario.startsWith("moves")) {
        const rect = focused.getBoundingClientRect();
        assert.ok(rect.top >= 20 && rect.bottom <= 200);
      }
      assert.equal(document.activeElement, focused);
    });
  }
}
