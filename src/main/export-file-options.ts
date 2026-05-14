import type { SaveDialogOptions } from 'electron'
import path from 'path'
import { detectImageFileExtension, IMAGE_FILE_EXTENSIONS } from '../gui/io/image-format'
import { ExportType } from './ipc-messages'

export interface ExportFileOptions {
  defaultExtension: string
  saveDialogOptions: SaveDialogOptions
}

export type ExportFileData = string | Uint8Array | ArrayBuffer | ArrayBufferView

export function exportFileOptions(exportType: ExportType, data: ExportFileData): ExportFileOptions {
  switch (exportType) {
    case ExportType.CameraParametersJSON:
      return jsonExportFileOptions('camera-parameters.json')
    case ExportType.TargetCameraParametersJSON:
      return jsonExportFileOptions('target-camera-parameters.json')
    case ExportType.ProjectImage:
      const defaultExtension = detectImageFileExtension(data) || 'png'
      return {
        defaultExtension,
        saveDialogOptions: {
          defaultPath: 'project-image.' + defaultExtension,
          filters: [
            { name: defaultExtension.toUpperCase() + ' image', extensions: [defaultExtension] },
            { name: 'Image files', extensions: IMAGE_FILE_EXTENSIONS },
            { name: 'All files', extensions: ['*'] }
          ]
        }
      }
  }
}

export function pathWithExportExtension(filePath: string, defaultExtension: string): string {
  if (path.extname(filePath)) {
    return filePath
  }
  return filePath + '.' + defaultExtension
}

function jsonExportFileOptions(defaultPath: string): ExportFileOptions {
  return {
    defaultExtension: 'json',
    saveDialogOptions: {
      defaultPath,
      filters: [
        { name: 'JSON files', extensions: ['json'] },
        { name: 'All files', extensions: ['*'] }
      ]
    }
  }
}
