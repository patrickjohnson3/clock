# Contributor Guidance

## Scope and Product

This file governs the whole repository; there are no nested instruction files.
Centered Clock is a static, full-screen browser clock with Matrix visuals, a
collapsible control panel, and procedural ambient audio. See `README.md` for
product documentation and the module map.

- Preserve deployment as static HTML/CSS/native JavaScript modules. Node is for
  development tooling, not the browser runtime. There is no backend, bundler,
  generated site, packaging step, or PWA configuration; do not introduce these as
  incidental refactors.
- Keep asset URLs and module imports relative, including explicit `.js` import
  extensions. The live demo is hosted under `/clock/`, not the domain root.
- Browser code uses ES modules and browser globals; do not introduce Node APIs or
  bare package imports into `app.js` or `js/` without changing the delivery model.

## Ownership and Change Boundaries

- `index.html` owns the app shell and controls; `styles.css` owns themes, effects,
  and responsive layout. `app.js` only imports `js/main.js`.
- `js/main.js` owns application state, module composition, event wiring, rendering,
  save scheduling, fullscreen, and wake-lock lifecycle. Route setting changes
  through its `updateState` path so normalization, controls, and persistence agree.
- `js/config.js` owns defaults, storage keys, and tuning constants. Keep
  normalization in `js/state.js` and localStorage access and migrations in
  `js/settings.js`; these must not acquire UI or audio dependencies.
- `js/ui.js` owns control references, control/state synchronization, panel collapse,
  and scroll hints. `js/clock.js` and `js/matrix.js` own their renderers. Preserve
  their factory interfaces with injected elements/configuration rather than
  importing the application orchestrator.
- `js/audio/engines.js` owns sound generation; `js/audio/manager.js` coordinates
  engines by state key. Preserve the `start`, `stop`, `setVolume` interface and the
  shared AudioContext supplied by `js/main.js`. Engines must not read controls or
  stored settings directly.
- `tests/` holds Node regression tests; `tests/helpers/` provides browser/audio
  fakes. Test observable lifecycle behavior, including asynchronous source events.
- When adding a setting, review all of `DEFAULTS`, `normalizeState`, settings
  loading, HTML controls, UI synchronization, and main event/render wiring.
  Existing control IDs usually follow `<stateKey>Toggle`; retain explicit mappings
  such as `persistStorage` to `storageToggle`.
- Use the theme CSS variables and existing body classes. The Matrix renderer reads
  `--fg` and `--matrix-trail`; update both CSS and renderer behavior when changing
  that contract. Keep `#panelTab` immediately after `#controls`: the reveal rule
  uses the adjacent-sibling selector.

## Behavior to Preserve

- Fresh settings use 12-hour time, visible seconds (`hideSeconds: false`), no
  leading zero or AM/PM marker, dark mode, no sound, and wake lock enabled.
  Persistent storage is off by default. Keep HTML defaults consistent with
  `DEFAULTS` unless the requested feature deliberately changes them.
- `normalizeState` makes display modes exclusive; Matrix mode forces Matrix rain
  and neon on. Do not bypass this normalization in new update/load paths.
- Time formatting uses `Intl.DateTimeFormat("en-GB", ...)` with the device's local
  timezone, not the browser's preferred locale. Keep formatter cache keys sensitive
  to hour mode, leading zeros, and seconds visibility; filter AM/PM with
  `formatToParts` rather than string assumptions.
- Preserve the storage keys `matrixClockSettings` and
  `matrixClockStorageEnabled`, typed defaults for missing/invalid saved fields,
  and legacy `hour12`/`hideAmPm` migrations. Storage failures must not prevent the
  clock from running.
- With persistence disabled, remove the saved settings payload and retain only
  the opt-in preference. Do not persist fullscreen or attempt to restore it on
  load. Keep debounced saves and the pending-save flush on unload.
- Sound modes can play together. State volume is 0-100; the audio manager receives
  0-1 and each engine applies its configured base gain. Keep audio initialization
  lazy and respect browser autoplay restrictions.
- Repeated renders/start/stop calls must not duplicate sources or timers. Stop
  clock/Matrix timers while hidden, preserve Dub Techno's visibility-aware
  scheduler, and clear engine timers and disconnect stopped sources.
- Fullscreen, Web Audio, canvas, and wake lock have capability checks; preserve
  graceful handling of missing or rejected APIs. Keep fullscreen controls synced
  with actual browser state. For wake lock, allow only one pending request,
  recheck visibility and the toggle after awaiting it, release when disabled or
  hidden, and do not immediately retry from the sentinel's `release` event.
- Preserve mobile panel scrolling, safe-area/fullscreen positioning, keyboard
  focus styles, and reduced-motion handling when changing controls or effects.

## Setup and Validation

- Use `npm ci` to install the locked development dependencies. CI uses Node 20 on
  Ubuntu; `package.json` does not declare a Node engine requirement.
- Serve the repository with `python3 -m http.server 8000` and open
  `http://localhost:8000` for browser validation. Use HTTP serving for the ES module
  entrypoint; direct-file URLs can block module loading.
- Run `npm test`, `npm run lint`, and `npm run format:check` before completing a
  change; these are the checks in `.github/workflows/quality.yml`. Documentation-only changes
  still need the format check. ESLint uses `eslint.config.js`; formatting uses
  Prettier defaults and `.prettierignore`.
- `npm run lint:fix` and `npm run format` are available, but rewrite files across
  the repository. Review their diff and avoid unrelated formatting changes.
- `npm test` uses Node's built-in test runner. Add regression coverage for audio
  lifecycle changes. There is no type-check, build, or packaging command. Node
  fakes do not verify browser policy, focus, CSS, or physical device APIs; exercise
  affected browser flows and report what was checked or unavailable.
- For clock/state/settings changes, check fresh defaults, 12/24-hour formatting,
  seconds/leading-zero/AM-PM combinations, mode normalization, and reloads with
  persistence on/off. Include legacy, malformed, or unavailable storage when
  changing settings loading.
- For UI/CSS changes, check dark/light/Matrix themes, desktop and narrow mobile
  layouts, panel scrolling and reopening, and keyboard focus. For audio/lifecycle
  changes, check repeated toggles, volume/muting, mixed sounds, tab hide/return,
  fullscreen exit, and wake-lock rejection/release as applicable.

## Repository Hygiene and Change Scope

- `node_modules/` is generated and ignored. Never hand-edit or commit it.
  `package-lock.json` is tracked: regenerate it with npm when intentionally
  changing dependencies, and include it with the `package.json` change.
- Browser localStorage is user-owned state. Use an isolated origin/profile for
  destructive persistence checks; never use `localStorage.clear()` in app code
  or delete unrelated origin data.
- All shipped files are public browser assets; do not embed credentials. Google
  Fonts is the existing external runtime resource; audio is generated locally.
  Do not add remote audio, tracking, or server dependencies incidentally.
- Keep documentation in `README.md`, npm scripts/dependencies in `package.json`,
  lint rules in `eslint.config.js`, and CI checks in
  `.github/workflows/quality.yml` consistent when changing those contracts.
- Keep changes scoped to the request. History uses short action-oriented commit
  subjects; there is no configured commit-message or branch-naming convention.
