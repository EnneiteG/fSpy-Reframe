# Dependency Upgrade Baseline

Baseline captured on `dependencies-update` before dependency upgrades.

## Environment

- OS: Windows
- Node.js: `v22.14.0`
- npm: `11.2.0`
- Corepack: `0.31.0`
- Yarn: `1.22.22` via `corepack yarn`
- Project recommended Node.js: `22.14.0` from `.nvmrc`

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
- After upgrading to `electron-builder@26.8.1`, Node.js `22.12.0` or newer is required because the packaging toolchain depends on `@electron/rebuild@4.x`.
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

## Phase 7 Renderer Isolation

Renderer Node integration was disabled after moving the remaining file, resource and clipboard operations behind the preload bridge.

Changes applied:

- Enabled `nodeIntegration: false` and `contextIsolation: true` for the main `BrowserWindow`.
- Removed direct renderer imports of `fs`, `path` and `electron`.
- Moved project file parsing and serialization into `src/gui/io/project-file-format.ts`, which uses browser-compatible `Uint8Array`, `DataView`, `TextEncoder` and `TextDecoder` APIs.
- Routed project/image file reads, project file writes, dropped project validation, resource path lookup and clipboard writes through `window.fSpyElectron`.
- Kept main-process startup/open-file behavior on the same `.fspy` format helpers so command-line file opening and macOS `open-file` handling continue to use the same validation logic.
- Updated project file tests to run against the preload API surface instead of renderer Node APIs.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Deferred updates:

- IPC file operations are still synchronous to preserve existing renderer control flow during this incremental phase.
- Electron remains on `8.2.1`; a later phase can now focus on the Electron major-version upgrade with renderer isolation already in place.

## Phase 7 Electron Upgrade, Palier 1

Electron was upgraded to an intermediate major version before attempting a recent supported Electron version.

Updated packages:

- `electron`: `8.2.1` -> `12.2.3`

Code changes:

- Updated Babel Electron target from `8.2` to `12.2`.
- Adjusted menu item access for Electron 12 typings, where `Menu.getMenuItemById(...)` can return `null`.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- Dev app smoke launch: Electron process stayed running after 5 seconds and was stopped manually.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked` with Electron `12.2.3`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Manual validation still required:

- Open a `.fspy` project file.
- Export camera JSON and target camera JSON.
- Confirm splash icon, example project and drag/drop remain functional after the Electron runtime upgrade.

Manual validation result:

- Splash icon, example project, drag/drop image, `.fspy` opening and JSON export were confirmed working manually.

## Phase 7 Electron Upgrade, Palier 2

Electron was upgraded from the intermediate major version to a more recent Electron runtime while keeping `electron-builder` unchanged for the next dedicated palier.

Updated packages:

- `electron`: `12.2.3` -> `22.3.27`

Code changes:

- Updated Babel Electron target from `12.2` to `22.3`.
- Removed obsolete `app.allowRendererProcessReuse`, which is no longer present in Electron 22.
- Explicitly kept `sandbox: false` because Electron 20+ sandboxes renderers by default when Node integration is disabled; this app's preload still uses Node-backed APIs for local file/resource bridging. Enabling sandbox remains deferred.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- Dev app smoke launch: Electron process stayed running after 5 seconds and was stopped manually.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked` with Electron `22.3.27`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Manual validation still required:

- Re-test splash icon, example project, drag/drop image, `.fspy` opening and JSON export on Electron `22.3.27` before updating `electron-builder`.

Manual validation result:

- Splash icon, example project, drag/drop image, `.fspy` opening and JSON export were confirmed working manually.

## Phase 7 Electron Upgrade, Palier 3

The packaging toolchain was updated after validating Electron `22.3.27` with the previous builder.

Updated packages:

