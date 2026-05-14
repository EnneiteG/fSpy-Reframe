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
import { ReferenceDistancePlane } from '../../types/calibration-settings'
import Dropdown from '../common/dropdown'
import { fSpyReferencePlaneToTargetPlane, targetPlaneToFSpyReferencePlane, targetPresetForId, targetSceneOrientationForId } from '../../solver/target-presets'

interface ReferenceDistancePlaneDropdownProps {
  selectedPlane: ReferenceDistancePlane
  targetPresetId: string
  targetSceneOrientationId: string
  onChange(plane: ReferenceDistancePlane): void
}

export default function ReferenceDistancePlaneDropdown(props: ReferenceDistancePlaneDropdownProps) {
  const preset = targetPresetForId(props.targetPresetId)
  const sceneOrientation = targetSceneOrientationForId(props.targetSceneOrientationId)
  const selectedTargetPlane = fSpyReferencePlaneToTargetPlane(props.selectedPlane, preset, sceneOrientation)

  return (
    <Dropdown
      options={[
        {
          value: ReferenceDistancePlane.XY,
          id: ReferenceDistancePlane.XY,
          title: 'Ground plane'
        },
        {
          value: ReferenceDistancePlane.XZ,
          id: ReferenceDistancePlane.XZ,
          title: 'Vertical XZ plane'
        },
        {
          value: ReferenceDistancePlane.YZ,
          id: ReferenceDistancePlane.YZ,
          title: 'Vertical YZ plane'
        }
      ]}
      selectedOptionId={selectedTargetPlane}
      onOptionSelected={(plane: ReferenceDistancePlane) => {
        props.onChange(targetPlaneToFSpyReferencePlane(plane, preset, sceneOrientation))
      }}
    />
  )
}
