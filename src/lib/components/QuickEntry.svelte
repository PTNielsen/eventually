<script lang="ts">
import { categoriesStore } from "$lib/stores/categories"
import { tasksStore } from "$lib/stores/tasks"
import type { Priority } from "$lib/types/models"

// Default time when no specific time is provided (end of day)
const DEFAULT_DUE_TIME = "23:59"

let title = ""
let category: number | null = null
let priority: Priority = "Medium"
// Default to today's date in local timezone
const today = new Date()
let dueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
let dueTime = ""
let isSubmitting = false

async function handleSubmit() {
  if (!title.trim() || isSubmitting) return

  isSubmitting = true
  try {
    let dueDateTimestamp: number | null = null
    if (dueDate) {
      const dateTimeString = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T${DEFAULT_DUE_TIME}`
      dueDateTimestamp = Math.floor(new Date(dateTimeString).getTime() / 1000)
    }

    await tasksStore.createTask({
      title: title.trim(),
      category_id: category,
      priority,
      parent_id: null,
      due_date: dueDateTimestamp,
    })

    // Reset form
    title = ""
    dueDate = ""
    dueTime = ""
    // Keep category and priority as defaults for next task
  } catch (error) {
    console.error("Failed to create task:", error)
    alert("Failed to create task. Please try again.")
  } finally {
    isSubmitting = false
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  // ⌘+Enter (Mac) or Ctrl+Enter (Windows/Linux) to submit
  // Only trigger if we're in the QuickEntry component area
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    const target = e.target as HTMLElement
    // Check if the target is within this component
    if (target.closest(".quick-entry-container")) {
      e.preventDefault()
      handleSubmit()
    }
  }
}
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="terminal-panel p-4 mb-6 quick-entry-container">
  <div class="flex items-center gap-2 mb-3">
    <span class="text-terminal-green">→</span>
    <span class="text-terminal-brightBlack text-sm">new task</span>
  </div>

  <input
    id="task-title"
    type="text"
    bind:value={title}
    placeholder="what needs to be done?"
    class="quick-entry-input terminal-input w-full mb-3 text-base"
    disabled={isSubmitting}
  />

  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
    <div>
      <label for="task-category" class="block text-xs text-terminal-brightBlack mb-1">category</label>
      <select id="task-category" bind:value={category} class="terminal-input w-full text-sm h-10" disabled={isSubmitting}>
        <option value={null}>none</option>
        {#each $categoriesStore.categories as cat}
          <option value={cat.id}>{cat.name.toLowerCase()}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="task-priority" class="block text-xs text-terminal-brightBlack mb-1">priority</label>
      <select id="task-priority" bind:value={priority} class="terminal-input w-full text-sm h-10" disabled={isSubmitting}>
        <option value="Urgent">urgent</option>
        <option value="High">high</option>
        <option value="Medium">medium</option>
        <option value="Low">low</option>
      </select>
    </div>

    <div>
      <label for="task-due-date" class="block text-xs text-terminal-brightBlack mb-1">due date</label>
      <input
        id="task-due-date"
        type="date"
        bind:value={dueDate}
        class="terminal-input w-full text-sm h-10"
        disabled={isSubmitting}
      />
    </div>

    <div>
      <label for="task-due-time" class="block text-xs text-terminal-brightBlack mb-1">time (optional)</label>
      <input
        id="task-due-time"
        type="time"
        bind:value={dueTime}
        class="terminal-input w-full text-sm h-10"
        disabled={isSubmitting}
      />
    </div>
  </div>

  <div class="mt-3 flex justify-between items-center">
    <span class="text-xs text-terminal-brightBlack">⌘+enter to save</span>
    <button
      class="terminal-button terminal-button-primary text-sm"
      on:click={handleSubmit}
      disabled={!title.trim() || isSubmitting}
    >
      {isSubmitting ? '...' : '+ add task'}
    </button>
  </div>
</div>
