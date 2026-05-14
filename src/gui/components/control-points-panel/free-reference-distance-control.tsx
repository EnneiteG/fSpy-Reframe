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
import { Group } from 'react-konva'
import ControlPoint from './control-point'
import ControlPolyline from './control-polyline'
import Point2D from '../../solver/point-2d'
import { Palette } from '../../style/palette'

interface FreeReferenceDistanceControlProps {
  handlePositions: [Point2D, Point2D]
  handleDragCallback(handleIndex: number, position: Point2D): void
}

export default class FreeReferenceDistanceControl extends React.PureComponent<FreeReferenceDistanceControlProps> {
  render() {
    const normal = {
      x: this.props.handlePositions[0].y - this.props.handlePositions[1].y,
      y: -this.props.handlePositions[0].x + this.props.handlePositions[1].x
    }

    return (
      <Group>
        <ControlPolyline
          color={Palette.referenceDistanceControlColor}
          points={this.props.handlePositions}
        />
        <ControlPoint
          lineNormal={normal}
          absolutePosition={this.props.handlePositions[0]}
          onControlPointDrag={(position: Point2D) => {
            this.props.handleDragCallback(0, position)
          }}
          stroke={Palette.referenceDistanceControlColor}
        />
        <ControlPoint
          lineNormal={normal}
          absolutePosition={this.props.handlePositions[1]}
          onControlPointDrag={(position: Point2D) => {
            this.props.handleDragCallback(1, position)
          }}
          stroke={Palette.referenceDistanceControlColor}
        />
      </Group>
    )
  }
}
