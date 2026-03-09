# Application Builder — VS Code & Antigravity IDE Extension

> A visual drag-and-drop application builder powered by **Svelte 5**, built as a VS Code extension and fully compatible with **Antigravity IDE**.

---

## Table of Contents

1. [What Is This?](#what-is-this)
2. [Features](#features)
3. [Installation](#installation)
   - [Install in Antigravity IDE (Recommended)](#install-in-antigravity-ide-recommended)
   - [Install in VS Code](#install-in-vs-code)
4. [How to Use](#how-to-use)
   - [Opening the Extension](#opening-the-extension)
   - [The Left Sidebar — Components & Navigator](#the-left-sidebar--components--navigator)
   - [The Canvas Panel](#the-canvas-panel)
   - [The Properties Panel](#the-properties-panel)
5. [Components Reference](#components-reference)
6. [Navigator (Layers Tree)](#navigator-layers-tree)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Developer Guide](#developer-guide)
   - [Project Structure](#project-structure)
   - [Architecture Overview](#architecture-overview)
   - [How the Extension Communicates](#how-the-extension-communicates)
   - [Running in Development Mode](#running-in-development-mode)
   - [Building for Production](#building-for-production)
   - [Packaging as VSIX](#packaging-as-vsix)
9. [Troubleshooting](#troubleshooting)
10. [Roadmap](#roadmap)

---

## What Is This?

**Application Builder** is a visual, drag-and-drop UI builder that lives inside your IDE. Think of tools like **Pinegrow**, **Figma**, or **Webflow** — but directly inside **Antigravity IDE** or **VS Code**.

Instead of writing HTML/CSS by hand for every layout, you:
1. Drag real **Svelte components** onto a canvas
2. See them rendered live
3. Inspect and nest them in the **Navigator** (Layers Tree)
4. Edit their position and size in the **Properties panel**
5. Export or build from the resulting component tree

All components on the canvas are real **Svelte 5 components** — not static wireframes or screenshots.

---

## Features

| Feature | Status |
|---|---|
| Drag & Drop Svelte components onto canvas | ✅ Working |
| Live component rendering (Hero, Button, Card, etc.) | ✅ Working |
| Navigator / Layers Tree with hierarchy | ✅ Working |
| Nested components (parent → child) | ✅ Working |
| Select, move, resize nodes on canvas | ✅ Working |
| Zoom & pan canvas | ✅ Working |
| Right-click context menu (Delete, Duplicate, Bring to Front) | ✅ Working |
| Properties panel (X, Y, W, H inputs) | ✅ Working |
| Multi-device frames (Desktop / Tablet / Mobile) | ✅ Working |
| Navigator ↔ Canvas selection sync | ✅ Working |
| Antigravity IDE support | ✅ Working |
| VS Code support | ✅ Working |

---

## Installation

### Install in Antigravity IDE (Recommended)

**Step 1 — Build the VSIX package**

Open a terminal in the project folder and run:

```bash
npm install
npm run build
npx vsce package --no-dependencies --out app-builder.vsix
```

This creates `app-builder.vsix` in the project root.

**Step 2 — Install via Antigravity CLI**

```powershell
& "C:\Users\<YourUsername>\AppData\Local\Programs\Antigravity\bin\antigravity" --install-extension "D:\Github\vscodeplugin-applicationbuilder\app-builder.vsix" --force
```

Replace `<YourUsername>` with your Windows username (e.g., `Gellish`).

**Step 3 — Restart Antigravity IDE**

Close and reopen Antigravity IDE. The extension will be loaded automatically.

---

### Install in VS Code

**Step 1 — Build the VSIX** (same as above)

**Step 2 — Install via VS Code CLI**

```bash
code --install-extension app-builder.vsix --force
```

**Step 3 — Reload VS Code**

Press `Ctrl+Shift+P` → type **"Developer: Reload Window"** → press Enter.

---

## How to Use

### Opening the Extension

After installing and restarting the IDE:

1. Look at the **left Activity Bar** (the vertical icon strip on the far left).
2. You will see the **Application Builder icon** (⚡ Vite icon by default).
3. Click it — this opens the **Sidebar** with the Components and Navigator panels.
4. The **Canvas** editor panel opens automatically in the main editor area.

You can also open the canvas manually:
- Press `Ctrl+Shift+P` → type **"Application Builder: Open"** → press Enter.

---

### The Left Sidebar — Components & Navigator

The sidebar has **two tabs**:

#### Components Tab
Browse and add Svelte components. Components are grouped by category:

| Group | Components |
|---|---|
| Layout | Navbar, Hero, Footer |
| Basic | Button, Text, Card, Form |
| Media | Image |

**To add a component:**
- **Click** the component card → it is added to the center of the canvas
- **Drag** the component card → drop it anywhere on the canvas

> **Tip:** If you have a component **selected** on the canvas when you click a component card in the sidebar, the new component is added **as a child** inside the selected one (nested component!).

#### Navigator Tab
The Navigator shows the **live layer hierarchy** of everything on the canvas — exactly like Figma's layers panel or Pinegrow's DOM tree.

- Each component you add appears as a row in the Navigator
- Nested components are shown **indented** below their parent
- **Click any row** in the Navigator to select that component on the canvas
- The currently selected component is **highlighted** in both the Navigator and on the canvas

---

### The Canvas Panel

The canvas is the main editing surface. It shows your components as draggable, resizable blocks rendered inside **device frames**.

#### Device Frames
Three device frames are always visible:

| Frame | Width |
|---|---|
| Desktop | 1000px |
| Tablet | 768px |
| Mobile | 375px |

#### Selecting Components
- **Click** a component to select it (highlighted in blue)
- **Shift+Click** to select multiple components
- **Click empty canvas** to deselect all

#### Moving Components
- **Click and drag** any selected component to move it
- Moving a container automatically moves all its **nested children** with it

#### Resizing Components
- Select a component — **8 resize handles** appear around it
- Drag any handle to resize (corners resize both axes, edges resize one axis)

#### Zooming & Panning
- **Scroll wheel** → zoom in/out (centered on cursor)
- **Hold Space + drag** → pan the canvas
- **Middle mouse button drag** → pan the canvas
- **Toolbar buttons** → zoom in (+), zoom out (−), fit/reset view (Fit)

#### Right-Click Context Menu
Right-click any selected component to get:

| Action | Description |
|---|---|
| Duplicate | Creates a copy of the selected component (`Ctrl+D`) |
| Bring to Front | Moves the component above all others |
| Send to Back | Moves the component below all others |
| Delete | Removes the component (`Delete` or `Backspace`) |

---

### The Properties Panel

The **right side** of the canvas panel shows the **Design / Properties panel**.

When a component is selected, it shows:

| Property | Description |
|---|---|
| X | Horizontal position on the canvas (in pixels) |
| Y | Vertical position on the canvas (in pixels) |
| W | Width of the component (in pixels) |
| H | Height of the component (in pixels) |

You can type new values directly into the fields to precisely position or resize a component.

---

## Components Reference

Each component is a real Svelte 5 component file located in `src/components/`.

| Component | File | Description |
|---|---|---|
| **Navbar** | `Navbar.svelte` | Top navigation bar with logo and links |
| **Hero** | `Hero.svelte` | Full-width hero section with headline and CTA |
| **Footer** | `Footer.svelte` | Page footer with copyright text |
| **Button** | `Button.svelte` | Clickable button element |
| **Text** | `Text.svelte` | Paragraph/text block |
| **Card** | `Card.svelte` | Content card with title and body |
| **Form** | `Form.svelte` | Input form with basic fields |
| **Image** | `Image.svelte` | Image placeholder block |

To **add a new component type**, create a new `.svelte` file in `src/components/` and register it in two places:
1. `src/CanvasApp.svelte` → add to `componentMap`
2. `src/SidebarPanel.svelte` → add to the `groups` array

---

## Navigator (Layers Tree)

The Navigator mirrors how Pinegrow and Figma handle the DOM/layer hierarchy.

### How Nesting Works

When you **drop a component on top of another** on the canvas, it is automatically assigned as a **child** of the component it was dropped onto (based on which component's bounding box contains the drop point).

When you **click a component in the sidebar** while another is selected on the canvas, the new component is placed **inside** the selected component.

### Tree Display

The Navigator renders a recursive tree:

```
📦 Hero
  🔘 Button
  📝 Text
☰ Navbar
🎴 Card
  📝 Text
  🔘 Button
```

- Top-level items have no indentation
- Each level of nesting adds 12px indentation
- The selected component is highlighted with a blue left border

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` | Switch to Select tool |
| `H` | Switch to Hand/Pan tool |
| `Space + Drag` | Pan the canvas |
| `Scroll Wheel` | Zoom in/out |
| `Ctrl + 0` | Reset zoom to 100% and pan to origin |
| `Ctrl + D` | Duplicate selected component(s) |
| `Delete` / `Backspace` | Delete selected component(s) |
| `Shift + Click` | Add component to selection |

---

## Developer Guide

### Project Structure

```
vscodeplugin-applicationbuilder/
├── src/
│   ├── extension.ts          # VS Code extension entry point
│   ├── canvasMain.ts         # Canvas webview entry (Svelte mount)
│   ├── sidebarMain.ts        # Sidebar webview entry (Svelte mount)
│   ├── CanvasApp.svelte      # Main canvas UI (drag, drop, zoom, pan)
│   ├── SidebarPanel.svelte   # Sidebar UI (Components + Navigator tabs)
│   ├── canvasStore.ts        # Svelte store — all canvas state
│   └── components/           # Real Svelte component files
│       ├── Button.svelte
│       ├── Card.svelte
│       ├── Footer.svelte
│       ├── Form.svelte
│       ├── Hero.svelte
│       ├── Image.svelte
│       ├── Navbar.svelte
│       └── Text.svelte
├── dist/                     # Production build output
│   ├── extension.cjs         # Bundled extension host code
│   └── assets/
│       ├── canvasMain.js     # Bundled canvas webview
│       ├── sidebarMain.js    # Bundled sidebar webview
│       ├── canvasMain.css    # Canvas styles
│       └── sidebarMain.css   # Sidebar styles
├── canvas.html               # Vite HTML entry for the canvas
├── sidebar.html              # Vite HTML entry for the sidebar
├── vite.config.ts            # Vite build configuration
├── package.json              # Extension manifest + npm scripts
└── app-builder.vsix          # Packaged extension (after build)
```

---

### Architecture Overview

This extension uses a **three-part architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                  Antigravity IDE / VS Code               │
│                                                          │
│  ┌───────────────┐   Messages   ┌──────────────────┐    │
│  │  Sidebar      │◄────────────►│  Extension Host  │    │
│  │  Webview      │              │  (extension.ts)  │    │
│  │  (Svelte)     │              │                  │    │
│  └───────────────┘              └────────┬─────────┘    │
│                                          │ Messages      │
│                                 ┌────────▼─────────┐    │
│                                 │  Canvas Webview   │    │
│                                 │  (Svelte)         │    │
│                                 └──────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

| Part | Technology | Responsibility |
|---|---|---|
| **Extension Host** | TypeScript (Node.js) | Creates webview panels, routes messages between sidebar and canvas |
| **Canvas Webview** | Svelte 5 + canvasStore | Renders the canvas, handles drag/drop/zoom/pan, syncs state |
| **Sidebar Webview** | Svelte 5 | Renders component palette + Navigator tree |

---

### How the Extension Communicates

All three parts communicate using **VS Code's postMessage API**:

#### Canvas → Extension Host
```
canvas.postMessage({ command: 'syncNodes', nodes: [...], selectedIds: [...] })
```
Sent whenever the canvas state changes. The extension host relays this to the sidebar.

#### Extension Host → Sidebar
```
sidebar.postMessage({ command: 'syncNodes', nodes: [...], selectedIds: [...] })
```
Sidebar receives this and updates the Navigator tree.

#### Sidebar → Extension Host → Canvas
When the user clicks a component in the Navigator or Component palette:
```
sidebar → { command: 'selectNode', id: '...' }
sidebar → { command: 'addComponent', type: 'Button' }
↓ extension host relays to canvas ↓
canvas receives and acts on it
```

---

### Running in Development Mode

Development mode uses **Vite's Hot Module Replacement (HMR)** for instant UI updates without rebuilding.

**Step 1 — Install dependencies**
```bash
npm install
```

**Step 2 — Start the dev server + extension watcher**
```bash
npm run dev
```
This runs two processes in parallel:
- `vite` — Svelte dev server on `http://localhost:5173`
- `watch:extension` — esbuild watching `extension.ts`, rebuilding on changes with `__DEV__=true`

**Step 3 — Launch in Extension Development Host**

In VS Code / Antigravity IDE, press **F5** (or go to Run → Start Debugging). This opens a new IDE window with the extension loaded in dev mode, pointing to the local Vite dev server.

> **Note:** In dev mode, the sidebar and canvas webviews load from `localhost:5173`. If the Vite server is not running, the webviews will be blank.

---

### Building for Production

Production mode bundles everything into the `dist/` folder. No dev server is needed.

```bash
npm run build
```

This runs two steps:
1. `npm run build:webview` — Vite bundles all Svelte code into `dist/assets/`
2. `npm run build:extension` — esbuild bundles `extension.ts` into `dist/extension.cjs` with `__DEV__=false`

With `__DEV__=false`, the extension loads webviews from the local `dist/assets/` files, not from `localhost`.

---

### Packaging as VSIX

A `.vsix` file is a self-contained extension package that can be installed in any VS Code-based IDE.

**Prerequisites:**
```bash
npm install -g @vscode/vsce
```

**Package:**
```bash
npm run build
vsce package --no-dependencies --out app-builder.vsix
```

**Install in Antigravity IDE:**
```powershell
& "C:\Users\<YourUsername>\AppData\Local\Programs\Antigravity\bin\antigravity" --install-extension ".\app-builder.vsix" --force
```

**Install in VS Code:**
```bash
code --install-extension app-builder.vsix --force
```

After installing, **restart the IDE** to apply the new extension version.

---

## Troubleshooting

### Extension shows old/blank UI

This happens when the webviews try to connect to a Vite dev server that isn't running.

**Fix:** Run a production build and reinstall:
```bash
npm run build
vsce package --no-dependencies --out app-builder.vsix
# Then install the VSIX (see above) and restart the IDE
```

---

### Canvas panel doesn't open

The canvas opens automatically on activation. If it doesn't:
- Open the Command Palette → type **"Application Builder: Open"**
- Or click the extension icon in the Activity Bar, then click any component in the sidebar (it will auto-open the canvas)

---

### Navigator shows "No elements on canvas"

The Navigator is populated by messages sent from the canvas. This means:
1. The canvas must be open and loaded
2. The canvas and sidebar must be communicating through the extension host

If this doesn't work, try closing and reopening the canvas tab.

---

### After adding a new component, it doesn't appear in the sidebar

You need to register the new component in `SidebarPanel.svelte` under the `groups` array:

```ts
{
  title: 'Basic',
  items: [
    { type: 'MyNewComponent', icon: '🆕', label: 'My Component' },
    // ...
  ]
}
```

---

### Drag and drop doesn't work

Ensure you are dropping components **onto the canvas viewport** (the dark dotted area), not on the toolbar or properties panel.

---

## Roadmap

| Feature | Priority |
|---|---|
| Drag-to-reorder layers in Navigator | 🔜 Next |
| Component props editor (change text, colors, etc.) | 🔜 Next |
| Export to Svelte code | 📋 Planned |
| Undo / Redo history | 📋 Planned |
| Import existing Svelte components from project | 📋 Planned |
| Responsive breakpoint preview toggle | 📋 Planned |
| Custom component registration UI | 💡 Idea |
| Collaboration / multiplayer canvas | 💡 Idea |

---

## License

MIT — free to use, extend, and modify.

---

*Built with ❤️ using Svelte 5, Vite, TypeScript, and the VS Code Extension API.*
