/**
 * Encryption utilities for securing sensitive data
 *
 * Uses AES-256-GCM encryption with:
 * - 256-bit encryption key (from environment)
 * - Random 12-byte initialization vector (IV) per encryption
 * - Authentication tag for integrity verification
 *
 * Format: iv:authTag:encryptedData (all hex-encoded)
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits

/**
 * Get the encryption key from environment
 * @throws Error if API_KEY_ENCRYPTION_SECRET is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET

  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is not set')
  }

  if (secret.length !== 64) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be 64 hex characters (32 bytes)')
  }

  // Convert hex string to buffer
  return Buffer.from(secret, 'hex')
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @returns Encrypted data in format: iv:authTag:encryptedData (hex-encoded)
 *
 * @example
 * const encrypted = encrypt('my-secret-api-key')
 * // Returns: "a1b2c3d4e5f6...g7h8:i9j0k1l2...m3n4:o5p6q7r8..."
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey()

    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Combine iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt encrypted data using AES-256-GCM
 *
 * @param encryptedData - Data in format: iv:authTag:encryptedData (hex-encoded)
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or data is tampered
 *
 * @example
 * const decrypted = decrypt('a1b2c3d4e5f6...g7h8:i9j0k1l2...m3n4:o5p6q7r8...')
 * // Returns: "my-secret-api-key"
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()

    // Split the encrypted data
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const [ivHex, authTagHex, encryptedHex] = parts

    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length')
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length')
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    // Decrypt the data
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data - data may be corrupted or tampered')
  }
}

/**
 * Generate a new random encryption key
 * @returns 64-character hex string (32 bytes)
 *
 * @example
 * const key = generateEncryptionKey()
 * console.log(key) // "a1b2c3d4e5f6...g7h8" (64 hex chars)
 *
 * Usage: Add this to your .env.local file:
 * API_KEY_ENCRYPTION_SECRET=<generated_key>
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Test encryption/decryption round-trip
 * Useful for verifying the encryption setup is working correctly
 *
 * @throws Error if encryption key is not properly configured
 */
export function testEncryption(): void {
  const testData = 'test-api-key-12345'

  try {
    const encrypted = encrypt(testData)
    const decrypted = decrypt(encrypted)

    if (decrypted !== testData) {
      throw new Error('Encryption round-trip failed - data mismatch')
    }

    console.log('✅ Encryption test passed')
  } catch (error) {
    console.error('❌ Encryption test failed:', error)
    throw error
  }
}
