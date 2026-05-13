/// <reference types="jest" />
import { ExportType } from '../../src/main/ipc-messages'
import { exportFileOptions, pathWithExportExtension } from '../../src/main/export-file-options'

describe('export file options', () => {
  test('uses json defaults for raw camera parameter export', () => {
    const options = exportFileOptions(ExportType.CameraParametersJSON, '{}')

    expect(options.defaultExtension).toBe('json')
    expect(options.saveDialogOptions.defaultPath).toBe('camera-parameters.json')
  })

  test('uses json defaults for target camera parameter export', () => {
    const options = exportFileOptions(ExportType.TargetCameraParametersJSON, '{}')

    expect(options.defaultExtension).toBe('json')
    expect(options.saveDialogOptions.defaultPath).toBe('target-camera-parameters.json')
  })

  test('detects project image extension from bytes', () => {
    const options = exportFileOptions(ExportType.ProjectImage, new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))

    expect(options.defaultExtension).toBe('jpg')
    expect(options.saveDialogOptions.defaultPath).toBe('project-image.jpg')
  })

  test('adds default extension when export path has none', () => {
    expect(pathWithExportExtension('camera-parameters', 'json')).toBe('camera-parameters.json')
  })

  test('keeps export path extension when one was supplied', () => {
    expect(pathWithExportExtension('camera-parameters.txt', 'json')).toBe('camera-parameters.txt')
  })
})
