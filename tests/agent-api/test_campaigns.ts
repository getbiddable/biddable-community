/**
 * Campaign Endpoint Tests for Agent API
 *
 * Tests all campaign CRUD operations and validation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'

// Test configuration
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'
const VALID_API_KEY = process.env.TEST_API_KEY || ''

// Test data
let createdCampaignId: number | null = null

// Helper function to make API requests
async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VALID_API_KEY}`,
      ...options.headers,
    },
  })
}

describe('Campaign CRUD Operations', () => {
  beforeAll(() => {
    if (!VALID_API_KEY) {
      throw new Error('TEST_API_KEY environment variable is required')
    }
  })

  afterAll(async () => {
    // Clean up: Delete test campaign if it was created
    if (createdCampaignId) {
      await makeRequest(`/api/v1/agent/campaigns/${createdCampaignId}/delete`, {
        method: 'DELETE',
      })
      console.log(`🧹 Cleaned up test campaign ${createdCampaignId}`)
    }
  })

  describe('POST /api/v1/agent/campaigns/create', () => {
    test('should create a valid campaign', async () => {
      const campaignData = {
        name: 'Test Campaign - API Test',
        platforms: ['google', 'reddit'],
        budget: 1000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
        goal: 'Test campaign for API validation',
      }

      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('campaign')

      const campaign = data.data.campaign
      expect(campaign).toHaveProperty('id')
      expect(campaign.campaign_name).toBe(campaignData.name)
      expect(campaign.budget).toBe(campaignData.budget)
      expect(campaign.platforms).toEqual(campaignData.platforms)

      // Save for cleanup
      createdCampaignId = campaign.id
      console.log(`✅ Created test campaign ${createdCampaignId}`)
    })

    test('should reject campaign with empty name', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          platforms: ['google'],
          budget: 1000,
          start_date: '2025-12-01',
          end_date: '2025-12-31',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details.errors).toBeDefined()
    })

    test('should reject campaign with no platforms', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          platforms: [],
          budget: 1000,
          start_date: '2025-12-01',
          end_date: '2025-12-31',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject campaign with invalid platform', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          platforms: ['invalid_platform'],
          budget: 1000,
          start_date: '2025-12-01',
          end_date: '2025-12-31',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject campaign with budget too low', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          platforms: ['google'],
          budget: 0,
          start_date: '2025-12-01',
          end_date: '2025-12-31',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject campaign with budget too high', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          platforms: ['google'],
          budget: 15000,
          start_date: '2025-12-01',
          end_date: '2025-12-31',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject campaign with invalid date format', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          platforms: ['google'],
          budget: 1000,
          start_date: '12/01/2025', // Wrong format
          end_date: '2025-12-31',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject campaign where end_date is before start_date', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          platforms: ['google'],
          budget: 1000,
          start_date: '2025-12-31',
          end_date: '2025-12-01',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    test('should reject campaign with goal too long', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Campaign',
          platforms: ['google'],
          budget: 1000,
          start_date: '2025-12-01',
          end_date: '2025-12-31',
          goal: 'A'.repeat(501), // 501 characters
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/v1/agent/campaigns/list', () => {
    test('should list campaigns with default pagination', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/list')

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('campaigns')
      expect(Array.isArray(data.data.campaigns)).toBe(true)
    })

    test('should respect limit parameter', async () => {
      const response = await makeRequest(
        '/api/v1/agent/campaigns/list?limit=5'
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.campaigns.length).toBeLessThanOrEqual(5)
    })

    test('should respect offset parameter', async () => {
      const response = await makeRequest(
        '/api/v1/agent/campaigns/list?offset=10'
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('campaigns')
    })

    test('should reject limit > 100', async () => {
      const response = await makeRequest(
        '/api/v1/agent/campaigns/list?limit=101'
      )

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/v1/agent/campaigns/:id/get', () => {
    test('should get campaign by ID', async () => {
      if (!createdCampaignId) {
        console.log('⏭️  Skipping: No campaign created')
        return
      }

      const response = await makeRequest(
        `/api/v1/agent/campaigns/${createdCampaignId}/get`
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('campaign')
      expect(data.data.campaign.id).toBe(createdCampaignId)
    })

    test('should return 404 for non-existent campaign', async () => {
      const response = await makeRequest('/api/v1/agent/campaigns/999999/get')

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
    })

    test('should return 400 for invalid campaign ID', async () => {
      const response = await makeRequest(
        '/api/v1/agent/campaigns/invalid/get'
      )

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/v1/agent/campaigns/:id/update', () => {
    test('should update campaign name', async () => {
      if (!createdCampaignId) {
        console.log('⏭️  Skipping: No campaign created')
        return
      }

      const response = await makeRequest(
        `/api/v1/agent/campaigns/${createdCampaignId}/update`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Updated Campaign Name',
          }),
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.campaign.campaign_name).toBe('Updated Campaign Name')
    })

    test('should update campaign budget', async () => {
      if (!createdCampaignId) {
        console.log('⏭️  Skipping: No campaign created')
        return
      }

      const response = await makeRequest(
        `/api/v1/agent/campaigns/${createdCampaignId}/update`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            budget: 2000,
          }),
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.campaign.budget).toBe(2000)
    })

    test('should update multiple fields at once', async () => {
      if (!createdCampaignId) {
        console.log('⏭️  Skipping: No campaign created')
        return
      }

      const response = await makeRequest(
        `/api/v1/agent/campaigns/${createdCampaignId}/update`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Multi-Update Test',
            budget: 1500,
            platforms: ['google', 'youtube'],
          }),
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.campaign.campaign_name).toBe('Multi-Update Test')
      expect(data.data.campaign.budget).toBe(1500)
      expect(data.data.campaign.platforms).toEqual(['google', 'youtube'])
    })

    test('should return 404 for non-existent campaign', async () => {
      const response = await makeRequest(
        '/api/v1/agent/campaigns/999999/update',
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Test',
          }),
        }
      )

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
    })
  })

  describe('DELETE /api/v1/agent/campaigns/:id/delete', () => {
    test('should delete campaign', async () => {
      if (!createdCampaignId) {
        console.log('⏭️  Skipping: No campaign created')
        return
      }

      const response = await makeRequest(
        `/api/v1/agent/campaigns/${createdCampaignId}/delete`,
        {
          method: 'DELETE',
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify it's actually deleted
      const getResponse = await makeRequest(
        `/api/v1/agent/campaigns/${createdCampaignId}/get`
      )
      expect(getResponse.status).toBe(404)

      // Clear the ID so afterAll doesn't try to delete again
      createdCampaignId = null
      console.log('✅ Campaign deleted successfully')
    })

    test('should return 404 when deleting non-existent campaign', async () => {
      const response = await makeRequest(
        '/api/v1/agent/campaigns/999999/delete',
        {
          method: 'DELETE',
        }
      )

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
    })
  })
})
