import { writable } from "svelte/store"

export type GroupBy = "none" | "category" | "priority"

interface UIState {
  groupBy: GroupBy
  showCompleted: boolean
  selectedTaskId: number | null
}

function createUIStore() {
  const { subscribe, update } = writable<UIState>({
    groupBy: "category",
    showCompleted: true,
    selectedTaskId: null,
  })

  return {
    subscribe,

    setGroupBy: (groupBy: GroupBy) => {
      update((state) => ({ ...state, groupBy }))
    },

    toggleShowCompleted: () => {
      update((state) => ({ ...state, showCompleted: !state.showCompleted }))
    },

    selectTask: (id: number | null) => {
      update((state) => ({ ...state, selectedTaskId: id }))
    },
  }
}

export const uiStore = createUIStore()
