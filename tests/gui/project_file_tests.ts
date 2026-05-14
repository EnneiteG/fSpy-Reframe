/// <reference types="jest" />
import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { TextDecoder, TextEncoder } from 'util'
import ProjectFile from '../../src/gui/io/project-file'
import { ActionTypes, AppAction, LoadState } from '../../src/gui/actions'
import { Dispatch } from 'redux'
import { defaultGlobalSettings } from '../../src/gui/defaults/global-settings'
import { defaultCalibrationSettingsBase, defaultCalibrationSettings1VP, defaultCalibrationSettings2VP } from '../../src/gui/defaults/calibration-settings'
import { defaultControlPointsStateBase, defaultControlPointsState1VP, defaultControlPointsState2VP } from '../../src/gui/defaults/control-points-state'
import { defaultResultDisplaySettings } from '../../src/gui/defaults/result-display-settings'
import { ReferenceDistanceMode, ReferenceDistancePlane, ReferenceDistanceUnit } from '../../src/gui/types/calibration-settings'
import { TargetPresetId, TargetSceneOrientationId } from '../../src/gui/solver/target-presets'
import { cameraPresets } from '../../src/gui/solver/camera-presets'
import type { ElectronAPI } from '../../src/gui/types/electron-api'
import { isProjectFileData } from '../../src/gui/io/project-file-format'

Object.defineProperty(global, 'TextDecoder', { value: TextDecoder })
Object.defineProperty(global, 'TextEncoder', { value: TextEncoder })

const noop = () => {
  // test fallback
}

function installElectronAPIFallback() {
  const api: ElectronAPI = {
    getAppVersion: async () => '',
    showErrorBox: async () => undefined,
    readFile: async (filePath: string) => new Uint8Array(readFileSync(filePath)),
    writeFile: async (filePath: string, data: Uint8Array) => {
      writeFileSync(filePath, Buffer.from(data))
    },
    isProjectFile: async (filePath: string) => {
      try {
        return isProjectFileData(readFileSync(filePath).slice(0, 4))
      } catch {
        return false
      }
    },
    getResourcePath: async () => '',
    getResourceURL: async () => '',
    writeClipboardText: noop,
    getPathForFile: () => '',
    sendSetDocumentState: noop,
    sendSpecifyProjectPath: noop,
    sendOpenDroppedProject: noop,
    sendSpecifyExportPath: noop,
    onNewProject: noop,
    onOpenProject: noop,
    onSaveProject: noop,
    onSaveProjectAs: noop,
    onOpenImage: noop,
    onExport: noop,
    onSetSidePanelVisibility: noop,
    onRunSmokeTest: noop,
    sendSmokeTestResult: noop
  }
  Object.defineProperty(global, 'window', { value: { electronAPI: api }, writable: true })
}

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

function writeProjectFile(state: unknown): string {
  return writeProjectFileBuffer(Buffer.from(JSON.stringify(state)))
}

function captureDispatch(actions: AppAction[]): Dispatch<AppAction> {
  return <T extends AppAction>(action: T): T => {
    actions.push(action)
    return action
  }
}

async function loadProjectState(state: unknown, isExampleProject = false): Promise<LoadState> {
  const actions: AppAction[] = []
  const dispatch = captureDispatch(actions)
  const filePath = writeProjectFile(state)

  await ProjectFile.load(filePath, dispatch, isExampleProject)

  expect(actions).toHaveLength(1)
  expect(actions[0].type).toEqual(ActionTypes.LOAD_STATE)
  return actions[0] as LoadState
}

function savedState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
  beforeEach(() => {
    installElectronAPIFallback()
  })

  test('loads old project files without saved Unreal display settings', async () => {
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
      },
      controlPointsStateBase: {
        principalPoint: defaultControlPointsStateBase.principalPoint,
        origin: defaultControlPointsStateBase.origin,
        firstVanishingPoint: defaultControlPointsStateBase.firstVanishingPoint
      }
    })

    const action = await loadProjectState(state)

    expect(action.savedState.cameraParameters).toBeNull()
    expect(action.savedState.resultDisplaySettings.targetPresetId).toEqual(TargetPresetId.FSpy)
    expect(action.savedState.resultDisplaySettings.targetSceneOrientationId).toEqual(TargetSceneOrientationId.Default)
    expect(action.savedState.calibrationSettingsBase.referenceDistanceUnit).toEqual(ReferenceDistanceUnit.Feet)
    expect(action.savedState.calibrationSettingsBase.referenceDistance).toEqual(6)
    expect(action.savedState.calibrationSettingsBase.referenceDistanceMode).toEqual(ReferenceDistanceMode.Axis)
    expect(action.savedState.calibrationSettingsBase.referenceDistancePlane).toEqual(ReferenceDistancePlane.XY)
    expect(action.savedState.controlPointsStateBase.referenceDistanceAnchor).toEqual(defaultControlPointsStateBase.referenceDistanceAnchor)
    expect(action.savedState.controlPointsStateBase.referenceDistanceHandleOffsets).toEqual(defaultControlPointsStateBase.referenceDistanceHandleOffsets)
    expect(action.savedState.controlPointsStateBase.referenceDistanceFreeHandlePositions).toEqual(defaultControlPointsStateBase.referenceDistanceFreeHandlePositions)
    expect(action.savedState.calibrationSettingsBase.cameraData.presetId).toBeNull()
    expect(action.savedState.calibrationSettingsBase.cameraData.presetData).toBeNull()
    expect(action.imageState.data).toBeNull()
    expect(action.imageState.width).toBeNull()
    expect(action.imageState.height).toBeNull()
  })

  test('preserves target preset and backfills missing scene orientation', async () => {
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

    const action = await loadProjectState(state, true)

    expect(action.savedState.resultDisplaySettings.targetPresetId).toEqual(TargetPresetId.Unreal)
    expect(action.savedState.resultDisplaySettings.targetSceneOrientationId).toEqual(TargetSceneOrientationId.Default)
    expect(action.savedState.calibrationSettingsBase.cameraData.presetId).toEqual('canon_5d')
    expect(action.savedState.calibrationSettingsBase.cameraData.presetData).toEqual(cameraPresets['canon_5d'])
    expect(action.projectFilePath).toContain('project.fspy')
    expect(action.isExampleProject).toEqual(true)
  })

  test('does not dispatch state when project state JSON is invalid', async () => {
    const actions: AppAction[] = []
    const dispatch = captureDispatch(actions)
    const filePath = writeProjectFileBuffer(Buffer.from('{not-json'))

    await ProjectFile.load(filePath, dispatch, false)

    expect(actions).toHaveLength(0)
  })
})
