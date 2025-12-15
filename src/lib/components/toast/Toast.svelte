<script lang="ts">
import { fly } from "svelte/transition"
import { toastStore } from "$lib/stores/toast/toast"

function getIcon(type: string) {
  switch (type) {
    case "success":
      return "✓"
    case "error":
      return "✕"
    case "warning":
      return "!"
    case "info":
      return "ℹ"
    default:
      return ""
  }
}

function getTypeClass(type: string) {
  switch (type) {
    case "success":
      return "toast-success"
    case "error":
      return "toast-error"
    case "warning":
      return "toast-warning"
    case "info":
      return "toast-info"
    default:
      return ""
  }
}
</script>

<div class="toast-container" role="region" aria-live="polite" aria-label="Notifications">
  {#each $toastStore as toast (toast.id)}
    <div
      class="toast {getTypeClass(toast.type)}"
      transition:fly={{ y: -20, duration: 200 }}
      role="alert"
    >
      <span class="toast-icon" aria-hidden="true">{getIcon(toast.type)}</span>
      <span class="toast-message">{toast.message}</span>
      <button
        class="toast-close"
        on:click={() => toastStore.remove(toast.id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 24rem;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--color-terminal-black);
    border: 1px solid;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    font-family: var(--font-family-mono);
    font-size: 0.875rem;
    pointer-events: auto;
  }

  .toast-success {
    border-color: var(--color-terminal-green);
    background: rgba(158, 206, 106, 0.1);
    color: var(--color-terminal-green);
  }

  .toast-error {
    border-color: var(--color-terminal-red);
    background: rgba(247, 118, 142, 0.1);
    color: var(--color-terminal-red);
  }

  .toast-warning {
    border-color: var(--color-terminal-yellow);
    background: rgba(224, 175, 104, 0.1);
    color: var(--color-terminal-yellow);
  }

  .toast-info {
    border-color: var(--color-terminal-blue);
    background: rgba(122, 162, 247, 0.1);
    color: var(--color-terminal-blue);
  }

  .toast-icon {
    font-size: 1.25rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    line-height: 1.4;
  }

  .toast-close {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.5rem;
    line-height: 1;
    padding: 0;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }

  .toast-close:hover {
    opacity: 1;
  }
</style>
