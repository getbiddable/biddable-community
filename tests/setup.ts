/**
 * Jest setup file
 * Runs before all tests
 */

// Load environment variables
import dotenv from 'dotenv'
import path from 'path'

// Load .env.test if it exists, otherwise fall back to .env
const envPath = path.resolve(process.cwd(), '.env.test')
dotenv.config({ path: envPath })

// If .env.test doesn't exist, try .env
if (!process.env.TEST_API_KEY) {
  dotenv.config()
}

// Set default test values if not provided
process.env.TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

// Global test timeout
jest.setTimeout(30000)

// Suppress console logs during tests (optional)
// Uncomment if you want quieter test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// }
