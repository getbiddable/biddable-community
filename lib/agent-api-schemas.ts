/**
 * Comprehensive Zod validation schemas for Agent API
 *
 * These schemas validate all input data for agent API endpoints,
 * ensuring data integrity and providing clear error messages.
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Date string in YYYY-MM-DD format
 */
export const DateStringSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
)

/**
 * Platform enum - supported ad platforms
 */
export const PlatformSchema = z.enum(['google', 'youtube', 'reddit', 'meta'], {
  errorMap: () => ({ message: 'Platform must be one of: google, youtube, reddit, meta' })
})

/**
 * UUID format validation
 */
export const UUIDSchema = z.string().uuid('Invalid UUID format')

/**
 * Positive integer validation
 */
export const PositiveIntSchema = z.number().int().positive('Must be a positive integer')

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
})

// ============================================================================
// CAMPAIGN SCHEMAS
// ============================================================================

/**
 * Create campaign request body schema
 */
export const CampaignCreateSchema = z.object({
  name: z.string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less'),

  platforms: z.array(PlatformSchema)
    .min(1, 'At least one platform is required')
    .max(4, 'Maximum 4 platforms allowed'),

  budget: z.number()
    .int('Budget must be an integer')
    .min(1, 'Budget must be at least $1')
    .max(10000, 'Budget cannot exceed $10,000 per campaign'),

  start_date: DateStringSchema,

  end_date: DateStringSchema,

  goal: z.string()
    .max(500, 'Goal must be 500 characters or less')
    .optional()
}).refine(
  (data) => {
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    return end > start
  },
  {
    message: 'end_date must be after start_date',
    path: ['end_date']
  }
)

/**
 * Update campaign request body schema
 * All fields are optional since this is a partial update
 */
export const CampaignUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Campaign name cannot be empty')
    .max(100, 'Campaign name must be 100 characters or less')
    .optional(),

  platforms: z.array(PlatformSchema)
    .min(1, 'At least one platform is required')
    .max(4, 'Maximum 4 platforms allowed')
    .optional(),

  budget: z.number()
    .int('Budget must be an integer')
    .min(1, 'Budget must be at least $1')
    .max(10000, 'Budget cannot exceed $10,000 per campaign')
    .optional(),

  start_date: DateStringSchema.optional(),

  end_date: DateStringSchema.optional(),

  goal: z.string()
    .max(500, 'Goal must be 500 characters or less')
    .optional(),

  status: z.boolean().optional()
}).refine(
  (data) => {
    // If both dates are provided, validate their relationship
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date)
      const end = new Date(data.end_date)
      return end > start
    }
    return true
  },
  {
    message: 'end_date must be after start_date',
    path: ['end_date']
  }
)

/**
 * Campaign list query parameters
 */
export const CampaignListQuerySchema = PaginationSchema.extend({
  status: z.enum(['active', 'inactive']).optional()
})

// ============================================================================
// ASSET SCHEMAS
// ============================================================================

/**
 * Asset type enum
 */
export const AssetTypeSchema = z.enum(['image', 'video', 'text', 'reddit_ad'], {
  errorMap: () => ({ message: 'Asset type must be one of: image, video, text, reddit_ad' })
})

/**
 * Ad format enum
 */
export const AdFormatSchema = z.enum(['rsa', 'eta', 'generic', 'reddit_promoted_post'], {
  errorMap: () => ({ message: 'Ad format must be one of: rsa, eta, generic, reddit_promoted_post' })
})

/**
 * Google text ad (RSA/ETA) creation schema
 */
export const TextAdCreateSchema = z.object({
  name: z.string()
    .min(1, 'Asset name is required')
    .max(100, 'Asset name must be 100 characters or less'),

  ad_format: z.enum(['rsa', 'eta', 'generic']),

  ad_data: z.object({
    headlines: z.array(z.string().max(30, 'Each headline must be 30 characters or less'))
      .min(1, 'At least one headline is required')
      .max(15, 'Maximum 15 headlines allowed'),

    descriptions: z.array(z.string().max(90, 'Each description must be 90 characters or less'))
      .min(1, 'At least one description is required')
      .max(4, 'Maximum 4 descriptions allowed'),

    paths: z.array(z.string().max(15, 'Each path must be 15 characters or less'))
      .max(2, 'Maximum 2 paths allowed')
      .optional(),

    final_url: z.string().url('Invalid URL format')
  })
}).refine(
  (data) => {
    // RSA: 3-15 headlines, 2-4 descriptions
    if (data.ad_format === 'rsa') {
      const headlineCount = data.ad_data.headlines.length
      const descCount = data.ad_data.descriptions.length
      return headlineCount >= 3 && headlineCount <= 15 && descCount >= 2 && descCount <= 4
    }
    // ETA: exactly 3 headlines, 2 descriptions
    if (data.ad_format === 'eta') {
      return data.ad_data.headlines.length === 3 && data.ad_data.descriptions.length === 2
    }
    return true
  },
  {
    message: 'Invalid headline/description count for ad format',
    path: ['ad_data']
  }
)

/**
 * Reddit ad creation schema
 */
export const RedditAdCreateSchema = z.object({
  name: z.string()
    .min(1, 'Asset name is required')
    .max(100, 'Asset name must be 100 characters or less'),

  headline: z.string()
    .min(1, 'Headline is required')
    .max(300, 'Headline must be 300 characters or less'),

  callToAction: z.enum([
    'download', 'install', 'shop_now', 'view_more', 'sign_up',
    'learn_more', 'contact_us', 'get_showtimes', 'get_a_quote'
  ]),

  destinationUrl: z.string().url('Invalid destination URL'),

  displayUrl: z.string().max(100, 'Display URL must be 100 characters or less').optional(),

  addSourceParameter: z.boolean().optional(),

  allowComments: z.boolean().optional(),

  mediaUrl: z.string().url('Invalid media URL').optional()
})

