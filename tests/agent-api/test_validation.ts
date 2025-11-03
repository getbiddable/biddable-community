/**
 * Validation and Error Handling Tests for Agent API
 *
 * Tests Zod schema validation, error codes, and error response formats
 */

import { describe, test, expect } from '@jest/globals'
import {
  CampaignCreateSchema,
  CampaignUpdateSchema,
  AudienceCreateSchema,
  PaginationSchema,
} from '../../lib/agent-api-schemas'
import {
  AgentErrorCode,
  ValidationError,
  BudgetExceededError,
  NotFoundError,
  formatZodError,
} from '../../lib/agent-api-errors'

describe('Zod Schema Validation', () => {
  describe('CampaignCreateSchema', () => {
    test('should validate valid campaign data', () => {
      const validData = {
        name: 'Test Campaign',
        platforms: ['google', 'reddit'],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
        goal: 'Drive sales',
      }

      const result = CampaignCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject empty name', () => {
      const invalidData = {
        name: '',
        platforms: ['google'],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = formatZodError(result.error)
        expect(errors.some((e) => e.field === 'name')).toBe(true)
      }
    })

    test('should reject name over 100 characters', () => {
      const invalidData = {
        name: 'A'.repeat(101),
        platforms: ['google'],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject empty platforms array', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: [],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject invalid platform', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: ['invalid_platform'],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject budget below 1', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: ['google'],
        budget: 0,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject budget above 10000', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: ['google'],
        budget: 10001,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject non-integer budget', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: ['google'],
        budget: 5000.5,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject invalid date format', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: ['google'],
        budget: 5000,
        start_date: '12/01/2025',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject end_date before start_date', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: ['google'],
        budget: 5000,
        start_date: '2025-12-31',
        end_date: '2025-12-01',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = formatZodError(result.error)
        expect(errors.some((e) => e.field === 'end_date')).toBe(true)
      }
    })

    test('should reject goal over 500 characters', () => {
      const invalidData = {
        name: 'Test Campaign',
        platforms: ['google'],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
        goal: 'A'.repeat(501),
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should accept optional goal field', () => {
      const validData = {
        name: 'Test Campaign',
        platforms: ['google'],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should accept multiple platforms', () => {
      const validData = {
        name: 'Test Campaign',
        platforms: ['google', 'youtube', 'reddit', 'meta'],
        budget: 5000,
        start_date: '2025-12-01',
        end_date: '2025-12-31',
      }

      const result = CampaignCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('CampaignUpdateSchema', () => {
    test('should validate partial updates', () => {
      const validData = {
        name: 'Updated Name',
      }

      const result = CampaignUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should allow updating only budget', () => {
      const validData = {
        budget: 3000,
      }

      const result = CampaignUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should validate date range when both dates provided', () => {
      const invalidData = {
        start_date: '2025-12-31',
        end_date: '2025-12-01',
      }

      const result = CampaignUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should allow updating only start_date', () => {
      const validData = {
        start_date: '2025-11-01',
      }

      const result = CampaignUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should allow empty updates object', () => {
      const validData = {}

      const result = CampaignUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('AudienceCreateSchema', () => {
    test('should validate valid audience data', () => {
      const validData = {
        name: 'Test Audience',
        description: 'Target millennials',
        age_min: 25,
        age_max: 40,
        genders: ['male', 'female'],
        locations: ['United States', 'Canada'],
        interests: ['technology', 'sports'],
        behaviors: ['online_shopping'],
      }

      const result = AudienceCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject age_min below 13', () => {
      const invalidData = {
        name: 'Test Audience',
        age_min: 12,
      }

      const result = AudienceCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject age_max above 100', () => {
      const invalidData = {
        name: 'Test Audience',
        age_max: 101,
      }

      const result = AudienceCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject age_min > age_max', () => {
      const invalidData = {
        name: 'Test Audience',
        age_min: 40,
        age_max: 25,
      }

      const result = AudienceCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should accept valid age range', () => {
      const validData = {
        name: 'Test Audience',
        age_min: 18,
        age_max: 65,
      }

      const result = AudienceCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject invalid gender', () => {
      const invalidData = {
        name: 'Test Audience',
        genders: ['invalid_gender'],
      }

      const result = AudienceCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should accept all valid genders', () => {
      const validData = {
        name: 'Test Audience',
        genders: ['male', 'female', 'other', 'all'],
      }

      const result = AudienceCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('PaginationSchema', () => {
    test('should apply default values', () => {
      const result = PaginationSchema.parse({})
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })

    test('should accept custom limit and offset', () => {
      const result = PaginationSchema.parse({
        limit: 20,
        offset: 10,
      })
      expect(result.limit).toBe(20)
      expect(result.offset).toBe(10)
    })

    test('should reject limit above 100', () => {
      const result = PaginationSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
    })

    test('should reject negative offset', () => {
      const result = PaginationSchema.safeParse({
        offset: -1,
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('Error Classes', () => {
  describe('ValidationError', () => {
    test('should create validation error with details', () => {
      const error = new ValidationError('Invalid input', {
        field: 'name',
        message: 'Name is required',
      })

      expect(error.code).toBe(AgentErrorCode.VALIDATION_ERROR)
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe('Invalid input')
      expect(error.details).toEqual({
        field: 'name',
        message: 'Name is required',
      })
    })
  })

  describe('BudgetExceededError', () => {
    test('should create budget exceeded error with details', () => {
      const error = new BudgetExceededError({
        monthly_limit: 10000,
        current_total: 8000,
        requested: 3000,
        available: 2000,
        affected_month: 'November 2025',
        campaigns: [
          { id: 1, name: 'Campaign 1', budget: 5000 },
          { id: 2, name: 'Campaign 2', budget: 3000 },
        ],
      })

      expect(error.code).toBe(AgentErrorCode.BUDGET_EXCEEDED)
      expect(error.statusCode).toBe(400)
      expect(error.message).toContain('$10,000')
      expect(error.details).toHaveProperty('monthly_limit', 10000)
      expect(error.details).toHaveProperty('current_total', 8000)
      expect(error.details?.campaigns).toHaveLength(2)
    })
  })

  describe('NotFoundError', () => {
    test('should create not found error with resource name', () => {
      const error = new NotFoundError('Campaign', 123)

      expect(error.code).toBe(AgentErrorCode.RESOURCE_NOT_FOUND)
      expect(error.statusCode).toBe(404)
      expect(error.message).toContain('Campaign')
      expect(error.message).toContain('123')
      expect(error.details).toEqual({
        resource: 'Campaign',
        id: 123,
      })
    })

    test('should create not found error without ID', () => {
      const error = new NotFoundError('Campaign')

      expect(error.code).toBe(AgentErrorCode.RESOURCE_NOT_FOUND)
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('Campaign not found')
    })
  })
})

describe('Error Formatting', () => {
  describe('formatZodError', () => {
    test('should format Zod errors into readable format', () => {
      const invalidData = {
        name: '',
        budget: -100,
        platforms: [],
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)

      if (!result.success) {
        const errors = formatZodError(result.error)

        expect(Array.isArray(errors)).toBe(true)
        expect(errors.length).toBeGreaterThan(0)

        errors.forEach((error) => {
          expect(error).toHaveProperty('field')
          expect(error).toHaveProperty('message')
          expect(typeof error.field).toBe('string')
          expect(typeof error.message).toBe('string')
        })
      }
    })

    test('should handle nested field errors', () => {
      const invalidData = {
        name: 'Test',
        platforms: ['google'],
        budget: 5000,
        start_date: '2025-12-31',
        end_date: '2025-12-01',
      }

      const result = CampaignCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)

      if (!result.success) {
        const errors = formatZodError(result.error)
        const endDateError = errors.find((e) => e.field === 'end_date')

        expect(endDateError).toBeDefined()
        expect(endDateError?.message).toContain('after')
      }
    })
  })
})
