import { describe, expect, it } from "vitest"
import { validateCategoryName, validateColorHex, validateTaskTitle } from "./validation"

describe("validateTaskTitle", () => {
  it("accepts valid title", () => {
    expect(validateTaskTitle("Buy groceries")).toEqual({ valid: true })
  })

  it("rejects empty title", () => {
    expect(validateTaskTitle("").valid).toBe(false)
    expect(validateTaskTitle("   ").valid).toBe(false)
  })

  it("rejects title over 500 chars", () => {
    expect(validateTaskTitle("a".repeat(501)).valid).toBe(false)
  })
})

describe("validateCategoryName", () => {
  it("accepts valid name", () => {
    expect(validateCategoryName("Work")).toEqual({ valid: true })
  })

  it("rejects empty name", () => {
    expect(validateCategoryName("").valid).toBe(false)
  })

  it("rejects name over 100 chars", () => {
    expect(validateCategoryName("a".repeat(101)).valid).toBe(false)
  })
})

describe("validateColorHex", () => {
  it("accepts valid hex color", () => {
    expect(validateColorHex("#FF5733")).toEqual({ valid: true })
    expect(validateColorHex("#abc123")).toEqual({ valid: true })
  })

  it("rejects invalid hex color", () => {
    expect(validateColorHex("FF5733").valid).toBe(false)
    expect(validateColorHex("#GG5733").valid).toBe(false)
    expect(validateColorHex("#FF57").valid).toBe(false)
  })
})
