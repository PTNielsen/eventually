<script lang="ts">
import * as taskApi from "$lib/api/tasks/tasks"
import { tasksStore } from "$lib/stores/tasks/tasks"
import { toastStore } from "$lib/stores/toast/toast"
import { undoStore } from "$lib/stores/undo/undo"

let canUndo = false
let canRedo = false

// Subscribe to undo store to track state
$: canUndo = $undoStore.past.length > 0
$: canRedo = $undoStore.future.length > 0

async function handleUndo() {
  const action = undoStore.undo()
  if (!action) return

  try {
    switch (action.type) {
      case "CREATE_TASK":
        // Undo create = delete the task
        await taskApi.deleteTask(action.task.id)
        await tasksStore.loadTasks()
        toastStore.info("Task creation undone")
        break

      case "DELETE_TASK":
        // Undo delete = recreate the task (note: we lose the original ID)
        await taskApi.createTask({
          title: action.task.title,
          description: action.task.description,
          category_id: action.task.category_id,
          priority: action.task.priority,
          parent_id: action.task.parent_id,
          due_date: action.task.due_date,
        })
        await tasksStore.loadTasks()
        toastStore.info("Task deletion undone")
        break

      case "UPDATE_TASK":
        // Undo update = restore previous values
        await taskApi.updateTask(action.taskId, {
          title: action.before.title,
          description: action.before.description,
          category_id: action.before.category_id,
          priority: action.before.priority,
          parent_id: action.before.parent_id,
          is_done: action.before.is_done,
          due_date: action.before.due_date,
        })
        await tasksStore.loadTasks()
        toastStore.info("Task update undone")
        break

      case "TOGGLE_TASK":
        // Undo toggle = restore previous done state
        await taskApi.updateTask(action.taskId, { is_done: action.before })
        await tasksStore.loadTasks()
        toastStore.info("Task toggle undone")
        break
    }
  } catch (error) {
    console.error("Failed to undo:", error)
    toastStore.error("Failed to undo action")
    // Re-add the action back since it failed
    undoStore.addAction(action)
  }
}

async function handleRedo() {
  const action = undoStore.redo()
  if (!action) return

  try {
    switch (action.type) {
      case "CREATE_TASK":
        // Redo create = recreate the task
        await taskApi.createTask({
          title: action.task.title,
          description: action.task.description,
          category_id: action.task.category_id,
          priority: action.task.priority,
          parent_id: action.task.parent_id,
          due_date: action.task.due_date,
        })
        await tasksStore.loadTasks()
        toastStore.info("Task creation redone")
        break

      case "DELETE_TASK":
        // Redo delete = delete again
        await taskApi.deleteTask(action.task.id)
        await tasksStore.loadTasks()
        toastStore.info("Task deletion redone")
        break

      case "UPDATE_TASK":
        // Redo update = apply the new values
        await taskApi.updateTask(action.taskId, {
          title: action.after.title,
          description: action.after.description,
          category_id: action.after.category_id,
          priority: action.after.priority,
          parent_id: action.after.parent_id,
          is_done: action.after.is_done,
          due_date: action.after.due_date,
        })
        await tasksStore.loadTasks()
        toastStore.info("Task update redone")
        break

      case "TOGGLE_TASK":
        // Redo toggle = apply the new done state
        await taskApi.updateTask(action.taskId, { is_done: action.after })
        await tasksStore.loadTasks()
        toastStore.info("Task toggle redone")
        break
    }
  } catch (error) {
    console.error("Failed to redo:", error)
    toastStore.error("Failed to redo action")
  }
}

// Global keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl + Z for undo
  if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
    if (canUndo) {
      e.preventDefault()
      handleUndo()
    }
  }
  // Cmd/Ctrl + Shift + Z for redo
  else if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
    if (canRedo) {
      e.preventDefault()
      handleRedo()
    }
  }
}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="undo-controls">
  <button
    class="terminal-button text-xs"
    on:click={handleUndo}
    disabled={!canUndo}
    aria-label="Undo last action (Cmd+Z)"
    title="Undo (⌘Z)"
  >
    ↶ undo
  </button>
  <button
    class="terminal-button text-xs"
    on:click={handleRedo}
    disabled={!canRedo}
    aria-label="Redo last undone action (Cmd+Shift+Z)"
    title="Redo (⌘⇧Z)"
  >
    ↷ redo
  </button>
</div>

<style>
  .undo-controls {
    display: flex;
    gap: 0.5rem;
  }
</style>
