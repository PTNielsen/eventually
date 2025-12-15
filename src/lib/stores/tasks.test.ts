import { invoke } from "@tauri-apps/api/core"
import { get } from "svelte/store"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Task, TaskTree } from "$lib/types/models"
import { sortedTaskTree, tasksByCategory, tasksByPriority, tasksStore } from "./tasks"

// Mock the Tauri invoke function
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

const mockInvoke = vi.mocked(invoke)

describe("tasksStore", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should initialize with empty state", () => {
    const state = get(tasksStore)
    expect(state.tasks).toEqual([])
    expect(state.taskTree).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it("should load tasks successfully", async () => {
    const mockTasks: Task[] = [
      {
        id: 1,
        title: "Task 1",
        description: null,
        category_id: 1,
        priority: "High",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
    ]

    const mockTree: TaskTree[] = [
      {
        id: 1,
        title: "Task 1",
        description: null,
        category_id: 1,
        priority: "High",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
        subtasks: [],
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve(mockTasks)
      if (cmd === "get_task_tree") return Promise.resolve(mockTree)
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const state = get(tasksStore)
    expect(state.tasks).toEqual(mockTasks)
    expect(state.taskTree).toEqual(mockTree)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it("should handle load errors", async () => {
    mockInvoke.mockRejectedValue(new Error("Database error"))

    await tasksStore.loadTasks()

    const state = get(tasksStore)
    expect(state.loading).toBe(false)
    expect(state.error).toBe("Database error")
  })

  it("should create task and reload tree", async () => {
    const newTask: Task = {
      id: 2,
      title: "New Task",
      description: null,
      category_id: 1,
      priority: "Medium",
      parent_id: null,
      is_done: false,
      position: 1,
      due_date: null,
      created_at: 0,
      updated_at: 0,
      completed_at: null,
    }

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "create_task") return Promise.resolve(newTask)
      if (cmd === "get_task_tree") return Promise.resolve([])
      return Promise.resolve([])
    })

    const result = await tasksStore.createTask({
      title: "New Task",
      priority: "Medium",
    })

    expect(result).toEqual(newTask)
    expect(mockInvoke).toHaveBeenCalledWith("create_task", {
      input: { title: "New Task", priority: "Medium" },
    })
    expect(mockInvoke).toHaveBeenCalledWith("get_task_tree")
  })

  it("should delete task and reload tree", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "delete_task") return Promise.resolve()
      if (cmd === "get_task_tree") return Promise.resolve([])
      return Promise.resolve([])
    })

    await tasksStore.deleteTask(1)

    expect(mockInvoke).toHaveBeenCalledWith("delete_task", { id: 1 })
    expect(mockInvoke).toHaveBeenCalledWith("get_task_tree")
  })

  it("should toggle task done status", async () => {
    const updatedTask: Task = {
      id: 1,
      title: "Task 1",
      description: null,
      category_id: 1,
      priority: "High",
      parent_id: null,
      is_done: true,
      position: 0,
      due_date: null,
      created_at: 0,
      updated_at: 0,
      completed_at: 123456,
    }

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "update_task") return Promise.resolve(updatedTask)
      if (cmd === "get_task_tree") return Promise.resolve([])
      return Promise.resolve([])
    })

    await tasksStore.toggleDone(1, true)

    expect(mockInvoke).toHaveBeenCalledWith("update_task", {
      id: 1,
      input: { is_done: true },
    })
  })
})

