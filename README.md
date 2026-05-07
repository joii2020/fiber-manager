# Fiber Manager

Fiber Manager is a developer-focused browser extension shell for managing Fiber nodes.

The first milestone provides:

- A WXT + React + TypeScript extension scaffold.
- A `manager.html` workspace opened by the extension icon.
- A node sidebar driven by mock `fiber-rpc` and `fiber-wasm-page` entries.
- A stable empty management workspace with a workspace status bar.
- `ManagedNode` zod schemas, node registry, active-node state, and storage wrapper.
- A minimal content-script to page-context bridge for future `fiber-js` integration.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm build:firefox
pnpm test
```

The extension intentionally does not define a popup, side panel, options page, or DevTools panel in this milestone.
