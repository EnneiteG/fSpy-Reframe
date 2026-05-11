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

Replaced the binary **"Dim image" checkbox** (which toggled between 100% and 20% opacity) with a **continuous slider control**. Users can now set image opacity to any value between 0% and 100% for finer control when overlaying calibration geometry.

### Bug Fix: Control Points Stuck After Dragging Outside Canvas

Fixed a bug where dragging a control point and releasing the mouse button outside the Konva stage (e.g. over a side panel) caused the control point to become permanently unresponsive.

**Root cause:** During a drag, Konva internally moves the `Circle` node to follow the pointer. When the mouse is released outside the stage, two problems occur:

1. The node's internal position ends up far off-screen, but `react-konva` skips updating it because the clamped props haven't changed — leaving the hit area desynchronized from the visual position.
2. Konva's internal drag state (`DD._dragElements`) may not get cleaned up, leaving `isDragging()` stuck as `true`.

**Fix** (in `control-point.tsx`):

1. Added a `ref` to the Konva `Circle` and in `onDragEnd`, explicitly reset the node's position to `this.props.absolutePosition` so the hit area always matches the rendered position.
2. Added a `window`-level `mouseup` listener that calls `node.stopDrag()` if the component is still in a dragging state, ensuring Konva's internal drag tracking is properly cleaned up even when the release happens outside the stage.

### Other Fixes

- **Clipboard copy in sandbox mode**: Moved `clipboard.writeText()` from the preload script to the main process via a `write-clipboard-text` IPC handler. The `clipboard` module is not available in sandboxed preload scripts.
- **DEV mode resource loading**: Fixed `getResourcePath()` to use `app.isPackaged` instead of checking `process.env.DEV` inside a `process.resourcesPath` guard, which could fail when `resourcesPath` was set in dev.
- **TypeScript module settings**: Updated `tsconfig.json` to `"module": "node16"` / `"moduleResolution": "node16"` for proper ESM/CJS interop.
- **Updated `README.md`** and added `AUTHORS.md`.

## Files Changed

38 files changed across the codebase. Key files:

- `src/main/preload.ts` — new preload script
- `src/gui/types/electron-api.ts` — new typed API interface
- `src/main/index.ts` — IPC handlers, Electron lifecycle modernization
- `src/gui/App.tsx` — removed Node.js/Electron imports, async file handling
- `src/gui/io/project-file.ts` — rewritten to use `DataView`/`Uint8Array` instead of `Buffer`/`fs`
- `src/gui/components/control-points-panel/control-point.tsx` — drag bug fix
- `src/gui/components/settings-panel/settings-panel.tsx` — opacity slider
- `webpack.config.js` — Webpack 5 config with 3 targets (main, gui, preload)
- `package.json` — all dependency upgrades
- `jest.config.js` — new Jest 29 config (replaces `webpack.tests.config.js`)

## Testing

- All 3 webpack bundles (main, gui, preload) compile cleanly with zero type errors.
- Existing `.fspy` test data files in `test_data/` load correctly (backward-compatible).
- Jest test suite runs via `npm test`.
