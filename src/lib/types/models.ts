// TypeScript interfaces matching Rust models

export type Priority = "Urgent" | "High" | "Medium" | "Low"

export interface Task {
  id: number
  title: string
  description: string | null
  category_id: number | null
  priority: Priority
  parent_id: number | null
  is_done: boolean
  position: number
  due_date: number | null
  created_at: number
  updated_at: number
  completed_at: number | null
}

export interface TaskTree {
  id: number
  title: string
  description: string | null
  category_id: number | null
  priority: Priority
  parent_id: number | null
  is_done: boolean
  position: number
  due_date: number | null
  created_at: number
  updated_at: number
  completed_at: number | null
  subtasks: TaskTree[]
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  category_id?: number | null
  priority: Priority
  parent_id?: number | null
  due_date?: number | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  category_id?: number | null
  priority?: Priority
  parent_id?: number | null
  is_done?: boolean
  position?: number
  due_date?: number | null
}

export interface Category {
  id: number
  name: string
  color: string
  created_at: number
  updated_at: number
}

export interface CreateCategoryInput {
  name: string
  color: string
}

export interface UpdateCategoryInput {
  name?: string
  color?: string
}
