/// <reference types="jest" />
import { safeWindowBounds } from '../../src/main/window-bounds'

describe('safeWindowBounds', () => {
  const defaultSize = { width: 800, height: 768 }
  const primaryDisplay = { x: 0, y: 0, width: 1920, height: 1080 }

  test('keeps bounds with useful visible area', () => {
    expect(safeWindowBounds(
      { x: 100, y: 100, width: 1200, height: 900 },
      [primaryDisplay],
      defaultSize
    )).toEqual({
      x: 100,
      y: 100,
      width: 1200,
      height: 900
    })
  })

  test('centers default bounds when restored bounds are offscreen', () => {
    expect(safeWindowBounds(
      { x: -3000, y: 100, width: 1200, height: 900 },
      [primaryDisplay],
      defaultSize
    )).toEqual({
      width: 800,
      height: 768,
      center: true
    })
  })

  test('centers default bounds when restored bounds are barely visible', () => {
    expect(safeWindowBounds(
      { x: 1910, y: 100, width: 1200, height: 900 },
      [primaryDisplay],
      defaultSize
    )).toEqual({
      width: 800,
      height: 768,
      center: true
    })
  })

  test('supports secondary display bounds', () => {
    expect(safeWindowBounds(
      { x: 2100, y: 100, width: 1200, height: 900 },
      [primaryDisplay, { x: 1920, y: 0, width: 1920, height: 1080 }],
      defaultSize
    )).toEqual({
      x: 2100,
      y: 100,
      width: 1200,
      height: 900
    })
  })
})
