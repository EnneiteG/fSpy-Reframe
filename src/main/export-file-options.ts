import type { SaveDialogOptions } from 'electron'
import path from 'path'
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
            { name: 'Image files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff'] },
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

function detectImageFileExtension(data: ExportFileData): string | null {
  const bytes = bytesFromData(data)
  if (bytes === null) {
    return null
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png'
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'jpg'
  }
  if (startsWithAscii(bytes, 'GIF87a') || startsWithAscii(bytes, 'GIF89a')) {
    return 'gif'
  }
  if (startsWithAscii(bytes, 'RIFF') && bytes.length >= 12 && startsWithAscii(bytes.subarray(8), 'WEBP')) {
    return 'webp'
  }
  if (startsWithAscii(bytes, 'BM')) {
    return 'bmp'
  }
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) {
    return 'tif'
  }
  return null
}

function bytesFromData(data: ExportFileData): Uint8Array | null {
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  return null
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) {
    return false
  }
  return prefix.every((value, index) => bytes[index] === value)
}

function startsWithAscii(bytes: Uint8Array, prefix: string): boolean {
  if (bytes.length < prefix.length) {
    return false
  }
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix.charCodeAt(i)) {
      return false
    }
  }
  return true
}
