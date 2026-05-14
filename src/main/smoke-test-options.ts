export interface SmokeTestOptions {
  imagePath: string
  exportPath: string
}

export interface SmokeTestResult {
  success: boolean
  message?: string
}
