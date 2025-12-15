# eventually

A minimalist desktop task manager with terminal aesthetics. Built with Tauri, SvelteKit, and SQLite.

## Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev
pnpm tauri dev

# Build for production
pnpm build
pnpm tauri build
```

## Development

```bash
# Frontend tests
pnpm test          # Run tests in watch mode
pnpm test:run      # Run tests once
pnpm check         # Type check
pnpm lint          # Lint code
pnpm format        # Format code

# Backend tests
cd src-tauri
cargo test         # Run Rust tests
```

## Stack

- **Frontend**: SvelteKit 5 + TypeScript + TailwindCSS
- **Backend**: Tauri 2 (Rust) + SQLx + SQLite
- **Testing**: Vitest
- **Tooling**: Biome (linting/formatting) + Lefthook (git hooks)
