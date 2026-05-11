import SavedState from './saved-state'

export const EXAMPLE_PROJECT_FILENAME = 'example.fspy'
export const PROJECT_FILE_EXTENSION = 'fspy'
export const PROJECT_FILE_ID = 'fspy'
export const PROJECT_FILE_VERSION = 1

const HEADER_SIZE = 16

export interface ProjectFileData {
  savedState: SavedState
  imageData: Uint8Array | null
}

function dataView(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength)
}

export function isProjectFileData(data: Uint8Array): boolean {
  if (data.length < PROJECT_FILE_ID.length) {
    return false
  }

  for (let i = 0; i < PROJECT_FILE_ID.length; i++) {
    if (data[i] != PROJECT_FILE_ID.charCodeAt(i)) {
      return false
    }
  }

  return true
}

export function parseProjectFileData(data: Uint8Array): ProjectFileData {
  if (!isProjectFileData(data)) {
    throw new Error('This does not appear to be a valid project file')
  }
  if (data.length < HEADER_SIZE) {
    throw new Error('This does not appear to be a valid project file')
  }

  const view = dataView(data)
  const projectFileVersion = view.getUint32(4, true)
  if (projectFileVersion != PROJECT_FILE_VERSION) {
    throw new Error('Version ' + projectFileVersion + ' project files are not compatible with this version of fSpy.')
  }

  const stateStringSize = view.getUint32(8, true)
  const imageDataSize = view.getUint32(12, true)
  const stateStart = HEADER_SIZE
  const stateEnd = stateStart + stateStringSize
  const imageEnd = stateEnd + imageDataSize
  if (stateEnd > data.length || imageEnd > data.length) {
    throw new Error('This does not appear to be a valid project file')
  }

  let savedState: SavedState
  try {
    const stateString = new TextDecoder().decode(data.slice(stateStart, stateEnd))
    savedState = JSON.parse(stateString)
  } catch {
    throw new Error('Could not parse the project state data contained in the project file.')
  }

  return {
    savedState: savedState,
    imageData: imageDataSize > 0 ? data.slice(stateEnd, imageEnd) : null
  }
}

export function serializeProjectFileData(savedState: SavedState, imageData: Uint8Array | null): Uint8Array {
  const stateData = new TextEncoder().encode(JSON.stringify(savedState))
  const imageDataSize = imageData ? imageData.length : 0
  const fileData = new Uint8Array(HEADER_SIZE + stateData.length + imageDataSize)
  const view = dataView(fileData)

  for (let i = 0; i < PROJECT_FILE_ID.length; i++) {
    view.setUint8(i, PROJECT_FILE_ID.charCodeAt(i))
  }
  view.setUint32(4, PROJECT_FILE_VERSION, true)
  view.setUint32(8, stateData.length, true)
  view.setUint32(12, imageDataSize, true)

  fileData.set(stateData, HEADER_SIZE)
  if (imageData) {
    fileData.set(imageData, HEADER_SIZE + stateData.length)
  }

  return fileData
}
