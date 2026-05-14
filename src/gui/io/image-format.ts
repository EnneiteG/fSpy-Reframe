export type ImageFileData = Uint8Array | ArrayBuffer | ArrayBufferView | string

export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff']

export function detectImageFileExtension(data: ImageFileData): string | null {
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
  if (isAvif(bytes)) {
    return 'avif'
  }
  if (startsWithAscii(bytes, 'BM')) {
    return 'bmp'
  }
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) {
    return 'tif'
  }
  return null
}

export function detectImageMimeType(data: ImageFileData): string | null {
  switch (detectImageFileExtension(data)) {
    case 'png':
      return 'image/png'
    case 'jpg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'bmp':
      return 'image/bmp'
    case 'tif':
      return 'image/tiff'
    default:
      return null
  }
}

function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || !startsWithAscii(bytes.subarray(4), 'ftyp')) {
    return false
  }

  for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
    if (startsWithAscii(bytes.subarray(offset), 'avif')) {
      return true
    }
  }

  return false
}

function bytesFromData(data: ImageFileData): Uint8Array | null {
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
