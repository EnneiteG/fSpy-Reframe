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
import { Palette } from '../../style/palette'

interface NumericInputFieldProps {
  precision?: number
  isDisabled?: boolean
  valueNotAvailable?: boolean
  value: number
  onSubmit(value: number): void
}

interface NumericInputFieldState {
  isEditing: boolean
  editedValue: string
  editedValueIsValid: boolean
}

export default class NumericInputField extends React.Component<NumericInputFieldProps, NumericInputFieldState> {

  private skipNextBlurHandling = false

  constructor(props: NumericInputFieldProps) {
    super(props)
    this.state = {
      isEditing: false,
      editedValue: props.value.toString(),
      editedValueIsValid: true
    }
  }

  handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      ...this.state,
      editedValue: event.target.value,
      editedValueIsValid: this.numericValue(event.target.value) !== undefined
    })
  }

  handleSubmit(event: React.FormEvent<HTMLInputElement>) {
    event.preventDefault()
    this.finishEditing()
    this.skipNextBlurHandling = true
    event.currentTarget.blur()
  }

  handleFocus(_event: React.FocusEvent<HTMLInputElement>) {
    this.beginEditing()
  }

  handleBlur(_event: React.FocusEvent<HTMLInputElement>) {
    if (this.skipNextBlurHandling) {
      this.skipNextBlurHandling = false
      return
    }

    if (this.state.editedValueIsValid) {
      this.finishEditing()
    } else {
      this.cancelEditing()
    }
  }

  render() {
    let inputStyle: React.CSSProperties = {
      height: '22px',
      outline: 'none',
      width: '60px',
      paddingLeft: '6px',
      border: '1px solid ' + Palette.gray
    }

    if (this.props.isDisabled) {
      inputStyle = {
        ...inputStyle,
        userSelect: 'none',
        cursor: 'default',
        color: Palette.disabledTextColor
      }
    }

    if (this.state.isEditing) {
      if (this.state.editedValueIsValid) {
        inputStyle = {
          ...inputStyle,
          border: '1px solid ' + Palette.green
        }
      } else {
        inputStyle = {
          ...inputStyle,
          border: '1px solid ' + Palette.red
        }
      }
    }

    let displayValue = this.props.precision ? this.props.value.toFixed(this.props.precision) : this.props.value
    if (this.props.valueNotAvailable) {
      displayValue = 'n/a'
    }

    return (
      <input
        disabled={this.props.isDisabled}
        style={inputStyle}
        type='text'
        value={this.state.isEditing ? this.state.editedValue : displayValue}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          if (!this.props.isDisabled) {
            this.handleChange(event)
          }
        }}
        onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
          if (!this.props.isDisabled) {
            this.handleFocus(event)
          }
        }}
        onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
          if (!this.props.isDisabled) {
            this.handleBlur(event)
          }
        }}
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (!this.props.isDisabled) {
            if (event.key == 'Escape') {
              this.cancelEditing()
              this.skipNextBlurHandling = true
              event.currentTarget.blur()
            } else if (event.key == 'Enter') {
              if (this.state.editedValueIsValid) {
                this.handleSubmit(event)
              }
            }
          }
        }}
      />
    )
  }

  private beginEditing() {
    this.setState({
      ...this.state,
      isEditing: true,
      editedValue: this.props.value.toString(),
      editedValueIsValid: true
    })
  }

  private finishEditing() {
    this.setState({
      ...this.state,
      isEditing: false
    })
    let numericValue = this.numericValue(this.state.editedValue)
    this.props.onSubmit(numericValue === undefined ? 0 : numericValue)
  }

  private cancelEditing() {
    this.setState({
      ...this.state,
      isEditing: false
    })
  }

  private numericValue(stringValue: string): number | undefined {
    let value = parseFloat(stringValue)
    return isNaN(value) ? undefined : value
  }
}
