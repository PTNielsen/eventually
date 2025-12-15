import { writable } from "svelte/store"
import * as categoryApi from "$lib/api/categories/categories"
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "$lib/types/models"

interface CategoriesState {
  categories: Category[]
  loading: boolean
  error: string | null
}

function createCategoriesStore() {
  const { subscribe, update } = writable<CategoriesState>({
    categories: [],
    loading: false,
    error: null,
  })

  return {
    subscribe,

    loadCategories: async () => {
      update((state) => ({ ...state, loading: true }))
      try {
        const categories = await categoryApi.getAllCategories()
        update((state) => ({
          ...state,
          categories,
          loading: false,
          error: null,
        }))
      } catch (error) {
        console.error("Failed to load categories:", error)
        update((state) => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load categories",
        }))
      }
    },

    createCategory: async (input: CreateCategoryInput) => {
      try {
        const category = await categoryApi.createCategory(input)
        update((state) => ({
          ...state,
          categories: [...state.categories, category].sort((a, b) => a.name.localeCompare(b.name)),
        }))
        return category
      } catch (error) {
        console.error("Failed to create category:", error)
        throw error
      }
    },

    updateCategory: async (id: number, input: UpdateCategoryInput) => {
      try {
        const updated = await categoryApi.updateCategory(id, input)
        update((state) => ({
          ...state,
          categories: state.categories
            .map((c) => (c.id === id ? updated : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        return updated
      } catch (error) {
        console.error("Failed to update category:", error)
        throw error
      }
    },

    deleteCategory: async (id: number) => {
      try {
        await categoryApi.deleteCategory(id)
        update((state) => ({
          ...state,
          categories: state.categories.filter((c) => c.id !== id),
        }))
      } catch (error) {
        console.error("Failed to delete category:", error)
        throw error
      }
    },
  }
}

export const categoriesStore = createCategoriesStore()