describe("tasksByCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should group tasks by category", async () => {
    const mockTasks: Task[] = [
      {
        id: 1,
        title: "Task 1",
        description: null,
        category_id: 1,
        priority: "High",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 2,
        title: "Task 2",
        description: null,
        category_id: 1,
        priority: "Medium",
        parent_id: null,
        is_done: false,
        position: 1,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 3,
        title: "Task 3",
        description: null,
        category_id: 2,
        priority: "Low",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve(mockTasks)
      if (cmd === "get_task_tree") return Promise.resolve([])
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const grouped = get(tasksByCategory)

    expect(grouped.get(1)).toHaveLength(2)
    expect(grouped.get(2)).toHaveLength(1)
    expect(grouped.get(1)?.[0].title).toBe("Task 1")
    expect(grouped.get(1)?.[1].title).toBe("Task 2")
    expect(grouped.get(2)?.[0].title).toBe("Task 3")
  })

  it("should only include top-level tasks", async () => {
    const mockTasks: Task[] = [
      {
        id: 1,
        title: "Parent",
        description: null,
        category_id: 1,
        priority: "High",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 2,
        title: "Child",
        description: null,
        category_id: 1,
        priority: "Medium",
        parent_id: 1,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve(mockTasks)
      if (cmd === "get_task_tree") return Promise.resolve([])
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const grouped = get(tasksByCategory)

    // Should only have the parent task
    expect(grouped.get(1)).toHaveLength(1)
    expect(grouped.get(1)?.[0].title).toBe("Parent")
  })

  it("should sort tasks by completion status, priority, and due date", async () => {
    const mockTasks: Task[] = [
      {
        id: 1,
        title: "Completed Urgent Due Soon",
        description: null,
        category_id: 1,
        priority: "Urgent",
        parent_id: null,
        is_done: true,
        position: 0,
        due_date: 100,
        created_at: 0,
        updated_at: 0,
        completed_at: 50,
      },
      {
        id: 2,
        title: "Incomplete Low Due Later",
        description: null,
        category_id: 1,
        priority: "Low",
        parent_id: null,
        is_done: false,
        position: 1,
        due_date: 200,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 3,
        title: "Incomplete Urgent Due Soon",
        description: null,
        category_id: 1,
        priority: "Urgent",
        parent_id: null,
        is_done: false,
        position: 2,
        due_date: 100,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 4,
        title: "Incomplete Urgent Due Later",
        description: null,
        category_id: 1,
        priority: "Urgent",
        parent_id: null,
        is_done: false,
        position: 3,
        due_date: 150,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 5,
        title: "Incomplete High Due Soon",
        description: null,
        category_id: 1,
        priority: "High",
        parent_id: null,
        is_done: false,
        position: 4,
        due_date: 100,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve(mockTasks)
      if (cmd === "get_task_tree") return Promise.resolve([])
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const grouped = get(tasksByCategory)
    const category1 = grouped.get(1)

    expect(category1).toHaveLength(5)
    // First: Incomplete tasks
    // Within incomplete: Urgent priority
    // Within Urgent: Earlier due date first
    expect(category1?.[0].title).toBe("Incomplete Urgent Due Soon")
    expect(category1?.[1].title).toBe("Incomplete Urgent Due Later")
    // Then High priority
    expect(category1?.[2].title).toBe("Incomplete High Due Soon")
    // Then Low priority
    expect(category1?.[3].title).toBe("Incomplete Low Due Later")
    // Last: Completed tasks
    expect(category1?.[4].title).toBe("Completed Urgent Due Soon")
  })
})

describe("tasksByPriority", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should group tasks by priority with correct order", async () => {
    const mockTasks: Task[] = [
      {
        id: 1,
        title: "Low Priority",
        description: null,
        category_id: 1,
        priority: "Low",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 2,
        title: "Urgent Priority",
        description: null,
        category_id: 1,
        priority: "Urgent",
        parent_id: null,
        is_done: false,
        position: 1,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
      {
        id: 3,
        title: "Medium Priority",
        description: null,
        category_id: 1,
        priority: "Medium",
        parent_id: null,
        is_done: false,
        position: 2,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve(mockTasks)
      if (cmd === "get_task_tree") return Promise.resolve([])
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const grouped = get(tasksByPriority)

    // All priority levels should exist
    expect(grouped.has("Urgent")).toBe(true)
    expect(grouped.has("High")).toBe(true)
    expect(grouped.has("Medium")).toBe(true)
    expect(grouped.has("Low")).toBe(true)

    // Check correct grouping
    expect(grouped.get("Urgent")).toHaveLength(1)
    expect(grouped.get("High")).toHaveLength(0)
    expect(grouped.get("Medium")).toHaveLength(1)
    expect(grouped.get("Low")).toHaveLength(1)

    expect(grouped.get("Urgent")?.[0].title).toBe("Urgent Priority")
    expect(grouped.get("Medium")?.[0].title).toBe("Medium Priority")
    expect(grouped.get("Low")?.[0].title).toBe("Low Priority")
  })
})

describe("sortedTaskTree", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should sort task tree by completion status, priority, and due date", async () => {
    const mockTree: TaskTree[] = [
      {
        id: 1,
        title: "Completed High",
        description: null,
        category_id: 1,
        priority: "High",
        parent_id: null,
        is_done: true,
        position: 0,
        due_date: 100,
        created_at: 0,
        updated_at: 0,
        completed_at: 50,
        subtasks: [],
      },
      {
        id: 2,
        title: "Incomplete Low",
        description: null,
        category_id: 1,
        priority: "Low",
        parent_id: null,
        is_done: false,
        position: 1,
        due_date: 200,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
        subtasks: [],
      },
      {
        id: 3,
        title: "Incomplete Urgent",
        description: null,
        category_id: 1,
        priority: "Urgent",
        parent_id: null,
        is_done: false,
        position: 2,
        due_date: 150,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
        subtasks: [],
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve([])
      if (cmd === "get_task_tree") return Promise.resolve(mockTree)
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const sorted = get(sortedTaskTree)

    expect(sorted).toHaveLength(3)
    // Incomplete tasks first, sorted by priority
    expect(sorted[0].title).toBe("Incomplete Urgent")
    expect(sorted[1].title).toBe("Incomplete Low")
    // Completed tasks last
    expect(sorted[2].title).toBe("Completed High")
  })

  it("should recursively sort subtasks", async () => {
    const mockTree: TaskTree[] = [
      {
        id: 1,
        title: "Parent Task",
        description: null,
        category_id: 1,
        priority: "High",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: 100,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
        subtasks: [
          {
            id: 2,
            title: "Completed Subtask",
            description: null,
            category_id: 1,
            priority: "Urgent",
            parent_id: 1,
            is_done: true,
            position: 0,
            due_date: 100,
            created_at: 0,
            updated_at: 0,
            completed_at: 50,
            subtasks: [],
          },
          {
            id: 3,
            title: "Incomplete Low Subtask",
            description: null,
            category_id: 1,
            priority: "Low",
            parent_id: 1,
            is_done: false,
            position: 1,
            due_date: 200,
            created_at: 0,
            updated_at: 0,
            completed_at: null,
            subtasks: [],
          },
          {
            id: 4,
            title: "Incomplete Urgent Subtask",
            description: null,
            category_id: 1,
            priority: "Urgent",
            parent_id: 1,
            is_done: false,
            position: 2,
            due_date: 150,
            created_at: 0,
            updated_at: 0,
            completed_at: null,
            subtasks: [],
          },
        ],
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve([])
      if (cmd === "get_task_tree") return Promise.resolve(mockTree)
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const sorted = get(sortedTaskTree)

    expect(sorted).toHaveLength(1)
    expect(sorted[0].title).toBe("Parent Task")

    // Verify subtasks are sorted correctly
    const subtasks = sorted[0].subtasks
    expect(subtasks).toHaveLength(3)
    // Incomplete tasks first, sorted by priority
    expect(subtasks[0].title).toBe("Incomplete Urgent Subtask")
    expect(subtasks[1].title).toBe("Incomplete Low Subtask")
    // Completed tasks last
    expect(subtasks[2].title).toBe("Completed Subtask")
  })

  it("should handle tasks with no due date", async () => {
    const mockTree: TaskTree[] = [
      {
        id: 1,
        title: "Incomplete Urgent No Due Date",
        description: null,
        category_id: 1,
        priority: "Urgent",
        parent_id: null,
        is_done: false,
        position: 0,
        due_date: null,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
        subtasks: [],
      },
      {
        id: 2,
        title: "Incomplete Urgent With Due Date",
        description: null,
        category_id: 1,
        priority: "Urgent",
        parent_id: null,
        is_done: false,
        position: 1,
        due_date: 100,
        created_at: 0,
        updated_at: 0,
        completed_at: null,
        subtasks: [],
      },
    ]

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_all_tasks") return Promise.resolve([])
      if (cmd === "get_task_tree") return Promise.resolve(mockTree)
      return Promise.resolve([])
    })

    await tasksStore.loadTasks()

    const sorted = get(sortedTaskTree)

    expect(sorted).toHaveLength(2)
    // Tasks with due dates come before tasks without
    expect(sorted[0].title).toBe("Incomplete Urgent With Due Date")
    expect(sorted[1].title).toBe("Incomplete Urgent No Due Date")
  })
})
