import { get } from "svelte/store"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { toastStore } from "./toast"

describe("toastStore", () => {
  beforeEach(() => {
    toastStore.clear()
    vi.useFakeTimers()
  })

  it("adds success toast", () => {
    toastStore.success("Task created")
    const toasts = get(toastStore)
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe("Task created")
    expect(toasts[0].type).toBe("success")
  })

  it("adds error toast", () => {
    toastStore.error("Failed to save")
    const toasts = get(toastStore)
    expect(toasts[0].type).toBe("error")
  })

  it("removes toast by id", () => {
    const id = toastStore.success("Test")
    expect(get(toastStore)).toHaveLength(1)
    toastStore.remove(id)
    expect(get(toastStore)).toHaveLength(0)
  })

  it("auto-removes toast after duration", () => {
    toastStore.success("Test", 3000)
    expect(get(toastStore)).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(get(toastStore)).toHaveLength(0)
  })

  it("clears all toasts", () => {
    toastStore.success("One")
    toastStore.error("Two")
    expect(get(toastStore)).toHaveLength(2)
    toastStore.clear()
    expect(get(toastStore)).toHaveLength(0)
  })
})
