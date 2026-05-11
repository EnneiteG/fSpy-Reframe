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
import ReferenceDistanceAxisDropdown from './reference-distance-axis-dropdown'
import ReferenceDistanceUnitDropdown from './reference-distance-unit-dropdown'
import NumericInputField from './../common/numeric-input-field'
import PanelSpacer from './../common/panel-spacer'
import { Axis, ReferenceDistanceUnit } from '../../types/calibration-settings'
import { Palette } from '../../style/palette'
import { targetPresetForId, TargetPresetId } from '../../solver/target-presets'

interface ReferenceDistanceFormProps {
  referenceAxis: Axis | null
  referenceDistance: number
  referenceDistanceUnit: ReferenceDistanceUnit
  targetPresetId: string
  targetSceneOrientationId: string
  onReferenceAxisChange(axis: Axis | null): void
  onReferenceDistanceChange(distance: number): void
  onReferenceDistanceUnitChange(unit: ReferenceDistanceUnit): void
}

export default class ReferenceDistanceForm extends React.PureComponent<ReferenceDistanceFormProps> {

  render() {
    return (
      <div className='panelSection'>
          <ReferenceDistanceAxisDropdown
            selectedAxis={this.props.referenceAxis}
            targetPresetId={this.props.targetPresetId}
            targetSceneOrientationId={this.props.targetSceneOrientationId}
            onChange={(axis: Axis | null) => {
              this.props.onReferenceAxisChange(axis)
            }}
          />
          { this.renderTargetAxisHint() }
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

  private renderDistanceInputField() {
    if (this.props.referenceAxis == null) {
      return null
    }

    return (
      <div>
      <PanelSpacer />
        <div style={{ display: 'flex' }}>
          <NumericInputField
            isDisabled={this.props.referenceAxis == null}
            valueNotAvailable={this.props.referenceAxis == null}
            value={this.props.referenceDistance}
            onSubmit={this.props.onReferenceDistanceChange}
          />
          <span style={{ marginLeft: '8px', width: '100%' }}><ReferenceDistanceUnitDropdown
            disabled={this.props.referenceAxis == null}
            selectedUnit={this.props.referenceAxis == null ? ReferenceDistanceUnit.None : this.props.referenceDistanceUnit}
            onChange={(unit: ReferenceDistanceUnit) => {
              this.props.onReferenceDistanceUnitChange(unit)
            }}
          /></span>
        </div>
      </div>
    )
  }

}
