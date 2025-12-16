<script lang="ts">
import { ask } from "@tauri-apps/plugin-dialog"
import { tasksStore } from "$lib/stores/tasks/tasks"
import type { TaskTree } from "$lib/types/models.d"
import { validateTaskTitle } from "$lib/utils/validation/validation"

export let taskTree: TaskTree
export let depth = 0

$: task = taskTree
$: hasSubtasks = taskTree.subtasks && taskTree.subtasks.length > 0

let expanded = true
let showSubtaskInput = false
let subtaskTitle = ""
let subtaskError: string | null = null

// Validate subtask title
$: {
  if (subtaskTitle) {
    const validation = validateTaskTitle(subtaskTitle)
    subtaskError = validation.valid ? null : (validation.error ?? null)
  } else {
    subtaskError = null
  }
}

// Calculate deadline status
function getDeadlineInfo(dueDate: number | null) {
  if (!dueDate) return null

  const now = Date.now() / 1000
  const diff = dueDate - now
  const hours = diff / 3600

  if (diff < 0) {
    return { status: "overdue", text: "overdue", class: "deadline-overdue" }
  } else if (hours < 24) {
    const hoursLeft = Math.floor(hours)
    return {
      status: "soon",
      text: hoursLeft < 1 ? "< 1h" : `${hoursLeft}h`,
      class: "deadline-soon",
    }
  } else if (hours < 72) {
    const daysLeft = Math.floor(hours / 24)
    return {
      status: "soon",
      text: `${daysLeft}d`,
      class: "deadline-soon",
    }
  } else {
    const daysLeft = Math.floor(hours / 24)
    return {
      status: "ok",
      text: `${daysLeft}d`,
      class: "deadline-ok",
    }
  }
}

$: deadlineInfo = getDeadlineInfo(task.due_date)

function formatDueDate(timestamp: number) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function toggleDone() {
  try {
    await tasksStore.toggleDone(task.id, !task.is_done)
  } catch (error) {
    console.error("Failed to toggle task:", error)
  }
}

async function handleDelete() {
  const confirmMessage = `Delete "${task.title}"${hasSubtasks ? " and all subtasks" : ""}?`
  const shouldDelete = await ask(confirmMessage, {
    title: "Confirm Delete",
    kind: "warning",
  })

  if (shouldDelete) {
    try {
      await tasksStore.deleteTask(task.id)
    } catch (error) {
      console.error("Failed to delete task:", error)
      // Error toast now handled by store
    }
  }
}

function toggleExpanded() {
  expanded = !expanded
}

function getPrioritySymbol(priority: string): string {
  switch (priority) {
    case "Urgent":
      return "!!!"
    case "High":
      return "!!"
    case "Medium":
      return "!"
    case "Low":
      return "·"
    default:
      return ""
  }
}

function getPriorityClass(priority: string): string {
  return `priority-${priority.toLowerCase()}`
}

async function handleAddSubtask() {
  if (!subtaskTitle.trim() || subtaskError) return

  try {
    await tasksStore.createTask({
      title: subtaskTitle.trim(),
      category_id: task.category_id,
      priority: task.priority,
      parent_id: task.id,
      due_date: null,
    })

    // Reset and close input
    subtaskTitle = ""
    subtaskError = null
    showSubtaskInput = false
    expanded = true
  } catch (error) {
    console.error("Failed to create subtask:", error)
    // Error toast now handled by store
  }
}

function toggleSubtaskInput() {
  showSubtaskInput = !showSubtaskInput
  if (showSubtaskInput) {
    // Auto-expand when adding subtask
    expanded = true
  }
}
</script>

<div
  class="terminal-panel p-3 mb-2 hover:border-terminal-blue/50 transition-colors"
  class:opacity-50={task.is_done}
  style="margin-left: {depth * 24}px;"
>
  <div class="flex items-start gap-3">
    {#if hasSubtasks}
      <button
        class="text-terminal-brightBlack hover:text-terminal-fg text-xs mt-1 cursor-pointer"
        on:click={toggleExpanded}
        aria-label="Toggle subtasks"
      >
        {expanded ? '▼' : '▶'}
      </button>
    {:else}
      <span class="w-3"></span>
    {/if}

    <input
      type="checkbox"
      checked={task.is_done}
      on:change={toggleDone}
      class="mt-1 w-4 h-4 rounded border-terminal-brightBlack/50 bg-terminal-black
             checked:bg-terminal-green checked:border-terminal-green
             focus:ring-terminal-green/50 cursor-pointer"
      aria-label="Mark task as {task.is_done ? 'incomplete' : 'complete'}"
    />

    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <span
          class="text-terminal-fg font-mono"
          class:line-through={task.is_done}
          class:text-terminal-brightBlack={task.is_done}
        >
          {task.title}
        </span>

        <div class="flex items-center gap-2 shrink-0">
          {#if deadlineInfo}
            <span
              class="text-xs px-2 py-0.5 border rounded {deadlineInfo.class}"
              title={task.due_date ? formatDueDate(task.due_date) : ''}
            >
              {deadlineInfo.text}
            </span>
          {/if}

          <span class="text-xs {getPriorityClass(task.priority)} border px-2 py-0.5 rounded">
            {getPrioritySymbol(task.priority)}
          </span>

          <button
            class="text-terminal-brightBlack hover:text-terminal-red text-lg leading-none cursor-pointer"
            on:click={handleDelete}
            aria-label="Delete task"
          >
            ×
          </button>
        </div>
      </div>

      {#if task.description}
        <p class="text-sm text-terminal-brightBlack mt-1">{task.description}</p>
      {/if}

      {#if task.due_date && !deadlineInfo}
        <p class="text-xs text-terminal-brightBlack mt-1">
          due: {formatDueDate(task.due_date)}
        </p>
      {/if}

      <!-- Add Subtask Button -->
      <div class="mt-2">
        <button
          class="text-xs text-terminal-brightBlack hover:text-terminal-cyan transition-colors cursor-pointer"
          on:click={toggleSubtaskInput}
        >
          {showSubtaskInput ? '- cancel' : '+ add subtask'}
        </button>
      </div>

      <!-- Subtask Input -->
      {#if showSubtaskInput}
        <div class="mt-2">
          <div class="flex gap-2">
            <input
              id="subtask-{task.id}"
              type="text"
              bind:value={subtaskTitle}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSubtask()
                } else if (e.key === 'Escape') {
                  showSubtaskInput = false
                  subtaskTitle = ''
                  subtaskError = null
                }
              }}
              placeholder="subtask title..."
              class="terminal-input text-sm flex-1"
              class:border-terminal-red={subtaskError}
              aria-label="Subtask title"
              aria-invalid={!!subtaskError}
              aria-describedby={subtaskError ? `subtask-error-${task.id}` : undefined}
              maxlength="500"
            />
            <button
              class="terminal-button terminal-button-primary text-xs px-3"
              on:click={handleAddSubtask}
              disabled={!subtaskTitle.trim() || !!subtaskError}
              aria-label="Add subtask"
            >
              add
            </button>
          </div>
          {#if subtaskError}
            <p id="subtask-error-{task.id}" class="text-terminal-red text-xs mt-1" role="alert">{subtaskError}</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if hasSubtasks && expanded}
    <div class="mt-2">
      {#each taskTree.subtasks as subtask (subtask.id)}
        <svelte:self taskTree={subtask} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</div>
