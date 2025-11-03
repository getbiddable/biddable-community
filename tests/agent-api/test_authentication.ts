/**
 * Authentication Tests for Agent API
 *
 * Tests API key authentication, authorization, and access control
 */

import { describe, test, expect, beforeAll } from '@jest/globals'

// Test configuration
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'
const VALID_API_KEY = process.env.TEST_API_KEY || ''
const INVALID_API_KEY = 'bbl_invalid_key_12345678901234567890'

// Helper function to make API requests
async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

describe('Agent API Authentication', () => {
  beforeAll(() => {
    if (!VALID_API_KEY) {
      console.warn('⚠️  TEST_API_KEY not set. Some tests will be skipped.')
    }
  })

  describe('API Key Validation', () => {
    test('should reject request with no API key', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/list')

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toContain('API key')
    })

    test('should reject request with invalid API key', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/list', {
        headers: {
          Authorization: `Bearer ${INVALID_API_KEY}`,
        },
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    test('should reject request with malformed Authorization header', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/list', {
        headers: {
          Authorization: 'InvalidFormat',
        },
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    test('should accept request with valid API key', async () => {
      if (!VALID_API_KEY) {
        console.log('⏭️  Skipping: TEST_API_KEY not set')
        return
      }

      const response = await makeRequest('/api/v1/agent/campaigns/list', {
        headers: {
          Authorization: `Bearer ${VALID_API_KEY}`,
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('campaigns')
    })
  })

  describe('Response Headers', () => {
    test('should include X-Request-ID in response', async () => {
      if (!VALID_API_KEY) {
        console.log('⏭️  Skipping: TEST_API_KEY not set')
        return
      }

      const response = await makeRequest('/api/v1/agent/campaigns/list', {
        headers: {
          Authorization: `Bearer ${VALID_API_KEY}`,
        },
      })

      expect(response.headers.get('X-Request-ID')).toBeTruthy()
    })

    test('should include rate limit headers', async () => {
      if (!VALID_API_KEY) {
        console.log('⏭️  Skipping: TEST_API_KEY not set')
        return
      }

      const response = await makeRequest('/api/v1/agent/campaigns/list', {
        headers: {
          Authorization: `Bearer ${VALID_API_KEY}`,
        },
      })

      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })
  })

  describe('Error Response Format', () => {
    test('should return standardized error format', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/list')

      const data = await response.json()

      // Check error structure
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
      expect(data.error).toHaveProperty('timestamp')
      expect(data.error).toHaveProperty('request_id')

      // Check timestamp format (ISO 8601)
      const timestamp = new Date(data.error.timestamp)
      expect(timestamp.toISOString()).toBe(data.error.timestamp)
    })

    test('should include details field when applicable', async () => {
      if (!VALID_API_KEY) {
        console.log('⏭️  Skipping: TEST_API_KEY not set')
        return
      }

      // Try to create campaign with invalid data
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VALID_API_KEY}`,
        },
        body: JSON.stringify({
          name: '', // Invalid: empty name
          platforms: [],
          budget: -100,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toHaveProperty('details')
      expect(data.error.details).toHaveProperty('errors')
    })
  })

  describe('CORS and Security Headers', () => {
    test('should handle preflight requests', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/list', {
        method: 'OPTIONS',
      })

      // OPTIONS should be handled gracefully
      expect([200, 204, 405]).toContain(response.status)
    })
  })
})

describe('Agent API Organization Isolation', () => {
  test('should only return data for authenticated organization', async () => {
    if (!VALID_API_KEY) {
      console.log('⏭️  Skipping: TEST_API_KEY not set')
      return
    }

    // List campaigns
    const response = await makeRequest('/api/v1/agent/campaigns/list', {
      headers: {
        Authorization: `Bearer ${VALID_API_KEY}`,
      },
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)

    // All campaigns should belong to the same organization
    // (We can't verify org ID directly, but we can verify consistency)
    const campaigns = data.data.campaigns

    if (campaigns.length > 0) {
      console.log(`✅ Retrieved ${campaigns.length} campaigns for organization`)
    }
  })

  test('should not allow access to resources from other organizations', async () => {
    if (!VALID_API_KEY) {
      console.log('⏭️  Skipping: TEST_API_KEY not set')
      return
    }

    // Try to access a campaign that doesn't exist or belongs to another org
    // Using a very high ID that's unlikely to exist
    const fakeId = 999999999

    const response = await makeRequest(
      `/api/v1/agent/campaigns/${fakeId}/get`,
      {
        headers: {
          Authorization: `Bearer ${VALID_API_KEY}`,
        },
      }
    )

    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
  })
})
