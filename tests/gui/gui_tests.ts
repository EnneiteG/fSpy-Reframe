/// <reference types="jest" />
import Transform from '../../src/gui/solver/transform'
import { CameraParameters } from '../../src/gui/solver/solver-result'
import { Axis, CalibrationSettingsBase, ReferenceDistanceMode, ReferenceDistancePlane, ReferenceDistanceUnit } from '../../src/gui/types/calibration-settings'
import {
  convertCameraParametersForTarget,
  fSpyAxisToTargetAxis,
  fSpyReferenceAxisToTargetAxis,
  targetPresetForId,
  targetAxisToFSpyAxis,
  targetAxisToFSpyReferenceAxis,
  targetPlaneToFSpyReferencePlane,
  fSpyReferencePlaneToTargetPlane,
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

function blenderXYZEulerMatrix(xDegrees: number, yDegrees: number, zDegrees: number): number[][] {
  const x = degreesToRadians(xDegrees)
  const y = degreesToRadians(yDegrees)
  const z = degreesToRadians(zDegrees)
  const sinX = Math.sin(x)
  const cosX = Math.cos(x)
  const sinY = Math.sin(y)
  const cosY = Math.cos(y)
  const sinZ = Math.sin(z)
  const cosZ = Math.cos(z)

  return [
    [cosY * cosZ, cosZ * sinX * sinY - cosX * sinZ, sinX * sinZ + cosX * cosZ * sinY],
    [cosY * sinZ, cosX * cosZ + sinX * sinY * sinZ, cosX * sinY * sinZ - cosZ * sinX],
    [-sinY, cosY * sinX, cosX * cosY]
  ]
}

function cameraParametersWithRotation(
  rotation: number[][],
  location: [number, number, number] = [0, 0, 0],
  horizontalFieldOfView = 0,
  verticalFieldOfView = 0,
  imageWidth = 100,
  imageHeight = 100
): CameraParameters {
  return {
    principalPoint: { x: 0, y: 0 },
    viewTransform: new Transform(),
    cameraTransform: Transform.fromMatrix([
      [rotation[0][0], rotation[0][1], rotation[0][2], location[0]],
      [rotation[1][0], rotation[1][1], rotation[1][2], location[1]],
      [rotation[2][0], rotation[2][1], rotation[2][2], location[2]],
      [0, 0, 0, 1]
    ]),
    horizontalFieldOfView: horizontalFieldOfView,
    verticalFieldOfView: verticalFieldOfView,
    vanishingPoints: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    vanishingPointAxes: [Axis.PositiveX, Axis.PositiveY, Axis.PositiveZ],
    relativeFocalLength: 0,
    imageWidth: imageWidth,
    imageHeight: imageHeight
  }
}

const calibrationSettings: CalibrationSettingsBase = {
  referenceDistanceUnit: ReferenceDistanceUnit.Meters,
  referenceDistance: 1,
  referenceDistanceAxis: null,
  referenceDistanceMode: ReferenceDistanceMode.Axis,
  referenceDistancePlane: ReferenceDistancePlane.XY,
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

  test('creates stable Unreal target camera export payload', () => {
    const preset = targetPresetForId(TargetPresetId.Unreal)
    const sceneOrientation = targetSceneOrientationForId(TargetSceneOrientationId.Default)
    const basisToFSpy = multiply3x3(preset.basisToFSpy, sceneOrientation.basisToTarget)
    const unrealRotation = unrealRotationMatrix(10, 20, 30)
    const fSpyRotation = multiply3x3(
      multiply3x3(basisToFSpy, unrealRotation),
      transposed3x3(preset.cameraBasisToFSpy)
    )

    const converted = convertCameraParametersForTarget(
      cameraParametersWithRotation(
        fSpyRotation,
        [1.25, -2, 0.5],
        degreesToRadians(60),
        degreesToRadians(40),
        1920,
        1080
      ),
      calibrationSettings,
      preset,
      sceneOrientation
    )

    expect(converted.presetId).toEqual(TargetPresetId.Unreal)
    expect(converted.presetName).toEqual('Unreal Engine')
    expect(converted.sceneOrientationId).toEqual(TargetSceneOrientationId.Default)
    expect(converted.sceneOrientationName).toEqual('Default (+X)')
    expect(converted.locationUnit).toEqual('cm')
    expect(converted.rotationUnit).toEqual('degrees')
    expect(converted.locationLabels).toEqual(['X', 'Y', 'Z'])
    expect(converted.rotationLabels).toEqual(['Roll', 'Pitch', 'Yaw', null])
    expect(converted.location[0]).toBeCloseTo(-200, 5)
    expect(converted.location[1]).toBeCloseTo(125, 5)
    expect(converted.location[2]).toBeCloseTo(50, 5)
    expect(converted.rotation[0]).toBeCloseTo(30, 5)
    expect(converted.rotation[1]).toBeCloseTo(10, 5)
    expect(converted.rotation[2]).toBeCloseTo(20, 5)
    expect(converted.rotation[3]).toBeNull()
    expect(converted.horizontalFieldOfView).toBeCloseTo(60, 5)
    expect(converted.verticalFieldOfView).toBeCloseTo(40, 5)
    expect(converted.imageWidth).toEqual(1920)
    expect(converted.imageHeight).toEqual(1080)
  })

  test('creates stable Blender target camera export payload', () => {
    const preset = targetPresetForId(TargetPresetId.Blender)
    const sceneOrientation = targetSceneOrientationForId(TargetSceneOrientationId.Default)
    const blenderRotation = blenderXYZEulerMatrix(70.559, 0, 46.692)

    const converted = convertCameraParametersForTarget(
      cameraParametersWithRotation(
        blenderRotation,
        [1.25, -2, 0.5],
        degreesToRadians(60),
        degreesToRadians(40),
        1920,
        1080
      ),
      calibrationSettings,
      preset,
      sceneOrientation
    )

    expect(converted.presetId).toEqual(TargetPresetId.Blender)
    expect(converted.presetName).toEqual('Blender')
    expect(converted.sceneOrientationId).toEqual(TargetSceneOrientationId.Default)
    expect(converted.sceneOrientationName).toEqual('Default (+X)')
    expect(converted.locationUnit).toEqual('Meters')
    expect(converted.rotationUnit).toEqual('degrees')
    expect(converted.locationLabels).toEqual(['X', 'Y', 'Z'])
    expect(converted.rotationLabels).toEqual(['X', 'Y', 'Z', null])
    expect(converted.location[0]).toBeCloseTo(1.25, 5)
    expect(converted.location[1]).toBeCloseTo(-2, 5)
    expect(converted.location[2]).toBeCloseTo(0.5, 5)
    expect(converted.rotation[0]).toBeCloseTo(70.559, 5)
    expect(converted.rotation[1]).toBeCloseTo(0, 5)
    expect(converted.rotation[2]).toBeCloseTo(46.692, 5)
    expect(converted.rotation[3]).toBeNull()
    expect(converted.horizontalFieldOfView).toBeCloseTo(60, 5)
    expect(converted.verticalFieldOfView).toBeCloseTo(40, 5)
    expect(converted.imageWidth).toEqual(1920)
    expect(converted.imageHeight).toEqual(1080)
  })

  test('scales Unreal target camera locations to centimeters', () => {
    const preset = targetPresetForId(TargetPresetId.Unreal)
    const sceneOrientation = targetSceneOrientationForId(TargetSceneOrientationId.Default)
    const cases = [
      [ReferenceDistanceUnit.Millimeters, 0.1],
      [ReferenceDistanceUnit.Centimeters, 1],
      [ReferenceDistanceUnit.Meters, 100],
      [ReferenceDistanceUnit.Kilometers, 100000],
      [ReferenceDistanceUnit.Inches, 2.54],
      [ReferenceDistanceUnit.Feet, 30.48],
      [ReferenceDistanceUnit.Miles, 160934.4],
      [ReferenceDistanceUnit.None, 1]
    ] as [ReferenceDistanceUnit, number][]

    for (let testCase of cases) {
      const converted = convertCameraParametersForTarget(
        cameraParametersWithRotation(
          [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
          ],
          [0, 1, 0]
        ),
        {
          ...calibrationSettings,
          referenceDistanceUnit: testCase[0]
        },
        preset,
        sceneOrientation
      )

      expect(converted.location[0]).toBeCloseTo(testCase[1], 5)
      expect(converted.location[1]).toBeCloseTo(0, 5)
      expect(converted.location[2]).toBeCloseTo(0, 5)
    }
  })

  test('maps reference distance axes through Unreal scene orientations', () => {
    const preset = targetPresetForId(TargetPresetId.Unreal)
    const cases = [
      [TargetSceneOrientationId.Default, Axis.PositiveY, Axis.PositiveX],
      [TargetSceneOrientationId.Rotate90, Axis.PositiveX, Axis.PositiveY],
      [TargetSceneOrientationId.Rotate180, Axis.PositiveY, Axis.PositiveX],
      [TargetSceneOrientationId.Rotate270, Axis.PositiveX, Axis.PositiveY]
    ] as [TargetSceneOrientationId, Axis, Axis][]

    for (let testCase of cases) {
      const sceneOrientation = targetSceneOrientationForId(testCase[0])
      expect(fSpyReferenceAxisToTargetAxis(Axis.PositiveX, preset, sceneOrientation)).toEqual(testCase[1])
      expect(fSpyReferenceAxisToTargetAxis(Axis.PositiveY, preset, sceneOrientation)).toEqual(testCase[2])
      expect(fSpyReferenceAxisToTargetAxis(Axis.PositiveZ, preset, sceneOrientation)).toEqual(Axis.PositiveZ)

      expect(targetAxisToFSpyReferenceAxis(testCase[1], preset, sceneOrientation)).toEqual(Axis.PositiveX)
      expect(targetAxisToFSpyReferenceAxis(testCase[2], preset, sceneOrientation)).toEqual(Axis.PositiveY)
      expect(targetAxisToFSpyReferenceAxis(Axis.PositiveZ, preset, sceneOrientation)).toEqual(Axis.PositiveZ)
    }
  })

  test('maps reference distance planes through Unreal scene orientations', () => {
    const preset = targetPresetForId(TargetPresetId.Unreal)
    const sceneOrientation = targetSceneOrientationForId(TargetSceneOrientationId.Default)

    expect(targetPlaneToFSpyReferencePlane(ReferenceDistancePlane.XY, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.XY)
    expect(targetPlaneToFSpyReferencePlane(ReferenceDistancePlane.XZ, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.YZ)
    expect(targetPlaneToFSpyReferencePlane(ReferenceDistancePlane.YZ, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.XZ)

    expect(fSpyReferencePlaneToTargetPlane(ReferenceDistancePlane.XY, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.XY)
    expect(fSpyReferencePlaneToTargetPlane(ReferenceDistancePlane.YZ, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.XZ)
    expect(fSpyReferencePlaneToTargetPlane(ReferenceDistancePlane.XZ, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.YZ)
  })

  test('maps signed vanishing point axes through Unreal scene orientations', () => {
    const preset = targetPresetForId(TargetPresetId.Unreal)
    const cases = [
      [TargetSceneOrientationId.Default, Axis.PositiveY, Axis.PositiveX],
      [TargetSceneOrientationId.Rotate90, Axis.PositiveX, Axis.NegativeY],
      [TargetSceneOrientationId.Rotate180, Axis.NegativeY, Axis.NegativeX],
      [TargetSceneOrientationId.Rotate270, Axis.NegativeX, Axis.PositiveY]
    ] as [TargetSceneOrientationId, Axis, Axis][]

    for (let testCase of cases) {
      const sceneOrientation = targetSceneOrientationForId(testCase[0])
      expect(fSpyAxisToTargetAxis(Axis.PositiveX, preset, sceneOrientation)).toEqual(testCase[1])
      expect(fSpyAxisToTargetAxis(Axis.PositiveY, preset, sceneOrientation)).toEqual(testCase[2])
      expect(fSpyAxisToTargetAxis(Axis.PositiveZ, preset, sceneOrientation)).toEqual(Axis.PositiveZ)

      expect(targetAxisToFSpyAxis(testCase[1], preset, sceneOrientation)).toEqual(Axis.PositiveX)
      expect(targetAxisToFSpyAxis(testCase[2], preset, sceneOrientation)).toEqual(Axis.PositiveY)
      expect(targetAxisToFSpyAxis(Axis.PositiveZ, preset, sceneOrientation)).toEqual(Axis.PositiveZ)
    }
  })

  test('keeps Blender target axes aligned with fSpy axes', () => {
    const preset = targetPresetForId(TargetPresetId.Blender)
    const sceneOrientation = targetSceneOrientationForId(TargetSceneOrientationId.Default)

    expect(fSpyReferenceAxisToTargetAxis(Axis.PositiveX, preset, sceneOrientation)).toEqual(Axis.PositiveX)
    expect(fSpyReferenceAxisToTargetAxis(Axis.PositiveY, preset, sceneOrientation)).toEqual(Axis.PositiveY)
    expect(fSpyReferenceAxisToTargetAxis(Axis.PositiveZ, preset, sceneOrientation)).toEqual(Axis.PositiveZ)

    expect(fSpyReferencePlaneToTargetPlane(ReferenceDistancePlane.XY, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.XY)
    expect(fSpyReferencePlaneToTargetPlane(ReferenceDistancePlane.XZ, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.XZ)
    expect(fSpyReferencePlaneToTargetPlane(ReferenceDistancePlane.YZ, preset, sceneOrientation)).toEqual(ReferenceDistancePlane.YZ)
  })
})
