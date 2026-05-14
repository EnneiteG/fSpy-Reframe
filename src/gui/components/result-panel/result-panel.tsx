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
import TableRow from './table-row'
import BulletList, { BulletListType } from './bullet-list'
import { ImageState } from '../../types/image-state'
import { SolverResult } from '../../solver/solver-result'
import CameraPresetForm from '../common/camera-preset-form'
import { CalibrationSettingsBase, CameraData } from '../../types/calibration-settings'
import { cameraPresets } from '../../solver/camera-presets'
import { GlobalSettings, CalibrationMode } from '../../types/global-settings'
import Dropdown from '../common/dropdown'
import { FieldOfViewFormat, OrientationFormat, PrincipalPointFormat, ResultDisplaySettings } from '../../types/result-display-settings'
import CoordinatesUtil, { ImageCoordinateFrame } from '../../solver/coordinates-util'
import Checkbox from '../settings-panel/checkbox'
import Solver from '../../solver/solver'
import strings from '../../strings/strings'
import { convertCameraParametersForTarget, targetPresetForId, targetPresets, targetSceneOrientationForId, targetSceneOrientations } from '../../solver/target-presets'

interface ResultPanelProps {
  globalSettings: GlobalSettings
  calibrationSettings: CalibrationSettingsBase
  solverResult: SolverResult
  resultDisplaySettings: ResultDisplaySettings
  image: ImageState
  onCameraPresetChange(cameraPreset: string | null): void
  onSensorSizeChange(width: number | undefined, height: number | undefined): void
  onFieldOfViewDisplayFormatChanged(displayFormat: FieldOfViewFormat): void
  onOrientationDisplayFormatChanged(displayFormat: OrientationFormat): void
  onDisplayAbsoluteFocalLengthChanged(enabled: boolean): void
  onPrincipalPointDisplayFormatChanged(displayFormat: PrincipalPointFormat): void
  onTargetPresetChanged(targetPresetId: string): void
  onTargetSceneOrientationChanged(targetSceneOrientationId: string): void
}

export default class ResultPanel extends React.PureComponent<ResultPanelProps> {
  render() {
    return (
      <div id='right-panel' className='side-panel'>
        {this.renderPanelContents()}

      </div>
    )
  }

  private renderPanelContents() {
    return (
      <div>
        <div id='panel-container'>
          {this.renderErrors()}
          {this.renderCameraParameters()}
        </div>
      </div>
    )
  }

  private renderErrors() {
    if (this.props.solverResult.errors.length == 0) {
      return null
    }

    return (
      <div className='panel-section'>
        <BulletList
          messages={
            this.props.solverResult.errors
          }
          type={BulletListType.Errors}
        />
      </div>
    )
  }

  private renderCameraParameters() {
    let cameraParameters = this.props.solverResult.cameraParameters
    if (!cameraParameters) {
      return null
    }
    const targetCameraParameters = this.targetCameraParameters()

    return (
      <div>
        <div className='panel-section bottom-border'>
          <div className='panel-group-title'>Target preset</div>
          <Dropdown
            options={Object.keys(targetPresets).map((id: string) => {
              return {
                id: id,
                value: id,
                title: targetPresets[id].displayName
              }
            })}
            selectedOptionId={this.props.resultDisplaySettings.targetPresetId}
            onOptionSelected={this.props.onTargetPresetChanged}
          />
          <div style={{ marginTop: '7px' }} className='panel-group-title'>Scene orientation</div>
          <Dropdown
            options={Object.keys(targetSceneOrientations).map((id: string) => {
              return {
                id: id,
                value: id,
                title: targetSceneOrientations[id].displayName
              }
            })}
            selectedOptionId={this.props.resultDisplaySettings.targetSceneOrientationId}
            onOptionSelected={this.props.onTargetSceneOrientationChanged}
          />
        </div>
        <div className='panel-section bottom-border'>
          <div className='panel-group-title'>Image</div>
          <TableRow
            title={'Width'}
            value={this.props.image.width}
          />
          <TableRow
            isLastRow={true}
            title={'Height'}
            value={this.props.image.height}
          />
        </div>
        {this.renderFieldOfViewSection()}
        <div className='panel-section bottom-border'>
          <div className='panel-group-title'>Camera position ({targetCameraParameters.locationUnit})</div>
          <TableRow
            title={targetCameraParameters.locationLabels[0]}
            value={targetCameraParameters.location[0]}
          />
          <TableRow
            title={targetCameraParameters.locationLabels[1]}
            value={targetCameraParameters.location[1]}
          />
          <TableRow
            isLastRow={true}
            title={targetCameraParameters.locationLabels[2]}
            value={targetCameraParameters.location[2]}
          />
        </div>
        { this.renderOrientationSection() }
        { this.renderPrincipalPointSection() }
        { this.renderFocalLengthSection() }
        {this.renderWarnings()}
      </div>
    )
  }

