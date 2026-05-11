# Modernize fSpy: Full Stack Upgrade & Bug Fixes

## Summary

Complete modernization of the fSpy desktop application, upgrading every major dependency from its legacy versions to current releases, implementing Electron's modern security model, and fixing several bugs.

## Dependency Upgrades

| Technology | Before | After |
|---|---|---|
| Electron | 8.2.1 | 42.x |
| TypeScript | 2.9.1 | 5.8.x |
| React | 16.4.0 | 18.3.1 |
| Redux | 4.0.0 | 5.0.1 |
| react-redux | 5.0.7 | 9.2.0 |
| redux-thunk | 2.3.0 | 3.1.0 |
| Webpack | 4.10.2 | 5.98.0 |
| Konva | 2.1.3 | 9.3.22 |
| react-konva | 1.7.4 | 18.2.14 |
| react-measure | 2.0.2 | 2.5.2 |
| Jest | 23.x | 29.7.0 |
| electron-builder | 22.4.0 | 26.8.1 |
| electron-window-state | 4.1.1 | 5.0.3 |

## Main Changes

### Build Toolchain

- **TypeScript 2.9 → 5.8** with strict mode, `ES2022` target, `node16` module resolution.
- **Webpack 4 → 5** with updated loaders (`ts-loader` 9, `css-loader` 7, `style-loader` 4, `html-webpack-plugin` 5).
- **Babel removed entirely** — `ts-loader` handles all transpilation and JSX.
- **TSLint → ESLint** — removed `tslint`, `tslint-loader`, `standard-loader`; replaced with `eslint` 8 + `@typescript-eslint`.
- **Jest 23 → 29** with `ts-jest` — removed `webpack.tests.config.js` (tests no longer webpack-compiled). Added `jest.config.js`.
- **Replaced `trash-cli` with `rimraf`**; added `cross-env` for cross-platform `DEV=true` env var; added `start` script.
- **0 npm audit vulnerabilities** (was multiple critical/high).

### Electron Security Model

- **Preload script + Context Bridge**: Created `src/main/preload.ts` exposing a typed `window.electronAPI` surface. Created `src/gui/types/electron-api.ts` with full `ElectronAPI` interface. Added `electron-preload` webpack target.
- **Removed `remote` module**: Replaced all `remote.dialog.showErrorBox()` and `remote.app.getVersion()` calls with IPC handlers (`ipcMain.handle` / `window.electronAPI.*`).
- **Removed direct Node.js usage from renderer**: Eliminated all `fs`, `Buffer`, `path`, `process`, and `electron` imports from renderer code. File I/O moved to main process via IPC. `Buffer` operations in `project-file.ts` rewritten to use `DataView`/`Uint8Array`/`TextEncoder`/`TextDecoder`.
- **Enabled full sandbox**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- **Electron upgraded 8 → 42** in multiple hops (8→12→20→28→35→42), fixing deprecated APIs at each step (`File.path` → `webUtils.getPathForFile`, `url.format()` → `pathToFileURL()`, `app.on('ready')` → `app.whenReady()`, deprecated event type annotations, etc.).

### React & UI Framework

- **React 16 → 18**: Migrated to `createRoot()` API. Fixed removed `componentWillMount` → `componentDidMount`. Added explicit `children?: React.ReactNode` prop where needed (React 18 no longer includes children implicitly).
- **Konva 2 → 9 / react-konva 1.7 → 18**: Canvas rendering code required no API changes.
- **Redux 4 → 5 / react-redux 5 → 9**: Switched to `legacy_createStore`, named `thunk` import, typed middleware `action` as `unknown`. Removed `@types/react-redux` (types now bundled).

### UX: Image Opacity Slider

Replaced the binary **"Dim image" checkbox** (which toggled between 100% and 20% opacity) with a **continuous slider control**, allowing any opacity value between 0% and 100%.

### Bug Fix: Control Points Stuck After Dragging Outside Canvas

Fixed a bug where dragging a control point and releasing the mouse button outside the Konva stage (e.g. over a side panel) caused the control point to become permanently unresponsive. The Konva node's internal position and drag state could get out of sync when the `mouseup` event didn't reach the stage. The fix ensures the node position and drag state are always properly reset on drag end.

### Other Fixes

Various minor fixes including clipboard compatibility with sandbox mode, DEV mode resource path resolution, and TypeScript module settings.

## Testing

- All 3 webpack bundles (main, gui, preload) compile cleanly with zero type errors.
- **8 test suites, 175 tests** pass via `npm test`.

### Added test coverage

| Area | File | Tests | Covers |
|---|---|---|---|
| Vector math | `tests/gui/solver/vector-3d.tests.ts` | 25 | Arithmetic, dot/cross product, normalize, min/max accessors |
| Math utilities | `tests/gui/solver/math-util.tests.ts` | 17 | Line intersection, triangle orthocenter, line-plane intersection, distance, normalization |
| Coordinates | `tests/gui/solver/coordinates-util.tests.ts` | 13 | All coordinate frame conversions (Absolute/Relative/ImagePlane), round-trip consistency for wide/tall/square images |
| Transforms | `tests/gui/solver/transform.tests.ts` | 24 | Identity, translation, scale, rotation, determinant, inverse, transpose, concatenation, equality |
| Project file I/O | `tests/gui/io/project-file.tests.ts` | 62 | Binary `.fspy` header parsing, state JSON validation, round-trip serialization ± image data; exercises all 14 `test_data/` files |
| Reducers | `tests/gui/reducers/reducers.tests.ts` | 17 | `globalSettings`, `imageState`, `resultDisplaySettings` — all action types, defaults, unknown-action passthrough |

## AI Disclosure

Claude Opus 4.6 (Anthropic) was used as an AI coding **assistant** during the development of this PR. This includes help with code migration, writing tests, debugging, and drafting documentation.
