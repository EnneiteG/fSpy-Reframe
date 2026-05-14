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

import Transform from './transform'
import Vector3D from './vector-3d'
import { CameraParameters } from './solver-result'
import { Axis, CalibrationSettingsBase, ReferenceDistancePlane, ReferenceDistanceUnit } from '../types/calibration-settings'

export enum TargetPresetId {
  FSpy = 'fspy',
  Unreal = 'unreal'
}

export enum TargetRotationFormat {
  AxisAngleDegrees = 'AxisAngleDegrees',
  UnrealRotatorDegrees = 'UnrealRotatorDegrees'
}

export enum TargetLocationUnit {
  Project = 'Project',
  Centimeters = 'Centimeters'
}

export enum TargetSceneOrientationId {
  Default = 'default',
  Rotate90 = 'rotate90',
  Rotate180 = 'rotate180',
  Rotate270 = 'rotate270'
}

export interface TargetPreset {
  id: TargetPresetId
  displayName: string
  locationUnit: TargetLocationUnit
  rotationFormat: TargetRotationFormat
  locationLabels: [string, string, string]
  rotationLabels: [string, string, string, string | null]
  basisToFSpy: number[][]
  cameraBasisToFSpy: number[][]
}

export interface TargetSceneOrientation {
  id: TargetSceneOrientationId
  displayName: string
  basisToTarget: number[][]
}

export interface TargetCameraParameters {
  presetId: TargetPresetId
  presetName: string
  sceneOrientationId: TargetSceneOrientationId
  sceneOrientationName: string
  locationUnit: string
  rotationUnit: string
  locationLabels: [string, string, string]
  rotationLabels: [string, string, string, string | null]
  location: [number, number, number]
  rotation: [number, number, number, number | null]
  horizontalFieldOfView: number
  verticalFieldOfView: number
  imageWidth: number
  imageHeight: number
}

export const targetPresets: { [id: string]: TargetPreset } = {
  [TargetPresetId.FSpy]: {
    id: TargetPresetId.FSpy,
    displayName: 'fSpy',
    locationUnit: TargetLocationUnit.Project,
    rotationFormat: TargetRotationFormat.AxisAngleDegrees,
    locationLabels: ['x', 'y', 'z'],
    rotationLabels: ['x', 'y', 'z', 'Angle'],
    basisToFSpy: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ],
    cameraBasisToFSpy: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ]
  },
  [TargetPresetId.Unreal]: {
    id: TargetPresetId.Unreal,
    displayName: 'Unreal Engine',
    locationUnit: TargetLocationUnit.Centimeters,
    rotationFormat: TargetRotationFormat.UnrealRotatorDegrees,
    locationLabels: ['X', 'Y', 'Z'],
    rotationLabels: ['Roll', 'Pitch', 'Yaw', null],
    // Target axes expressed in fSpy coordinates. Unreal is X forward, Y right, Z up.
    basisToFSpy: [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1]
    ],
    // Unreal camera local axes expressed in fSpy camera-local coordinates.
    // Unreal looks along +X; fSpy cameras look along -Z.
    cameraBasisToFSpy: [
      [0, 1, 0],
      [0, 0, 1],
      [-1, 0, 0]
    ]
  }
}

export const targetSceneOrientations: { [id: string]: TargetSceneOrientation } = {
  [TargetSceneOrientationId.Default]: {
    id: TargetSceneOrientationId.Default,
    displayName: 'Default (+X)',
    basisToTarget: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ]
  },
  [TargetSceneOrientationId.Rotate90]: {
    id: TargetSceneOrientationId.Rotate90,
    displayName: '+90 deg (+Y)',
    basisToTarget: [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1]
    ]
  },
  [TargetSceneOrientationId.Rotate180]: {
    id: TargetSceneOrientationId.Rotate180,
    displayName: '180 deg (-X)',
    basisToTarget: [
      [-1, 0, 0],
      [0, -1, 0],
      [0, 0, 1]
    ]
  },
  [TargetSceneOrientationId.Rotate270]: {
    id: TargetSceneOrientationId.Rotate270,
    displayName: '-90 deg (-Y)',
    basisToTarget: [
      [0, 1, 0],
      [-1, 0, 0],
      [0, 0, 1]
    ]
  }
}

export function targetPresetForId(id: string | undefined): TargetPreset {
  return targetPresets[id || TargetPresetId.FSpy] || targetPresets[TargetPresetId.FSpy]
}

export function targetSceneOrientationForId(id: string | undefined): TargetSceneOrientation {
  return targetSceneOrientations[id || TargetSceneOrientationId.Default] || targetSceneOrientations[TargetSceneOrientationId.Default]
}

export function targetPointToFSpy(point: Vector3D, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): Vector3D {
  return transformPoint(point, orientedBasisToFSpy(preset, sceneOrientation))
}

