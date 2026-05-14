/// <reference types="jest" />
import { pathWithProjectExtension, projectSaveDialogOptions } from '../../src/main/project-file-options'

describe('project file options', () => {
  test('uses a clear untitled default for new projects', () => {
    const options = projectSaveDialogOptions(null, false)

    expect(options.defaultPath).toBe('untitled.fspy')
    expect(options.filters).toEqual([
      { name: 'fSpy project files', extensions: ['fspy'] }
    ])
  })

  test('defaults to the current project path for existing projects', () => {
    const options = projectSaveDialogOptions('C:\\projects\\camera.fspy', false)

    expect(options.defaultPath).toBe('C:\\projects\\camera.fspy')
  })

  test('does not default to the bundled example project path', () => {
    const options = projectSaveDialogOptions('E:\\app\\resources\\example.fspy', true)

    expect(options.defaultPath).toBe('untitled.fspy')
  })

  test('adds fspy extension when missing', () => {
    expect(pathWithProjectExtension('C:\\projects\\camera')).toBe('C:\\projects\\camera.fspy')
  })

  test('keeps fspy extension when present', () => {
    expect(pathWithProjectExtension('C:\\projects\\camera.fspy')).toBe('C:\\projects\\camera.fspy')
  })
})
