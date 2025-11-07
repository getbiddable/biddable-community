/** @type {import('jest').Config} */
const config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directories
  roots: ['<rootDir>/test', '<rootDir>/lib'],

  // Test file patterns
  testMatch: [
    '**/test/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  testPathIgnorePatterns: [
    '<rootDir>/test/agent-api/setup.ts'
  ],

  // Module path aliases (match tsconfig.json)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Coverage configuration
  collectCoverageFrom: [
    'lib/agent-api-*.ts',
    'app/api/v1/agent/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/agent-api/setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,

  maxWorkers: 1,

  // Test timeout (30 seconds for API tests)
  testTimeout: 30000
}

module.exports = config
