import { get } from "svelte/store"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as taskApi from "$lib/api/tasks/tasks"
import type { Task } from "$lib/types/models"
import { toastStore } from "../toast/toast"
import { undoStore } from "../undo/undo"
import { tasksStore } from "./tasks"

vi.mock("$lib/api/tasks/tasks")

const mockTask: Task = {
  id: 1,
  title: "Buy groceries",
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

describe("tasksStore", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastStore.clear()
    undoStore.clear()
  })

  it("creates task and updates state", async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(mockTask)
    vi.mocked(taskApi.getTaskTree).mockResolvedValue([])

    await tasksStore.createTask({
      title: "Buy groceries",
      priority: "Medium",
    })

    const state = get(tasksStore)
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].title).toBe("Buy groceries")
  })

  it("shows success toast on create", async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(mockTask)
    vi.mocked(taskApi.getTaskTree).mockResolvedValue([])

    await tasksStore.createTask({
      title: "Buy groceries",
      priority: "Medium",
    })

    const toasts = get(toastStore)
    expect(toasts.some((t) => t.type === "success")).toBe(true)
  })

  it("tracks undo action on create", async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(mockTask)
    vi.mocked(taskApi.getTaskTree).mockResolvedValue([])

    await tasksStore.createTask({
      title: "Buy groceries",
      priority: "Medium",
    })

    expect(undoStore.canUndo()).toBe(true)
  })

  it("updates task in state", async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(mockTask)
    vi.mocked(taskApi.getTaskTree).mockResolvedValue([])
    await tasksStore.createTask({ title: "Buy groceries", priority: "Medium" })

    const updated = { ...mockTask, title: "Buy milk" }
    vi.mocked(taskApi.updateTask).mockResolvedValue(updated)

    await tasksStore.updateTask(1, { title: "Buy milk" })

    const state = get(tasksStore)
    expect(state.tasks[0].title).toBe("Buy milk")
  })

  it("removes task from state on delete", async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(mockTask)
    vi.mocked(taskApi.getTaskTree).mockResolvedValue([])
    await tasksStore.createTask({ title: "Buy groceries", priority: "Medium" })

    vi.mocked(taskApi.deleteTask).mockResolvedValue()

    await tasksStore.deleteTask(1)

    const state = get(tasksStore)
    expect(state.tasks).toHaveLength(0)
  })
})
