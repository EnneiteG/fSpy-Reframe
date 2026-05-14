import type { ExportType } from '../../main/ipc-messages'
import type { SmokeTestResult } from '../../main/smoke-test-options'
import type { ExportFileData } from '../ipc-messages'

export interface ElectronAPI {
  // Request-response
  showErrorBox(title: string, content: string): Promise<void>
  getAppVersion(): Promise<string>
  readFile(filePath: string): Promise<Uint8Array>
  writeFile(filePath: string, data: Uint8Array): Promise<void>
  isProjectFile(filePath: string): Promise<boolean>
  getResourceURL(fileName: string): Promise<string>
  getResourcePath(fileName: string): Promise<string>

  // Fire-and-forget (renderer → main)
  sendSetDocumentState(
    hasUnsavedChanges: boolean | undefined,
    filePath: string | null | undefined,
    isExampleProject: boolean | undefined
  ): void
  sendSpecifyProjectPath(): void
  sendOpenDroppedProject(filePath: string): void
  sendSpecifyExportPath(exportType: ExportType, data: ExportFileData): void

  // Listeners (main → renderer)
  onNewProject(callback: () => void): void
  onOpenProject(callback: (filePath: string, isExampleProject: boolean) => void): void
  onSaveProject(callback: () => void): void
  onSaveProjectAs(callback: (filePath: string) => void): void
  onOpenImage(callback: (filePath: string) => void): void
  onExport(callback: (exportType: ExportType) => void): void
  onSetSidePanelVisibility(callback: (panelsAreVisible: boolean) => void): void
  onRunSmokeTest(callback: (imagePath: string, exportPath: string) => void): void

  // Smoke test
  sendSmokeTestResult(result: SmokeTestResult): void

  // Clipboard
  writeClipboardText(text: string): void

  // File utilities
  getPathForFile(file: File): string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
