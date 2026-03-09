# AI Context — Application Builder Extension

> **READ THIS FIRST before making any changes to this project.**
> This file exists to prevent common mistakes that have wasted time in previous AI sessions.

---

## Critical Facts

### 1. The IDE is Antigravity, NOT VS Code

The user runs **Antigravity IDE** — a VS Code-based IDE but a completely separate application.

- Antigravity executable: `C:\Users\Gellish\AppData\Local\Programs\Antigravity\Antigravity.exe`
- Antigravity CLI: `C:\Users\Gellish\AppData\Local\Programs\Antigravity\bin\antigravity`
- Antigravity extensions folder: `C:\Users\Gellish\AppData\Roaming\Antigravity\User\extensions\`

**Do NOT use `code` CLI** — it installs to regular VS Code, not Antigravity.

### 2. Ctrl+Shift+P does NOT work for the user

Do not tell the user to press `Ctrl+Shift+P`. It does not work in their setup.
Instead, use the CLI or terminal-based approaches.

### 3. Do NOT ask the user to press F5

The user has explicitly expressed frustration with being asked to press F5 to reload. 
Don't do it. If you need to reload the extension, automate it via the terminal/CLI.

---

## How to Install the Extension (Correct Method)

```powershell
# 1. Build production assets
npm run build

# 2. Package as VSIX
npx vsce package --no-dependencies --out app-builder.vsix

# 3. Install into Antigravity IDE
$ag = "C:\Users\Gellish\AppData\Local\Programs\Antigravity\bin\antigravity"
& $ag --install-extension "D:\Github\vscodeplugin-applicationbuilder\app-builder.vsix" --force
```

After installing, the user needs to **restart Antigravity IDE** (close and reopen the window).

---

## Dev vs Production Mode

| Mode | `__DEV__` flag | Loads from | How to trigger |
|---|---|---|---|
| **Development** | `true` | `http://localhost:5173` | `watch:extension` script |
| **Production** | `false` | `dist/assets/` | `build:extension` script |

### Critical: Dev mode ONLY works when Vite server is running

When `__DEV__=true`, the extension tries to load webviews from `localhost:5173`.
If the Vite dev server isn't running → **blank / stale webviews**.

**Always use production mode** (`npm run build`) when the user reports they see the old UI. Never leave `extension.cjs` compiled with `__DEV__=true` for the user to run without also starting the Vite server.

### The `watch:extension` script overwrites `extension.cjs` with `__DEV__=true`

If the user previously ran `npm run dev`, the `watch:extension` process may have compiled `extension.cjs` with `__DEV__=true`. Always run `npm run build` or `npm run build:extension` explicitly before packaging.

---

## Architecture

```
Antigravity IDE
│
├── Sidebar Webview (SidebarPanel.svelte)
│     - Shows "Components" tab (drag-drop palette)
│     - Shows "Navigator" tab (Layers Tree / DOM tree)
│     - Entry: src/sidebarMain.ts
│     - Built to: dist/assets/sidebarMain.js
│
├── Extension Host (extension.ts)
│     - Routes messages between Sidebar ↔ Canvas
│     - Built to: dist/extension.cjs
│     - __DEV__=false for production
│
└── Canvas Webview (CanvasApp.svelte)
      - Main drag-and-drop canvas
      - Renders real Svelte components
      - Entry: src/canvasMain.ts
      - Built to: dist/assets/canvasMain.js
```

### Message Flow

```
Canvas --[syncNodes]--> Extension Host --[syncNodes]--> Sidebar (updates Navigator)
Sidebar --[addComponent]--> Extension Host --[addComponent]--> Canvas (adds node)
Sidebar --[selectNode]--> Extension Host --[selectNode]--> Canvas (selects node)
```

---

## State Management (canvasStore.ts)

All canvas state lives in `canvasStore.ts` as a Svelte writable store.

### CanvasNode type

```ts
interface CanvasNode {
  id: string;
  type: string;       // 'Hero', 'Button', 'Card', etc.
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  parentId?: string;  // undefined = root level, set = nested child
  props?: Record<string, any>;
}
```

