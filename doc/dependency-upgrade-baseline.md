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
