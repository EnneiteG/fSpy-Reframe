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

  test('detects AVIF project image extension from bytes', () => {
    const options = exportFileOptions(ExportType.ProjectImage, new Uint8Array([
      0x00, 0x00, 0x00, 0x20,
      0x66, 0x74, 0x79, 0x70,
      0x61, 0x76, 0x69, 0x66,
      0x00, 0x00, 0x00, 0x00,
      0x61, 0x76, 0x69, 0x66
    ]))

    expect(options.defaultExtension).toBe('avif')
    expect(options.saveDialogOptions.defaultPath).toBe('project-image.avif')
  })

  test('includes AVIF in project image export filters', () => {
    const options = exportFileOptions(ExportType.ProjectImage, new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))
    const imageFilter = options.saveDialogOptions.filters?.find((filter) => filter.name == 'Image files')

    expect(imageFilter?.extensions).toContain('avif')
  })

  test('adds default extension when export path has none', () => {
    expect(pathWithExportExtension('camera-parameters', 'json')).toBe('camera-parameters.json')
  })

  test('keeps export path extension when one was supplied', () => {
    expect(pathWithExportExtension('camera-parameters.txt', 'json')).toBe('camera-parameters.txt')
  })
})
