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

`Keep Screen Awake` requests a screen wake lock; the status below it reports
whether it is active, paused, released, or unavailable. The checked toggle is your
preference, not a guarantee that the browser will keep the screen on. After a
failed request or release, toggle it off and on to retry; returning to the page
also requests it again when enabled.

Use `Clock Size (%)` to enlarge the clock from 100% to 200% without changing its
responsive default size. If enlarged text exceeds the screen, scroll the clock
to reach the whole time; keyboard users can focus the clock and use arrow keys.

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