export function targetAxisToFSpyAxis(axis: Axis, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): Axis {
  return axisFromVector(transformPoint(axisVector(axis), orientedBasisToFSpy(preset, sceneOrientation)))
}

export function fSpyAxisToTargetAxis(axis: Axis, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): Axis {
  return axisFromVector(transformPoint(axisVector(axis), transposed3x3(orientedBasisToFSpy(preset, sceneOrientation))))
}

export function targetAxisToFSpyReferenceAxis(axis: Axis, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): Axis {
  return positiveAxis(targetAxisToFSpyAxis(axis, preset, sceneOrientation))
}

export function fSpyReferenceAxisToTargetAxis(axis: Axis, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): Axis {
  return positiveAxis(fSpyAxisToTargetAxis(axis, preset, sceneOrientation))
}

export function targetPlaneToFSpyReferencePlane(plane: ReferenceDistancePlane, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): ReferenceDistancePlane {
  return referencePlaneForNormalAxis(targetAxisToFSpyReferenceAxis(referencePlaneNormalAxis(plane), preset, sceneOrientation))
}

export function fSpyReferencePlaneToTargetPlane(plane: ReferenceDistancePlane, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): ReferenceDistancePlane {
  return referencePlaneForNormalAxis(fSpyReferenceAxisToTargetAxis(referencePlaneNormalAxis(plane), preset, sceneOrientation))
}

function referencePlaneNormalAxis(plane: ReferenceDistancePlane): Axis {
  switch (plane) {
    case ReferenceDistancePlane.XY:
      return Axis.PositiveZ
    case ReferenceDistancePlane.XZ:
      return Axis.PositiveY
    case ReferenceDistancePlane.YZ:
      return Axis.PositiveX
  }
}

function referencePlaneForNormalAxis(axis: Axis): ReferenceDistancePlane {
  switch (positiveAxis(axis)) {
    case Axis.PositiveX:
      return ReferenceDistancePlane.YZ
    case Axis.PositiveY:
      return ReferenceDistancePlane.XZ
    case Axis.PositiveZ:
      return ReferenceDistancePlane.XY
  }

  return ReferenceDistancePlane.XY
}

export function positiveAxis(axis: Axis): Axis {
  switch (axis) {
    case Axis.NegativeX:
      return Axis.PositiveX
    case Axis.NegativeY:
      return Axis.PositiveY
    case Axis.NegativeZ:
      return Axis.PositiveZ
    default:
      return axis
  }
}

export function targetAxisLabel(axis: Axis, preset: TargetPreset): string {
  let label = preset.locationLabels[axisIndex(axis)]
  switch (axis) {
    case Axis.NegativeX:
    case Axis.NegativeY:
    case Axis.NegativeZ:
      return '-' + label
    default:
      return label
  }
}

export function convertCameraParametersForTarget(
  cameraParameters: CameraParameters,
  calibrationSettings: CalibrationSettingsBase,
  preset: TargetPreset,
  sceneOrientation: TargetSceneOrientation
): TargetCameraParameters {
  let location = new Vector3D(
    cameraParameters.cameraTransform.matrix[0][3],
    cameraParameters.cameraTransform.matrix[1][3],
    cameraParameters.cameraTransform.matrix[2][3]
  )
  location = fSpyPointToTarget(location, preset, sceneOrientation).multipliedByScalar(locationScale(calibrationSettings, preset))

  const targetRotationMatrix = fSpyRotationToTarget(cameraParameters.cameraTransform, preset, sceneOrientation)
  const rotation = targetRotation(targetRotationMatrix, preset)

  return {
    presetId: preset.id,
    presetName: preset.displayName,
    sceneOrientationId: sceneOrientation.id,
    sceneOrientationName: sceneOrientation.displayName,
    locationUnit: preset.locationUnit == TargetLocationUnit.Centimeters ? 'cm' : calibrationSettings.referenceDistanceUnit.toString(),
    rotationUnit: 'degrees',
    locationLabels: preset.locationLabels,
    rotationLabels: preset.rotationLabels,
    location: [location.x, location.y, location.z],
    rotation: rotation,
    horizontalFieldOfView: 180 * cameraParameters.horizontalFieldOfView / Math.PI,
    verticalFieldOfView: 180 * cameraParameters.verticalFieldOfView / Math.PI,
    imageWidth: cameraParameters.imageWidth,
    imageHeight: cameraParameters.imageHeight
  }
}

function fSpyPointToTarget(point: Vector3D, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): Vector3D {
  return transformPoint(point, transposed3x3(orientedBasisToFSpy(preset, sceneOrientation)))
}

function fSpyRotationToTarget(transform: Transform, preset: TargetPreset, sceneOrientation: TargetSceneOrientation): number[][] {
  const basisToFSpy = orientedBasisToFSpy(preset, sceneOrientation)
  const basisFromFSpy = transposed3x3(basisToFSpy)
  return multiply3x3(multiply3x3(basisFromFSpy, rotation3x3(transform)), preset.cameraBasisToFSpy)
}

