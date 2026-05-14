# fSpy Reframe

fSpy Reframe is a modernized fork of [fSpy](https://fspy.io), an open source application for still image camera matching. It preserves fSpy's original calibration model and `.fspy` project format while adding target-specific camera workflows for DCCs and engines.

The project started as fSpy-UE, focused on Unreal Engine camera output. It has since grown into a broader maintained fork with Unreal Engine and Blender presets, updated dependencies, safer file handling, and workflow fixes.

![fSpy Reframe screenshot](doc/images/Capture_01.png)

## Highlights

- Modern Electron, React, Redux, TypeScript and Webpack stack.
- Compatible with existing `.fspy` project files.
- Unreal Engine target preset with Unreal-friendly coordinates, centimeters and Roll/Pitch/Yaw output.
- Blender target preset with Blender XYZ Euler rotation output in degrees.
- Target camera JSON export for copy/paste or custom pipeline tooling.
- Raw fSpy camera JSON export for low-level integration.
- Free reference distance mode for measuring scale from arbitrary image handles on a selected plane.
- AVIF image import support alongside common raster image formats.
- Safer save/export defaults, extension handling and packaged app smoke tests.

## Target Presets

The solver still computes the same fSpy camera. Target presets only change how that solved camera is displayed and exported.

`fSpy`

Native fSpy coordinates and axis-angle rotation.

`Unreal Engine`

Displays position in Unreal's X-forward, Y-right, Z-up coordinate system, converts supported units to centimeters, and reports rotation as Roll, Pitch and Yaw in degrees.

`Blender`

Displays position in Blender-compatible coordinates and reports rotation as XYZ Euler angles in degrees, matching Blender's camera rotation convention.

Scene orientation options can rotate the target frame without changing the underlying calibration. This is useful when the image's main forward direction does not match the target application's default forward axis.

## Original fSpy And Blender Importer

The original fSpy project is available at:

https://github.com/stuffmatic/fSpy

If you only need to import `.fspy` projects directly into Blender, the official importer add-on remains useful:

https://github.com/stuffmatic/fSpy-Blender

fSpy Reframe is useful when you want the desktop calibration workflow plus target-specific camera values and JSON exports from the app itself.

## Development

Node.js 22.14.0 is the recommended development runtime. The repository includes an `.nvmrc` file, and npm is the package manager for this fork.

Install dependencies:

```bash
npm ci
```

Build development bundles once:

```bash
npm run build-dev
```

Run the renderer dev server:

```bash
npm run dev-server
```

Start Electron against the dev server in another terminal:

```bash
npm run electron-dev
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

## Validation

Run lint, development build and the full Jest suite:

```bash
npm run verify
```

Run only the main process tests:

```bash
npm run test:unit
```

Run project/export compatibility tests:

```bash
npm run test:export-project
```

## Packaging

Build an unpacked app for local smoke testing:

```bash
npm run dist-preview
```

On Windows, this creates `dist/win-unpacked/fSpy Reframe.exe`.

Run the packaged smoke test:

```bash
npm run smoke:packaged
```

Build the Windows installer and zip archive:

```bash
npm run dist-win
```

The release workflow builds the same Windows artifacts on tags matching `v*`, uploads them to the GitHub Release, and runs a smoke launch of the packaged app before publishing.

## Repository Layout

- `src/main`: Electron main process, windows, menus, IPC handlers and file system access.
- `src/main/preload.ts`: context-isolated API bridge exposed as `window.electronAPI`.
- `src/gui`: React/Redux renderer UI, calibration controls and solver display.
- `src/gui/solver`: camera matching math, target presets and coordinate conversions.
- `tests`: Jest tests for main process helpers, project files, reducers, solver utilities and GUI conversion logic.
- `doc/release-notes`: release notes used for GitHub Releases.

## Security Model

The renderer has no direct Node.js or Electron access. Electron runs with `contextIsolation: true`, `nodeIntegration: false` and `sandbox: true`. Renderer access to native capabilities goes through the typed preload API and IPC handlers in the main process.

## License

fSpy Reframe is licensed under GPL-3.0, following the original fSpy project.
