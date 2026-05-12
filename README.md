## What is this?

fSpy is an open source, cross platform app for still image camera matching. See [fspy.io](https://fspy.io) for more info. The source code is available under the GPL license.

## Purpose of this fork

fSpy-UE is a fork of fSpy focused on making the camera matching workflow easier to use with [Unreal Engine](https://www.unrealengine.com/).

The goal is to keep fSpy's original calibration model intact while adding target-specific output options. In practice, this means the solved camera data remains compatible with fSpy, but the UI and exports can present the same camera in Unreal-friendly coordinates, units and rotation order.

This fork currently adds an Unreal Engine target preset, scene orientation options, Unreal-style camera rotation display and a target camera JSON export. These additions are intended to reduce manual coordinate conversion when recreating a matched camera in Unreal Engine.

![fSpy screenshot](screenshot.jpg)

## Release notes

### v0.4.0-ue

This release modernizes the app stack while preserving the fSpy-UE Unreal workflow.

- Upgraded the desktop stack to Electron 42, React 18, Redux 5, Webpack 5, TypeScript 5.9 and Jest 29.
- Migrated the fork from Yarn to npm with `package-lock.json` as the canonical lockfile.
- Replaced legacy renderer access to Electron/Node APIs with a sandboxed preload bridge exposed as `window.electronAPI`.
- Added and retained tests for project-file compatibility, solver math utilities, reducers and Unreal target camera conversions.
- Kept fSpy-UE identity, Windows setup/zip packaging, Unreal target presets, target axis mapping and target JSON export.
- Fixed drag and drop image/project loading after the Electron security migration.
- Fixed fullscreen menu restoration and changed the fullscreen shortcut to `F11`.
- Included upstream fixes for sandbox clipboard copy, development resource loading and control points getting stuck after dragging outside the canvas.

## Using the computed camera parameters in other applications

In theory, camera parameters computed by fSpy could be used in any application that has a notion of a 3D camera and provides some way of setting the camera parameters. If you're a Blender user, have a look at the [offical fSpy importer add-on](https://github.com/stuffmatic/fSpy-Blender). If you're using an application without a dedicated importer, you may still be able to manually copy the camera parameters from fSpy.

Interested in writing an importer for your favorite application? Then the [fSpy project file format spec](https://github.com/stuffmatic/fSpy/blob/develop/project_file_format.md) is a good starting point.

## Building and running

The following instructions are for developers. If you just want to run the app, download the latest build from the [fSpy-UE releases page](https://github.com/EnneiteG/fSpy-UE/releases).

fSpy is written in [Typescript](https://www.typescriptlang.org) using [Electron](https://electronjs.org), [React](https://reactjs.org) and [Redux](https://redux.js.org). [Visual Studio Code](https://code.visualstudio.com) is recommended for a pleasant editing experience.

Node.js 22 is the recommended development runtime for the current Electron build stack. The repository includes an `.nvmrc` file for this purpose. npm is the package manager for this fork.

To install necessary dependencies, run:

```
npm ci
```

The `src` folder contains `main` and `gui`, containing code for the [Electron main and renderer processes](https://electronjs.org/docs/tutorial/application-architecture) respectively, and `cli`, which contains a command-line interface for processing fSpy project files without the GUI. The main process includes a preload script (`src/main/preload.ts`) that bridges the renderer and main processes via IPC.

Here's how to run the app in development mode:

1. Run `npm run dev-server` in a separate terminal tab to start the dev server.
2. Run `npm run build-dev` to build the main, preload, and GUI code. This build step is needed to generate main process and preload code used to start up the app.
3. Run `npm run electron-dev` in a separate terminal tab to start an Electron instance which uses the dev server to provide automatic reloading on GUI code changes.

To test a packaged app without creating installers, run:

```
npm run dist-preview
```

On Windows, this creates an unpacked app in `dist/win-unpacked`.

When launching the unpacked app from a terminal, make sure `ELECTRON_RUN_AS_NODE` is not set. That variable is used by Electron tooling to run Electron as a Node.js binary; if it leaks into the app launch environment, the app exits immediately instead of opening a window. In PowerShell, clear it for the current session with:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
```

## Creating binaries for distribution

To create installers and archives for all configured platforms, run:

```
npm run dist
```

which invokes [Electron builder](https://github.com/electron-userland/electron-builder).

To create a Windows installer locally, run:

```
npm run dist-win
```

On Windows, this creates an x64 NSIS setup executable in `dist/`. GitHub also has a `Windows Release` workflow that builds the same installer. Pushing a tag such as `v0.4.0-ue` creates a GitHub Release and attaches the generated installer. The generated file names use the version from `package.json`.
