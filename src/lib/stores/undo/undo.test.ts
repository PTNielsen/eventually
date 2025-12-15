import { get } from "svelte/store"
import { beforeEach, describe, expect, it } from "vitest"
import type { Task } from "$lib/types/models"
import { undoStore } from "./undo"

const mockTask: Task = {
  id: 1,
  title: "Test",
  description: null,
  category_id: null,
  priority: "Medium",
  parent_id: null,
  is_done: false,
  position: 0,
  due_date: null,
  created_at: Date.now(),
  updated_at: Date.now(),
  completed_at: null,
}

describe("undoStore", () => {
  beforeEach(() => {
    undoStore.clear()
  })

  it("adds action to history", () => {
    undoStore.addAction({ type: "CREATE_TASK", task: mockTask })
    const state = get(undoStore)
    expect(state.past).toHaveLength(1)
  })

  it("can undo action", () => {
    undoStore.addAction({ type: "CREATE_TASK", task: mockTask })
    expect(undoStore.canUndo()).toBe(true)
    const action = undoStore.undo()
    expect(action?.type).toBe("CREATE_TASK")
  })

  it("can redo action", () => {
    undoStore.addAction({ type: "CREATE_TASK", task: mockTask })
    undoStore.undo()
    expect(undoStore.canRedo()).toBe(true)
    const action = undoStore.redo()
    expect(action?.type).toBe("CREATE_TASK")
  })

  it("clears redo on new action", () => {
    undoStore.addAction({ type: "CREATE_TASK", task: mockTask })
    undoStore.undo()
    expect(undoStore.canRedo()).toBe(true)
    undoStore.addAction({ type: "CREATE_TASK", task: { ...mockTask, id: 2 } })
    expect(undoStore.canRedo()).toBe(false)
  })

  it("limits history size", () => {
    for (let i = 0; i < 60; i++) {
      undoStore.addAction({ type: "CREATE_TASK", task: { ...mockTask, id: i } })
    }
    const state = get(undoStore)
    expect(state.past.length).toBeLessThanOrEqual(50)
  })
})
