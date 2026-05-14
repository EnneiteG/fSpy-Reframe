/// <reference types="jest" />
import Solver from '../../../src/gui/solver/solver'
import Transform from '../../../src/gui/solver/transform'
import { Axis, ReferenceDistancePlane } from '../../../src/gui/types/calibration-settings'
import { ControlPointsStateBase } from '../../../src/gui/types/control-points-state'
import { defaultControlPointsStateBase } from '../../../src/gui/defaults/control-points-state'
import { CameraParameters } from '../../../src/gui/solver/solver-result'

function cameraParameters(): CameraParameters {
  return {
    principalPoint: { x: 0, y: 0 },
    viewTransform: Transform.translation(0, 0, -10),
    cameraTransform: Transform.translation(0, 0, 10),
    horizontalFieldOfView: Math.PI / 2,
    verticalFieldOfView: Math.PI / 2,
    vanishingPoints: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    vanishingPointAxes: [Axis.PositiveX, Axis.PositiveY, Axis.PositiveZ],
    relativeFocalLength: 1,
    imageWidth: 100,
    imageHeight: 100
  }
}

describe('free reference distance solver', () => {
  test('projects free handles onto the selected plane', () => {
    const controlPoints: ControlPointsStateBase = {
      ...defaultControlPointsStateBase,
      referenceDistanceFreeHandlePositions: [
        { x: 0.45, y: 0.5 },
        { x: 0.55, y: 0.5 }
      ]
    }

    const result = Solver.freeReferenceDistanceHandlesWorldPositions(
      controlPoints,
      ReferenceDistancePlane.XY,
      100,
      100,
      cameraParameters()
    )

    expect(result).not.toBeNull()
    expect(result![0].z).toBeCloseTo(0, 8)
    expect(result![1].z).toBeCloseTo(0, 8)
    expect(result![0].subtracted(result![1]).length).toBeGreaterThan(0)
  })
})
