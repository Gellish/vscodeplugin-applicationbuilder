# VS Code Extension Development Setup

## Project: `vscodeplugin-applicationbuilder`
**Stack:** Svelte 5 + Vite 7 (webview UI) + esbuild (extension host)

---

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [VS Code](https://code.visualstudio.com) **or** Antigravity IDE installed and on your PATH

---

## First-Time Setup

```bash
cd D:\Github\vscodeplugin-applicationbuilder
npm install
```

---

## Development (Hot Reload)

### 1. Start the dev server

```bash
npm run dev
```

This runs **two things in parallel** via `concurrently`:
- `vite` — Webview dev server at `http://localhost:5173` with HMR
- `esbuild --watch` — Rebuilds `dist/extension.cjs` on every save (with `__DEV__=true`)

### 2. Launch the Extension Development Host

Open a second terminal and run:

```bash
# Antigravity IDE
antigravity --extensionDevelopmentPath="D:\Github\vscodeplugin-applicationbuilder"

# VS Code (if needed)
code --extensionDevelopmentPath="D:\Github\vscodeplugin-applicationbuilder"
```

A new IDE window opens with your extension active.

### 3. Develop

| What you change | Result |
|---|---|
| Any `.svelte` file | ✅ Instantly hot-reloads in the sidebar webview |
| Any `.css` / style | ✅ Instantly hot-reloads |
| `extension.ts` | 🔁 esbuild rebuilds → reload the webview or run `Developer: Reload Window` |
| `package.json` contributes | 🔄 Re-launch the extension dev host |

---

## How It Works

```
┌────────────────────────────────────────┐
│  npm run dev                           │
│                                        │
│  ┌─────────────┐  ┌──────────────────┐ │
│  │  vite serve │  │ esbuild --watch  │ │
│  │ :5173 (HMR) │  │ dist/extension   │ │
│  └──────┬──────┘  └────────┬─────────┘ │
│         │                  │           │
│   Webview UI          Extension host   │
└─────────┼──────────────────┼───────────┘
          │                  │
          ▼                  ▼
   ┌──────────────────────────────┐
   │   Antigravity Dev Host       │
   │  (--extensionDevelopmentPath)│
   │                              │
   │  Sidebar webview ◄──── HMR  │
   └──────────────────────────────┘
```

The extension's `__DEV__` flag (injected by esbuild `--define`) controls which URL the webview loads:

- **Dev:** `http://localhost:5173/src/main.ts` (live HMR)
- **Prod:** `dist/assets/index.js` (bundled)

---

## Production Build

```bash
npm run build
```

Outputs to `dist/`:
- `dist/assets/index.js` — Bundled Svelte webview
- `dist/assets/index.css` — Styles
- `dist/extension.cjs` — Extension host (CommonJS for VS Code)

---

## Key Files

| File | Purpose |
|---|---|
| `src/extension.ts` | Extension entry point, registers sidebar + panel |
| `src/main.ts` | Svelte app entry (mounts `Workspace.svelte`) |
| `src/Workspace.svelte` | Root UI component |
| `vite.config.ts` | Vite config for webview build |
| `package.json` | Scripts + VS Code contribution points |
| `.vscode/launch.json` | Debug launch configs |
| `.vscode/tasks.json` | Pre-launch tasks |

---

## Troubleshooting

**Sidebar is blank**
→ Make sure `npm run dev` is running **before** launching the extension dev host.

**Changes not reflecting**
→ Svelte files: check Vite is running at `:5173`. `extension.ts`: wait for esbuild rebuild, then reload window.

**`antigravity` not found**
→ Binary is at `C:\Users\Gellish\AppData\Local\Programs\Antigravity\bin\` — ensure it's on your PATH.
