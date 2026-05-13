/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*tests.ts', '**/*specs.ts', '**/*_tests.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: {
        ignoreCodes: [151002]
      }
    }]
  },
  reporters: ['default', 'jest-junit']
}
