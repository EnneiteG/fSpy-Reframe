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

### 2.4 Remove Direct Node.js Usage in Renderer

**Must be done before enabling `contextIsolation: true` / `nodeIntegration: false`.**

Files using Node.js APIs directly in the renderer process:

- `src/gui/io/project-file.ts` — uses `fs.readFileSync`, `Buffer`.
- `src/gui/App.tsx` — uses `readFileSync`.
- `src/gui/io/util.ts` — likely uses Node.js APIs.
- `src/cli/cli.ts` — uses `fs` APIs (CLI is fine, but review if bundled with renderer).

All file system operations must move to the main process, exposed via IPC through the preload script.

### 2.5 Electron 12 → 42 (final upgrade)

**Only after 2.2–2.4 are complete.** With the modern IPC architecture in place, upgrade Electron in hops:

1. **Electron 12 → 20**: Enable `contextIsolation: true`, `nodeIntegration: false`. Remove `enableRemoteModule`.
2. **Electron 20 → 28**: Updated Chromium/Node. Enable `sandbox: true`.
3. **Electron 28 → 42**: Latest security model, performance improvements.

Each hop: install, fix any type errors, build, test.

### 2.6 Remove Deprecated Electron APIs

- Replace `require('url')` with `new URL()` or `pathToFileURL()` (if not already done).
- Update `BrowserWindow.loadURL()` calls if needed.
- Update `dialog` API calls (some method signatures changed).
- Review and update `ipcMain`/`ipcRenderer` usage patterns (use `ipcMain.handle`/`ipcRenderer.invoke` for request-response).

### 2.7 Update electron-builder

- Update `electron-builder` to `^25.x`.
- Update build config: remove `ia32` targets if 32-bit support is not needed.
- Add `arm64` targets for Apple Silicon Macs.
- Update `@types/electron-window-state` or remove if types are bundled.

---

## Stage 3: React & UI Framework

**Priority: High — required for modern component patterns.**

### 3.1 Upgrade React (16 → 19)

Recommended incremental path: 16 → 18 → 19.

**React 16 → 18:**
- Update `react` and `react-dom` to `^18.x`.
- Replace `ReactDOM.render()` with `createRoot()` in `src/gui/index.tsx`:
  ```tsx
  import { createRoot } from 'react-dom/client'
  const root = createRoot(document.getElementById('root')!)
  root.render(<Provider store={store}><App /></Provider>)
  ```
- Update `@types/react` and `@types/react-dom` to `^18.x`.
- Address any `StrictMode` double-render issues.

**React 18 → 19:**
- Update to `react` and `react-dom` `^19.x`.
- Update type packages to `^19.x`.
- Review and address any deprecation warnings.

### 3.2 Upgrade Konva & react-konva

- Update `konva` to `^9.x` and `react-konva` to `^18.x`.
- Review API changes — Konva 9 has significant changes from v2.
- Test all canvas-based UI (control points, viewport rendering).
- `react-konva` 18 is designed for React 18 — align these upgrades.

### 3.3 Upgrade react-measure

- Update `react-measure` to latest or evaluate alternatives (e.g., `ResizeObserver` API directly, `@react-hook/resize-observer`).
- `react-measure` may be unmaintained — consider replacing with native `ResizeObserver`.

---

## Stage 4: State Management

**Priority: Medium — modernize Redux usage.**

### 4.1 Upgrade Redux Stack

Option A — **Minimal upgrade** (keep current Redux patterns):
- Update `redux` to `^5.x`, `react-redux` to `^9.x`, `redux-thunk` to `^3.x`.
- Fix breaking type changes.

Option B — **Migrate to Redux Toolkit** (recommended):
- Install `@reduxjs/toolkit`.
- Convert reducers to use `createSlice()`.
- Replace manual store creation with `configureStore()` (thunk middleware included by default).
- Convert thunks to `createAsyncThunk()`.
- Remove `redux-thunk` as a separate dependency.

### 4.2 Type-Safe Store

- Define `RootState` and `AppDispatch` types from the store.
- Use typed hooks (`useAppSelector`, `useAppDispatch`) instead of untyped `connect()`.
- Gradually migrate class components using `connect()` to function components with hooks.

---

## Stage 5: Testing Infrastructure

**Priority: Medium — ensure tests work with new stack.**

### 5.1 Upgrade Jest (23 → 29)

- Update `jest` to `^29.x`, `@types/jest` to `^29.x`.
- Replace `jest-junit` with latest version.
- Install `ts-jest` for TypeScript support (replaces webpack-based test compilation).
- Create `jest.config.ts` configuration file.
- Remove `webpack.tests.config.js` (no longer needed with ts-jest).
- Update test scripts in `package.json`.

### 5.2 Add Testing Library

- Consider adding `@testing-library/react` for component tests.
- Add `@testing-library/jest-dom` for DOM matchers.

---

## Stage 6: Developer Experience & Cleanup

**Priority: Low — nice-to-haves.**

### 6.1 Modernize Package Scripts

- Replace `trash-cli` with `rimraf` or `del-cli` (or use `rm -rf` with cross-platform support).
- Simplify `pre*` scripts.
- Add a `start` script for development.
- Consider using `concurrently` to run Electron + webpack-dev-server together.
- Add `electron-dev` script that works cross-platform (current uses `DEV=true` which is Unix-only).

### 6.2 Consider Build Tool Migration

Webpack 5 works but is heavy. Evaluate alternatives:
- **Vite + vite-plugin-electron**: Much faster dev experience, HMR support.
- **electron-vite**: Purpose-built for Electron + Vite.
- **esbuild-loader** for webpack: Keep webpack but use esbuild for faster transpilation.

This is optional but would significantly improve developer experience.

### 6.3 Dependency Audit

- Update `minimist` to latest.
- Update `electron-window-state` to latest.
- Remove `standard` and `standard-loader` (replaced by ESLint).
- Review all `@types/*` packages — some may be unnecessary with modern versions that bundle types.
- Run `npm audit` and fix vulnerabilities.

### 6.4 Add Modern Tooling

- Add `.nvmrc` or `.node-version` specifying Node.js 20+.
- Add `prettier` for code formatting.
- Add `husky` + `lint-staged` for pre-commit hooks (optional).
- Update `.gitignore` if needed.

---

## Execution Notes

- **Test after each stage.** Each stage should result in a buildable, runnable application.
- **Stage 1 and 2 are tightly coupled** — Webpack 5 + Electron 42 must both understand the new module/target system. It may be practical to combine them.
- **Create a branch per stage** for easier rollback.
- **The `remote` module removal (Stage 2.2–2.4) is the single largest refactor** — it touches the IPC architecture throughout the app.
- **Konva upgrade (Stage 3.2) is a risk area** — the jump from v2 to v9 is massive and may require significant canvas code rewrites.