/**
 * AI image generation schema
 */
export const AIImageGenerateSchema = z.object({
  name: z.string()
    .min(1, 'Asset name is required')
    .max(100, 'Asset name must be 100 characters or less'),

  product: z.string()
    .min(1, 'Product description is required')
    .max(200, 'Product description must be 200 characters or less'),

  brand: z.string()
    .min(1, 'Brand name is required')
    .max(100, 'Brand name must be 100 characters or less')
})

/**
 * Asset list query parameters
 */
export const AssetListQuerySchema = PaginationSchema.extend({
  type: AssetTypeSchema.optional()
})

/**
 * Asset assignment schema
 */
export const AssetAssignSchema = z.object({
  asset_id: UUIDSchema
})

// ============================================================================
// AUDIENCE SCHEMAS
// ============================================================================

/**
 * Gender enum
 */
export const GenderSchema = z.enum(['male', 'female', 'other', 'all'], {
  errorMap: () => ({ message: 'Gender must be one of: male, female, other, all' })
})

/**
 * Audience status enum
 */
export const AudienceStatusSchema = z.enum(['active', 'archived'], {
  errorMap: () => ({ message: 'Status must be: active or archived' })
})

/**
 * Create audience schema
 */
export const AudienceCreateSchema = z.object({
  name: z.string()
    .min(1, 'Audience name is required')
    .max(100, 'Audience name must be 100 characters or less'),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),

  age_min: z.number()
    .int('Age must be an integer')
    .min(13, 'Minimum age is 13')
    .max(100, 'Maximum age is 100')
    .optional(),

  age_max: z.number()
    .int('Age must be an integer')
    .min(13, 'Minimum age is 13')
    .max(100, 'Maximum age is 100')
    .optional(),

  genders: z.array(GenderSchema)
    .optional(),

  locations: z.array(z.string().min(1, 'Location cannot be empty'))
    .optional(),

  interests: z.array(z.string().min(1, 'Interest cannot be empty'))
    .optional(),

  behaviors: z.array(z.string().min(1, 'Behavior cannot be empty'))
    .optional(),

  estimated_size: z.number().int().positive().optional(),

  targeting_criteria: z.record(z.any()).optional()
}).refine(
  (data) => {
    // If both ages are provided, min must be <= max
    if (data.age_min !== undefined && data.age_max !== undefined) {
      return data.age_min <= data.age_max
    }
    return true
  },
  {
    message: 'age_min must be less than or equal to age_max',
    path: ['age_max']
  }
)

/**
 * Update audience schema
 * All fields are optional since this is a partial update
 */
export const AudienceUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Audience name cannot be empty')
    .max(100, 'Audience name must be 100 characters or less')
    .optional(),

  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),

  age_min: z.number()
    .int('Age must be an integer')
    .min(13, 'Minimum age is 13')
    .max(100, 'Maximum age is 100')
    .optional(),

  age_max: z.number()
    .int('Age must be an integer')
    .min(13, 'Minimum age is 13')
    .max(100, 'Maximum age is 100')
    .optional(),

  genders: z.array(GenderSchema)
    .optional(),

  locations: z.array(z.string().min(1, 'Location cannot be empty'))
    .optional(),

  interests: z.array(z.string().min(1, 'Interest cannot be empty'))
    .optional(),

  behaviors: z.array(z.string().min(1, 'Behavior cannot be empty'))
    .optional(),

  estimated_size: z.number().int().positive().optional(),

  targeting_criteria: z.record(z.any()).optional(),

  status: AudienceStatusSchema.optional()
}).refine(
  (data) => {
    // If both ages are provided, min must be <= max
    if (data.age_min !== undefined && data.age_max !== undefined) {
      return data.age_min <= data.age_max
    }
    return true
  },
  {
    message: 'age_min must be less than or equal to age_max',
    path: ['age_max']
  }
)

/**
 * Audience list query parameters
 */
export const AudienceListQuerySchema = PaginationSchema.extend({
  status: AudienceStatusSchema.optional()
})

/**
 * Audience assignment schema
 */
export const AudienceAssignSchema = z.object({
  audience_id: z.number().int().positive('Audience ID must be a positive integer')
})

// ============================================================================
// BUDGET SCHEMAS
// ============================================================================

/**
 * Budget status query parameters
 */
export const BudgetStatusQuerySchema = z.object({
  year: z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional()
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CampaignCreateInput = z.infer<typeof CampaignCreateSchema>
export type CampaignUpdateInput = z.infer<typeof CampaignUpdateSchema>
export type CampaignListQuery = z.infer<typeof CampaignListQuerySchema>

export type TextAdCreateInput = z.infer<typeof TextAdCreateSchema>
export type RedditAdCreateInput = z.infer<typeof RedditAdCreateSchema>
export type AIImageGenerateInput = z.infer<typeof AIImageGenerateSchema>
export type AssetListQuery = z.infer<typeof AssetListQuerySchema>
export type AssetAssignInput = z.infer<typeof AssetAssignSchema>

export type AudienceCreateInput = z.infer<typeof AudienceCreateSchema>
export type AudienceUpdateInput = z.infer<typeof AudienceUpdateSchema>
export type AudienceListQuery = z.infer<typeof AudienceListQuerySchema>
export type AudienceAssignInput = z.infer<typeof AudienceAssignSchema>

export type BudgetStatusQuery = z.infer<typeof BudgetStatusQuerySchema>
