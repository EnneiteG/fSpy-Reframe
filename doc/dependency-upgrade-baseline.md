# Dependency Upgrade Baseline

Baseline captured on `dependencies-update` before dependency upgrades.

## Environment

- OS: Windows
- Node.js: `v22.14.0`
- npm: `11.2.0`
- Corepack: `0.31.0`
- Yarn: `1.22.22` via `corepack yarn`
- Project recommended Node.js: `16.20.2` from `.nvmrc`

## Setup

Command:

```powershell
corepack yarn install --frozen-lockfile
```

Result: success.

Observed warnings:

- `tslint-config-standard > tslint-eslint-rules@5.4.0` has an old TypeScript peer dependency.
- Workspaces warning because the package is not private.
- `corepack enable` could not write global shims under `C:\Program Files\nodejs` without elevated permissions, but `corepack yarn` works.

## Verification

Command:

```powershell
corepack yarn verify
```

Result: success.

- `build-dev`: success with Webpack 4.
- Tests: `2` suites passed, `4` tests passed.

Observed warnings:

- npm warns about legacy env configs: `argv`, `version-commit-hooks`, `version-git-message`, `version-git-tag`, `version-tag-prefix`.
- TSLint deprecated rules: `no-unused-variable`, `no-use-before-declare`.
- Several TSLint rules require type information but lint runs without it.
- Babel deoptimizes large generated output for `react-dom` and `konva`.
- Jest `testResultsProcessor` is deprecated in favor of reporters.

## Packaging Preview

Command:

```powershell
corepack yarn dist-preview
```

Result: success.

- `build-dist`: success.
- Electron Builder packaged Windows x64 app to `dist/win-unpacked`.
- Main executable generated: `dist/win-unpacked/fSpy UE.exe`.
- If `ELECTRON_RUN_AS_NODE=1` is present in the launching terminal, the packaged app exits immediately because Electron starts in Node mode instead of app mode. Clear it before launching from PowerShell with `Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue`.

Observed downloads:

- Electron `8.2.1` Windows x64 runtime.
- Electron Builder `winCodeSign-2.6.0` helper archive.

## Baseline Notes

- The current dependency set can install, build, test and package on Node.js `22.14.0` when Yarn is launched through Corepack.
- The stack is operational but contains maintenance risks: Electron 8, Webpack 4, Babel 6, Jest 23, TSLint and deprecated Electron renderer patterns.
- Future dependency changes should be validated against this baseline with at least `corepack yarn verify` and `corepack yarn dist-preview`.

## Phase 2 Regression Coverage

Additional dependency-upgrade guard tests were added before changing dependency versions.

Command:

```powershell
corepack yarn verify
```

Result: success.

- Test suites: `3` passed.
- Tests: `10` passed.

Coverage added:

- Unreal target camera export payload shape, labels, location conversion, rotation values, field of view and image dimensions.
- Unreal location scaling for all reference distance units.
- `.fspy` project compatibility for legacy state without camera parameters or target display settings.
- `.fspy` fallback behavior for old yards units, missing camera preset data and missing target scene orientation.
- CLI validation for missing options, invalid dimensions and missing state file.

## Phase 3 Compatibility Fixes

Low-risk compatibility fixes were applied before dependency version changes.

Command:

```powershell
corepack yarn verify
```

Result: success.

- Test suites: `3` passed.
- Tests: `12` passed.

Fixes applied:

- Replaced deprecated `new Buffer(...)` calls with `Buffer.from(...)` and `Buffer.alloc(...)`.
- Added controlled `.fspy` project load failure for invalid serialized project JSON.
- Added controlled CLI failure for invalid or unreadable project state JSON.
- Replaced React `componentWillMount` with `componentDidMount` for app startup registration.

Coverage added:

- Invalid `.fspy` state JSON does not dispatch a loaded project state.
- Invalid CLI state JSON reports a readable error instead of throwing.

## Phase 4 Low-Risk Dependency Updates

Patch/minor runtime dependency updates were applied without changing Electron, React, Webpack, Babel, Jest, TSLint or Konva.

Updated packages:

- `minimist`: `1.2.0` -> `1.2.8`
- `react-measure`: `2.0.2` -> `2.5.2`
- `redux`: `4.0.0` -> `4.2.1`
- `redux-thunk`: `2.3.0` -> `2.4.2`

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.

Deferred updates:

- Electron, Electron Builder, React, React DOM, React Redux, React Konva, Konva, Webpack, Babel, Jest, TypeScript and TSLint remain pinned for later dedicated migration phases.

## Phase 5 Build Toolchain Migration

The build pipeline was migrated from Webpack 4/Babel 6 to Webpack 5/Babel 7 while keeping Electron, React, Jest and TSLint on their existing major versions.

Updated build packages:

- `webpack`: `4.10.2` -> `5.106.2`
- `webpack-cli`: `3.0.1` -> `5.1.4`
- `webpack-dev-server`: `3.1.4` -> `4.15.2`
- `ts-loader`: `8.4.0` -> `9.5.4`
- `babel-loader`: `7.1.4` -> `9.2.1`
- `html-webpack-plugin`: `3.2.0` -> `5.6.0`
- `css-loader`: `0.28.11` -> `6.11.0`
- `style-loader`: `0.21.0` -> `3.3.4`
- Added Babel 7 packages: `@babel/core`, `@babel/preset-env`, `@babel/preset-react`.
- Removed obsolete Babel 6 packages and `standard-loader`.

Configuration changes:

- Updated `.babelrc` to Babel 7 presets targeting Electron `8.2`.
- Updated Webpack loader syntax for Webpack 5.
- Updated `dev-server` from `webpack-dev-server --content-base` to `webpack serve` with `devServer.static`.
- Removed the Webpack 4 OpenSSL legacy provider workaround from `scripts/run-webpack-tool.js`.
- Disabled Jest transforms because tests are already bundled by Webpack before Jest executes them.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
corepack yarn dev-server
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.
- `dev-server`: success, served on `http://localhost:8080/`.

Deferred updates:

- Jest still uses version `23.6.0`; its transform pipeline is disabled for bundled test files and should be modernized in a dedicated test-tooling phase.
- TSLint and `tslint-loader` remain in place and continue to emit legacy warnings; ESLint migration remains a separate phase.

## Phase 6 Preload Bridge Preparation

Electron renderer access was moved toward a preload/contextBridge API without yet disabling renderer Node integration. This keeps the migration incremental while preparing for a later Electron major upgrade.

Changes applied:

- Added a dedicated `preload` Webpack entry that emits `build/preload.js`.
- Added `src/preload/index.ts` to expose a minimal `window.fSpyElectron` API.
- Routed renderer app-version, error-box and document-state operations through the preload API instead of importing `ipcRenderer`/`remote` directly from renderer modules.
- Added typed renderer-side access through `src/gui/electron-api.ts`, with a test fallback for non-Electron test execution.
- Configured `BrowserWindow` with the preload script while temporarily keeping `nodeIntegration: true` and `contextIsolation: false` until project file IO is moved out of the renderer.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, `preload.js` emitted and Windows x64 unpacked app generated in `dist/win-unpacked`.

Deferred updates:

- `nodeIntegration: false` is deferred until renderer `fs` access for project open/save/export is moved behind IPC.
- `contextIsolation: true` is deferred to the same follow-up so the renderer no longer depends on direct Node globals.
- Electron remains on `8.2.1`; the preload bridge is a preparation step, not the Electron major-version upgrade itself.
