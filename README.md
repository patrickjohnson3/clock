# Centered Clock

This is a vibe coding project.

A full-screen Matrix-inspired clock with a top drop-down control panel, visual effects, and ambient sound modes.

Live demo: [patrickjohnson3.github.io/clock](https://patrickjohnson3.github.io/clock/)

## Features

- Centered digital clock with optional AM/PM display
- Matrix rain background and visual effects (`Glitch`, `Glyph`, `Glow`, `Neon`)
- Display modes: `Dark`, `Light`, `Matrix Mode (Green)`
- Ambient sound modes:
  - Brown Noise
  - Rain Storm
  - Aircraft Cabin
  - Pink Noise
  - Dub Techno
- Global sound volume slider
- Settings persistence toggle

## Run Locally

This project is static HTML/CSS/JS (no build step required).

Serve the repository folder with a static HTTP server so the browser can load its ES modules.

Example (Python):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Controls

The top panel is grouped into 3 sections:

- Left: `General` + `Clock`
- Middle: `Matrix`
- Right: `Sound`

Use `Hide Panel` to collapse the panel. Use the subtle top handle to reopen it.
While open, the panel shares the screen with an unobscured clock preview. Scroll
the panel to reach additional controls; hiding it restores the full-screen clock.
Status changes remain available to assistive technology while the panel is hidden.
If a warning needs attention, a compact notice prompts you to reopen the panel
for details without covering the clock.

`Remember settings on this device` is off by default. If saving fails, a warning
appears below it without interrupting the clock. After resolving browser storage
restrictions, change a setting to retry; a successful save clears the warning.

`Keep Screen Awake` requests a screen wake lock; the status below it reports
whether it is active, paused, released, or unavailable. The checked toggle is your
preference, not a guarantee that the browser will keep the screen on. After a
failed request or release, toggle it off and on to retry; returning to the page
also requests it again when enabled.

`Fullscreen` follows the browser's actual fullscreen state. It is disabled with
an explanation when the browser or page disallows it. Rejected entry or exit
attempts show a status message; you can also use your browser's fullscreen exit
command. If the panel is hidden, reopen it to reach the Fullscreen toggle.

Use `Clock Size (%)` to enlarge the clock from 100% to 200% without changing its
responsive default size. If enlarged text exceeds the screen, scroll the clock
to reach the whole time; keyboard users can focus the clock and use arrow keys.
Clock Size and Sound Volume show their current percentages beside their labels.

Matrix mode keeps `Matrix Rain` and `Neon FX` enabled; choose Dark or Light mode
to adjust them separately. `Show AM/PM` is unavailable in 24-hour mode, but its
preference is retained when switching back to 12-hour mode.

`Reduced Motion` in the Matrix section is off by default, independently of the
system's motion preference. Turning it on pauses Matrix rain and disables glitch
animation, the scroll hint's motion, and panel transitions. If Matrix Rain is
selected while Reduced Motion is on, a visible and announced warning explains
the conflict. Rain resumes when Reduced Motion is turned off if rain is still
selected and the page is visible. This setting is saved only when remembering
settings is enabled.

The Sound status distinguishes playing, muted, paused, off, and unavailable audio.
If restored sounds are paused by the browser, click or press a key to try playback.
The sound toggles retain your selection while playback is blocked.

## Project Structure

- `index.html` - app shell and control markup
- `styles.css` - layout and visual styling
- `app.js` - module entrypoint
- `js/main.js` - app orchestration
- `js/config.js` - defaults and tuneable constants
- `js/state.js` - state normalization/invariants
- `js/settings.js` - localStorage load/save
- `js/ui.js` - DOM refs and control bindings
- `js/matrix.js` - matrix background renderer
- `js/clock.js` - clock renderer
- `js/audio/engines.js` - individual sound engines
- `js/audio/manager.js` - shared sound engine orchestration

## Tests, Linting, and Formatting

Regression tests use Node's built-in test runner and require no extra dependencies.

Scripts from `package.json`:

```bash
npm test
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

Configuration:

- ESLint flat config: `eslint.config.js`
- Prettier ignore: `.prettierignore`
- CI quality checks: `.github/workflows/quality.yml`

## Notes

- Audio starts after user interaction due to browser autoplay policies.
- Saved sounds wait for playback permission before generating audio buffers or
  starting their scheduler.
- Google Fonts are requested only when a custom font is selected or restored;
  the System font does not require a network request.
