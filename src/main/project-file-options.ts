import type { SaveDialogOptions } from 'electron'
import { PROJECT_FILE_EXTENSION } from '../gui/io/project-file-format'

const defaultProjectFileName = 'untitled.' + PROJECT_FILE_EXTENSION

export function projectSaveDialogOptions(filePath: string | null, isExampleProject: boolean): SaveDialogOptions {
  return {
    defaultPath: filePath && !isExampleProject ? filePath : defaultProjectFileName,
    filters: [
      { name: 'fSpy project files', extensions: [PROJECT_FILE_EXTENSION] }
    ]
  }
}

export function pathWithProjectExtension(filePath: string): string {
  if (filePath.endsWith('.' + PROJECT_FILE_EXTENSION)) {
    return filePath
  }
  return filePath + '.' + PROJECT_FILE_EXTENSION
}
