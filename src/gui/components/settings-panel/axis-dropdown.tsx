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
import { fSpyAxisToTargetAxis, targetAxisLabel, targetAxisToFSpyAxis, targetPresetForId, targetSceneOrientationForId, TargetPreset } from '../../solver/target-presets'

interface AxisDropdownProps {
  selectedAxis: Axis
  targetPresetId: string
  targetSceneOrientationId: string
  onChange(axis: Axis): void
}

export default function AxisDropdown(props: AxisDropdownProps) {
  const preset = targetPresetForId(props.targetPresetId)
  const sceneOrientation = targetSceneOrientationForId(props.targetSceneOrientationId)
  const selectedTargetAxis = fSpyAxisToTargetAxis(props.selectedAxis, preset, sceneOrientation)

  return (
    <Dropdown
      options={
        [
          axisOption(Axis.NegativeX, preset),
          axisOption(Axis.PositiveX, preset),
          axisOption(Axis.NegativeY, preset),
          axisOption(Axis.PositiveY, preset),
          axisOption(Axis.NegativeZ, preset),
          axisOption(Axis.PositiveZ, preset)
        ]
      }
      selectedOptionId={selectedTargetAxis}
      onOptionSelected={(selectedValue: Axis) => {
        props.onChange(targetAxisToFSpyAxis(selectedValue, preset, sceneOrientation))
      }}
    />
  )
}

function axisOption(axis: Axis, preset: TargetPreset) {
  return {
    value: axis,
    id: axis,
    title: targetAxisLabel(axis, preset),
    circleColor: Palette.colorForAxis(axis)
  }
}