### Key store functions

| Function | Description |
|---|---|
| `addNode(type, x, y, parentId?)` | Add a new component to the canvas |
| `removeNodes(ids[])` | Delete components by ID |
| `selectNode(id, shiftKey)` | Select a node (shift = multi-select) |
| `clearSelection()` | Deselect all |
| `moveSelectedNodes(dx, dy)` | Move selected nodes (and their children) |
| `resizeNode(id, x, y, w, h)` | Resize a specific node |
| `duplicateNodes(ids[])` | Duplicate selected nodes |
| `bringToFront(id)` | Increase z-index |
| `sendToBack(id)` | Decrease z-index |

---

## Adding New Component Types

**Step 1:** Create `src/components/MyComponent.svelte`

**Step 2:** Register in `CanvasApp.svelte`:
```ts
import MyComponent from './components/MyComponent.svelte';

const componentMap = {
  // ...existing
  MyComponent,
};
```

**Step 3:** Register in `SidebarPanel.svelte`:
```ts
const groups = [
  {
    title: 'My Group',
    items: [
      { type: 'MyComponent', icon: '🆕', label: 'My Component' },
    ]
  }
];
```

**Step 4:** Add color styling in `CanvasApp.svelte`:
```ts
const COMPONENT_COLORS = {
  // ...existing
  MyComponent: { bg: '#1a1a2e', border: '#333399', icon: '🆕' },
};
```

---

## Common Problems & Solutions

### Problem: User sees old UI (Workspace.svelte layout, old sidebar with no tabs)

**Cause:** `extension.cjs` compiled with `__DEV__=true`, Vite server not running.

**Fix:**
```bash
npm run build
npx vsce package --no-dependencies --out app-builder.vsix
# Install VSIX to Antigravity, then user restarts the IDE
```

---

### Problem: Sidebar doesn't show Navigator/Components tabs

**Cause:** `sidebarMain.js` is serving an old cached build.

**Fix:** Run `npm run build` and reinstall VSIX.

---

### Problem: Navigator shows "No elements on canvas"

**Cause:** Canvas and sidebar are not communicating (extension host message routing issue).

**Check:** Confirm `extension.ts` has `CanvasPanel.sidebarProvider.postMessage(msg)` in the `syncNodes` handler.

---

### Problem: Moving a parent doesn't move its children

**Fixed in:** `canvasStore.ts` → `moveSelectedNodes` uses a loop to collect all
descendant node IDs before applying the translation delta.

---

## File Quick Reference

| File | Purpose |
|---|---|
| `src/extension.ts` | Extension host — webview creation and message routing |
| `src/CanvasApp.svelte` | Canvas UI — all drag, drop, resize, pan, zoom logic |
| `src/SidebarPanel.svelte` | Sidebar UI — Components palette + Navigator tree |
| `src/canvasStore.ts` | Shared state — all nodes, zoom, pan, selection |
| `src/canvasMain.ts` | Canvas webview entry point |
| `src/sidebarMain.ts` | Sidebar webview entry point |
| `src/components/*.svelte` | Real Svelte components rendered on the canvas |
| `canvas.html` | Vite HTML template for the canvas |
| `sidebar.html` | Vite HTML template for the sidebar |
| `vite.config.ts` | Vite build config (two entry points: canvas + sidebar) |
| `package.json` | Extension manifest + build scripts |

---

## npm Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `concurrently "vite" "npm run watch:extension"` | Dev mode: Vite HMR + extension watcher (`__DEV__=true`) |
| `build` | `build:webview && build:extension` | Full production build |
| `build:webview` | `vite build` | Build Svelte UI to dist/assets/ |
| `build:extension` | `esbuild ... --define:__DEV__=false` | Build extension host (production) |
| `watch:extension` | `esbuild ... --define:__DEV__=true --watch` | Dev watcher (DEV mode only!) |

---

## GitHub Repository

- **URL:** https://github.com/Gellish/vscodeplugin-applicationbuilder
- **Branch:** `master`
- **Push after changes:** `git add . && git commit -m "..." && git push`
