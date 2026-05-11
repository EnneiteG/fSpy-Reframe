/**
 * fSpy
 * Copyright (c) 2020 - Per Gantelius
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { electronAPI } from '../electron-api'

export function loadImage(
  imageBuffer: Uint8Array,
  onLoad: (width: number, height: number, url: string) => void,
  onError: () => void
) {
  let blob = new Blob([imageBuffer])
  let url = URL.createObjectURL(blob)
  let image = new Image()
  image.src = url
  image.onload = (_: Event) => {
    onLoad(image.width, image.height, url)
  }
  image.onerror = (_) => {
    onError()
  }
}

export function resourceURL(fileName: string): string {
  return electronAPI().resourceURL(fileName)
}

export function resourcePath(fileName: string): string {
  return electronAPI().resourcePath(fileName)
}