function orientedBasisToFSpy(preset: TargetPreset, sceneOrientation: TargetSceneOrientation): number[][] {
  return multiply3x3(preset.basisToFSpy, sceneOrientation.basisToTarget)
}

function targetRotation(matrix: number[][], preset: TargetPreset): [number, number, number, number | null] {
  switch (preset.rotationFormat) {
    case TargetRotationFormat.UnrealRotatorDegrees:
      return unrealRotatorFromMatrix(matrix)
    case TargetRotationFormat.AxisAngleDegrees:
      return axisAngleFromMatrix(matrix)
  }
}

function axisAngleFromMatrix(matrix: number[][]): [number, number, number, number] {
  const trace = matrix[0][0] + matrix[1][1] + matrix[2][2]
  const angle = Math.acos(clamp((trace - 1) / 2, -1, 1))
  const denominator = 2 * Math.sin(angle)
  if (Math.abs(denominator) < 1e-7) {
    return [1, 0, 0, 0]
  }
  return [
    (matrix[2][1] - matrix[1][2]) / denominator,
    (matrix[0][2] - matrix[2][0]) / denominator,
    (matrix[1][0] - matrix[0][1]) / denominator,
    180 * angle / Math.PI
  ]
}

function unrealRotatorFromMatrix(matrix: number[][]): [number, number, number, null] {
  // Match Unreal's FRotationMatrix::Rotator convention for a matrix whose
  // columns are the actor's local X/Y/Z axes in target world coordinates.
  const pitch = Math.atan2(
    matrix[2][0],
    Math.sqrt(matrix[0][0] * matrix[0][0] + matrix[1][0] * matrix[1][0])
  )
  const yaw = Math.atan2(matrix[1][0], matrix[0][0])
  const roll = Math.atan2(-matrix[2][1], matrix[2][2])
  return [
    180 * roll / Math.PI,
    180 * pitch / Math.PI,
    normalizeDegrees360(180 * yaw / Math.PI),
    null
  ]
}

function normalizeDegrees360(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function locationScale(settings: CalibrationSettingsBase, preset: TargetPreset): number {
  if (preset.locationUnit != TargetLocationUnit.Centimeters) {
    return 1
  }
  switch (settings.referenceDistanceUnit) {
    case ReferenceDistanceUnit.Millimeters:
      return 0.1
    case ReferenceDistanceUnit.Centimeters:
      return 1
    case ReferenceDistanceUnit.Meters:
      return 100
    case ReferenceDistanceUnit.Kilometers:
      return 100000
    case ReferenceDistanceUnit.Inches:
      return 2.54
    case ReferenceDistanceUnit.Feet:
      return 30.48
    case ReferenceDistanceUnit.Miles:
      return 160934.4
    case ReferenceDistanceUnit.None:
      return 1
  }
}

function axisVector(axis: Axis): Vector3D {
  switch (axis) {
    case Axis.NegativeX:
      return new Vector3D(-1, 0, 0)
    case Axis.PositiveX:
      return new Vector3D(1, 0, 0)
    case Axis.NegativeY:
      return new Vector3D(0, -1, 0)
    case Axis.PositiveY:
      return new Vector3D(0, 1, 0)
    case Axis.NegativeZ:
      return new Vector3D(0, 0, -1)
    case Axis.PositiveZ:
      return new Vector3D(0, 0, 1)
  }
}

function axisFromVector(vector: Vector3D): Axis {
  if (Math.abs(vector.x) >= Math.abs(vector.y) && Math.abs(vector.x) >= Math.abs(vector.z)) {
    return vector.x < 0 ? Axis.NegativeX : Axis.PositiveX
  }
  if (Math.abs(vector.y) >= Math.abs(vector.z)) {
    return vector.y < 0 ? Axis.NegativeY : Axis.PositiveY
  }
  return vector.z < 0 ? Axis.NegativeZ : Axis.PositiveZ
}

function axisIndex(axis: Axis): number {
  switch (positiveAxis(axis)) {
    case Axis.PositiveX:
      return 0
    case Axis.PositiveY:
      return 1
    case Axis.PositiveZ:
      return 2
  }
  return 0
}

function rotation3x3(transform: Transform): number[][] {
  return [
    [transform.matrix[0][0], transform.matrix[0][1], transform.matrix[0][2]],
    [transform.matrix[1][0], transform.matrix[1][1], transform.matrix[1][2]],
    [transform.matrix[2][0], transform.matrix[2][1], transform.matrix[2][2]]
  ]
}

function transformPoint(point: Vector3D, matrix: number[][]): Vector3D {
  return new Vector3D(
    matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2] * point.z,
    matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] * point.z,
    matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2] * point.z
  )
}

function transposed3x3(matrix: number[][]): number[][] {
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]]
  ]
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
