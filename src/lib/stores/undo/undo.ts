import { writable } from "svelte/store"
import type { Task } from "$lib/types/models"

export type UndoableAction =
  | { type: "CREATE_TASK"; task: Task }
  | { type: "UPDATE_TASK"; taskId: number; before: Task; after: Task }
  | { type: "DELETE_TASK"; task: Task; subtasks?: Task[] }
  | { type: "TOGGLE_TASK"; taskId: number; before: boolean; after: boolean }

interface UndoState {
  past: UndoableAction[]
  future: UndoableAction[]
  maxHistory: number
}

function createUndoStore() {
  const { subscribe, update } = writable<UndoState>({
    past: [],
    future: [],
    maxHistory: 50,
  })

  function addAction(action: UndoableAction) {
    update((state) => ({
      ...state,
      past: [...state.past.slice(-state.maxHistory + 1), action],
      future: [], // Clear redo stack when new action is performed
    }))
  }

  function canUndo(): boolean {
    let result = false
    update((state) => {
      result = state.past.length > 0
      return state
    })
    return result
  }

  function canRedo(): boolean {
    let result = false
    update((state) => {
      result = state.future.length > 0
      return state
    })
    return result
  }

  function undo(): UndoableAction | null {
    let action: UndoableAction | null = null
    update((state) => {
      if (state.past.length === 0) return state

      const lastAction = state.past[state.past.length - 1]
      action = lastAction

      return {
        ...state,
        past: state.past.slice(0, -1),
        future: [lastAction, ...state.future],
      }
    })
    return action
  }

  function redo(): UndoableAction | null {
    let action: UndoableAction | null = null
    update((state) => {
      if (state.future.length === 0) return state

      const nextAction = state.future[0]
      action = nextAction

      return {
        ...state,
        past: [...state.past, nextAction],
        future: state.future.slice(1),
      }
    })
    return action
  }

  function clear() {
    update((state) => ({
      ...state,
      past: [],
      future: [],
    }))
  }

  return {
    subscribe,
    addAction,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
  }
}

export const undoStore = createUndoStore()