  private renderFieldOfViewSection() {
    if (!this.props.solverResult.cameraParameters) {
      return null
    }
    const targetCameraParameters = this.targetCameraParameters()
    const displayDegrees = this.props.resultDisplaySettings.fieldOfViewFormat == FieldOfViewFormat.Degrees
    const fovFactor = displayDegrees ? 1 : Math.PI / 180
    return (
      <div className='panel-section bottom-border'>
        <div className='panel-group-title'>Field of view</div>
        <Dropdown
          options={[
            { id: FieldOfViewFormat.Degrees, title: 'Degrees', value: FieldOfViewFormat.Degrees },
            { id: FieldOfViewFormat.Radians, title: 'Radians', value: FieldOfViewFormat.Radians }
          ]}
          selectedOptionId={this.props.resultDisplaySettings.fieldOfViewFormat}
          onOptionSelected={this.props.onFieldOfViewDisplayFormatChanged}
        />
        <TableRow
          isFirstRow={true}
          title={'Horizontal'}
          value={fovFactor * targetCameraParameters.horizontalFieldOfView}
        />
        <TableRow
          isLastRow={true}
          title={'Vertical'}
          value={fovFactor * targetCameraParameters.verticalFieldOfView }
        />
      </div>
    )
  }

  private renderOrientationSection() {
    if (!this.props.solverResult.cameraParameters) {
      return null
    }
    const targetCameraParameters = this.targetCameraParameters()
    const rotation = targetCameraParameters.rotation
    const labels = targetCameraParameters.rotationLabels
    const fourthLabel = labels[3]

    return (
      <div className='panel-section bottom-border'>
          <div className='panel-group-title'>Camera orientation ({targetCameraParameters.rotationUnit})</div>
          <TableRow
            isFirstRow={true}
            title={labels[0]}
            value={rotation[0]}
          />
          <TableRow
            title={labels[1]}
            value={rotation[1]}
          />
          <TableRow
            isLastRow={fourthLabel === null}
            title={labels[2]}
            value={rotation[2]}
          />
          {fourthLabel !== null ? (<TableRow
            isLastRow={true}
            title={fourthLabel}
            value={rotation[3] || 0}
          />) : null}
        </div>
    )
  }

  private renderPrincipalPointSection() {
    if (!this.props.solverResult.cameraParameters) {
      return null
    }
    const cameraParameters = this.props.solverResult.cameraParameters
    let displayPosition = this.props.solverResult.cameraParameters.principalPoint
    switch (this.props.resultDisplaySettings.principalPointFormat) {
      case PrincipalPointFormat.Absolute:
        displayPosition = CoordinatesUtil.convert(
          displayPosition,
          ImageCoordinateFrame.ImagePlane,
          ImageCoordinateFrame.Absolute,
          cameraParameters.imageWidth,
          cameraParameters.imageHeight
        )
        break
      case PrincipalPointFormat.Relative:
        displayPosition = CoordinatesUtil.convert(
          displayPosition,
          ImageCoordinateFrame.ImagePlane,
          ImageCoordinateFrame.Relative,
          cameraParameters.imageWidth,
          cameraParameters.imageHeight
        )
        break
    }

    return (
      <div className='panel-section bottom-border'>
          <div className='panel-group-title'>Principal point</div>
          <Dropdown
            options={[
              { id: PrincipalPointFormat.Absolute, title: 'Absolute', value: PrincipalPointFormat.Absolute },
              { id: PrincipalPointFormat.Relative, title: 'Relative', value: PrincipalPointFormat.Relative }
            ]}
            selectedOptionId={this.props.resultDisplaySettings.principalPointFormat}
            onOptionSelected={this.props.onPrincipalPointDisplayFormatChanged}
          />
          <TableRow
            isFirstRow={true}
            title={'x'}
            value={displayPosition.x}
          />
          <TableRow
            isLastRow={true}
            title={'y'}
            value={displayPosition.y}
          />
        </div>
    )
  }

