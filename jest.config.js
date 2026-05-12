/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*tests.ts', '**/*specs.ts', '**/*_tests.ts'],
  reporters: ['default', 'jest-junit']
}
