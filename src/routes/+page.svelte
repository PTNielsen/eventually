<script lang="ts">
import QuickEntry from "$lib/components/quick-entry/QuickEntry.svelte"
import TaskList from "$lib/components/task-list/TaskList.svelte"
import UndoRedo from "$lib/components/undo-redo/UndoRedo.svelte"

// Global keyboard shortcut to focus quick entry
function handleGlobalKeydown(e: KeyboardEvent) {
  // ⌘+K or Ctrl+K to focus quick entry
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault()
    const input = document.querySelector(".quick-entry-input") as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  }
}
</script>

<svelte:head>
  <title>eventually - stuff i should do</title>
</svelte:head>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="min-h-screen p-8">
  <header class="mb-12 fade-in">
    <div class="terminal-panel p-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="flex gap-2">
          <div class="w-3 h-3 rounded-full bg-terminal-red shadow-sm shadow-terminal-red/50"></div>
          <div class="w-3 h-3 rounded-full bg-terminal-yellow shadow-sm shadow-terminal-yellow/50"></div>
          <div class="w-3 h-3 rounded-full bg-terminal-green shadow-sm shadow-terminal-green/50"></div>
        </div>
        <span class="text-terminal-bright-black text-sm">~/eventually</span>
      </div>
      <h1 class="text-3xl text-terminal-cyan font-bold mb-2 tracking-tight">$ eventually</h1>
      <p class="text-terminal-bright-black">
        <span class="text-terminal-bright-black/50">//</span> stuff you should probably do
      </p>
      <div class="text-terminal-bright-black/70 text-xs mt-3 space-y-1">
        <p><span class="text-terminal-bright-black">⌘+k</span> to focus quick entry</p>
        <p><span class="text-terminal-bright-black">⌘+z</span> undo · <span class="text-terminal-bright-black">⌘+shift+z</span> redo</p>
      </div>
    </div>
  </header>

  <main class="space-y-6">
    <QuickEntry />
    <UndoRedo />
    <TaskList />
  </main>
</div>
