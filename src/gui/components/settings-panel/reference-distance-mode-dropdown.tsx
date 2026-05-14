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

import React from 'react'
import { Axis, ReferenceDistanceMode } from '../../types/calibration-settings'
import Dropdown from '../common/dropdown'
import { Palette } from '../../style/palette'
import {
  fSpyReferenceAxisToTargetAxis,
  targetAxisLabel,
  targetAxisToFSpyReferenceAxis,
  targetPresetForId,
  targetSceneOrientationForId,
  TargetPreset,
  TargetPresetId
} from '../../solver/target-presets'

export type ReferenceDistanceSelection =
  { mode: ReferenceDistanceMode.Axis, axis: Axis | null } |
  { mode: ReferenceDistanceMode.Free, axis: null }

interface ReferenceDistanceModeDropdownProps {
  selectedMode: ReferenceDistanceMode
  selectedAxis: Axis | null
  targetPresetId: string
  targetSceneOrientationId: string
  onChange(selection: ReferenceDistanceSelection): void
}

export default function ReferenceDistanceModeDropdown(props: ReferenceDistanceModeDropdownProps) {
  const preset = targetPresetForId(props.targetPresetId)
  const sceneOrientation = targetSceneOrientationForId(props.targetSceneOrientationId)
  const selectedTargetAxis = props.selectedAxis == null
    ? null
    : fSpyReferenceAxisToTargetAxis(props.selectedAxis, preset, sceneOrientation)
  const options = [
    {
      value: { mode: ReferenceDistanceMode.Axis, axis: null } as ReferenceDistanceSelection,
      id: 'null',
      title: 'Default'
    },
    referenceAxisOption(Axis.PositiveX, preset),
    referenceAxisOption(Axis.PositiveY, preset),
    referenceAxisOption(Axis.PositiveZ, preset),
    {
      value: { mode: ReferenceDistanceMode.Free, axis: null } as ReferenceDistanceSelection,
      id: ReferenceDistanceMode.Free,
      title: 'Free',
      circleColor: Palette.referenceDistanceControlColor
    }
  ]

  return (
    <Dropdown<ReferenceDistanceSelection>
      options={options}
      selectedOptionId={props.selectedMode == ReferenceDistanceMode.Free
        ? ReferenceDistanceMode.Free
        : selectedTargetAxis || 'null'}
      onOptionSelected={(selectedValue: ReferenceDistanceSelection) => {
        if (selectedValue.mode == ReferenceDistanceMode.Free) {
          props.onChange(selectedValue)
        } else {
          props.onChange({
            mode: ReferenceDistanceMode.Axis,
            axis: selectedValue.axis == null ? null : targetAxisToFSpyReferenceAxis(selectedValue.axis, preset, sceneOrientation)
          })
        }
      }}
    />
  )
}

function referenceAxisOption(axis: Axis, preset: TargetPreset) {
  return {
    value: { mode: ReferenceDistanceMode.Axis, axis: axis } as ReferenceDistanceSelection,
    id: axis,
    title: referenceAxisTitle(axis, preset),
    circleColor: Palette.colorForAxis(axis)
  }
}

function referenceAxisTitle(axis: Axis, preset: TargetPreset): string {
  const label = targetAxisLabel(axis, preset)
  if (preset.id == TargetPresetId.FSpy) {
    return label + ' axis'
  }
  return preset.displayName + ' ' + label + ' axis'
}
