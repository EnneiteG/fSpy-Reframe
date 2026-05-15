/// <reference types="jest" />
import { readFileSync } from 'fs'
import path from 'path'

describe('packaging config', () => {
  const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'))

  test('builds Linux AppImage, deb and rpm packages', () => {
    expect(packageJson.scripts['dist-linux']).toContain('AppImage deb rpm')
    expect(packageJson.build.linux.executableName).toBe('fspy-reframe')
    expect(packageJson.build.linux.target.map((target: { target: string }) => target.target)).toEqual([
      'AppImage',
      'deb',
      'rpm'
    ])
  })

  test('builds macOS DMGs for Intel and Apple Silicon', () => {
    expect(packageJson.scripts['dist-mac']).toContain('--x64 --arm64')
    expect(packageJson.build.mac.target).toEqual([
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ])
  })
})
