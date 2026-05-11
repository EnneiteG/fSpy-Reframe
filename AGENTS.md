# AGENTS.md — fSpy Upgrade Constraints & Instructions

## Project Overview

fSpy is a cross-platform Electron desktop application for camera matching from still images. It uses React for the UI, Konva/react-konva for canvas rendering, and Redux for state management. The app is being upgraded from a 2018-era stack to modern versions.

## Upgrade Reference

See [update-plan.md](update-plan.md) for the staged upgrade plan with version targets and task breakdown.

## General Constraints

- **Do not change application behavior.** All upgrades must preserve existing functionality. The app should look and behave identically to the user after each stage.
- **Do not remove features.** If an API is removed in a newer version, find the replacement — do not drop the feature.
- **Keep the GPL-3.0 license.** Do not introduce dependencies with incompatible licenses (e.g., SSPL, proprietary, AGPL in some contexts). Prefer MIT/Apache-2.0/BSD/ISC licensed packages.
- **Test after every stage.** Each stage in the upgrade plan must result in a buildable, runnable application. Do not move to the next stage until the current one is verified.
- **One stage at a time.** Do not combine stages unless explicitly told to. Each stage should be a separate commit or set of commits.
- **Keep the plan up to date.** After completing each stage, update `update-plan.md` to reflect the actual work done. If unplanned actions were taken (workarounds, scope changes, extra fixes), add them to the relevant stage. Mark completed stages with ✅.
- **Preserve the project file format.** The `.fspy` binary format (documented in `project_file_format.md`) must remain backward-compatible. Existing `.fspy` files in `test_data/` must load correctly after upgrades.

## Code Style & Patterns

- Use TypeScript strict mode. Do not add `@ts-ignore` or `any` to work around upgrade issues — fix the types properly.
- Prefer `const` over `let`. Never use `var`.
- Use ES module import syntax (`import/export`), not `require()`, in TypeScript source files.
- Indent with 2 spaces. LF line endings.
- Do not add comments explaining what upgraded code does unless the pattern is non-obvious. Do not add JSDoc to unchanged code.
- Do not refactor or "improve" code beyond what is necessary for the upgrade. Resist the urge to modernize patterns that are working fine.

## Electron-Specific Rules

- **Context isolation must be enabled** (`contextIsolation: true`) once Electron is upgraded past v12.
- **Node integration must be disabled** in the renderer (`nodeIntegration: false`). All Node.js API access from the renderer must go through a preload script using `contextBridge`.
- **Do not use the `remote` module.** Replace all `remote` usage with proper IPC (`ipcMain.handle` / `ipcRenderer.invoke` for request-response, `ipcMain.on` / `ipcRenderer.send` for fire-and-forget).
- **Do not use `eval()` or `new Function()`** in renderer code. CSP must be compatible with `unsafe-eval` being disabled.
- **Preload script must be minimal.** Only expose the narrowest API surface needed. Do not expose raw `ipcRenderer` to the renderer.
- **Sandbox should be enabled** (`sandbox: true`) in the final Electron version.

## React Rules

- When upgrading React, use `createRoot` (React 18+). Do not use the legacy `ReactDOM.render`.
- Existing class components do not need to be converted to function components as part of this upgrade unless required by a dependency change.
- Do not introduce new class components. Any new code should use function components with hooks.

## Redux Rules

- If migrating to Redux Toolkit, convert one slice at a time. Do not attempt a big-bang migration.
- Keep the existing action type strings stable — they may be referenced in middleware or persistence logic.

## Build & Tooling

- Webpack config must produce two bundles: `main` (electron-main target) and `gui` (electron-renderer target), plus a preload script.
- The preload script must be bundled separately with `target: 'electron-preload'`.
- Do not switch from Webpack to Vite/esbuild unless explicitly requested. The plan includes this as an optional future step.
- ESLint must be configured before TSLint is removed. Both can coexist temporarily during migration.

## Testing

- All existing tests in `tests/` must continue to pass after each upgrade stage.
- Test with the `.fspy` files in `test_data/` to verify project file compatibility.
- On Windows, verify the app builds and runs. On macOS/Linux, verify if CI is available.

## Dependencies

- Pin major versions in `package.json` (e.g., `^5.8.0`, not `*` or `latest`).
- Run `npm audit` (or `yarn audit`) after each dependency upgrade and fix critical/high vulnerabilities before proceeding.
- Prefer well-maintained packages with recent releases. If a dependency is unmaintained, find an alternative.

## File Structure

- Do not restructure the `src/` directory layout unless a dependency requires it.
- New files (e.g., `preload.ts`, `.eslintrc.json`, `jest.config.ts`) should be placed in conventional locations.
- The preload script source should go in `src/main/preload.ts`.
