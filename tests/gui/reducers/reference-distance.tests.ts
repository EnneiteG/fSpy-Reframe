/// <reference types="jest" />
import { calibrationSettingsBase } from '../../../src/gui/reducers/calibration-settings-base'
import { controlPointsStateBase } from '../../../src/gui/reducers/control-points-base'
import { defaultCalibrationSettingsBase } from '../../../src/gui/defaults/calibration-settings'
import { defaultControlPointsStateBase } from '../../../src/gui/defaults/control-points-state'
import { ActionTypes } from '../../../src/gui/actions'
import { ReferenceDistanceMode, ReferenceDistancePlane } from '../../../src/gui/types/calibration-settings'

describe('reference distance reducers', () => {
  test('sets reference distance mode', () => {
    const state = calibrationSettingsBase(defaultCalibrationSettingsBase, {
      type: ActionTypes.SET_REFERENCE_DISTANCE_MODE,
      mode: ReferenceDistanceMode.Free
    })

    expect(state.referenceDistanceMode).toEqual(ReferenceDistanceMode.Free)
  })

  test('sets reference distance plane', () => {
    const state = calibrationSettingsBase(defaultCalibrationSettingsBase, {
      type: ActionTypes.SET_REFERENCE_DISTANCE_PLANE,
      plane: ReferenceDistancePlane.XZ
    })

    expect(state.referenceDistancePlane).toEqual(ReferenceDistancePlane.XZ)
  })

  test('sets a free reference distance handle without moving the other handle', () => {
    const state = controlPointsStateBase(defaultControlPointsStateBase, {
      type: ActionTypes.SET_REFERENCE_DISTANCE_FREE_HANDLE,
      handleIndex: 1,
      position: { x: 0.7, y: 0.8 }
    })

    expect(state.referenceDistanceFreeHandlePositions[0]).toEqual(defaultControlPointsStateBase.referenceDistanceFreeHandlePositions[0])
    expect(state.referenceDistanceFreeHandlePositions[1]).toEqual({ x: 0.7, y: 0.8 })
  })
})
