## What is this?

fSpy is an open source, cross platform app for still image camera matching. See [fspy.io](https://fspy.io) for more info. The source code is available under the GPL license.

## Purpose of this fork

fSpy-UE is a fork of fSpy focused on making the camera matching workflow easier to use with [Unreal Engine](https://www.unrealengine.com/).

The goal is to keep fSpy's original calibration model intact while adding target-specific output options. In practice, this means the solved camera data remains compatible with fSpy, but the UI and exports can present the same camera in Unreal-friendly coordinates, units and rotation order.

This fork currently adds an Unreal Engine target preset, scene orientation options, Unreal-style camera rotation display and a target camera JSON export. These additions are intended to reduce manual coordinate conversion when recreating a matched camera in Unreal Engine.

![fSpy screenshot](screenshot.jpg)

## Using the computed camera parameters in other applications

In theory, camera parameters computed by fSpy could be used in any application that has a notion of a 3D camera and provides some way of setting the camera parameters. If you're a Blender user, have a look at the [offical fSpy importer add-on](https://github.com/stuffmatic/fSpy-Blender). If you're using an application without a dedicated importer, you may still be able to manually copy the camera parameters from fSpy.

Interested in writing an importer for your favorite application? Then the [fSpy project file format spec](https://github.com/stuffmatic/fSpy/blob/develop/project_file_format.md) is a good starting point.


## Building and running

The following instructions are for developers. If you just want to run the app, [download the latest executable for your platform](https://github.com/stuffmatic/fSpy/releases).

fSpy is written in [Typescript](https://www.typescriptlang.org) using [Electron](https://electronjs.org), [React](https://reactjs.org) and [Redux](https://redux.js.org). [Visual Studio Code](https://code.visualstudio.com) is recommended for a pleasant editing experience.

To install necessary dependencies, run

```
corepack enable
yarn
```

Node.js 16 is the recommended development runtime for this legacy Electron/Webpack stack. The repository includes an `.nvmrc` file for this purpose. Newer Node.js versions can still be used; the build scripts automatically enable Webpack 4's required legacy OpenSSL provider when needed.

The `src` folder contains two subfolders `main` and `gui`, containing code for the [Electron main and renderer processes](https://electronjs.org/docs/tutorial/application-architecture) respectively.

Here's how to run the app in development mode

1. Run `yarn dev-server` in a separate terminal tab to start the dev server
2. Run `yarn build-dev` to build both the main and GUI code. This build step is needed to generate main process code used to start up the app.
3. Run `yarn electron-dev` in a separate terminal tab to start an Electron instance which uses the dev server to provide automatic reloading on GUI code changes.

To test a packaged app without creating installers, run:

```
yarn dist-preview
```

On Windows, this creates `dist/win-unpacked/fSpy.exe`.

⚠️ The current build process is not ideal. For example, it lacks support for live reloading on main process code changes. Changes to main process code require a manual rebuild, i.e steps 2-3, in order to show up in the app.


## Creating binaries for distribution

To create executables for distribution, run

```
yarn dist
```

which invokes [Electron builder](https://github.com/electron-userland/electron-builder).
