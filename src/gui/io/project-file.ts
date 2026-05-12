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

import store from '../store/store'
import { StoreState } from '../types/store-state'
import SavedState from './saved-state'
import { AppAction, loadState, setProjectFilePath } from '../actions'
import { Dispatch } from 'redux'
import { loadImage } from './util'
import '../types/electron-api'
import { defaultResultDisplaySettings } from '../defaults/result-display-settings'
import { cameraPresets } from '../solver/camera-presets'
import { ReferenceDistanceUnit } from '../types/calibration-settings'
import { EXAMPLE_PROJECT_FILENAME as EXAMPLE_PROJECT_FILE_NAME, parseProjectFileData, PROJECT_FILE_EXTENSION as PROJECT_EXTENSION, PROJECT_FILE_ID as PROJECT_ID, PROJECT_FILE_VERSION as PROJECT_VERSION, ProjectFileData, serializeProjectFileData } from './project-file-format'

export default class ProjectFile {
  static readonly EXAMPLE_PROJECT_FILENAME = EXAMPLE_PROJECT_FILE_NAME
  static readonly PROJECT_FILE_EXTENSION = PROJECT_EXTENSION
  static readonly PROJECT_FILE_ID = PROJECT_ID
  static readonly PROJECT_FILE_VERSION = PROJECT_VERSION

  static getStateToSave(): SavedState {
    let storeState: StoreState = store.getState()
    return {
      globalSettings: storeState.globalSettings,
      calibrationSettingsBase: storeState.calibrationSettingsBase,
      calibrationSettings1VP: storeState.calibrationSettings1VP,
      calibrationSettings2VP: storeState.calibrationSettings2VP,
      controlPointsStateBase: storeState.controlPointsStateBase,
      controlPointsState1VP: storeState.controlPointsState1VP,
      controlPointsState2VP: storeState.controlPointsState2VP,
      cameraParameters: storeState.solverResult.cameraParameters,
      resultDisplaySettings: storeState.resultDisplaySettings
    }
  }

  static async save(path: string, dispatch: Dispatch<AppAction>) {

    if (!path.endsWith('.' + this.PROJECT_FILE_EXTENSION)) {
      path += '.' + this.PROJECT_FILE_EXTENSION
    }

    const storeState: StoreState = store.getState()
    const fileData = serializeProjectFileData(this.getStateToSave(), storeState.image.data)
    await window.electronAPI.writeFile(path, fileData)
    dispatch(setProjectFilePath(path))
  }

  static async loadExample(dispatch: Dispatch<AppAction>) {
    let examplePath = await window.electronAPI.getResourcePath(this.EXAMPLE_PROJECT_FILENAME)
    await this.load(examplePath, dispatch, true)
  }

  static async load(path: string, dispatch: Dispatch<AppAction>, isExampleProject: boolean) {
    let valid = await window.electronAPI.isProjectFile(path)
    if (!valid) {
      window.electronAPI.showErrorBox(
        'Failed to load project',
        'This does not appear to be a valid project file'
      )
    } else {
      let buffer: Uint8Array
      try {
        buffer = await window.electronAPI.readFile(path)
      } catch {
        window.electronAPI.showErrorBox(
          'Failed to load image data',
          'Could not load the image data contained in the project file'
        )
        return
      }

      let projectData: ProjectFileData
      try {
        projectData = parseProjectFileData(buffer)
      } catch (error) {
        window.electronAPI.showErrorBox(
          'Failed to load project',
          (error as Error).message
        )
        return
      }

      let loadedState: SavedState = projectData.savedState
      let imageBuffer = projectData.imageData
      if (loadedState.cameraParameters === undefined) {
        loadedState.cameraParameters = null
      }
      if (loadedState.resultDisplaySettings === undefined) {
        loadedState.resultDisplaySettings = defaultResultDisplaySettings
      } else if (loadedState.resultDisplaySettings.targetPresetId === undefined) {
        loadedState.resultDisplaySettings.targetPresetId = defaultResultDisplaySettings.targetPresetId
      }
      if (loadedState.resultDisplaySettings.targetSceneOrientationId === undefined) {
        loadedState.resultDisplaySettings.targetSceneOrientationId = defaultResultDisplaySettings.targetSceneOrientationId
      }

      // Earlier versions had yards as a reference distance unit. Switch to feet
      // if that's the case
      const distanceUnitString = loadedState.calibrationSettingsBase.referenceDistanceUnit.toString()
      if (distanceUnitString == 'Yards') {
        loadedState.calibrationSettingsBase.referenceDistanceUnit = ReferenceDistanceUnit.Feet
        loadedState.calibrationSettingsBase.referenceDistance *= 3.0 // 3 feet per yard
      }

      // Make sure the stored camera preset still exists. If not, fall back to
      // custom camera preset
      const cameraPresetId = loadedState.calibrationSettingsBase.cameraData.presetId
      if (cameraPresetId) {
        if (cameraPresets[cameraPresetId] === undefined) {
          loadedState.calibrationSettingsBase.cameraData.presetId = null
        }
      }

      // Fix old files not storing camera preset data
      if (loadedState.calibrationSettingsBase.cameraData.presetData === undefined) {
        loadedState.calibrationSettingsBase.cameraData.presetData = null
        const presetId = loadedState.calibrationSettingsBase.cameraData.presetId
        if (presetId) {
          const preset = cameraPresets[presetId]
          if (preset) {
            loadedState.calibrationSettingsBase.cameraData.presetData = preset
          }
        }
      }

      if (imageBuffer) {
        // There is image data in the project file. Load the image and then load
        // the state
        loadImage(
          imageBuffer,
          (width: number, height: number, url: string) => {
            dispatch(
              loadState(
                loadedState,
                {
                  width: width,
                  height: height,
                  data: imageBuffer,
                  url: url
                },
                path,
                isExampleProject
              )
            )
          },
          () => {
            window.electronAPI.showErrorBox(
              'Failed to load image data',
              'Could not load the image data contained in the project file'
            )
          }
        )
      } else {
        // There is no image data in the project file. Load the state
        // and blank image data
        dispatch(
          loadState(
            loadedState,
            {
              width: null,
              height: null,
              data: null,
              url: null
            },
            path,
            isExampleProject
          )
        )
      }
    }
  }

  static async isProjectFile(path: string): Promise<boolean> {
    return window.electronAPI.isProjectFile(path)
  }
}
