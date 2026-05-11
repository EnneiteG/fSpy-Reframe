# fSpy Upgrade Plan

This document outlines the staged upgrade plan for modernizing the fSpy application from its current outdated stack to current versions.

## Current Stack Summary

| Technology       | Current Version | Target Version |
|------------------|-----------------|----------------|
| Electron         | 8.2.1           | 42.x           |
| TypeScript       | 2.9.1           | 5.8.x          |
| React            | 16.4.0          | 19.x           |
| Redux            | 4.0.0           | 5.x (or Redux Toolkit) |
| react-redux      | 5.0.7           | 9.x            |
| redux-thunk      | 2.3.0           | 3.x (built into RTK)   |
| Webpack          | 4.10.2          | 5.x            |
| Babel            | 6.x             | 7.x            |
| Jest             | 23.x            | 29.x           |
| Konva            | 2.1.3           | 9.x            |
| react-konva      | 1.7.4           | 18.x           |
| TSLint           | 5.10.0          | Remove (migrate to ESLint) |
| electron-builder | 22.4.0          | 25.x           |
| Node.js target   | (implicit ~10)  | 20+ (LTS)      |

---

## Stage 1: TypeScript & Build Toolchain (Foundation)

**Priority: Critical — everything else depends on this.**

### 1.1 Upgrade TypeScript (2.9 → 5.8) ✅

- Updated `typescript` to `^5.8.0`.
- Updated `tsconfig.json`:
  - Set `"target": "ES2022"` (temporarily lowered to `ES2018` in 1.3, restored in 1.4).
  - Set `"module": "commonjs"`.
  - Replaced `"allowSyntheticDefaultImports"` with `"esModuleInterop": true`.
  - Added `"forceConsistentCasingInFileNames": true`.
  - Removed `"allowJs": true` (no `.js` source files exist).
  - Kept `"jsx": "react"` (will switch to `"react-jsx"` after React 17+ upgrade in Stage 3).
- Fixed 3 deprecated `new Buffer()` calls in `src/gui/io/project-file.ts` → `Buffer.from()` / `Buffer.alloc()`.
- Zero type errors — clean compilation with `tsc --noEmit`.

### 1.2 Migrate TSLint → ESLint ✅

- Removed `tslint`, `tslint-config-standard`, `tslint-loader`, `standard`, `standard-loader`.
- Deleted `tslint.json`.
- Installed `eslint@^8.57.0`, `@typescript-eslint/parser@^7.0.0`, `@typescript-eslint/eslint-plugin@^7.0.0`.
- Created `.eslintrc.json` mapping old TSLint rules (indent, eqeqeq off, space-before-function-paren). Permissive rules (`no-explicit-any`, `prefer-const`, `ban-types`) turned off to match existing codebase.
- Removed `tslint-loader` and `standard-loader` rules from `webpack.config.js`.
- Relying on IDE integration for ESLint (no webpack plugin added).
- Result: 0 errors, 92 indent warnings (existing code style).

### 1.3 Remove Babel (ts-loader handles transpilation) ✅

- ~~Upgrade Babel 6 → 7~~ — Babel removed entirely; `ts-loader` with TypeScript 5.8 handles ES downleveling and JSX.
- Removed `babel-core`, `babel-loader`, `babel-preset-es2015`, `babel-preset-es2015-node`, `babel-preset-react`, `babel-preset-stage-2`.
- Deleted `.babelrc`.
- Updated `webpack.config.js`: `.tsx?` rule changed from `['babel-loader', 'ts-loader']` to `'ts-loader'`; removed standalone `.jsx?` → `babel-loader` rule.
- Lowered `tsconfig.json` target from `ES2022` to `ES2018` — Webpack 4's acorn parser cannot handle ES2019+ syntax (optional catch binding, class fields). Will be bumped back to `ES2022` in Stage 1.4.

### 1.4 Upgrade Webpack (4 → 5) ✅

