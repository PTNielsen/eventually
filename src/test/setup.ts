import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// Mock Tauri API
global.window = Object.assign(global.window || {}, {
  __TAURI__: {
    invoke: vi.fn(),
  },
})
