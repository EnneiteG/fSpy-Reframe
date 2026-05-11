/// <reference types="jest" />
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import ProjectFile from '../../src/gui/io/project-file'
import { ActionTypes, AppAction, LoadState } from '../../src/gui/actions'
import { defaultGlobalSettings } from '../../src/gui/defaults/global-settings'
import { defaultCalibrationSettingsBase, defaultCalibrationSettings1VP, defaultCalibrationSettings2VP } from '../../src/gui/defaults/calibration-settings'
import { defaultControlPointsStateBase, defaultControlPointsState1VP, defaultControlPointsState2VP } from '../../src/gui/defaults/control-points-state'
import { defaultResultDisplaySettings } from '../../src/gui/defaults/result-display-settings'
import { ReferenceDistanceUnit } from '../../src/gui/types/calibration-settings'
import { TargetPresetId, TargetSceneOrientationId } from '../../src/gui/solver/target-presets'
import { cameraPresets } from '../../src/gui/solver/camera-presets'

function writeProjectFileBuffer(stateBuffer: Buffer): string {
  const directory = mkdtempSync(join(tmpdir(), 'fspy-project-file-test-'))
  const filePath = join(directory, 'project.fspy')
  const headerBuffer = Buffer.alloc(16)

  headerBuffer.writeUInt8(ProjectFile.PROJECT_FILE_ID.charCodeAt(0), 0)
  headerBuffer.writeUInt8(ProjectFile.PROJECT_FILE_ID.charCodeAt(1), 1)
  headerBuffer.writeUInt8(ProjectFile.PROJECT_FILE_ID.charCodeAt(2), 2)
  headerBuffer.writeUInt8(ProjectFile.PROJECT_FILE_ID.charCodeAt(3), 3)
  headerBuffer.writeUInt32LE(ProjectFile.PROJECT_FILE_VERSION, 4)
  headerBuffer.writeUInt32LE(stateBuffer.length, 8)
  headerBuffer.writeUInt32LE(0, 12)

  writeFileSync(filePath, Buffer.concat([headerBuffer, stateBuffer]))
  return filePath
}

function writeProjectFile(state: any): string {
  return writeProjectFileBuffer(Buffer.from(JSON.stringify(state)))
}

function loadProjectState(state: any, isExampleProject = false): LoadState {
  const actions: AppAction[] = []
  const dispatch = ((action: AppAction) => {
    actions.push(action)
    return action
  }) as any
  const filePath = writeProjectFile(state)

  ProjectFile.load(filePath, dispatch, isExampleProject)

  expect(actions).toHaveLength(1)
  expect(actions[0].type).toEqual(ActionTypes.LOAD_STATE)
  return actions[0] as LoadState
}

function savedState(overrides: any = {}): any {
  return {
    globalSettings: defaultGlobalSettings,
    calibrationSettingsBase: defaultCalibrationSettingsBase,
    calibrationSettings1VP: defaultCalibrationSettings1VP,
    calibrationSettings2VP: defaultCalibrationSettings2VP,
    controlPointsStateBase: defaultControlPointsStateBase,
    controlPointsState1VP: defaultControlPointsState1VP,
    controlPointsState2VP: defaultControlPointsState2VP,
    cameraParameters: null,
    resultDisplaySettings: defaultResultDisplaySettings,
    ...overrides
  }
}

describe('Project file compatibility', () => {
  test('loads old project files without saved Unreal display settings', () => {
    const state = savedState({
      cameraParameters: undefined,
      resultDisplaySettings: undefined,
      calibrationSettingsBase: {
        ...defaultCalibrationSettingsBase,
        referenceDistanceUnit: 'Yards',
        referenceDistance: 2,
        cameraData: {
          presetId: 'missing-preset',
          customSensorWidth: 36,
          customSensorHeight: 24
        }
      }
    })

    const action = loadProjectState(state)

    expect(action.savedState.cameraParameters).toBeNull()
    expect(action.savedState.resultDisplaySettings.targetPresetId).toEqual(TargetPresetId.FSpy)
    expect(action.savedState.resultDisplaySettings.targetSceneOrientationId).toEqual(TargetSceneOrientationId.Default)
    expect(action.savedState.calibrationSettingsBase.referenceDistanceUnit).toEqual(ReferenceDistanceUnit.Feet)
    expect(action.savedState.calibrationSettingsBase.referenceDistance).toEqual(6)
    expect(action.savedState.calibrationSettingsBase.cameraData.presetId).toBeNull()
    expect(action.savedState.calibrationSettingsBase.cameraData.presetData).toBeNull()
    expect(action.imageState.data).toBeNull()
    expect(action.imageState.width).toBeNull()
    expect(action.imageState.height).toBeNull()
  })

  test('preserves target preset and backfills missing scene orientation', () => {
    const state = savedState({
      resultDisplaySettings: {
        ...defaultResultDisplaySettings,
        targetPresetId: TargetPresetId.Unreal,
        targetSceneOrientationId: undefined
      },
      calibrationSettingsBase: {
        ...defaultCalibrationSettingsBase,
        cameraData: {
          presetId: 'canon_5d',
          customSensorWidth: 36,
          customSensorHeight: 24
        }
      }
    })

    const action = loadProjectState(state, true)

    expect(action.savedState.resultDisplaySettings.targetPresetId).toEqual(TargetPresetId.Unreal)
    expect(action.savedState.resultDisplaySettings.targetSceneOrientationId).toEqual(TargetSceneOrientationId.Default)
    expect(action.savedState.calibrationSettingsBase.cameraData.presetId).toEqual('canon_5d')
    expect(action.savedState.calibrationSettingsBase.cameraData.presetData).toEqual(cameraPresets['canon_5d'])
    expect(action.projectFilePath).toContain('project.fspy')
    expect(action.isExampleProject).toEqual(true)
  })

  test('does not dispatch state when project state JSON is invalid', () => {
    const actions: AppAction[] = []
    const dispatch = ((action: AppAction) => {
      actions.push(action)
      return action
    }) as any
    const filePath = writeProjectFileBuffer(Buffer.from('{not-json'))

    ProjectFile.load(filePath, dispatch, false)

    expect(actions).toHaveLength(0)
  })
})
