<script lang="ts">
import { onMount } from "svelte"
import { categoriesStore } from "$lib/stores/categories"
import { sortedTaskTree, tasksByCategory, tasksByPriority, tasksStore } from "$lib/stores/tasks"
import { uiStore } from "$lib/stores/ui"
import type { TaskTree } from "$lib/types/models"
import TaskItem from "./TaskItem.svelte"

onMount(async () => {
  // Load categories first, then tasks (so category names are available when tasks render)
  await categoriesStore.loadCategories()
  await tasksStore.loadTasks()
})

$: groupedView =
  $uiStore.groupBy === "category"
    ? $tasksByCategory
    : $uiStore.groupBy === "priority"
      ? $tasksByPriority
      : null

function getCategoryName(id: number | null): string {
  if (id === null) return "uncategorized"
  const category = $categoriesStore.categories.find((c) => c.id === id)
  return category?.name.toLowerCase() || "unknown"
}

// Helper to find the TaskTree for a given task ID
function findTaskTree(taskId: number): TaskTree | null {
  function search(trees: TaskTree[]): TaskTree | null {
    for (const tree of trees) {
      if (tree.id === taskId) return tree
      const found = search(tree.subtasks)
      if (found) return found
    }
    return null
  }
  return search($sortedTaskTree)
}
</script>

<div class="w-full">
  <!-- Controls -->
  <div class="terminal-panel p-3 mb-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-terminal-brightBlack">view:</span>
          <select
            class="terminal-input text-xs py-1 px-2"
            value={$uiStore.groupBy}
            on:change={(e) => uiStore.setGroupBy(e.currentTarget.value as any)}
          >
            <option value="none">tree</option>
            <option value="category">category</option>
            <option value="priority">priority</option>
          </select>
        </div>

        <button
          class="text-xs text-terminal-brightBlack hover:text-terminal-fg transition-colors"
          on:click={() => uiStore.toggleShowCompleted()}
        >
          [{$uiStore.showCompleted ? '×' : ' '}] show completed
        </button>
      </div>

      <div class="text-xs text-terminal-brightBlack">
        {$tasksStore.tasks.filter((t) => !t.is_done).length} active
      </div>
    </div>
  </div>

  <!-- Loading State -->
  {#if $tasksStore.loading}
    <div class="terminal-panel p-6 text-center">
      <p class="text-terminal-brightBlack">loading tasks...</p>
    </div>

  <!-- Error State -->
  {:else if $tasksStore.error}
    <div class="terminal-panel p-6 text-center">
      <p class="text-terminal-red mb-3">error: {$tasksStore.error}</p>
      <button class="terminal-button text-sm" on:click={() => tasksStore.loadTasks()}>
        retry
      </button>
    </div>

  <!-- Empty State -->
  {:else if $tasksStore.tasks.length === 0}
    <div class="terminal-panel p-8 text-center">
      <p class="text-terminal-cyan text-lg mb-2">$ no tasks</p>
      <p class="text-terminal-brightBlack text-sm">create your first task above</p>
    </div>

  <!-- Grouped View (Category or Priority) -->
  {:else if groupedView}
    <div class="space-y-6">
      {#each [...groupedView.entries()] as [groupKey, tasks]}
        {@const visibleTasks = tasks.filter((t) => $uiStore.showCompleted || !t.is_done)}
        {#if visibleTasks.length > 0}
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="text-terminal-green">▸</span>
              <h3 class="text-terminal-cyan text-sm font-bold">
                {$uiStore.groupBy === 'category'
                  ? getCategoryName(typeof groupKey === 'number' || groupKey === null ? groupKey : null)
                  : String(groupKey).toLowerCase()}
              </h3>
              <span class="text-xs text-terminal-brightBlack">({visibleTasks.length})</span>
            </div>
            <div class="space-y-2">
              {#each visibleTasks as task}
                {@const taskTree = findTaskTree(task.id)}
                {#if taskTree}
                  <TaskItem {taskTree} />
                {:else}
                  <TaskItem taskTree={{ ...task, subtasks: [] }} />
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>

  <!-- Tree View (Hierarchical) -->
  {:else}
    <div class="space-y-2">
      {#each $sortedTaskTree.filter((t) => $uiStore.showCompleted || !t.is_done) as taskTree}
        <TaskItem {taskTree} />
      {/each}
    </div>
  {/if}
</div>
