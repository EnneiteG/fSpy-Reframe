import { contextBridge, ipcRenderer } from 'electron'
import { FSpyElectronAPI } from '../gui/electron-api'
import { OpenDroppedProjectMessage, SetDocumentStateMessage, SpecifyExportPathMessage, SpecifyProjectPathMessage, GetAppVersionMessage, ShowErrorBoxMessage } from '../gui/ipc-messages'
import { ExportMessage, NewProjectMessage, OpenImageMessage, OpenProjectMessage, SaveProjectAsMessage, SaveProjectMessage, SetSidePanelVisibilityMessage } from '../main/ipc-messages'

function on(channel: string, callback: (_: any, message: any) => void) {
  ipcRenderer.on(channel, callback)
  return () => {
    ipcRenderer.removeListener(channel, callback)
  }
}

const api: FSpyElectronAPI = {
  getAppVersion: () => ipcRenderer.sendSync(GetAppVersionMessage.type),
  showErrorBox: (title: string, message: string) => {
    ipcRenderer.send(ShowErrorBoxMessage.type, new ShowErrorBoxMessage(title, message))
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

const electronProcess = process as NodeJS.Process & { contextIsolated?: boolean }

if (electronProcess.contextIsolated) {
  contextBridge.exposeInMainWorld('fSpyElectron', api)
} else {
  const rendererWindow = window as any
  rendererWindow.fSpyElectron = api
}