  private renderFocalLengthSection() {
    let cameraParameters = this.props.solverResult.cameraParameters
    if (!cameraParameters) {
      return null
    }

    if (this.props.globalSettings.calibrationMode == CalibrationMode.OneVanishingPoint) {
      return null
    }

    let cameraData = this.props.calibrationSettings.cameraData
    let sensorWidth = cameraData.customSensorWidth
    let sensorHeight = cameraData.customSensorHeight
    if (cameraData.presetId) {
      let preset = cameraPresets[cameraData.presetId]
      sensorWidth = preset.sensorWidth
      sensorHeight = preset.sensorHeight
    }
    let sensorAspectRatio = sensorHeight > 0 ? sensorWidth / sensorHeight : 1
    const absoluteFocalLength = sensorAspectRatio > 1
      ? 0.5 * sensorWidth * cameraParameters.relativeFocalLength
      : 0.5 * sensorHeight * cameraParameters.relativeFocalLength

    const displayFocalLength = this.props.resultDisplaySettings.displayAbsoluteFocalLength
    const proportionsMatch = Solver.imageProportionsMatchSensor(
      cameraParameters.imageWidth,
      cameraParameters.imageHeight,
      sensorWidth,
      sensorHeight
    )

    return (
      <div className='panel-section bottom-border'>
        <div style={{ marginTop: '-2px' }}><Checkbox
          title='Focal length'
          isSelected={displayFocalLength}
          onChange={ (enabled: boolean) => { this.props.onDisplayAbsoluteFocalLengthChanged(enabled) } }
        /></div>
        { displayFocalLength ? this.renderCameraPresetForm(absoluteFocalLength, cameraData) : null }
        { !proportionsMatch && displayFocalLength ? (<div style={{ marginTop: '5px' }}><BulletList
          messages={
            [ strings.imageSensorProportionsMismatch ]
          }
          type={BulletListType.Warnings}
        /></div>) : null }
      </div>
    )
  }

  private renderCameraPresetForm(absoluteFocalLength: number, cameraData: CameraData) {
    return (
      <div style={{ marginTop: '5px' }}>
      <CameraPresetForm
            absoluteFocalLength={absoluteFocalLength}
            cameraData={cameraData}
            onCameraPresetChange={this.props.onCameraPresetChange}
            onSensorSizeChange={this.props.onSensorSizeChange}
          >
        <TableRow value={absoluteFocalLength} title='Value (mm)' />
      </CameraPresetForm>
      </div>
    )
  }

  private renderWarnings() {
    if (this.props.solverResult.warnings.length == 0) {
      return null
    }
    return (
      <div className='panel-section'>
        <BulletList
          messages={
            this.props.solverResult.warnings
          }
          type={BulletListType.Warnings}
        />
      </div>
    )
  }

  private targetCameraParameters() {
    return convertCameraParametersForTarget(
      this.props.solverResult.cameraParameters!,
      this.props.calibrationSettings,
      targetPresetForId(this.props.resultDisplaySettings.targetPresetId),
      targetSceneOrientationForId(this.props.resultDisplaySettings.targetSceneOrientationId)
    )
  }
}
