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

import * as React from 'react'
import ReferenceDistanceModeDropdown, { ReferenceDistanceSelection } from './reference-distance-mode-dropdown'
import ReferenceDistancePlaneDropdown from './reference-distance-plane-dropdown'
import ReferenceDistanceUnitDropdown from './reference-distance-unit-dropdown'
import NumericInputField from './../common/numeric-input-field'
import PanelSpacer from './../common/panel-spacer'
import { Axis, ReferenceDistanceMode, ReferenceDistancePlane, ReferenceDistanceUnit } from '../../types/calibration-settings'
import { Palette } from '../../style/palette'
import { targetPresetForId, TargetPresetId } from '../../solver/target-presets'

interface ReferenceDistanceFormProps {
  referenceMode: ReferenceDistanceMode
  referenceAxis: Axis | null
  referencePlane: ReferenceDistancePlane
  referenceDistance: number
  referenceDistanceUnit: ReferenceDistanceUnit
  targetPresetId: string
  targetSceneOrientationId: string
  onReferenceModeChange(mode: ReferenceDistanceMode): void
  onReferenceAxisChange(axis: Axis | null): void
  onReferencePlaneChange(plane: ReferenceDistancePlane): void
  onReferenceDistanceChange(distance: number): void
  onReferenceDistanceUnitChange(unit: ReferenceDistanceUnit): void
}

export default class ReferenceDistanceForm extends React.PureComponent<ReferenceDistanceFormProps> {

  render() {
    return (
      <div className='panelSection'>
        <ReferenceDistanceModeDropdown
          selectedMode={this.props.referenceMode}
          selectedAxis={this.props.referenceAxis}
          targetPresetId={this.props.targetPresetId}
          targetSceneOrientationId={this.props.targetSceneOrientationId}
          onChange={(selection: ReferenceDistanceSelection) => {
            this.props.onReferenceModeChange(selection.mode)
            this.props.onReferenceAxisChange(selection.axis)
          }}
        />
        { this.renderTargetAxisHint() }
        { this.renderReferencePlaneDropdown() }
        { this.renderDistanceInputField() }
      </div>
    )
  }

  private renderTargetAxisHint() {
    const preset = targetPresetForId(this.props.targetPresetId)
    if (preset.id == TargetPresetId.FSpy) {
      return null
    }

    return (
      <div style={{ color: Palette.disabledTextColor, fontSize: '11px', lineHeight: '14px', marginTop: '6px' }}>
        Axis shown in {preset.displayName}; solver scale remains internal.
      </div>
    )
  }

  private renderReferencePlaneDropdown() {
    if (this.props.referenceMode != ReferenceDistanceMode.Free) {
      return null
    }

    return (
      <div>
        <PanelSpacer />
        <ReferenceDistancePlaneDropdown
          selectedPlane={this.props.referencePlane}
          targetPresetId={this.props.targetPresetId}
          targetSceneOrientationId={this.props.targetSceneOrientationId}
          onChange={this.props.onReferencePlaneChange}
        />
      </div>
    )
  }

  private renderDistanceInputField() {
    if (this.props.referenceAxis == null && this.props.referenceMode != ReferenceDistanceMode.Free) {
      return null
    }

    return (
      <div>
        <PanelSpacer />
        <div style={{ display: 'flex' }}>
          <NumericInputField
            isDisabled={this.props.referenceAxis == null && this.props.referenceMode != ReferenceDistanceMode.Free}
            valueNotAvailable={this.props.referenceAxis == null && this.props.referenceMode != ReferenceDistanceMode.Free}
            value={this.props.referenceDistance}
            onSubmit={this.props.onReferenceDistanceChange}
          />
          <span style={{ marginLeft: '8px', width: '100%' }}><ReferenceDistanceUnitDropdown
            disabled={this.props.referenceAxis == null && this.props.referenceMode != ReferenceDistanceMode.Free}
            selectedUnit={this.props.referenceAxis == null && this.props.referenceMode != ReferenceDistanceMode.Free ? ReferenceDistanceUnit.None : this.props.referenceDistanceUnit}
            onChange={(unit: ReferenceDistanceUnit) => {
              this.props.onReferenceDistanceUnitChange(unit)
            }}
          /></span>
        </div>
      </div>
    )
  }

}
