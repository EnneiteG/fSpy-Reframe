/// <reference types="jest" />
import { mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { CLI } from '../../src/cli/cli'

describe('CLI', () => {
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test('prints usage when required options are missing', () => {
    CLI.run(['fspy'])

    expect(logSpy).toHaveBeenCalledWith('fSpy CLI')
    expect(logSpy).toHaveBeenCalledWith('Options (all required)')
  })

  test('rejects invalid image dimensions before reading state', () => {
    CLI.run(['fspy', '-w', 'not-a-number', '-h', '1080', '-s', 'missing.json', '-o', 'out.json'])

    expect(logSpy).toHaveBeenCalledWith('Error: got invalid image dimensions')
  })

  test('rejects missing project state file', () => {
    const missingStatePath = join(tmpdir(), 'fspy-missing-project-state.json')

    CLI.run(['fspy', '-w', '1920', '-h', '1080', '-s', missingStatePath, '-o', 'out.json'])

    expect(logSpy).toHaveBeenCalledWith('Error: project state file ' + missingStatePath + ' does not exist')
  })

  test('rejects invalid project state JSON', () => {
    const directory = mkdtempSync(join(tmpdir(), 'fspy-cli-test-'))
    const statePath = join(directory, 'state.json')
    writeFileSync(statePath, '{not-json')

    CLI.run(['fspy', '-w', '1920', '-h', '1080', '-s', statePath, '-o', 'out.json'])

    expect(logSpy).toHaveBeenCalledWith('Error: failed to read project state file ' + statePath)
  })
})
