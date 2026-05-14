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

import * as React from 'react'
import ControlPointsContainer from './containers/control-points-container'
import ResultContainer from './containers/result-container'
import SettingsContainer from './containers/settings-container'

import { StoreState } from './types/store-state'
import { connect } from 'react-redux'
import { AppAction, setImage, loadDefaultState, setSidePanelVisibility } from './actions'
import { GlobalSettings } from './types/global-settings'
import { UIState } from './types/ui-state'
import { ImageState } from './types/image-state'
import { SolverResult } from './solver/solver-result'
import './types/electron-api'
import { ExportType } from '../main/ipc-messages'
import ProjectFile from './io/project-file'
import { loadImage } from './io/util'
import store from './store/store'
import SplashScreen from './components/splash-screen'
import { Dispatch } from 'redux'
import { convertCameraParametersForTarget, targetPresetForId, targetSceneOrientationForId } from './solver/target-presets'
import type { SmokeTestResult } from '../main/smoke-test-options'

interface AppProps {
  uiState: UIState,
  globalSettings: GlobalSettings,
  solverResult: SolverResult,
  image: ImageState,
  onImageFileDropped(imagePath: string): void | Promise<void>
  onProjectFileDropped(imagePath: string): void
  onOpenExampleProjectPressed(): void

  onNewProjectIPCMessage(): void
  onOpenProjectIPCMessage(filePath: string, isExampleProject: boolean): void
  onSaveProjectAsIPCMessage(filePath: string): void
  onOpenImageIPCMessage(imagePath: string): void
  onExportIPCMessage(exportType: ExportType): void
  onSetSidePanelVisibilityIPCMessage(panelsAreVisible: boolean): void
  onRunSmokeTestIPCMessage(imagePath: string, exportPath: string): void
}

function waitForCondition(condition: () => boolean, timeoutMs = 10000): Promise<void> {
  const startTime = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) {
        resolve()
      } else if (Date.now() - startTime >= timeoutMs) {
        reject(new Error('Timed out while waiting for smoke test condition'))
      } else {
        window.setTimeout(check, 100)
      }
    }
    check()
  })
}

function loadDroppedImage(imagePath: string, dispatch: Dispatch<AppAction>, onError: () => void): Promise<void> {
  let didReportError = false
  const reportError = () => {
    if (!didReportError) {
      didReportError = true
      onError()
    }
  }

  return window.electronAPI.readFile(imagePath).then((imageBuffer) => new Promise<void>((resolve, reject) => {
    loadImage(
      imageBuffer,
      (width: number, height: number, url: string) => {
        dispatch(setImage(url, imageBuffer, width, height))
        resolve()
      },
      () => {
        reportError()
        reject(new Error('Failed to load image'))
      }
    )
  })).catch((error) => {
    reportError()
    throw error
  })
}

async function runRendererSmokeTest(
  callbacks: {
    onOpenExampleProjectPressed(): void
    onSmokeImageDropped(imagePath: string): Promise<void>
    onExportIPCMessage(exportType: ExportType): void
  },
  imagePath: string
): Promise<void> {
  callbacks.onOpenExampleProjectPressed()
  await waitForCondition(() => store.getState().uiState.projectFilePath === null && store.getState().image.data !== null)
  if (store.getState().solverResult.cameraParameters === null) {
    throw new Error('Example project did not produce camera parameters')
  }

  await callbacks.onSmokeImageDropped(imagePath)
  await waitForCondition(() => store.getState().image.data !== null && store.getState().uiState.projectHasUnsavedChanges)
  callbacks.onExportIPCMessage(ExportType.CameraParametersJSON)
}

class App extends React.PureComponent<AppProps> {
  componentDidMount() {
    this.registerIPCHandlers()

    document.ondragover = (ev) => {
      ev.preventDefault()
      return false
    }

    document.ondragenter = (ev) => {
      ev.preventDefault()
      return false
    }

    document.ondragleave = (ev) => {
      ev.preventDefault()
      return false
    }

    document.ondrop = (ev) => {
      if (ev.dataTransfer != null) {
        let firstFile = ev.dataTransfer.files[0]
        if (firstFile) {
          let filePath = window.electronAPI.getPathForFile(firstFile)
          ProjectFile.isProjectFile(filePath).then((isProject) => {
            if (isProject) {
              this.props.onProjectFileDropped(filePath)
            } else {
              this.props.onImageFileDropped(filePath)
            }
          })
        }
        ev.preventDefault()
        return false
      }
      return true
    }
  }

  render() {
    const hasImage = this.props.image.data !== null
    return (
      <div id='app-container'>
        <SettingsContainer isVisible={this.props.uiState.sidePanelsAreVisible} />
        <ControlPointsContainer />
        <ResultContainer isVisible={this.props.uiState.sidePanelsAreVisible} />
        { !hasImage ? (<SplashScreen onClickedLoadExampleProject={this.props.onOpenExampleProjectPressed} />) : null }
      </div>
    )
  }