- `electron-builder`: `22.4.0` -> `26.8.1`

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked` with Electron `22.3.27` and `electron-builder` `26.8.1`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Observed packaging notes:

- `electron-builder` now runs `@electron/rebuild` during packaging.
- `electron-builder` reports duplicate dependency references from the existing React/Redux dependency tree but still completes successfully.
- Windows unpacked packaging now reports a `signtool.exe` signing step for the executable.

Manual validation still required:

- Re-test splash icon, example project, drag/drop image, `.fspy` opening and JSON export after the builder update.

Manual validation result:

- Splash icon, example project, drag/drop image, `.fspy` opening and JSON export were confirmed working manually after the builder update.

## Phase 8 React 16 Compatibility Palier

The first UI dependency palier updated React within the React 16 line before attempting React 18/19.

Updated packages:

- `react`: `16.4.0` -> `16.14.0`
- `react-dom`: `16.4.0` -> `16.14.0`
- `react-konva`: `1.7.4` -> `1.7.16`

Notes:

- `react-konva` was kept on the `1.7.x` line to avoid combining this React compatibility step with a major Konva renderer migration.
- `react-konva@1.7.16` relaxes the React peer dependency to `^16.0.0`, avoiding the invalid dependency tree reported by `electron-builder` when using `react@16.14.0` with `react-konva@1.7.4`.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Manual validation still required:

- Re-test the control point UI before proceeding to React 18/19 or a major Konva/react-konva upgrade.

## Phase 8 React Redux Palier

React Redux was upgraded without migrating away from the existing `connect` API.

Updated packages:

- `react-redux`: `5.0.7` -> `7.2.9`
- `@types/react-redux`: `6.0.28` -> `7.1.34`

Notes:

- Existing class components and `connect(...)` usage were retained.
- Redux and Redux Thunk were already on modern 4.x/2.x versions from the runtime dependency phase.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Manual validation still required:

- Re-test UI state changes such as side panel visibility, calibration controls and result updates before proceeding to React 18/19.

## Phase 8 React Redux 8 Palier

React Redux was upgraded to its current React 16/17/18-compatible major version while retaining the existing `connect` API.

Updated packages:

- `react-redux`: `7.2.9` -> `8.1.3`
- Removed direct `@types/react-redux` because React Redux 8 ships its own TypeScript types.

Notes:

- Existing class components and `connect(...)` usage were retained.
- React remains on `16.14.0`; React Redux 8 supports React `^16.8 || ^17.0 || ^18.0`, so this remains a bridge step before React 18.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Manual validation still required:

- Re-test UI state changes such as side panel visibility, calibration controls and result updates before proceeding to React 18/19.

## Phase 8 React 18 and Konva Palier

React and the Konva renderer stack were upgraded to React 18-compatible versions after validating React Redux 8.

Updated packages:

- `react`: `16.14.0` -> `18.2.0`
- `react-dom`: `16.14.0` -> `18.2.0`
- `@types/react`: `16.14.69` -> `18.2.79`
- `@types/react-dom`: `16.9.25` -> `18.2.25`
- `konva`: `2.1.3` -> `8.4.3`
- `react-konva`: `1.7.16` -> `18.2.14`

Code changes:

- Replaced `ReactDOM.render(...)` with `createRoot(...).render(...)` in the GUI entrypoint.
- Made `CameraPresetFormProps.children` explicit because React 18 types no longer add implicit `children` props.
- Added a `react-reconciler@0.29.0` Yarn resolution so `react-konva@18.2.14` uses the React 18.2-compatible reconciler patch instead of a newer patch that peers on React 18.3.

Validation commands:

```powershell
corepack yarn verify
corepack yarn dist-preview
```

Results:

- `verify`: success, `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.
- Packaged Windows app smoke launch: process stayed running after 5 seconds and was stopped manually.

Manual validation still required:

- Re-test the control point UI before proceeding to React 19 or any further Konva changes.
- Specifically check vanishing points, horizon, origin, reference distance handles, overlay 3D and magnifying glass interactions.

Manual validation result:

- Control point UI validation was confirmed working manually after the React 18/Konva upgrade.
- Checked vanishing points, horizon, origin, reference distance, overlay 3D and zoom/magnifying glass interactions.

## Phase 9 Maintenance CI

Maintenance guardrails were added so future dependency updates run through explicit Windows CI checks and update grouping.

CI changes:

- Kept mandatory Windows CI on push, pull request, manual dispatch and weekly Monday schedule.
- Kept frozen lockfile install with `corepack yarn install --frozen-lockfile`.
- Added explicit `lint`, development build, test bundle build, unit tests, export/project tests and package preview steps.
- Kept uploading the unpacked Windows app artifact from `dist/win-unpacked`.
- Updated the Windows release workflow to use `corepack yarn` consistently.

Dependency automation:

- Added Dependabot weekly npm updates.
- Grouped patch/minor updates into security patch, build tooling, Electron, React UI and tests/lint groups.
- Ignored semver-major updates so majors cannot be auto-merged through grouped dependency automation.

Review checklist:

- Added a pull request template requiring validation commands and dependency update checks.
- Added explicit Electron validation coverage for app launch, menus, dialogs, drag/drop, resources, `.fspy` open/save and JSON export.
- Added explicit React/Konva visual validation coverage for vanishing points, horizon, origin, reference distance, overlay 3D and zoom/magnifying glass.

Validation commands:

```powershell
corepack yarn install --frozen-lockfile
corepack yarn lint
corepack yarn build-dev
corepack yarn build-test
corepack yarn test:unit
corepack yarn test:export-project
corepack yarn verify
corepack yarn dist-preview
```

Results:

- All validation commands completed successfully.
- `test:unit`: `1` suite passed, `4` tests passed.
- `test:export-project`: `2` suites passed, `8` tests passed.
- `verify`: `3` suites passed, `12` tests passed.
- `dist-preview`: success, Windows x64 unpacked app generated in `dist/win-unpacked`.
