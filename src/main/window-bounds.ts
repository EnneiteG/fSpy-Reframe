export interface WindowBounds {
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface SafeWindowBounds {
  x?: number
  y?: number
  width: number
  height: number
  center?: boolean
}

const minimumVisibleWidth = 80
const minimumVisibleHeight = 80

export function safeWindowBounds(
  restoredBounds: WindowBounds,
  visibleAreas: WindowBounds[],
  defaultSize: { width: number, height: number }
): SafeWindowBounds {
  const width = validDimension(restoredBounds.width)
    ? Math.max(restoredBounds.width, defaultSize.width)
    : defaultSize.width
  const height = validDimension(restoredBounds.height)
    ? Math.max(restoredBounds.height, defaultSize.height)
    : defaultSize.height

  if (!validCoordinate(restoredBounds.x) || !validCoordinate(restoredBounds.y)) {
    return centeredDefaultBounds(defaultSize)
  }

  const bounds = {
    x: restoredBounds.x,
    y: restoredBounds.y,
    width,
    height
  }

  if (!visibleAreas.some((visibleArea) => hasUsefulVisibleIntersection(bounds, visibleArea))) {
    return centeredDefaultBounds(defaultSize)
  }

  return bounds
}

function centeredDefaultBounds(defaultSize: { width: number, height: number }): SafeWindowBounds {
  return {
    width: defaultSize.width,
    height: defaultSize.height,
    center: true
  }
}

function validCoordinate(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value)
}

function validDimension(value: number | undefined): value is number {
  return validCoordinate(value) && value > 0
}

function hasUsefulVisibleIntersection(bounds: Required<WindowBounds>, visibleArea: WindowBounds): boolean {
  if (!validCoordinate(visibleArea.x) || !validCoordinate(visibleArea.y) ||
    !validDimension(visibleArea.width) || !validDimension(visibleArea.height)) {
    return false
  }

  const intersectionWidth = Math.min(bounds.x + bounds.width, visibleArea.x + visibleArea.width) -
    Math.max(bounds.x, visibleArea.x)
  const intersectionHeight = Math.min(bounds.y + bounds.height, visibleArea.y + visibleArea.height) -
    Math.max(bounds.y, visibleArea.y)

  return intersectionWidth >= minimumVisibleWidth && intersectionHeight >= minimumVisibleHeight
}
