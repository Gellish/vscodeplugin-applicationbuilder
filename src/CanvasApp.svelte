<script lang="ts">
    import {
        canvasStore,
        addNode,
        removeNodes,
        moveSelectedNodes,
        resizeNode,
        selectNode,
        clearSelection,
        setTool,
        setZoom,
        setPan,
        bringToFront,
        sendToBack,
        duplicateNodes,
        type CanvasNode,
        type ActiveTool,
    } from './canvasStore';

    import Button from './components/Button.svelte';
    import Hero from './components/Hero.svelte';
    import Navbar from './components/Navbar.svelte';
    import Card from './components/Card.svelte';
    import Image from './components/Image.svelte';
    import Text from './components/Text.svelte';
    import Form from './components/Form.svelte';
    import Footer from './components/Footer.svelte';

    const componentMap: Record<string, any> = {
        Button,
        Hero,
        Navbar,
        Card,
        Image,
        Text,
        Form,
        Footer
    };

    // @ts-ignore — vscode API injected in webview
    const vscode = (window as any).acquireVsCodeApi?.() ?? null;

    // Send state to extension host whenever nodes change
    $: if (vscode && $canvasStore) {
        vscode.postMessage({ command: 'syncNodes', nodes: $canvasStore.nodes, selectedIds: $canvasStore.selectedIds });
    }

    // ─── Local interaction state ─────────────────────────────────────
    let isPanning = false;
    let isDragging = false;
    let isResizing = false;
    let spaceHeld = false;
    let lastPointer = { x: 0, y: 0 };
    let dragStartPositions: Map<string, { x: number; y: number }> = new Map();
    let resizeHandle = '';
    let resizeNodeId = '';
    let resizeStartRect = { x: 0, y: 0, w: 0, h: 0 };
    let resizeStartPointer = { x: 0, y: 0 };
    let contextMenu = { visible: false, x: 0, y: 0, nodeId: '' };
    let isDragOver = false;

    let canvasEl: HTMLDivElement;

    // Component visuals
    const COMPONENT_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
        Hero:   { bg: '#1a1a2e', border: '#533483', icon: '🏠' },
        Navbar: { bg: '#16213e', border: '#0f3460', icon: '☰' },
        Button: { bg: '#1b262c', border: '#3282b8', icon: '🔘' },
        Image:  { bg: '#2d132c', border: '#c72c41', icon: '🖼️' },
        Card:   { bg: '#1a1a2e', border: '#e94560', icon: '🎴' },
        Text:   { bg: '#222831', border: '#30475e', icon: '📝' },
        Form:   { bg: '#2c2c54', border: '#474787', icon: '📋' },
        Footer: { bg: '#1b1b2f', border: '#1f4068', icon: '▬' },
    };

    function getColor(type: string) {
        return COMPONENT_COLORS[type] || { bg: '#2a2a2a', border: '#555', icon: '📦' };
    }

    // ─── Coordinate helpers ──────────────────────────────────────────
    function screenToCanvas(sx: number, sy: number, state: typeof $canvasStore) {
        const rect = canvasEl?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (sx - rect.left - state.panX) / state.zoom,
            y: (sy - rect.top - state.panY) / state.zoom,
        };
    }

    // ─── Zoom ────────────────────────────────────────────────────────
    function handleWheel(e: WheelEvent) {
        e.preventDefault();
        const state = $canvasStore;
        const rect = canvasEl.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.min(4, Math.max(0.1, state.zoom * factor));
        const ratio = newZoom / state.zoom;

        setPan(mx - ratio * (mx - state.panX), my - ratio * (my - state.panY));
        setZoom(newZoom);
    }

    // ─── Pointer events ─────────────────────────────────────────────
    function handlePointerDown(e: PointerEvent) {
        if (contextMenu.visible) {
            contextMenu = { ...contextMenu, visible: false };
            return;
        }

        const state = $canvasStore;

        // Middle mouse or space held = pan
        if (e.button === 1 || (e.button === 0 && (spaceHeld || state.activeTool === 'hand'))) {
            isPanning = true;
            lastPointer = { x: e.clientX, y: e.clientY };
            (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
            e.preventDefault();
            return;
        }

        // Left click on empty canvas = clear selection
        if (e.button === 0) {
            const target = e.target as HTMLElement;
            if (target === canvasEl || target.classList.contains('canvas-grid')) {
                clearSelection();
            }
        }
    }

    function handlePointerMove(e: PointerEvent) {
        if (isPanning) {
            const dx = e.clientX - lastPointer.x;
            const dy = e.clientY - lastPointer.y;
            const state = $canvasStore;
            setPan(state.panX + dx, state.panY + dy);
            lastPointer = { x: e.clientX, y: e.clientY };
            return;
        }

        if (isDragging) {
            const state = $canvasStore;
            const dx = (e.clientX - lastPointer.x) / state.zoom;
            const dy = (e.clientY - lastPointer.y) / state.zoom;
            moveSelectedNodes(dx, dy);
            lastPointer = { x: e.clientX, y: e.clientY };
            return;
        }

        if (isResizing) {
            handleResizeMove(e);
            return;
        }
    }

    function handlePointerUp(e: PointerEvent) {
        isPanning = false;
        isDragging = false;
        isResizing = false;
    }

    // ─── Node interaction ────────────────────────────────────────────
    function handleNodePointerDown(e: PointerEvent, node: CanvasNode) {
        if (e.button !== 0) return;
        if (spaceHeld || $canvasStore.activeTool === 'hand') return;

        e.stopPropagation();
        selectNode(node.id, e.shiftKey);

        isDragging = true;
        lastPointer = { x: e.clientX, y: e.clientY };

        // Store start positions for undo
        const state = $canvasStore;
        dragStartPositions.clear();
        for (const id of state.selectedIds) {
            const n = state.nodes.find(nn => nn.id === id);
            if (n) dragStartPositions.set(id, { x: n.x, y: n.y });
        }
    }

    // ─── Resize handles ──────────────────────────────────────────────
    function handleResizeStart(e: PointerEvent, nodeId: string, handle: string) {
        e.stopPropagation();
        e.preventDefault();
        isResizing = true;
        resizeHandle = handle;
        resizeNodeId = nodeId;
        resizeStartPointer = { x: e.clientX, y: e.clientY };
        const node = $canvasStore.nodes.find(n => n.id === nodeId);
        if (node) {
            resizeStartRect = { x: node.x, y: node.y, w: node.width, h: node.height };
        }
    }

    function handleResizeMove(e: PointerEvent) {
        const zoom = $canvasStore.zoom;
        const dx = (e.clientX - resizeStartPointer.x) / zoom;
        const dy = (e.clientY - resizeStartPointer.y) / zoom;

        let { x, y, w, h } = resizeStartRect;

        if (resizeHandle.includes('r')) { w += dx; }
        if (resizeHandle.includes('l')) { x += dx; w -= dx; }
        if (resizeHandle.includes('b')) { h += dy; }
        if (resizeHandle.includes('t')) { y += dy; h -= dy; }

        resizeNode(resizeNodeId, x, y, Math.max(40, w), Math.max(24, h));
    }

    // ─── Keyboard ────────────────────────────────────────────────────
    function handleKeyDown(e: KeyboardEvent) {
        if (e.code === 'Space' && !spaceHeld) {
            spaceHeld = true;
            e.preventDefault();
        }
        if (e.code === 'Delete' || e.code === 'Backspace') {
            const state = $canvasStore;
            if (state.selectedIds.length > 0) {
                removeNodes(state.selectedIds);
            }
        }
        if (e.key === 'v' || e.key === 'V') setTool('select');
        if (e.key === 'h' || e.key === 'H') setTool('hand');
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            const state = $canvasStore;
            if (state.selectedIds.length > 0) {
                duplicateNodes(state.selectedIds);
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            setZoom(1);
            setPan(0, 0);
        }
    }

    function handleKeyUp(e: KeyboardEvent) {
        if (e.code === 'Space') spaceHeld = false;
    }

    // ─── Drag & drop from sidebar ────────────────────────────────────
    function handleDragOver(e: DragEvent) {
        if (e.dataTransfer?.types.includes('application/x-component-type')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            isDragOver = true;
        }
    }

    function handleDragLeave() {
        isDragOver = false;
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        isDragOver = false;
        const compType = e.dataTransfer?.getData('application/x-component-type');
        if (!compType) return;

        const state = $canvasStore;
        const pos = screenToCanvas(e.clientX, e.clientY, state);

        // Find potential parent (highest z-index node containing this point)
        const possibleParents = state.nodes.filter(n => 
            pos.x >= n.x && pos.x <= n.x + n.width &&
            pos.y >= n.y && pos.y <= n.y + n.height
        ).sort((a, b) => b.zIndex - a.zIndex);
        
        const parentId = possibleParents.length > 0 ? possibleParents[0].id : undefined;

        addNode(compType, pos.x, pos.y, parentId);
    }

    // ─── Context menu ────────────────────────────────────────────────
    function handleContextMenu(e: MouseEvent) {
        e.preventDefault();
        const state = $canvasStore;
        if (state.selectedIds.length > 0) {
            contextMenu = {
                visible: true,
                x: e.clientX,
                y: e.clientY,
                nodeId: state.selectedIds[0],
            };
        }
    }

    function ctxAction(action: string) {
        const state = $canvasStore;
        switch (action) {
            case 'delete': removeNodes(state.selectedIds); break;
            case 'duplicate': duplicateNodes(state.selectedIds); break;
            case 'front': if (contextMenu.nodeId) bringToFront(contextMenu.nodeId); break;
            case 'back': if (contextMenu.nodeId) sendToBack(contextMenu.nodeId); break;
        }
        contextMenu = { ...contextMenu, visible: false };
    }

    // ─── Listen for messages from extension host ─────────────────────
    if (typeof window !== 'undefined') {
        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.command === 'addComponent' && msg.type) {
                const state = $canvasStore;
                let parentId = state.selectedIds.length > 0 ? state.selectedIds[0] : undefined;
                
                let cx, cy;
                if (parentId) {
                    const parent = state.nodes.find(n => n.id === parentId);
                    if (parent) {
                        cx = parent.x + 20;
                        cy = parent.y + 20;
                    }
                }
                
                if (cx === undefined || cy === undefined) {
                    const rect = canvasEl?.getBoundingClientRect();
                    if (rect) {
                        cx = (rect.width / 2 - state.panX) / state.zoom;
                        cy = (rect.height / 2 - state.panY) / state.zoom;
                    } else {
                        cx = 100;
                        cy = 100;
                    }
                }
                addNode(msg.type, cx, cy, parentId);
            } else if (msg.command === 'selectNode' && msg.id) {
                selectNode(msg.id, false);
            }
        });
    }

    // Handle zoom buttons
    function zoomIn() { setZoom($canvasStore.zoom * 1.2); }
    function zoomOut() { setZoom($canvasStore.zoom / 1.2); }
    function zoomReset() { setZoom(1); setPan(0, 0); }

    function updateNodeProp(node: CanvasNode, prop: 'x' | 'y' | 'w' | 'h', value: string) {
        const num = parseFloat(value);
        if (isNaN(num)) return;
        
        let { x, y, width, height } = node;
        if (prop === 'x') x = num;
        if (prop === 'y') y = num;
        if (prop === 'w') width = num;
        if (prop === 'h') height = num;
        
        resizeNode(node.id, x, y, width, height);
    }

    const HANDLE_KEYS = ['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'];

    // ─── Device Frames ───────────────────────────────────────────────
    const DEVICE_FRAMES = [
        { id: "desktop", name: "Desktop", x: 100, y: 100, width: 1000, height: 800 },
        { id: "tablet", name: "Tablet", x: 1200, y: 100, width: 768, height: 1024 },
        { id: "mobile", name: "Mobile", x: 2068, y: 100, width: 375, height: 812 },
    ];
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div class="app-container">
    <div class="canvas-root">
        <!-- Toolbar -->
        <div class="toolbar">
        <div class="toolbar-group">
            <button
                class="tool-btn"
                class:active={$canvasStore.activeTool === 'select'}
                onclick={() => setTool('select')}
                title="Select (V)"
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M5 3l14 9-6.5 1.5L11 20l-2-5.5L3 13z" />
                </svg>
            </button>
            <button
                class="tool-btn"
                class:active={$canvasStore.activeTool === 'hand'}
                onclick={() => setTool('hand')}
                title="Hand / Pan (H)"
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M10 2a1.5 1.5 0 0 1 1.5 1.5v7a.5.5 0 0 0 1 0v-8a1.5 1.5 0 0 1 3 0v8a.5.5 0 0 0 1 0v-6a1.5 1.5 0 0 1 3 0v9.5a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7V8.5a1.5 1.5 0 0 1 3 0v2a.5.5 0 0 0 1 0v-7a1.5 1.5 0 0 1 1.5-1.5z"/>
                </svg>
            </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
            <button class="tool-btn" onclick={zoomOut} title="Zoom Out">−</button>
            <span class="zoom-label">{Math.round($canvasStore.zoom * 100)}%</span>
            <button class="tool-btn" onclick={zoomIn} title="Zoom In">+</button>
            <button class="tool-btn text-btn" onclick={zoomReset} title="Reset Zoom (Ctrl+0)">Fit</button>
        </div>

        <div class="toolbar-spacer"></div>

        <div class="toolbar-group">
            <span class="node-count">{$canvasStore.nodes.length} element{$canvasStore.nodes.length !== 1 ? 's' : ''}</span>
        </div>
    </div>

    <!-- Canvas -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="canvas-viewport"
        class:panning={isPanning || spaceHeld || $canvasStore.activeTool === 'hand'}
        class:drag-over={isDragOver}
        bind:this={canvasEl}
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
        onwheel={handleWheel}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        oncontextmenu={handleContextMenu}
    >
        <div
            class="canvas-transform"
            style="transform: translate({$canvasStore.panX}px, {$canvasStore.panY}px) scale({$canvasStore.zoom})"
        >
            <!-- Grid -->
            <div class="canvas-grid"></div>

            <!-- Device Frames -->
            {#each DEVICE_FRAMES as frame (frame.id)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="device-frame" style="left: {frame.x}px; top: {frame.y}px; width: {frame.width}px; height: {frame.height}px;">
                    <div class="device-label">{frame.name}</div>
                </div>
            {/each}

            <!-- Nodes -->
            {#each $canvasStore.nodes.sort((a, b) => a.zIndex - b.zIndex) as node (node.id)}
                {@const selected = $canvasStore.selectedIds.includes(node.id)}
                {@const colors = getColor(node.type)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="canvas-node"
                    class:selected
                    style="
                        left: {node.x}px;
                        top: {node.y}px;
                        width: {node.width}px;
                        height: {node.height}px;
                        z-index: {node.zIndex};
                        background: {colors.bg};
                        border-color: {selected ? '#3b82f6' : colors.border};
                    "
                    onpointerdown={(e) => handleNodePointerDown(e, node)}
                >
                    <div class="node-header" style="border-bottom-color: {colors.border}">
                        <span class="node-icon">{colors.icon}</span>
                        <span class="node-type">{node.type}</span>
                        <span class="node-size">{Math.round(node.width)}×{Math.round(node.height)}</span>
                    </div>
                    <div class="node-body">
                        <div class="node-preview" style="border-color: {colors.border}30">
                            <!-- Dynamically render the real Svelte component -->
                            {#if componentMap[node.type]}
                                <svelte:component this={componentMap[node.type]} />
                            {:else}
                                <div class="preview-generic">
                                    <span style="opacity:0.3">{node.type}</span>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Resize handles (only when selected) -->
                    {#if selected}
                        {#each HANDLE_KEYS as hk}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="resize-handle handle-{hk}"
                                onpointerdown={(e) => handleResizeStart(e, node.id, hk)}
                            ></div>
                        {/each}
                    {/if}
                </div>
            {/each}
        </div>

        <!-- Drop overlay -->
        {#if isDragOver}
            <div class="drop-overlay">
                <div class="drop-text">
                    <span class="drop-icon">+</span>
                    <span>Drop to add component</span>
                </div>
            </div>
        {/if}
    </div>

    <!-- Context Menu -->
    {#if contextMenu.visible}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="context-menu" style="left: {contextMenu.x}px; top: {contextMenu.y}px">
            <button class="ctx-item" onclick={() => ctxAction('duplicate')}>
                <span>Duplicate</span><kbd>Ctrl+D</kbd>
            </button>
            <div class="ctx-divider"></div>
            <button class="ctx-item" onclick={() => ctxAction('front')}>Bring to Front</button>
            <button class="ctx-item" onclick={() => ctxAction('back')}>Send to Back</button>
            <div class="ctx-divider"></div>
            <button class="ctx-item danger" onclick={() => ctxAction('delete')}>
                <span>Delete</span><kbd>Del</kbd>
            </button>
        </div>
    {/if}
</div>

<!-- Properties Panel (Secondary Sidebar) -->
    <div class="properties-panel">
        <div class="properties-header">
            <span>Design</span>
        </div>
        <div class="properties-body">
            {#if $canvasStore.selectedIds.length === 0}
                <div class="empty-properties">No selection</div>
            {:else if $canvasStore.selectedIds.length === 1}
                {@const node = $canvasStore.nodes.find(n => n.id === $canvasStore.selectedIds[0])}
                {#if node}
                    <div class="prop-group">
                        <div class="prop-group-title">Layout</div>
                        <div class="prop-row">
                            <div class="prop-field">
                                <label>X</label>
                                <input type="number" value={Math.round(node.x)} onchange={(e) => updateNodeProp(node, 'x', e.currentTarget.value)} />
                            </div>
                            <div class="prop-field">
                                <label>Y</label>
                                <input type="number" value={Math.round(node.y)} onchange={(e) => updateNodeProp(node, 'y', e.currentTarget.value)} />
                            </div>
                        </div>
                        <div class="prop-row">
                            <div class="prop-field">
                                <label>W</label>
                                <input type="number" value={Math.round(node.width)} onchange={(e) => updateNodeProp(node, 'w', e.currentTarget.value)} />
                            </div>
                            <div class="prop-field">
                                <label>H</label>
                                <input type="number" value={Math.round(node.height)} onchange={(e) => updateNodeProp(node, 'h', e.currentTarget.value)} />
                            </div>
                        </div>
                    </div>
                {/if}
            {:else}
                <div class="mixed-properties">Multiple selected</div>
            {/if}
        </div>
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: var(--vscode-editor-background, #1e1e1e);
        color: var(--vscode-editor-foreground, #ccc);
        font-family: var(--vscode-font-family, system-ui, sans-serif);
        font-size: var(--vscode-font-size, 13px);
    }
    :global(*) {
        box-sizing: border-box;
    }

    .app-container {
        display: flex;
        flex-direction: row;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
    }

    .canvas-root {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
    }

    /* ─── Toolbar ─────────────────────────────────────────── */
    .toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: var(--vscode-titleBar-activeBackground, #2d2d2d);
        border-bottom: 1px solid var(--vscode-panel-border, #393939);
        z-index: 1000;
        min-height: 40px;
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .toolbar-divider {
        width: 1px;
        height: 20px;
        background: var(--vscode-panel-border, #444);
        margin: 0 8px;
    }

    .toolbar-spacer {
        flex: 1;
    }

    .tool-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 28px;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: var(--vscode-foreground, #ccc);
        cursor: pointer;
        font-size: 16px;
        transition: all 0.1s;
    }

    .tool-btn:hover {
        background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    .tool-btn.active {
        background: var(--vscode-button-background, #0078d4);
        color: var(--vscode-button-foreground, #fff);
    }

    .text-btn {
        width: auto;
        padding: 0 8px;
        font-size: 11px;
    }

    .zoom-label {
        font-size: 11px;
        min-width: 40px;
        text-align: center;
        opacity: 0.7;
        user-select: none;
    }

    .node-count {
        font-size: 11px;
        opacity: 0.5;
        user-select: none;
    }

    /* ─── Canvas Viewport ─────────────────────────────────── */
    .canvas-viewport {
        flex: 1;
        position: relative;
        overflow: hidden;
        cursor: default;
    }

    .canvas-viewport.panning {
        cursor: grab;
    }

    .canvas-viewport.drag-over {
        outline: 2px dashed #3b82f6;
        outline-offset: -2px;
    }

    .canvas-transform {
        transform-origin: 0 0;
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
    }

    /* ─── Grid background ─────────────────────────────────── */
    .canvas-grid {
        position: fixed;
        top: -50000px;
        left: -50000px;
        width: 200000px;
        height: 200000px;
        background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
        background-size: 20px 20px;
        pointer-events: none;
    }

    /* ─── Device Frames ───────────────────────────────────── */
    .device-frame {
        position: absolute;
        background: #ffffff;
        border: 1px solid var(--vscode-panel-border, #444);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        pointer-events: none;
        overflow: hidden;
    }

    .device-label {
        position: absolute;
        top: -26px;
        left: 0;
        font-size: 14px;
        font-size: 14px;
        font-weight: 600;
        color: var(--vscode-descriptionForeground, #888);
        pointer-events: auto;
    }

    /* ─── Properties Panel ────────────────────────────────── */
    .properties-panel {
        width: 240px;
        flex-shrink: 0;
        background: var(--vscode-sideBar-background, #252526);
        border-left: 1px solid var(--vscode-panel-border, #393939);
        display: flex;
        flex-direction: column;
    }

    .properties-header {
        height: 40px;
        border-bottom: 1px solid var(--vscode-panel-border, #393939);
        display: flex;
        align-items: center;
        padding: 0 12px;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        opacity: 0.8;
    }

    .properties-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
    }

    .empty-properties, .mixed-properties {
        font-size: 12px;
        opacity: 0.5;
        text-align: center;
        padding-top: 20px;
    }

    .prop-group {
        margin-bottom: 16px;
    }

    .prop-group-title {
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 8px;
        opacity: 0.8;
    }

    .prop-row {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
    }

    .prop-field {
        display: flex;
        align-items: center;
        background: var(--vscode-input-background, #3c3c3c);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 3px;
        padding: 2px 6px;
        flex: 1;
    }

    .prop-field label {
        font-size: 10px;
        opacity: 0.6;
        width: 16px;
        user-select: none;
    }

    .prop-field input {
        background: transparent;
        border: none;
        color: var(--vscode-input-foreground, #ccc);
        font-family: inherit;
        font-size: 11px;
        width: 100%;
        outline: none;
    }

    /* ─── Canvas Node ─────────────────────────────────────── */
    .canvas-node {
        position: absolute;
        border: 2px solid;
        border-radius: 6px;
        cursor: move;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: box-shadow 0.15s;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .canvas-node:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }

    .canvas-node.selected {
        box-shadow: 0 0 0 1px #3b82f6, 0 4px 20px rgba(59, 130, 246, 0.3);
    }

    .node-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-bottom: 1px solid;
        font-size: 11px;
        font-weight: 600;
        user-select: none;
        flex-shrink: 0;
    }

    .node-icon {
        font-size: 12px;
    }

    .node-type {
        flex: 1;
    }

    .node-size {
        font-size: 9px;
        opacity: 0.5;
        font-weight: 400;
    }

    .node-body {
        flex: 1;
        padding: 10px;
        display: flex;
        overflow: hidden;
    }

    .node-preview {
        flex: 1;
        border: 1px dashed;
        border-radius: 4px;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }



    /* ─── Resize Handles ──────────────────────────────────── */
    .resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #3b82f6;
        border: 2px solid #1d4ed8;
        border-radius: 2px;
        z-index: 10;
    }

    .handle-tl { top: -5px; left: -5px; cursor: nwse-resize; }
    .handle-t  { top: -5px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-tr { top: -5px; right: -5px; cursor: nesw-resize; }
    .handle-r  { top: calc(50% - 5px); right: -5px; cursor: ew-resize; }
    .handle-br { bottom: -5px; right: -5px; cursor: nwse-resize; }
    .handle-b  { bottom: -5px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-bl { bottom: -5px; left: -5px; cursor: nesw-resize; }
    .handle-l  { top: calc(50% - 5px); left: -5px; cursor: ew-resize; }

    /* ─── Drop Overlay ────────────────────────────────────── */
    .drop-overlay {
        position: absolute;
        inset: 0;
        background: rgba(59, 130, 246, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 999;
    }

    .drop-text {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 32px;
        background: rgba(59, 130, 246, 0.15);
        border: 2px dashed #3b82f6;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 500;
        color: #93c5fd;
    }

    .drop-icon {
        font-size: 24px;
        font-weight: bold;
    }

    /* ─── Empty State ─────────────────────────────────────── */
    .empty-state {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        pointer-events: none;
        user-select: none;
    }

    .empty-icon {
        font-size: 48px;
        opacity: 0.5;
    }

    .empty-title {
        font-size: 20px;
        font-weight: 600;
        opacity: 0.4;
    }

    .empty-desc {
        font-size: 13px;
        opacity: 0.3;
    }

    .empty-shortcuts {
        display: flex;
        gap: 16px;
        margin-top: 12px;
        font-size: 11px;
        opacity: 0.25;
    }

    .empty-shortcuts kbd {
        display: inline-block;
        padding: 2px 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        font-family: inherit;
        font-size: 10px;
        margin-right: 4px;
    }

    /* ─── Context Menu ────────────────────────────────────── */
    .context-menu {
        position: fixed;
        z-index: 10000;
        background: var(--vscode-menu-background, #2d2d2d);
        border: 1px solid var(--vscode-menu-border, #454545);
        border-radius: 6px;
        padding: 4px;
        min-width: 180px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .ctx-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--vscode-menu-foreground, #ccc);
        font-size: 12px;
        cursor: pointer;
        font-family: inherit;
    }

    .ctx-item:hover {
        background: var(--vscode-list-hoverBackground, #3a3a3a);
    }

    .ctx-item.danger {
        color: #f87171;
    }

    .ctx-item kbd {
        font-size: 10px;
        opacity: 0.5;
        font-family: inherit;
    }

    .ctx-divider {
        height: 1px;
        background: var(--vscode-menu-separatorBackground, #404040);
        margin: 4px 8px;
    }
</style>
