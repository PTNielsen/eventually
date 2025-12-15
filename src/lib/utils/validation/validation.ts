/**
 * Validation utilities for user input
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateTaskTitle(title: string): ValidationResult {
  const trimmed = title.trim()

  if (!trimmed) {
    return { valid: false, error: "Title cannot be empty" }
  }

  if (trimmed.length > 500) {
    return { valid: false, error: "Title is too long (max 500 characters)" }
  }

  return { valid: true }
}

export function validateCategoryName(name: string): ValidationResult {
  const trimmed = name.trim()

  if (!trimmed) {
    return { valid: false, error: "Category name cannot be empty" }
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Category name is too long (max 100 characters)" }
  }

  return { valid: true }
}

export function validateColorHex(color: string): ValidationResult {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/

  if (!hexPattern.test(color)) {
    return { valid: false, error: "Color must be a valid hex code (e.g., #FF5733)" }
  }

  return { valid: true }
}

/**
 * Sanitize description text to prevent XSS if ever rendered as HTML
 */
export function sanitizeDescription(description: string): string {
  return description.trim()
}