- Updated `webpack` to `^5.98.0`, `webpack-cli` to `^5.1.4`, `webpack-dev-server` to `^5.2.0`.
- Updated `html-webpack-plugin` to `^5.6.3`, `css-loader` to `^7.1.2`, `style-loader` to `^4.0.0`, `ts-loader` to `^9.5.2`.
- `standard-loader` already removed in 1.2.
- Webpack 5 breaking changes addressed:
  - Removed `node: { __dirname: false }` from shared config; moved to `electron-main` config only.
  - Replaced `Object.assign` with spread syntax for config composition.
  - No polyfill issues — Electron targets handle Node.js modules natively.
- Bumped `tsconfig.json` target back to `ES2022` (Webpack 5's parser supports it).
- No `--openssl-legacy-provider` workaround needed (was a Webpack 4 + Node 17+ issue).

---

## Stage 2: Electron Upgrade (Core Platform)

**Priority: Critical — major security and API changes.**

### 2.1 Electron 8 → 12 (initial upgrade)

✅ Done. Upgraded Electron to 12.x with explicit `contextIsolation: false` and `enableRemoteModule: true` to maintain backward compat. Removed `app.allowRendererProcessReuse`, fixed nullable `getMenuItemById` types, converted `require()` to ES imports in main process.

### 2.2 Remove `remote` Module Usage ✅

**Must be done before upgrading past Electron 14** (which removes `enableRemoteModule` entirely).

The `remote` module is removed in modern Electron. All usages must be replaced with IPC:

- **`src/gui/App.tsx`**: Uses `remote.dialog.showErrorBox()` — replace with IPC call to main process.
- **`src/gui/components/splash-screen.tsx`**: Uses `remote.app.getVersion()` — pass version via preload script or IPC.
- **`src/gui/io/project-file.ts`**: Multiple `remote.dialog.showErrorBox()` calls — replace with IPC.

Done. Added `ipcMain.handle('show-error-box')` and `ipcMain.handle('get-app-version')` in main process. Replaced all `remote.dialog.showErrorBox` calls in App.tsx (1), project-file.ts (4) with `ipcRenderer.invoke('show-error-box', ...)`. Replaced `remote.app.getVersion()` in splash-screen.tsx with module-level `ipcRenderer.invoke('get-app-version')` (React 16.4 lacks hooks, so used module-scope async pattern). Removed `remote` import from all three files. Removed `enableRemoteModule: true` from BrowserWindow webPreferences.

### 2.3 Implement Preload Script & Context Bridge ✅

**Must be done before upgrading past Electron 20** (which defaults to `contextIsolation: true`).

Modern Electron requires a preload script to safely expose APIs to the renderer:

- Create `src/main/preload.ts` that uses `contextBridge.exposeInMainWorld()`.
- Expose a typed API object (e.g., `window.electronAPI`) for:
  - File dialogs (open, save).
  - App version info.
  - Error dialogs.
  - Project file I/O.
- Update `BrowserWindow` creation to set:
  ```js
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
  ```

Done. Created `src/main/preload.ts` using `contextBridge.exposeInMainWorld('electronAPI', ...)` exposing: `showErrorBox`, `getAppVersion`, `sendSetDocumentState`, `sendSpecifyProjectPath`, `sendOpenDroppedProject`, `sendSpecifyExportPath`, 7 `on*` listener registrations (newProject, openProject, saveProject, saveProjectAs, openImage, export, setSidePanelVisibility), and `writeClipboardText`. Created `src/gui/types/electron-api.ts` with `ElectronAPI` interface and `Window` augmentation. Added `electron-preload` target to webpack.config.js. Wired `preload: path.join(__dirname, 'preload.js')` in BrowserWindow. Migrated all 6 renderer files off direct `electron` imports: App.tsx (ipcRenderer.on/send/invoke → window.electronAPI), splash-screen.tsx (ipcRenderer.invoke → window.electronAPI.getAppVersion), project-file.ts (ipcRenderer.invoke → window.electronAPI.showErrorBox), ui-state.ts (ipcRenderer.send → window.electronAPI.sendSetDocumentState), table-row.tsx (clipboard → window.electronAPI.writeClipboardText), overlay-3d-panel.tsx (Point type → Point2D). Kept `contextIsolation: false` / `nodeIntegration: true` because renderer still uses `fs`/`Buffer`/`process` directly (Stage 2.4 will remove those, then we flip the switches).

### 2.4 Remove Direct Node.js Usage in Renderer ✅

**Must be done before enabling `contextIsolation: true` / `nodeIntegration: false`.**

Files using Node.js APIs directly in the renderer process:

- `src/gui/io/project-file.ts` — uses `fs.readFileSync`, `Buffer`.
- `src/gui/App.tsx` — uses `readFileSync`.
- `src/gui/io/util.ts` — likely uses Node.js APIs.
- `src/cli/cli.ts` — uses `fs` APIs (CLI is fine, but review if bundled with renderer).

All file system operations must move to the main process, exposed via IPC through the preload script.

Done. Added 5 new IPC handlers in main: `read-file`, `write-file`, `is-project-file`, `get-resource-url`, `get-resource-path`. Moved `isProjectFile()`, `getResourcePath()`, `getResourceURL()`, `getExampleProjectPath()` functions into main process directly (removed `ProjectFile` import from main). Extended preload.ts and `ElectronAPI` interface with matching methods. Rewrote `project-file.ts`: removed `fs` import, replaced `Buffer` ops with `DataView`/`Uint8Array`/`TextEncoder`/`TextDecoder`, made `save()`, `load()`, `loadExample()`, `isProjectFile()` async using IPC. Rewrote `App.tsx`: removed `readFileSync`, made image handlers async via `window.electronAPI.readFile()`, made drop handler async for `isProjectFile`. Rewrote `util.ts`: removed `path`/`process` imports, `loadImage()` takes `Uint8Array`, `resourceURL`/`resourcePath` now async via IPC. Changed `ImageState.data` from `Buffer|null` to `Uint8Array|null`, `SetImage.data` from `Buffer` to `Uint8Array`. Updated `splash-screen.tsx` to resolve `iconURL` via IPC at module load. Fixed `Uint8Array`→`BlobPart` TS 5.8 strict typing. Enabled `contextIsolation: true`, `nodeIntegration: false`. The gui bundle now has zero `external` Node.js/electron dependencies.

### 2.5 Electron 12 → 42 (final upgrade) ✅

**Only after 2.2–2.4 are complete.** With the modern IPC architecture in place, upgrade Electron in hops:

1. **Electron 12 → 20**: Enable `contextIsolation: true`, `nodeIntegration: false`. Remove `enableRemoteModule`.
2. **Electron 20 → 28**: Updated Chromium/Node. Enable `sandbox: true`.
3. **Electron 28 → 42**: Latest security model, performance improvements.

Each hop: install, fix any type errors, build, test.

Done. Upgraded in 4 hops: 12→20 (no fixes needed), 20→28 (fixed `Event` type annotations on `app.on('open-file')` and `window.on('close')` — removed explicit `: Event` parameter types that conflicted with stricter Electron overloads, enabled `sandbox: true`), 28→35 (fixed `Event` type on `enter-full-screen`/`leave-full-screen` handlers), 35→42 (fixed `File.path` — no longer available as a property in sandboxed renderer; added `webUtils.getPathForFile` to preload via `window.electronAPI.getPathForFile(file)` as the modern Electron replacement). Also replaced deprecated `url.format()` with template literal `file://` URL, removed `url` import.

### 2.6 Remove Deprecated Electron APIs ✅

- Replace `require('url')` with `new URL()` or `pathToFileURL()` (if not already done).
- Update `BrowserWindow.loadURL()` calls if needed.
- Update `dialog` API calls (some method signatures changed).
- Review and update `ipcMain`/`ipcRenderer` usage patterns (use `ipcMain.handle`/`ipcRenderer.invoke` for request-response).

Done. Replaced `app.on('ready')` with `app.whenReady().then()`. Fixed `getResourceURL()` — was incorrectly using `path.join()` with `file://` prefix (produces backslash paths on Windows); now uses `pathToFileURL().href` for correct cross-platform file URLs. Replaced `startUrl` template literal with `pathToFileURL().href`. Cleaned up duplicate `path` import (was importing both `path` default and `{ basename, join }` destructured); now uses `path.join()`, `path.basename()` consistently. Verified dialog APIs (already promise-based), IPC patterns (already using `handle`/`invoke` for request-response, `on`/`send` for fire-and-forget).

### 2.7 Update electron-builder ✅

- Update `electron-builder` to `^25.x`.
- Update build config: remove `ia32` targets if 32-bit support is not needed.
- Add `arm64` targets for Apple Silicon Macs.
- Update `@types/electron-window-state` or remove if types are bundled.

Done. Upgraded `electron-builder` from ^22.4.0 to 25.1.8. Removed Windows `ia32` targets (nsis and zip) — only `x64` remains. Updated Mac target from bare `"dmg"` string to structured format with `arch: ["x64", "arm64"]` for Apple Silicon support. Kept `@types/electron-window-state@^2.0.33` — `electron-window-state` does not bundle its own types. All 3 webpack bundles compile cleanly.

---

## Stage 3: React & UI Framework

**Priority: High — required for modern component patterns.**

React and react-konva are peer-coupled. react-konva@18 requires React >=18 and konva >=7.2.5. They must be upgraded together.

### 3.1 Upgrade React 16 → 18 + Konva 2 → 9 + react-konva 1.7 → 18 ✅

These are tightly coupled and must move together:
- Update `react` and `react-dom` to `^18.3.1`.
- Update `@types/react` to `^18.3.28` and `@types/react-dom` to `^18.3.7`.
- Replace `ReactDOM.render()` with `createRoot()` in `src/gui/index.tsx`:
  ```tsx
  import { createRoot } from 'react-dom/client'
  const root = createRoot(document.getElementById('root')!)
  root.render(<Provider store={store}><App /></Provider>)
  ```
- Update `konva` to `^9.3.22` and `react-konva` to `^18.2.14`.
- Review Konva API changes (v2 → v9 is a major jump). Test all canvas-based UI (control points, viewport rendering).
- Address any `StrictMode` double-render issues if present.

Done. Installed react 18.3.1, react-dom 18.3.1, @types/react 18.3.28, @types/react-dom 18.3.7, konva 9.3.22, react-konva 18.2.14. Replaced `ReactDOM.render()` with `createRoot()` in index.tsx. Fixed React 18 type breaking changes: (1) added `children?: React.ReactNode` to `CameraPresetFormProps` (children no longer implicit in React 18 types), (2) typed `connect()` exports in settings-container.tsx and result-container.tsx with `as unknown as React.ComponentType<OwnProps>` to preserve the `isVisible` own prop (old @types/react-redux@6 loses prop inference with React 18 types), (3) added explicit type for `measureRef` destructuring in control-points-panel.tsx, (4) renamed `componentWillMount` to `componentDidMount` in App.tsx (`componentWillMount` was removed in React 18 — silently not called, which broke all IPC handler registration). No Konva API changes needed — canvas code compiled without modifications.

### 3.2 Upgrade react-measure ✅

- `react-measure@2.5.2` is the latest and final version. Verify it works with React 18.
- Update `@types/react-measure` to `^2.0.12`.
- If it breaks, replace with native `ResizeObserver` API.

Done. Upgraded react-measure from 2.0.2 to 2.5.2 and @types/react-measure from 2.0.2 to 2.0.12. Works with React 18 without issues.

---

## Stage 4: State Management ✅

**Priority: Medium — modernize Redux usage.**

### 4.1 Upgrade Redux Stack ✅

Minimal upgrade (keep current Redux patterns):
- Update `redux` to `^5.0.1`, `react-redux` to `^9.2.0`, `redux-thunk` to `^3.1.0`.
- Remove `@types/react-redux` (types are bundled in react-redux@9).
- Fix breaking type changes.

Done. Upgraded redux from ^4.0.0 to ^5.0.1, react-redux from ^5.0.7 to ^9.2.0, redux-thunk from ^2.3.0 to ^3.1.0. Removed `@types/react-redux` (types now bundled in react-redux@9). Fixed breaking changes:
- `store.ts`: Changed `import thunk from 'redux-thunk'` to named import `import { thunk } from 'redux-thunk'` (default export removed in v3). Replaced `createStore` with `legacy_createStore as createStore` to suppress Redux 5 deprecation warning. Removed unused `AnyAction`, `Store`, `StoreState` imports; simplified generic type parameters (4-param generic removed in Redux 5).
- `root.ts`: Removed explicit `<StoreState>` generic from `combineReducers` (signature changed in Redux 5 — generic is now the reducers map `M`, not the state type). Added `as unknown as Reducer<StoreState>` export cast to maintain correct store typing (Redux 5's `PreloadedState` inference fails with custom action union types that lack index signatures).
- `app-middleware.ts`: Typed `action` parameter as `unknown` (Redux 5 `Middleware` type change). Destructured `type` with `ActionTypes` cast for `indexOf` compatibility. Used `as any` on both `store.dispatch` calls (custom action interfaces don't satisfy `UnknownAction`'s index signature requirement).
- `solver-result.ts`: Replaced deprecated `AnyAction` import with `AppAction` from actions for consistency with all other reducers.
- All existing `connect()` calls, `Dispatch<AppAction>`, `ThunkAction`, `ThunkDispatch`, and `Provider` usage work without changes. All 3 webpack bundles (main, gui, preload) compile cleanly.

Optional future work (not part of this upgrade):
- Migrate to Redux Toolkit (`@reduxjs/toolkit` with `configureStore`, `createSlice`).
- Convert `connect()` components to function components with typed hooks.

---

## Stage 5: Testing Infrastructure ✅

**Priority: Medium — ensure tests work with new stack.**

### 5.1 Upgrade Jest ✅

- Update `jest` to `^29.7.0`, `@types/jest` to `^29.5.14`.
- Update `jest-junit` to `^17.0.0`.
- Install `ts-jest@^29.4.0` for TypeScript support (replaces webpack-based test compilation).
- Create `jest.config.js` configuration file.
- Remove `webpack.tests.config.js` (no longer needed with ts-jest).
- Update test scripts in `package.json`.

Done. Upgraded jest from ^23.1.0 to ^29.7.0, @types/jest from ^23.0.0 to ^29.5.14, jest-junit from ^5.0.0 to ^17.0.0. Installed ts-jest@^29.4.0 as TypeScript transform (replaces the old webpack-based test compilation pipeline). Created `jest.config.js` with `preset: 'ts-jest'`, `testEnvironment: 'node'`, roots pointing to `tests/`, matching `*tests.ts` and `*specs.ts` patterns, and `jest-junit` reporter. Used `.js` config (not `.ts`) to avoid an extra `ts-node` dependency. Removed `webpack.tests.config.js` (no longer needed — ts-jest compiles TypeScript inline). Removed `prebuild-test`, `build-test`, and `pretest` scripts from package.json (the old flow was: trash `__tests__/` → webpack-compile tests → run jest on compiled JS; now jest runs directly on `.ts` source via ts-jest). Removed the inline `"jest"` and `"jest-junit"` config blocks from package.json (moved to `jest.config.js`). Both test files run: `main_tests.ts` passes, `gui_tests.ts` has a pre-existing intentional failure (`PlaceHolderFailingTest` expects `1+2 === 4`).

---

## Stage 6: Developer Experience & Cleanup

**Priority: Low — nice-to-haves.**

### 6.1 Modernize Package Scripts

- Replace `trash-cli` with `rimraf@^6.1.3` (cross-platform, well-maintained).
- Simplify `pre*` scripts.
- Add a `start` script for development.
- Add cross-platform `electron-dev` script (current uses `DEV=true` which is Unix-only).

### 6.2 Dependency Audit

- Update `minimist` to `^1.2.8` (already at latest).
- Update `electron-window-state` to `^5.0.3` and `@types/electron-window-state` to `^5.0.2`.
- Remove `trash-cli` after replacing with `rimraf`.
- Run `npm audit` and fix vulnerabilities.

### 6.3 Consider Build Tool Migration (optional)

Webpack 5 works but is heavy. Evaluate alternatives:
- **Vite + vite-plugin-electron**: Much faster dev experience, HMR support.
- **electron-vite**: Purpose-built for Electron + Vite.
- **esbuild-loader** for webpack: Keep webpack but use esbuild for faster transpilation.

This is optional and would be a separate effort.

---

## Execution Notes

- **Test after each stage.** Each stage should result in a buildable, runnable application.
- **Create a branch per stage** for easier rollback.
- **Konva upgrade (Stage 3.1) is a risk area** — the jump from v2 to v9 is massive and may require significant canvas code rewrites.
- **react-redux@9 drops `connect()` support for class components** — this may require converting container components to function components with hooks during Stage 4.
