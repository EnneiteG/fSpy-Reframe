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
import { Axis } from '../../types/calibration-settings'
import Dropdown from '../common/dropdown'
import { Palette } from '../../style/palette'
import Constants from '../../constants'
import {
  fSpyReferenceAxisToTargetAxis,
  targetAxisLabel,
  targetAxisToFSpyReferenceAxis,
  targetPresetForId,
  targetSceneOrientationForId,
  TargetPreset,
  TargetPresetId
} from '../../solver/target-presets'

interface ReferenceDistanceAxisDropdownProps {
  selectedAxis: Axis | null
  targetPresetId: string
  targetSceneOrientationId: string
  onChange(axis: Axis | null): void
}

export default function ReferenceDistanceAxisDropdown(props: ReferenceDistanceAxisDropdownProps) {
  const preset = targetPresetForId(props.targetPresetId)
  const sceneOrientation = targetSceneOrientationForId(props.targetSceneOrientationId)
  const selectedTargetAxis = props.selectedAxis == null
    ? null
    : fSpyReferenceAxisToTargetAxis(props.selectedAxis, preset, sceneOrientation)

  return (
    <Dropdown
      options={
        [
          {
            value: null,
            id: 'null',
            title: 'Default'
          },
          referenceAxisOption(Axis.PositiveX, preset),
          referenceAxisOption(Axis.PositiveY, preset),
          referenceAxisOption(Axis.PositiveZ, preset)
        ]
      }
      selectedOptionId={
        selectedTargetAxis ? selectedTargetAxis : 'null'
      }
      onOptionSelected={(selectedValue: Axis | null) => {
        props.onChange(selectedValue == null ? null : targetAxisToFSpyReferenceAxis(selectedValue, preset, sceneOrientation))
      }}
    />
  )
}

function referenceAxisOption(axis: Axis, preset: TargetPreset) {
  return {
    value: axis,
    id: axis,
    title: referenceAxisTitle(axis, preset),
    circleColor: Palette.colorForAxis(axis)
  }
}

function referenceAxisTitle(axis: Axis, preset: TargetPreset): string {
  const prefix = Constants.referenceDistanceAnchorEnabled ? 'In the' : 'Along the'
  const suffix = Constants.referenceDistanceAnchorEnabled ? 'direction' : 'axis'
  const label = targetAxisLabel(axis, preset)
  if (preset.id == TargetPresetId.FSpy) {
    return prefix + ' ' + label + ' ' + suffix
  }
  return prefix + ' ' + preset.displayName + ' ' + label + ' ' + suffix
}
