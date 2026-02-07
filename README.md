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

- Open `index.html` directly in a browser, or
- Serve the folder locally with any static server

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

## Linting and Formatting

Scripts from `package.json`:

```bash
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
- Fonts are loaded from Google Fonts in `index.html`.
