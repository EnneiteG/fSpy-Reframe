/// <reference types="jest" />
import Transform from '../../src/gui/solver/transform'
import { CameraParameters } from '../../src/gui/solver/solver-result'
import { Axis, CalibrationSettingsBase, ReferenceDistanceUnit } from '../../src/gui/types/calibration-settings'
import {
  convertCameraParametersForTarget,
  targetPresetForId,
  TargetPresetId,
  targetSceneOrientationForId,
  TargetSceneOrientationId
} from '../../src/gui/solver/target-presets'

function degreesToRadians(value: number): number {
  return value * Math.PI / 180
}

function multiply3x3(a: number[][], b: number[][]): number[][] {
  let result: number[][] = []
  for (let row = 0; row < 3; row++) {
    result[row] = []
    for (let col = 0; col < 3; col++) {
      result[row][col] = a[row][0] * b[0][col] + a[row][1] * b[1][col] + a[row][2] * b[2][col]
    }
  }
  return result
}

function transposed3x3(matrix: number[][]): number[][] {
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]]
  ]
}

function unrealRotationMatrix(pitchDegrees: number, yawDegrees: number, rollDegrees: number): number[][] {
  const pitch = degreesToRadians(pitchDegrees)
  const yaw = degreesToRadians(yawDegrees)
  const roll = degreesToRadians(rollDegrees)
  const sinPitch = Math.sin(pitch)
  const cosPitch = Math.cos(pitch)
  const sinYaw = Math.sin(yaw)
  const cosYaw = Math.cos(yaw)
  const sinRoll = Math.sin(roll)
  const cosRoll = Math.cos(roll)

  return [
    [cosPitch * cosYaw, sinRoll * sinPitch * cosYaw - cosRoll * sinYaw, cosRoll * sinPitch * cosYaw + sinRoll * sinYaw],
    [cosPitch * sinYaw, sinRoll * sinPitch * sinYaw + cosRoll * cosYaw, cosRoll * sinPitch * sinYaw - sinRoll * cosYaw],
    [sinPitch, -sinRoll * cosPitch, cosRoll * cosPitch]
  ]
}

function cameraParametersWithRotation(rotation: number[][]): CameraParameters {
  return {
    principalPoint: { x: 0, y: 0 },
    viewTransform: new Transform(),
    cameraTransform: Transform.fromMatrix([
      [rotation[0][0], rotation[0][1], rotation[0][2], 0],
      [rotation[1][0], rotation[1][1], rotation[1][2], 0],
      [rotation[2][0], rotation[2][1], rotation[2][2], 0],
      [0, 0, 0, 1]
    ]),
    horizontalFieldOfView: 0,
    verticalFieldOfView: 0,
    vanishingPoints: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    vanishingPointAxes: [Axis.PositiveX, Axis.PositiveY, Axis.PositiveZ],
    relativeFocalLength: 0,
    imageWidth: 100,
    imageHeight: 100
  }
}

const calibrationSettings: CalibrationSettingsBase = {
  referenceDistanceUnit: ReferenceDistanceUnit.Meters,
  referenceDistance: 1,
  referenceDistanceAxis: null,
  cameraData: {
    presetId: null,
    presetData: null,
    customSensorWidth: 36,
    customSensorHeight: 24
  },
  firstVanishingPointAxis: Axis.PositiveX,
  secondVanishingPointAxis: Axis.PositiveY
}

describe('GUI', () => {
  test('converts fSpy camera rotation to Unreal roll, pitch, yaw order', () => {
    const preset = targetPresetForId(TargetPresetId.Unreal)
    const sceneOrientation = targetSceneOrientationForId(TargetSceneOrientationId.Rotate180)
    const basisToFSpy = multiply3x3(preset.basisToFSpy, sceneOrientation.basisToTarget)
    const unrealRotation = unrealRotationMatrix(-21, 215, -11.6)
    const fSpyRotation = multiply3x3(
      multiply3x3(basisToFSpy, unrealRotation),
      transposed3x3(preset.cameraBasisToFSpy)
    )

    const converted = convertCameraParametersForTarget(
      cameraParametersWithRotation(fSpyRotation),
      calibrationSettings,
      preset,
      sceneOrientation
    )

    expect(converted.rotationLabels).toEqual(['Roll', 'Pitch', 'Yaw', null])
    expect(converted.rotation[0]).toBeCloseTo(-11.6, 5)
    expect(converted.rotation[1]).toBeCloseTo(-21, 5)
    expect(converted.rotation[2]).toBeCloseTo(215, 5)
  })
})
