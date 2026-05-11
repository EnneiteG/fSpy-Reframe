import { clipboard, contextBridge, ipcRenderer } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { FSpyElectronAPI } from '../gui/electron-api'
import { OpenDroppedProjectMessage, SetDocumentStateMessage, SpecifyExportPathMessage, SpecifyProjectPathMessage, GetAppVersionMessage, ShowErrorBoxMessage, ReadFileMessage, WriteFileMessage, IsProjectFileMessage } from '../gui/ipc-messages'
import { ExportMessage, NewProjectMessage, OpenImageMessage, OpenProjectMessage, SaveProjectAsMessage, SaveProjectMessage, SetSidePanelVisibilityMessage } from '../main/ipc-messages'

function on(channel: string, callback: (_: any, message: any) => void) {
  ipcRenderer.on(channel, callback)
  return () => {
    ipcRenderer.removeListener(channel, callback)
  }
}

function resourcePath(fileName: string): string {
  if (process.resourcesPath != null) {
    if (process.env.DEV) {
      return join(process.cwd(), 'assets/electron', fileName)
    }
    return join(process.resourcesPath, fileName)
  }

  return ''
}

function resourceURL(fileName: string): string {
  const filePath = resourcePath(fileName)
  return filePath ? pathToFileURL(filePath).toString() : ''
}

function checkedResult<T>(result: { data?: T, error?: string }): T {
  if (result.error) {
    throw new Error(result.error)
  }
  return result.data as T
}

function droppedFilePath(event: DragEvent): string | null {
  if (event.dataTransfer === null) {
    return null
  }

  const firstFile = event.dataTransfer.files[0] as File & { path?: string }
  if (!firstFile || !firstFile.path) {
    return null
  }

  return firstFile.path
}

const api: FSpyElectronAPI = {
  getAppVersion: () => ipcRenderer.sendSync(GetAppVersionMessage.type),
  showErrorBox: (title: string, message: string) => {
    ipcRenderer.send(ShowErrorBoxMessage.type, new ShowErrorBoxMessage(title, message))
  },
  readFile: (filePath: string) => {
    const data = checkedResult<ArrayBuffer>(ipcRenderer.sendSync(ReadFileMessage.type, new ReadFileMessage(filePath)))
    return new Uint8Array(data)
  },
  writeFile: (filePath: string, data: Uint8Array) => {
    checkedResult<void>(ipcRenderer.sendSync(WriteFileMessage.type, new WriteFileMessage(filePath, data)))
  },
  isProjectFile: (filePath: string) => ipcRenderer.sendSync(IsProjectFileMessage.type, new IsProjectFileMessage(filePath)),
  resourcePath: resourcePath,
  resourceURL: resourceURL,
  copyText: (text: string) => {
    clipboard.writeText(text)
  },
  onFileDrop: (callback) => {
    const dragHandler = (event: DragEvent) => {
      event.preventDefault()
    }
    const dropHandler = (event: DragEvent) => {
      event.preventDefault()
      const filePath = droppedFilePath(event)
      if (filePath) {
        callback(filePath)
      }
    }

    document.addEventListener('dragover', dragHandler)
    document.addEventListener('dragenter', dragHandler)
    document.addEventListener('drop', dropHandler)

    return () => {
      document.removeEventListener('dragover', dragHandler)
      document.removeEventListener('dragenter', dragHandler)
      document.removeEventListener('drop', dropHandler)
    }
  },
  specifyProjectPath: () => {
    ipcRenderer.send(SpecifyProjectPathMessage.type, new SpecifyProjectPathMessage())
  },
  specifyExportPath: (exportType, data) => {
    ipcRenderer.send(SpecifyExportPathMessage.type, new SpecifyExportPathMessage(exportType, data))
  },
  openDroppedProject: (filePath: string) => {
    ipcRenderer.send(OpenDroppedProjectMessage.type, new OpenDroppedProjectMessage(filePath))
  },
  setDocumentState: (hasUnsavedChanges, filePath, isExampleProject) => {
    ipcRenderer.send(
      SetDocumentStateMessage.type,
      new SetDocumentStateMessage(hasUnsavedChanges, filePath, isExampleProject)
    )
  },
  onNewProject: (callback) => on(NewProjectMessage.type, () => callback()),
  onOpenProject: (callback) => on(OpenProjectMessage.type, (_: any, message: OpenProjectMessage) => {
    callback(message.filePath, message.isExampleProject)
  }),
  onSaveProject: (callback) => on(SaveProjectMessage.type, () => callback()),
  onSaveProjectAs: (callback) => on(SaveProjectAsMessage.type, (_: any, message: SaveProjectAsMessage) => {
    callback(message.filePath)
  }),
  onOpenImage: (callback) => on(OpenImageMessage.type, (_: any, message: OpenImageMessage) => {
    callback(message.filePath)
  }),
  onExport: (callback) => on(ExportMessage.type, (_: any, message: ExportMessage) => {
    callback(message.exportType)
  }),
  onSetSidePanelVisibility: (callback) => on(SetSidePanelVisibilityMessage.type, (_: any, message: SetSidePanelVisibilityMessage) => {
    callback(message.panelsAreVisible)
  })
}

try {
  contextBridge.exposeInMainWorld('fSpyElectron', api)
} catch {
  const rendererWindow = window as any
  rendererWindow.fSpyElectron = api
}
