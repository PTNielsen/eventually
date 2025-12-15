import { invoke } from "@tauri-apps/api/core"
import type { CreateTaskInput, Task, TaskTree, UpdateTaskInput } from "$lib/types/models"

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return await invoke("create_task", { input })
}

export async function getAllTasks(): Promise<Task[]> {
  return await invoke("get_all_tasks")
}

export async function getTaskTree(): Promise<TaskTree[]> {
  return await invoke("get_task_tree")
}

export async function updateTask(id: number, input: UpdateTaskInput): Promise<Task> {
  return await invoke("update_task", { id, input })
}

export async function deleteTask(id: number): Promise<void> {
  return await invoke("delete_task", { id })
}

export async function reorderTask(id: number, newPosition: number): Promise<void> {
  return await invoke("reorder_task", { id, newPosition })
}
