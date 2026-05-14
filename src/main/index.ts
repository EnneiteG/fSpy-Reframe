/**
 * fSpy
 * Copyright (c) 2020 - Per Gantelius
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, clipboard, shell, screen } from 'electron'
import { OpenProjectMessage, OpenImageMessage, SaveProjectMessage, SaveProjectAsMessage, NewProjectMessage, ExportMessage, ExportType, SetSidePanelVisibilityMessage, RunSmokeTestMessage } from './ipc-messages'
import path from 'path'
import { pathToFileURL } from 'url'

import windowStateKeeper from 'electron-window-state'
import { SpecifyProjectPathMessage, SpecifyExportPathMessage, SetDocumentStateMessage, OpenDroppedProjectMessage, RegisterFilePathMessage } from '../gui/ipc-messages'
import AppMenuManager from './app-menu-manager'
import { Palette } from '../gui/style/palette'
import { existsSync, openSync, writeSync, closeSync, readFileSync, realpathSync } from 'fs'
import { CLI } from '../cli/cli'
import { EXAMPLE_PROJECT_FILENAME, isProjectFileData } from '../gui/io/project-file-format'
import { exportFileOptions, pathWithExportExtension } from './export-file-options'
import { IMAGE_FILE_EXTENSIONS } from '../gui/io/image-format'
import type { SmokeTestOptions, SmokeTestResult } from './smoke-test-options'
import { safeWindowBounds } from './window-bounds'
import { pathWithProjectExtension, projectSaveDialogOptions } from './project-file-options'

let mainWindow: Electron.BrowserWindow | null = null

export interface DocumentState {
  hasUnsavedChanges: boolean
  filePath: string | null,
  isExampleProject: boolean
}

let documentState: DocumentState | null = null

let initialOpenMessage: OpenProjectMessage | null = null
let windowHasAppeared = false
let smokeTestOptions: SmokeTestOptions | null = null
const allowedReadFilePaths = new Set<string>()
const allowedWriteFilePaths = new Set<string>()

const allowedResourceFileNames = new Set([
  EXAMPLE_PROJECT_FILENAME,
  'icon.svg',
  'icon.png'
])

// macOS only
app.on('open-file', (event, filePath) => {
  if (mainWindow === null) {
    initialOpenMessage = new OpenProjectMessage(registerOpenProjectPath(filePath), false)
    if (windowHasAppeared) {
      // The main window has appeared at least once but there is
      // currently no window. Create one
      createWindow()
    }
  } else {
    showDiscardChangesDialogIfNeeded(mainWindow, (didCancel: boolean) => {
      event.preventDefault()
      if (!didCancel) {
        openProject(filePath, mainWindow!)
      }
    })
  }
})

function openProject(filePath: string, window: BrowserWindow) {
  const projectPath = registerOpenProjectPath(filePath)
  app.addRecentDocument(projectPath)
  window.webContents.send(
    OpenProjectMessage.type,
    new OpenProjectMessage(projectPath, false)
  )
}

function openImage(filePath: string, window: BrowserWindow) {
  const imagePath = allowReadPath(filePath)
  window.webContents.send(
    OpenImageMessage.type,
    new OpenImageMessage(imagePath)
  )
}

function getResourcePath(fileName: string): string {
  if (!allowedResourceFileNames.has(fileName) || path.basename(fileName) !== fileName) {
    throw new Error('Resource is not allowed')
  }

  let resourcePath: string
  if (!app.isPackaged) {
    resourcePath = path.join(process.cwd(), 'assets/electron', fileName)
  } else if (process.resourcesPath != null) {
    resourcePath = path.join(process.resourcesPath, fileName)
  } else {
    return ''
  }
  return allowReadPath(resourcePath)
}

function getResourceURL(fileName: string): string {
  const resourcePath = getResourcePath(fileName)
  if (resourcePath) {
    return pathToFileURL(resourcePath).href
  }
  return ''
}

function getExampleProjectPath(): string {
  return getResourcePath(EXAMPLE_PROJECT_FILENAME)
}

function isAllowedNavigationURL(url: string): boolean {
  return url.startsWith('https://github.com/') || url.startsWith('https://stuffmatic.com/')
}

function getSmokeTestOptions(): SmokeTestOptions | null {
  if (process.env.FSPY_SMOKE_TEST !== '1') {
    return null
  }

  const imagePath = process.env.FSPY_SMOKE_IMAGE_PATH
  const exportPath = process.env.FSPY_SMOKE_EXPORT_PATH
  if (!imagePath || !exportPath) {
    throw new Error('FSPY_SMOKE_IMAGE_PATH and FSPY_SMOKE_EXPORT_PATH are required for smoke tests')
  }

  return { imagePath, exportPath }
}

function resolveExistingPath(filePath: string): string {
  if (!path.isAbsolute(filePath)) {
    throw new Error('Path must be absolute')
  }
  return realpathSync(filePath)
}

function resolveWritablePath(filePath: string): string {
  if (!path.isAbsolute(filePath)) {
    throw new Error('Path must be absolute')
  }

  const parentPath = path.dirname(filePath)
  if (!existsSync(parentPath)) {
    throw new Error('Parent directory does not exist')
  }

  return path.join(realpathSync(parentPath), path.basename(filePath))
}

function allowReadPath(filePath: string): string {
  if (!filePath) {
    throw new Error('Path is required')
  }
  const resolvedPath = resolveExistingPath(filePath)
  allowedReadFilePaths.add(resolvedPath)
  return resolvedPath
}

function allowWritePath(filePath: string): string {
  if (!filePath) {
    throw new Error('Path is required')
  }
  const resolvedPath = resolveWritablePath(filePath)
  allowedWriteFilePaths.add(resolvedPath)
  return resolvedPath
}

function allowProjectWritePath(filePath: string): string {
  const projectPath = pathWithProjectExtension(filePath)
  allowWritePath(projectPath)
  return projectPath
}

function registerOpenProjectPath(filePath: string): string {
  const projectPath = allowReadPath(filePath)
  allowWritePath(projectPath)
  return projectPath
}

function assertAllowedReadPath(filePath: string): string {
  const resolvedPath = resolveExistingPath(filePath)
  if (!allowedReadFilePaths.has(resolvedPath)) {
    throw new Error('Read path is outside allowed locations')
  }
  return resolvedPath
}

function assertAllowedWritePath(filePath: string): string {
  const resolvedPath = resolveWritablePath(filePath)
  if (!allowedWriteFilePaths.has(resolvedPath)) {
    throw new Error('Write path is outside allowed locations')
  }
  return resolvedPath
}

function isProjectFilePath(filePath: string): boolean {
  try {
    return isProjectFileData(readFileSync(assertAllowedReadPath(filePath)).slice(0, 4))
  } catch {
    return false
  }
}

function createWindow() {
  const minWidth = 800
  const minHeight = 768
  let mainWindowState = windowStateKeeper({
    defaultWidth: minWidth,
    defaultHeight: minHeight
  })
  const initialWindowBounds = safeWindowBounds(
    {
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height
    },
    screen.getAllDisplays().map((display) => display.workArea),
    { width: minWidth, height: minHeight }
  )

  let windowIconPath: string | undefined
  if (process.resourcesPath) {
    if (process.platform == 'darwin') {
      // macOS uses the app bundle icon.
    } else if (process.platform == 'win32') {
      windowIconPath = path.join(process.resourcesPath, 'icon.ico')
    } else {
      windowIconPath = path.join(process.resourcesPath, 'icon.png')
    }
  }

  let window = new BrowserWindow({
    ...initialWindowBounds,
    minWidth: minWidth,
    minHeight: minHeight,
    show: false,
    icon: windowIconPath,
    backgroundColor: Palette.imagePanelBackgroundColor,
    webPreferences: {
      // Allow loading local files in dev mode
      webSecurity: process.env.DEV === undefined,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  mainWindowState.manage(window)
  mainWindow = window

  let appMenuManager: AppMenuManager

  const restoreMenuBar = () => {
    window.setAutoHideMenuBar(false)
    window.setMenuBarVisibility(true)
  }

  const applyFullScreenState = (isFullScreen: boolean) => {
    window.webContents.send(
      SetSidePanelVisibilityMessage.type,
      new SetSidePanelVisibilityMessage(!isFullScreen)
    )
    appMenuManager.setEnterFullScreenItemEnabled(!isFullScreen)
    appMenuManager.setExitFullScreenItemEnabled(isFullScreen)
    if (!isFullScreen) {
      restoreMenuBar()
    }
  }

  const setFullScreenMode = (isFullScreen: boolean) => {
    window.setFullScreen(isFullScreen)
    applyFullScreenState(isFullScreen)
  }

  appMenuManager = new AppMenuManager(
    {
      onNewProject: () => {
        if (mainWindow) {
          showDiscardChangesDialogIfNeeded(mainWindow, (didCancel: boolean) => {
            if (!didCancel) {
              window.webContents.send(
                NewProjectMessage.type,
                new NewProjectMessage()
              )
            }
          })
        } else {
          createWindow()
        }
      },
      onOpenProject: () => {
        showDiscardChangesDialogIfNeeded(mainWindow, (didCancel: boolean) => {
          if (!didCancel) {
            if (mainWindow) {
              dialog.showOpenDialog(
                mainWindow,
                {
                  filters: [
                    { name: 'fSpy project files', extensions: ['fspy'] }
                  ],
                  properties: ['openFile']
                }
              ).then((result) => {
                if (!result.canceled) {
                  openProject(result.filePaths[0], window)
                }
              }).catch(() => {
                // dialog canceled or failed
              })
            } else {
              dialog.showOpenDialog(
                {
                  filters: [
                    { name: 'fSpy project files', extensions: ['fspy'] }
                  ],
                  properties: ['openFile']
                }
              ).then((result) => {
                if (!result.canceled) {
                  initialOpenMessage = new OpenProjectMessage(registerOpenProjectPath(result.filePaths[0]), false)
                  createWindow()
                }
              }).catch(() => {
                // dialog canceled or failed
              })
            }
          }
        })
      },
      onSaveProject: () => {
        window.webContents.send(
          SaveProjectMessage.type,
          new SaveProjectMessage()
        )
      },
      onSaveProjectAs: () => {
        dialog.showSaveDialog(
          window,
          projectSaveDialogOptions(documentState?.filePath || null, documentState?.isExampleProject || false)
        ).then((result) => {
          if (!result.canceled && result.filePath !== undefined) {
            const projectPath = allowProjectWritePath(result.filePath)
            window.webContents.send(
              SaveProjectAsMessage.type,
              new SaveProjectAsMessage(projectPath)
            )
          }
        }).catch(() => {
          // dialog canceled or failed
        })
      },
      onOpenImage: () => {
        dialog.showOpenDialog(
          window,
          {
            properties: ['openFile'],
            filters: [
              { name: 'Image files', extensions: IMAGE_FILE_EXTENSIONS },
              { name: 'All files', extensions: ['*'] }
            ]
          }
        ).then((result) => {
          if (!result.canceled) {
            openImage(result.filePaths[0], window)
          }
        }).catch(() => {
          // dialog canceled or failed
        })
      },
      onOpenExampleProject: () => {
        showDiscardChangesDialogIfNeeded(mainWindow, (didCancel: boolean) => {
          if (!didCancel) {
            let projectPath = getExampleProjectPath()
            if (mainWindow) {
              window.webContents.send(
                OpenProjectMessage.type,
                new OpenProjectMessage(projectPath, true)
              )
            } else {
              initialOpenMessage = new OpenProjectMessage(projectPath, true)
              createWindow()
            }
          }
        })
      },
      onExportJSON: () => {
        window.webContents.send(
          ExportMessage.type,
          new ExportMessage(ExportType.CameraParametersJSON)
        )
      },
      onExportTargetJSON: () => {
        window.webContents.send(
          ExportMessage.type,
          new ExportMessage(ExportType.TargetCameraParametersJSON)
        )
      },
      onExportProjectImage: () => {
        window.webContents.send(
          ExportMessage.type,
          new ExportMessage(ExportType.ProjectImage)
        )
      },
      onQuit: () => {
        app.quit()
      },
      onEnterFullScreenMode: () => {
        setFullScreenMode(true)
      },
      onExitFullScreenMode: () => {
        setFullScreenMode(false)
      }
    }
  )

  // Prevent following links, e.g when they are dropped
  // on the app window
  window.webContents.on('will-navigate', ev => {
    if (process.env.DEV === undefined) {
      ev.preventDefault()
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigationURL(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.DEV === undefined
            ? "default-src 'self'; img-src 'self' file: blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'"
            : "default-src 'self' http://localhost:8080 ws://localhost:8080; img-src 'self' file: blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'"
        ]
      }
    })
  })

  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return
    }

    if (input.key === 'F11') {
      event.preventDefault()
      setFullScreenMode(!window.isFullScreen())
    } else if (input.key === 'Escape' && window.isFullScreen()) {
      event.preventDefault()
      setFullScreenMode(false)
    }
  })

  window.on('ready-to-show', () => {
    refreshTitle(window)
    window.show()
    window.focus()
    windowHasAppeared = true

    documentState = {
      hasUnsavedChanges: false,
      filePath: null,
      isExampleProject: false
    }

    if (initialOpenMessage) {
      window.webContents.send(
        OpenProjectMessage.type,
        new OpenProjectMessage(initialOpenMessage.filePath, false)
      )
    } else {
      // Check if an image or project path was passed as an argument
      const argCount = process.argv.length
      const openCommand = process.argv[argCount - 2]
      const filePath = process.argv[argCount - 1]
      if (openCommand == 'open' && filePath) {
        try {
          // Make sure the file can be opened before proceeding
          const fd = openSync(allowReadPath(filePath), 'r')
          closeSync(fd)

          if (isProjectFilePath(filePath)) {
            openProject(filePath, window)
          } else {
            openImage(filePath, window)
          }
        } catch (error) {
          console.log(error)
          console.log('process.argv:')
          console.log(process.argv)

          const errorMessage = 'Failed to open \'' + filePath + '\'. ' + error
          dialog.showMessageBoxSync(window, {
            message: errorMessage
          })
        }
      }
    }

    if (process.env.DEV && process.env.FSPY_OPEN_DEVTOOLS === '1') {
      window.webContents.openDevTools({ mode: 'bottom' })
    }

    if (smokeTestOptions) {
      window.webContents.send(
        RunSmokeTestMessage.type,
        new RunSmokeTestMessage(smokeTestOptions.imagePath, smokeTestOptions.exportPath)
      )
    }
  })

  const startUrl = pathToFileURL(path.join(__dirname, '../build/index.html')).href

  const devUrl = 'http://localhost:8080'

  window.loadURL(
    process.env.DEV ? devUrl : startUrl
  ).then(() => {
    // loaded
  }).catch(() => {
    // load failed
  })

  Menu.setApplicationMenu(appMenuManager.menu)
  appMenuManager.setExitFullScreenItemEnabled(false)

  window.on('close', (event) => {
    showDiscardChangesDialogIfNeeded(window, (didCancel: boolean) => {
      if (didCancel) {
        event.preventDefault()
      } else {
        ipcMain.removeAllListeners(SetDocumentStateMessage.type)
        ipcMain.removeAllListeners(SpecifyProjectPathMessage.type)
        ipcMain.removeAllListeners(SpecifyExportPathMessage.type)
        ipcMain.removeAllListeners(OpenDroppedProjectMessage.type)
        ipcMain.removeAllListeners(RegisterFilePathMessage.type)
        ipcMain.removeAllListeners('SmokeTestResultMessage')
        appMenuManager.setOpenImageItemEnabled(false)
        appMenuManager.setSaveAsItemEnabled(false)
        appMenuManager.setSaveItemEnabled(false)
        appMenuManager.setEnterFullScreenItemEnabled(false)
        appMenuManager.setExitFullScreenItemEnabled(false)
        mainWindow = null
        documentState = null
        initialOpenMessage = null
      }
    })
  })

  window.on('enter-full-screen', () => {
    applyFullScreenState(true)
    window.setMenuBarVisibility(false)
  })

  window.on('leave-full-screen', () => {
    applyFullScreenState(false)
    setTimeout(restoreMenuBar, 0)
  })

  ipcMain.on(SpecifyProjectPathMessage.type, () => {
    // TODO: DRY
    dialog.showSaveDialog(
      window,
      projectSaveDialogOptions(documentState?.filePath || null, documentState?.isExampleProject || false)
    ).then((result) => {
      if (!result.canceled && result.filePath) {
        const projectPath = allowProjectWritePath(result.filePath)
        window.webContents.send(
          SaveProjectAsMessage.type,
          new SaveProjectAsMessage(projectPath)
        )
      }
    }).catch(() => {
      // dialog canceled or failed
    })
  })

  ipcMain.on(SpecifyExportPathMessage.type, (_: Electron.IpcMainEvent, message: SpecifyExportPathMessage) => {
    // TODO: DRY
    const fileOptions = exportFileOptions(message.exportType, message.data)
    const smokeExportPath = smokeTestOptions?.exportPath
    if (smokeExportPath) {
      allowWritePath(smokeExportPath)
      writeExportFile(smokeExportPath, fileOptions.defaultExtension, message.data)
    } else {
      dialog.showSaveDialog(
        window,
        fileOptions.saveDialogOptions
      ).then((result) => {
        if (!result.canceled && result.filePath) {
          allowWritePath(pathWithExportExtension(result.filePath, fileOptions.defaultExtension))
          writeExportFile(result.filePath, fileOptions.defaultExtension, message.data)
        }
      }).catch(() => {
        // dialog canceled or failed
      })
    }
  })

  function writeExportFile(filePath: string, defaultExtension: string, data: SpecifyExportPathMessage['data']) {
    const exportPath = assertAllowedWritePath(pathWithExportExtension(filePath, defaultExtension))
    const file = openSync(exportPath, 'w')
    if (typeof data === 'string') {
      writeSync(file, data)
    } else {
      writeSync(file, exportFileDataToBuffer(data))
    }
    closeSync(file)
  }

  function exportFileDataToBuffer(data: Exclude<SpecifyExportPathMessage['data'], string>): Buffer {
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data)
    }
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  }

  ipcMain.on(OpenDroppedProjectMessage.type, (_: Electron.IpcMainEvent, message: OpenDroppedProjectMessage) => {
    showDiscardChangesDialogIfNeeded(window, (didCancel: boolean) => {
      if (!didCancel) {
        registerOpenProjectPath(message.filePath)
        openProject(message.filePath, window)
      }
    })
  })

  ipcMain.on(RegisterFilePathMessage.type, (_: Electron.IpcMainEvent, message: RegisterFilePathMessage) => {
    allowReadPath(message.filePath)
  })

  function refreshTitle(window: BrowserWindow) {
    let title = 'Untitled'

    if (documentState !== null) {
      if (documentState.isExampleProject) {
        title = 'Example project'
      } else if (documentState.filePath !== null) {
        title = path.basename(documentState.filePath)
      }

      if (documentState.hasUnsavedChanges) {
        if (process.platform !== 'darwin') {
          title += ' (modified)'
        } else {
          // using window.setDocumentEdited on mac
        }
      }

      if (documentState.filePath) {
        window.setRepresentedFilename(documentState.filePath)
      } else {
        window.setRepresentedFilename('')
      }

      window.setDocumentEdited(documentState.hasUnsavedChanges)
    }

    if (process.platform !== 'darwin') {
      title += ' - fSpy UE'
    }

    window.setTitle(title)
  }

  ipcMain.on(SetDocumentStateMessage.type, (_: Electron.IpcMainEvent, message: SetDocumentStateMessage) => {
    if (documentState !== null) {
      if (message.filePath !== undefined) {
        documentState.filePath = message.filePath
      }
      if (message.hasUnsavedChanges !== undefined) {
        documentState.hasUnsavedChanges = message.hasUnsavedChanges
      }

      if (message.isExampleProject !== undefined) {
        documentState.isExampleProject = message.isExampleProject
        appMenuManager.setSaveItemEnabled(!message.isExampleProject)
      }
    }
    refreshTitle(window)
  })

  ipcMain.on('SmokeTestResultMessage', (_: Electron.IpcMainEvent, result: SmokeTestResult) => {
    if (!smokeTestOptions) {
      return
    }

    if (!result.success) {
      console.error(result.message || 'Smoke test failed')
      app.exit(1)
      return
    }

    app.exit(0)
  })
}

function showDiscardChangesDialogIfNeeded(
  window: BrowserWindow | null,
  callback: (didCancel: boolean) => void
) {
  if (documentState === null) {
    callback(false)
    return
  }

  if (window === null) {
    callback(false)
    return
  }

  if (documentState.hasUnsavedChanges) {
    let result = dialog.showMessageBoxSync(
      window!,
      {
        type: 'question',
        buttons: ['Discard', 'Cancel'],
        title: 'Proceed?',
        message: 'Do you want to discard unsaved changes?'
      }
    )
    callback(result != 0)
  } else {
    callback(false)
  }
}

// IPC handlers for renderer requests (replacing remote module usage)
ipcMain.handle('show-error-box', (_event, title: string, content: string) => {
  dialog.showErrorBox(title, content)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('read-file', (_event, filePath: string): Uint8Array => {
  const buffer = readFileSync(assertAllowedReadPath(filePath))
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
})

ipcMain.handle('write-file', (_event, filePath: string, data: Uint8Array) => {
  const file = openSync(assertAllowedWritePath(filePath), 'w')
  writeSync(file, Buffer.from(data))
  closeSync(file)
})

ipcMain.handle('is-project-file', (_event, filePath: string): boolean => {
  return isProjectFilePath(assertAllowedReadPath(filePath))
})

ipcMain.handle('get-resource-url', (_event, fileName: string): string => {
  return getResourceURL(fileName)
})

ipcMain.handle('get-resource-path', (_event, fileName: string): string => {
  return getResourcePath(fileName)
})

ipcMain.handle('write-clipboard-text', (_event, text: string): void => {
  clipboard.writeText(text)
})

app.whenReady().then(() => {
  try {
    smokeTestOptions = getSmokeTestOptions()
    if (smokeTestOptions) {
      allowReadPath(smokeTestOptions.imagePath)
      allowWritePath(smokeTestOptions.exportPath)
    }
  } catch (error) {
    console.error(error)
    app.exit(1)
    return
  }

  // Assume we're in CLI mode if any argument starts
  // with '-' or equals 'help'
  let isCli = false
  const args = process.argv
  for (const arg of args) {
    if (['-w', '-h', '-s', '-o', '-h', '--help', 'help'].indexOf(arg) >= 0) {
      isCli = true
      break
    }
  }

  if (isCli) {
    // We're in CLI mode. Run the CLI and exit
    CLI.run(process.argv)
    process.exit()
  } else {
    // We're in GUI mode.
    createWindow()
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
