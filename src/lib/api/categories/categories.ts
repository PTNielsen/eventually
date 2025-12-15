import { invoke } from "@tauri-apps/api/core"
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "$lib/types/models"

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return await invoke("create_category", { input })
}

export async function getAllCategories(): Promise<Category[]> {
  return await invoke("get_all_categories")
}

export async function updateCategory(id: number, input: UpdateCategoryInput): Promise<Category> {
  return await invoke("update_category", { id, input })
}

export async function deleteCategory(id: number): Promise<void> {
  return await invoke("delete_category", { id })
}
