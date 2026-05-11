import { ExportType } from '../main/ipc-messages'

export type Unsubscribe = () => void

export interface FSpyElectronAPI {
  getAppVersion(): string
  showErrorBox(title: string, message: string): void
  specifyProjectPath(): void
  specifyExportPath(exportType: ExportType, data: any): void
  openDroppedProject(filePath: string): void
  setDocumentState(hasUnsavedChanges: boolean | undefined, filePath: string | null | undefined, isExampleProject: boolean | undefined): void
  onNewProject(callback: () => void): Unsubscribe
  onOpenProject(callback: (filePath: string, isExampleProject: boolean) => void): Unsubscribe
  onSaveProject(callback: () => void): Unsubscribe
  onSaveProjectAs(callback: (filePath: string) => void): Unsubscribe
  onOpenImage(callback: (filePath: string) => void): Unsubscribe
  onExport(callback: (exportType: ExportType) => void): Unsubscribe
  onSetSidePanelVisibility(callback: (panelsAreVisible: boolean) => void): Unsubscribe
}

declare global {
  interface Window {
    fSpyElectron?: FSpyElectronAPI
  }
}

const noop = () => {
  // no-op fallback for tests that run without Electron preload
}

const fallbackElectronAPI: FSpyElectronAPI = {
  getAppVersion: () => '',
  showErrorBox: noop,
  specifyProjectPath: noop,
  specifyExportPath: noop,
  openDroppedProject: noop,
  setDocumentState: noop,
  onNewProject: () => noop,
  onOpenProject: () => noop,
  onSaveProject: () => noop,
  onSaveProjectAs: () => noop,
  onOpenImage: () => noop,
  onExport: () => noop,
  onSetSidePanelVisibility: () => noop
}

export function electronAPI(): FSpyElectronAPI {
  if (typeof window !== 'undefined' && window.fSpyElectron) {
    return window.fSpyElectron
  }
  return fallbackElectronAPI
}