  private registerIPCHandlers() {
    window.electronAPI.onNewProject(() => {
      this.props.onNewProjectIPCMessage()
    })

    window.electronAPI.onOpenProject((filePath: string, isExampleProject: boolean) => {
      this.props.onOpenProjectIPCMessage(filePath, isExampleProject)
    })

    window.electronAPI.onSaveProject(() => {
      if (this.props.uiState.projectFilePath) {
        this.props.onSaveProjectAsIPCMessage(this.props.uiState.projectFilePath)
      } else {
        window.electronAPI.sendSpecifyProjectPath()
      }
    })

    window.electronAPI.onSaveProjectAs((filePath: string) => {
      this.props.onSaveProjectAsIPCMessage(filePath)
    })

    window.electronAPI.onOpenImage((filePath: string) => {
      this.props.onOpenImageIPCMessage(filePath)
    })

    window.electronAPI.onExport((exportType: ExportType) => {
      this.props.onExportIPCMessage(exportType)
    })

    window.electronAPI.onSetSidePanelVisibility((panelsAreVisible: boolean) => {
      this.props.onSetSidePanelVisibilityIPCMessage(panelsAreVisible)
    })

    window.electronAPI.onRunSmokeTest((imagePath: string, exportPath: string) => {
      this.props.onRunSmokeTestIPCMessage(imagePath, exportPath)
    })
  }
}

export function mapStateToProps(state: StoreState) {
  return {
    uiState: state.uiState,
    globalSettings: state.globalSettings,
    solverResult: state.solverResult,
    image: state.image
  }
}

export function mapDispatchToProps(dispatch: Dispatch<AppAction>) {
  return {
    onImageFileDropped: (imagePath: string) => {
      void loadDroppedImage(
        imagePath,
        dispatch,
        () => {
          window.electronAPI.showErrorBox(
            'Failed to load image data',
            'Could not load the image data. Is this a valid image file?'
          )
        }
      )
    },
    onProjectFileDropped: (projectPath: string) => {
      window.electronAPI.sendOpenDroppedProject(projectPath)
    },
    onOpenExampleProjectPressed: () => {
      ProjectFile.loadExample(dispatch)
    },
    onNewProjectIPCMessage: () => {
      dispatch(loadDefaultState())
    },
    onOpenProjectIPCMessage: (filePath: string, isExampleProject: boolean) => {
      ProjectFile.load(filePath, dispatch, isExampleProject)
    },
    onSaveProjectAsIPCMessage: (filePath: string) => {
      ProjectFile.save(filePath, dispatch)
    },
    onOpenImageIPCMessage: (imagePath: string) => {
      loadDroppedImage(imagePath, dispatch, () => {
        alert('Failed to load image')
      })
    },
    onOpenExampleProjectIPCMessage: () => {
      ProjectFile.loadExample(dispatch)
    },
    onExportIPCMessage: (exportType: ExportType) => {
      let dataToExport: string | Uint8Array | null = null
      const storeState: StoreState = store.getState()
      switch (exportType) {
        case ExportType.CameraParametersJSON:
          const cameraParameters = storeState.solverResult.cameraParameters
          if (cameraParameters) {
            dataToExport = JSON.stringify(cameraParameters, null, 2)
          }
          break
        case ExportType.TargetCameraParametersJSON:
          const targetCameraParameters = storeState.solverResult.cameraParameters
          if (targetCameraParameters) {
            dataToExport = JSON.stringify(
              convertCameraParametersForTarget(
                targetCameraParameters,
                storeState.calibrationSettingsBase,
                targetPresetForId(storeState.resultDisplaySettings.targetPresetId),
                targetSceneOrientationForId(storeState.resultDisplaySettings.targetSceneOrientationId)
              ),
              null,
              2
            )
          }
          break
        case ExportType.ProjectImage:
          dataToExport = storeState.image.data
          break
      }

      if (dataToExport) {
        window.electronAPI.sendSpecifyExportPath(exportType, dataToExport)
      }
    },
    onSetSidePanelVisibilityIPCMessage: (panelsAreVisible: boolean) => {
      dispatch(setSidePanelVisibility(panelsAreVisible))
    },
    onRunSmokeTestIPCMessage: (imagePath: string) => {
      runRendererSmokeTest(
        {
          onOpenExampleProjectPressed: () => ProjectFile.loadExample(dispatch),
          onSmokeImageDropped: (droppedImagePath: string) => loadDroppedImage(droppedImagePath, dispatch, () => {
            window.electronAPI.sendSmokeTestResult({ success: false, message: 'Smoke image failed to load' })
          }),
          onExportIPCMessage: (exportType: ExportType) => {
            const cameraParameters = store.getState().solverResult.cameraParameters
            const result: SmokeTestResult = { success: false, message: 'Camera parameters were not available for export' }
            if (cameraParameters) {
              window.electronAPI.sendSpecifyExportPath(exportType, JSON.stringify(cameraParameters, null, 2))
              result.success = true
              result.message = undefined
            }
            window.electronAPI.sendSmokeTestResult(result)
          }
        },
        imagePath
      ).catch((error) => {
        window.electronAPI.sendSmokeTestResult({ success: false, message: (error as Error).message })
      })
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
