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

import { ExportType } from '../main/ipc-messages'

export type ExportFileData = string | Uint8Array | ArrayBuffer | ArrayBufferView

// Messages sent from the renderer process to the main process

export class SpecifyProjectPathMessage {
  static readonly type = 'SpecifyProjectPathMessage'
}

export class SpecifyExportPathMessage {
  static readonly type = 'SpecifyExportPathMessage'
  readonly data: ExportFileData
  readonly exportType: ExportType
  constructor(exportType: ExportType, data: ExportFileData) {
    this.exportType = exportType
    this.data = data
  }
}

export class OpenDroppedProjectMessage {
  static readonly type = 'OpenDroppedProjectMessage'
  readonly filePath: string
  constructor(filePath: string) {
    this.filePath = filePath
  }
}

export class RegisterFilePathMessage {
  static readonly type = 'RegisterFilePathMessage'
  readonly filePath: string
  constructor(filePath: string) {
    this.filePath = filePath
  }
}

export class SetDocumentStateMessage {
  static readonly type = 'SetDocumentStateMessage'
  readonly hasUnsavedChanges: boolean | undefined
  readonly filePath: string | null | undefined
  readonly isExampleProject: boolean | undefined
  constructor(
    hasUnsavedChanges: boolean | undefined,
    filePath: string | null | undefined,
    isExampleProject: boolean | undefined
  ) {
    this.hasUnsavedChanges = hasUnsavedChanges
    this.filePath = filePath
    this.isExampleProject = isExampleProject
  }
}

export class GetAppVersionMessage {
  static readonly type = 'GetAppVersionMessage'
}

export class ShowErrorBoxMessage {
  static readonly type = 'ShowErrorBoxMessage'
  readonly title: string
  readonly message: string

  constructor(title: string, message: string) {
    this.title = title
    this.message = message
  }
}

export class ReadFileMessage {
  static readonly type = 'ReadFileMessage'
  readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }
}

export class WriteFileMessage {
  static readonly type = 'WriteFileMessage'
  readonly filePath: string
  readonly data: Uint8Array

  constructor(filePath: string, data: Uint8Array) {
    this.filePath = filePath
    this.data = data
  }
}

export class IsProjectFileMessage {
  static readonly type = 'IsProjectFileMessage'
  readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }
}
