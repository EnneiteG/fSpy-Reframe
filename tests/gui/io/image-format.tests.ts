/// <reference types="jest" />
import { detectImageFileExtension, detectImageMimeType, IMAGE_FILE_EXTENSIONS } from '../../../src/gui/io/image-format'

const avifBytes = new Uint8Array([
  0x00, 0x00, 0x00, 0x20,
  0x66, 0x74, 0x79, 0x70,
  0x61, 0x76, 0x69, 0x66,
  0x00, 0x00, 0x00, 0x00,
  0x61, 0x76, 0x69, 0x66
])

describe('image format detection', () => {
  test('detects AVIF extension', () => {
    expect(detectImageFileExtension(avifBytes)).toBe('avif')
  })

  test('detects AVIF MIME type', () => {
    expect(detectImageMimeType(avifBytes)).toBe('image/avif')
  })

  test('lists AVIF as a supported image extension', () => {
    expect(IMAGE_FILE_EXTENSIONS).toContain('avif')
  })
})
