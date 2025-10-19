// Google Search Ads character limits and validation

export const AD_LIMITS = {
  RSA: {
    HEADLINE_MAX: 15,
    HEADLINE_CHAR_LIMIT: 30,
    DESCRIPTION_MAX: 4,
    DESCRIPTION_CHAR_LIMIT: 90,
    PATH_CHAR_LIMIT: 15,
    PATH_MAX: 2,
  },
  ETA: {
    HEADLINE_MAX: 3,
    HEADLINE_CHAR_LIMIT: 30,
    DESCRIPTION_MAX: 2,
    DESCRIPTION_CHAR_LIMIT: 90,
    PATH_CHAR_LIMIT: 15,
    PATH_MAX: 2,
  },
} as const

export type AdFormat = 'rsa' | 'eta' | 'generic'

export interface TextAdData {
  headlines: string[]
  descriptions: string[]
  paths?: string[]
  final_url?: string
}

export interface TextAdValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates a text ad based on format requirements
 */
export function validateTextAd(
  data: TextAdData,
  format: AdFormat
): TextAdValidationResult {
  const errors: string[] = []

  if (format === 'generic') {
    // Generic text ads don't have strict validation
    return { valid: true, errors: [] }
  }

  const limits = format === 'rsa' ? AD_LIMITS.RSA : AD_LIMITS.ETA

  // Validate headlines
  if (!data.headlines || data.headlines.length === 0) {
    errors.push('At least one headline is required')
  } else {
    if (data.headlines.length > limits.HEADLINE_MAX) {
      errors.push(`Maximum ${limits.HEADLINE_MAX} headlines allowed for ${format.toUpperCase()}`)
    }

    data.headlines.forEach((headline, index) => {
      if (headline.length > limits.HEADLINE_CHAR_LIMIT) {
        errors.push(
          `Headline ${index + 1} exceeds ${limits.HEADLINE_CHAR_LIMIT} characters (${headline.length} characters)`
        )
      }
    })
  }

  // Validate descriptions
  if (!data.descriptions || data.descriptions.length === 0) {
    errors.push('At least one description is required')
  } else {
    if (data.descriptions.length > limits.DESCRIPTION_MAX) {
      errors.push(`Maximum ${limits.DESCRIPTION_MAX} descriptions allowed for ${format.toUpperCase()}`)
    }

    data.descriptions.forEach((description, index) => {
      if (description.length > limits.DESCRIPTION_CHAR_LIMIT) {
        errors.push(
          `Description ${index + 1} exceeds ${limits.DESCRIPTION_CHAR_LIMIT} characters (${description.length} characters)`
        )
      }
    })
  }

  // Validate paths (optional)
  if (data.paths && data.paths.length > 0) {
    if (data.paths.length > limits.PATH_MAX) {
      errors.push(`Maximum ${limits.PATH_MAX} path fields allowed`)
    }

    data.paths.forEach((path, index) => {
      if (path.length > limits.PATH_CHAR_LIMIT) {
        errors.push(
          `Path ${index + 1} exceeds ${limits.PATH_CHAR_LIMIT} characters (${path.length} characters)`
        )
      }
    })
  }

  // Validate final URL (optional but recommended)
  if (data.final_url && !isValidUrl(data.final_url)) {
    errors.push('Final URL is not valid')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Checks if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Gets the character limit for a specific field
 */
export function getCharacterLimit(
  format: AdFormat,
  field: 'headline' | 'description' | 'path'
): number {
  if (format === 'generic') return 999 // No limit for generic

  const limits = format === 'rsa' ? AD_LIMITS.RSA : AD_LIMITS.ETA

  switch (field) {
    case 'headline':
      return limits.HEADLINE_CHAR_LIMIT
    case 'description':
      return limits.DESCRIPTION_CHAR_LIMIT
    case 'path':
      return limits.PATH_CHAR_LIMIT
    default:
      return 0
  }
}

/**
 * Gets the maximum number of items allowed for a field
 */
export function getMaxItems(
  format: AdFormat,
  field: 'headline' | 'description' | 'path'
): number {
  if (format === 'generic') return 99 // Generous limit for generic

  const limits = format === 'rsa' ? AD_LIMITS.RSA : AD_LIMITS.ETA

  switch (field) {
    case 'headline':
      return limits.HEADLINE_MAX
    case 'description':
      return limits.DESCRIPTION_MAX
    case 'path':
      return limits.PATH_MAX
    default:
      return 0
  }
}

/**
 * Formats text ad data for display
 */
export function formatTextAdForDisplay(data: TextAdData): string {
  const parts: string[] = []

  if (data.headlines.length > 0) {
    parts.push('Headlines:')
    data.headlines.forEach((h, i) => parts.push(`  ${i + 1}. ${h}`))
  }

  if (data.descriptions.length > 0) {
    parts.push('\nDescriptions:')
    data.descriptions.forEach((d, i) => parts.push(`  ${i + 1}. ${d}`))
  }

  if (data.paths && data.paths.length > 0) {
    parts.push('\nPaths:')
    data.paths.forEach((p, i) => parts.push(`  ${i + 1}. ${p}`))
  }

  if (data.final_url) {
    parts.push(`\nFinal URL: ${data.final_url}`)
  }

  return parts.join('\n')
}
