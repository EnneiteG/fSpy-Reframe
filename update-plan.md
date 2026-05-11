# fSpy Upgrade Plan

This document outlines the staged upgrade plan for modernizing the fSpy application from its current outdated stack to current versions.

## Current Stack Summary

| Technology       | Current Version | Target Version |
|------------------|-----------------|----------------|
| Electron         | 8.2.1           | 35.x           |
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

### 1.1 Upgrade TypeScript (2.9 → 5.8)

- Update `typescript` dependency to `^5.8.0`.
- Update `tsconfig.json`:
  - Set `"target": "ES2022"`.
  - Set `"module": "commonjs"` (or `"ES2022"` if switching to ESM later).
  - Add `"esModuleInterop": true` (replaces `allowSyntheticDefaultImports`).
  - Add `"forceConsistentCasingInFileNames": true`.
  - Remove `"allowJs": true` if no `.js` source files exist.
  - Set `"jsx": "react-jsx"` (once React 17+ is in place).
- Fix any new type errors introduced by stricter type checking.

### 1.2 Migrate TSLint → ESLint

- Remove `tslint`, `tslint-config-standard`, `tslint-loader`.
- Remove `tslint.json`.
- Install `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`.
- Create `.eslintrc.json` with rules approximating the current TSLint config.
- Remove the `tslint-loader` rule from `webpack.config.js`.
- Add an ESLint webpack plugin or rely on IDE integration.

### 1.3 Remove Babel (ts-loader handles transpilation)

- ~~Upgrade Babel 6 → 7~~ — Babel removed entirely; `ts-loader` with TypeScript 5.8 handles ES downleveling and JSX.
- Removed `babel-core`, `babel-loader`, `babel-preset-es2015`, `babel-preset-es2015-node`, `babel-preset-react`, `babel-preset-stage-2`.
- Deleted `.babelrc`.
- Updated `webpack.config.js`: `.tsx?` rule changed from `['babel-loader', 'ts-loader']` to `'ts-loader'`; removed standalone `.jsx?` → `babel-loader` rule.
- Lowered `tsconfig.json` target from `ES2022` to `ES2018` — Webpack 4's acorn parser cannot handle ES2019+ syntax (optional catch binding, class fields). Will be bumped back to `ES2022` in Stage 1.4.

### 1.4 Upgrade Webpack (4 → 5)

- Update `webpack` to `^5.x`, `webpack-cli` to `^5.x`, `webpack-dev-server` to `^5.x`.
- Update `html-webpack-plugin` to `^5.x`.
- Update `css-loader` to `^7.x`, `style-loader` to `^4.x`.
- Update `ts-loader` to `^9.x`.
- Remove `standard-loader` (deprecated).
- Address Webpack 5 breaking changes:
  - `node: { __dirname: false }` is no longer valid; use `node: false` or configure `resolve.fallback`.
  - Adjust `output` and `target` settings for Electron.
  - Review polyfill changes (Webpack 5 no longer polyfills Node.js core modules by default).

---

## Stage 2: Electron Upgrade (Core Platform)

**Priority: Critical — major security and API changes.**

### 2.1 Incremental Electron Upgrade Path

Due to massive API changes between Electron 8 and 35, an incremental approach is recommended:

1. **Electron 8 → 12**: Introduces `contextIsolation` default, removes `remote` module to `@electron/remote`.
2. **Electron 12 → 20**: `contextIsolation: true` and `nodeIntegration: false` become defaults.
3. **Electron 20 → 28+**: ESM support, updated Chromium/Node.
4. **Electron 28 → 35**: Latest security model, performance improvements.

### 2.2 Remove `remote` Module Usage

The `remote` module is removed in modern Electron. All usages must be replaced with IPC:

- **`src/gui/App.tsx`**: Uses `remote.dialog.showErrorBox()` — replace with IPC call to main process.
- **`src/gui/components/splash-screen.tsx`**: Uses `remote.app.getVersion()` — pass version via preload script or IPC.
- **`src/gui/io/project-file.ts`**: Multiple `remote.dialog.showErrorBox()` calls — replace with IPC.

### 2.3 Implement Preload Script & Context Bridge

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

### 2.4 Remove Direct Node.js Usage in Renderer

Files using Node.js APIs directly in the renderer process:

- `src/gui/io/project-file.ts` — uses `fs.readFileSync`, `Buffer`.
- `src/gui/App.tsx` — uses `readFileSync`.
- `src/gui/io/util.ts` — likely uses Node.js APIs.
- `src/cli/cli.ts` — uses `fs` APIs (CLI is fine, but review if bundled with renderer).

All file system operations must move to the main process, exposed via IPC through the preload script.

### 2.5 Remove Deprecated Electron APIs

- Remove `app.allowRendererProcessReuse = true` (default in modern Electron).
- Replace `require('url')` with `new URL()` or `pathToFileURL()`.
- Update `BrowserWindow.loadURL()` calls if needed.
- Update `dialog` API calls (some method signatures changed).
- Review and update `ipcMain`/`ipcRenderer` usage patterns (use `ipcMain.handle`/`ipcRenderer.invoke` for request-response).

### 2.6 Update electron-builder

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
- **Stage 1 and 2 are tightly coupled** — Webpack 5 + Electron 35 must both understand the new module/target system. It may be practical to combine them.
- **Create a branch per stage** for easier rollback.
- **The `remote` module removal (Stage 2.2–2.4) is the single largest refactor** — it touches the IPC architecture throughout the app.
- **Konva upgrade (Stage 3.2) is a risk area** — the jump from v2 to v9 is massive and may require significant canvas code rewrites.
