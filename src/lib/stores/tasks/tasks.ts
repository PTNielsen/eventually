import { derived, get, writable } from "svelte/store"
import * as taskApi from "$lib/api/tasks/tasks"
import type { CreateTaskInput, Task, TaskTree, UpdateTaskInput } from "$lib/types/models"
import { toastStore } from "../toast/toast"
import { undoStore } from "../undo/undo"

interface TasksState {
  tasks: Task[]
  taskTree: TaskTree[]
  loading: boolean
  error: string | null
}

function createTasksStore() {
  const { subscribe, update } = writable<TasksState>({
    tasks: [],
    taskTree: [],
    loading: false,
    error: null,
  })

  return {
    subscribe,

    loadTasks: async () => {
      update((state) => ({ ...state, loading: true }))
      try {
        const [tasks, taskTree] = await Promise.all([taskApi.getAllTasks(), taskApi.getTaskTree()])
        update((state) => ({
          ...state,
          tasks,
          taskTree,
          loading: false,
          error: null,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load tasks"
        console.error("Failed to load tasks:", error)
        toastStore.error(message)
        update((state) => ({
          ...state,
          loading: false,
          error: message,
        }))
      }
    },

    createTask: async (input: CreateTaskInput) => {
      try {
        const task = await taskApi.createTask(input)
        update((state) => ({
          ...state,
          tasks: [...state.tasks, task],
        }))
        // Reload tree to update hierarchy
        const taskTree = await taskApi.getTaskTree()
        update((state) => ({ ...state, taskTree }))

        // Track for undo
        undoStore.addAction({ type: "CREATE_TASK", task })
        toastStore.success("Task created")

        return task
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create task"
        console.error("Failed to create task:", error)
        toastStore.error(message)
        throw error
      }
    },

    updateTask: async (id: number, input: UpdateTaskInput) => {
      try {
        // Get current state for undo
        const currentState = get({ subscribe })
        const before = currentState.tasks.find((t) => t.id === id)

        const updated = await taskApi.updateTask(id, input)
        update((state) => ({
          ...state,
          tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        }))

        // Only reload tree if hierarchy changed (parent_id modified)
        const needsTreeUpdate = input.parent_id !== undefined
        if (needsTreeUpdate) {
          const taskTree = await taskApi.getTaskTree()
          update((state) => ({ ...state, taskTree }))
        }

        // Track for undo
        if (before) {
          undoStore.addAction({ type: "UPDATE_TASK", taskId: id, before, after: updated })
        }
        toastStore.success("Task updated")

        return updated
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update task"
        console.error("Failed to update task:", error)
        toastStore.error(message)
        throw error
      }
    },

    deleteTask: async (id: number) => {
      try {
        // Get current state for undo
        const currentState = get({ subscribe })
        const task = currentState.tasks.find((t) => t.id === id)
        const subtasks = currentState.tasks.filter((t) => t.parent_id === id)

        await taskApi.deleteTask(id)
        update((state) => ({
          ...state,
          tasks: state.tasks.filter((t) => t.id !== id),
        }))
        // Reload tree to update hierarchy
        const taskTree = await taskApi.getTaskTree()
        update((state) => ({ ...state, taskTree }))

        // Track for undo
        if (task) {
          undoStore.addAction({ type: "DELETE_TASK", task, subtasks })
        }
        toastStore.success("Task deleted")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete task"
        console.error("Failed to delete task:", error)
        toastStore.error(message)
        throw error
      }
    },

    toggleDone: async (id: number, isDone: boolean) => {
      try {
        // Get current state for undo
        const currentState = get({ subscribe })
        const task = currentState.tasks.find((t) => t.id === id)
        const before = task?.is_done ?? false

        const updated = await taskApi.updateTask(id, { is_done: isDone })
        update((state) => ({
          ...state,
          tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        }))
        // Also update in tree
        const taskTree = await taskApi.getTaskTree()
        update((state) => ({ ...state, taskTree }))

        // Track for undo
        undoStore.addAction({ type: "TOGGLE_TASK", taskId: id, before, after: isDone })
        toastStore.success(isDone ? "Task completed" : "Task marked incomplete")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to toggle task"
        console.error("Failed to toggle task:", error)
        toastStore.error(message)
        throw error
      }
    },
  }
}

export const tasksStore = createTasksStore()

// Helper function to sort tasks by completion status, priority, and due date
function sortTasks(tasks: Task[]): Task[] {
  const priorityValues: Record<string, number> = {
    Urgent: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  }

  return tasks.sort((a, b) => {
    // 1. Sort by completion status (incomplete before complete)
    if (a.is_done !== b.is_done) {
      return a.is_done ? 1 : -1
    }

    // 2. Sort by priority (Urgent -> High -> Medium -> Low)
    const aPriority = priorityValues[a.priority] ?? 999
    const bPriority = priorityValues[b.priority] ?? 999
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    // 3. Sort by due date (earliest first)
    // Tasks with no due date go to the end
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1

    return a.due_date - b.due_date
  })
}

// Derived store: Group tasks by category, sorted by completion, priority, and due date
export const tasksByCategory = derived(tasksStore, ($tasks) => {
  const grouped = new Map<number | null, Task[]>()

  // Only include top-level tasks (no parent)
  $tasks.tasks
    .filter((t) => t.parent_id === null)
    .forEach((task) => {
      const key = task.category_id
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(task)
    })

  // Sort each category by completion status, priority, and due date
  grouped.forEach((tasks, key) => {
    grouped.set(key, sortTasks(tasks))
  })

  return grouped
})

// Derived store: Group tasks by priority, sorted by completion and due date
export const tasksByPriority = derived(tasksStore, ($tasks) => {
  const grouped = new Map<string, Task[]>()
  const priorityOrder = ["Urgent", "High", "Medium", "Low"]

  // Initialize all priority levels
  for (const p of priorityOrder) {
    grouped.set(p, [])
  }

  // Only include top-level tasks (no parent)
  $tasks.tasks
    .filter((t) => t.parent_id === null)
    .forEach((task) => {
      if (!grouped.has(task.priority)) {
        grouped.set(task.priority, [])
      }
      grouped.get(task.priority)!.push(task)
    })

  // Sort each priority group by completion status and due date
  grouped.forEach((tasks, key) => {
    grouped.set(key, sortTasks(tasks))
  })

  return grouped
})

// Helper function to sort TaskTree objects recursively
function sortTaskTree(tree: TaskTree[]): TaskTree[] {
  const priorityValues: Record<string, number> = {
    Urgent: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  }

  return tree
    .map((task) => ({
      ...task,
      // Recursively sort subtasks
      subtasks: sortTaskTree(task.subtasks),
    }))
    .sort((a, b) => {
      // 1. Sort by completion status (incomplete before complete)
      if (a.is_done !== b.is_done) {
        return a.is_done ? 1 : -1
      }

      // 2. Sort by priority (Urgent -> High -> Medium -> Low)
      const aPriority = priorityValues[a.priority] ?? 999
      const bPriority = priorityValues[b.priority] ?? 999
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // 3. Sort by due date (earliest first)
      // Tasks with no due date go to the end
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1

      return a.due_date - b.due_date
    })
}

// Derived store: Sorted task tree
export const sortedTaskTree = derived(tasksStore, ($tasks) => {
  return sortTaskTree($tasks.taskTree)
})
