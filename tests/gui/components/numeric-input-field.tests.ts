/// <reference types="jest" />
import * as React from 'react'
import NumericInputField from '../../../src/gui/components/common/numeric-input-field'

function createField(onSubmit: (value: number) => void): NumericInputField {
  const field = new NumericInputField({
    value: 4,
    onSubmit
  })

  const setState = ((
    state: Parameters<NumericInputField['setState']>[0],
    callback?: Parameters<NumericInputField['setState']>[1]
  ) => {
    const nextState = typeof state === 'function'
      ? state(field.state, field.props)
      : state

    if (nextState !== null) {
      Object.assign(field.state, nextState)
    }

    if (callback) {
      callback()
    }
  }) as NumericInputField['setState']

  field.setState = setState
  return field
}

function changeEvent(value: string): React.ChangeEvent<HTMLInputElement> {
  return {
    target: {
      value
    }
  } as React.ChangeEvent<HTMLInputElement>
}

function focusEvent(): React.FocusEvent<HTMLInputElement> {
  return {} as React.FocusEvent<HTMLInputElement>
}

function submitEvent(): React.FormEvent<HTMLInputElement> {
  return {
    preventDefault: jest.fn(),
    currentTarget: {
      blur: jest.fn()
    }
  } as unknown as React.FormEvent<HTMLInputElement>
}

describe('NumericInputField', () => {
  test('submits valid edits on blur', () => {
    const onSubmit = jest.fn()
    const field = createField(onSubmit)

    field.handleFocus(focusEvent())
    field.handleChange(changeEvent('12.5'))
    field.handleBlur(focusEvent())

    expect(onSubmit).toHaveBeenCalledWith(12.5)
    expect(field.state.isEditing).toBe(false)
  })

  test('cancels invalid edits on blur', () => {
    const onSubmit = jest.fn()
    const field = createField(onSubmit)

    field.handleFocus(focusEvent())
    field.handleChange(changeEvent('not-a-number'))
    field.handleBlur(focusEvent())

    expect(onSubmit).not.toHaveBeenCalled()
    expect(field.state.isEditing).toBe(false)
  })

  test('does not submit twice when enter triggers blur', () => {
    const onSubmit = jest.fn()
    const field = createField(onSubmit)

    field.handleFocus(focusEvent())
    field.handleChange(changeEvent('8'))
    field.handleSubmit(submitEvent())
    field.handleBlur(focusEvent())

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(8)
  })
})
