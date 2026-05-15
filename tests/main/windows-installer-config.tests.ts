/// <reference types="jest" />
import { readFileSync } from 'fs'
import path from 'path'

describe('Windows installer config', () => {
  const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'))

  test('keeps current-user install available while allowing all-users install', () => {
    expect(packageJson.build.nsis).toEqual({
      oneClick: false,
      perMachine: false,
      selectPerMachineByDefault: false,
      allowElevation: true
    })
  })
})
