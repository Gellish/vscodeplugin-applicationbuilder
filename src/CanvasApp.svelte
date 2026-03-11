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
        DEFAULT_SIZES,
        updateNodeContent,
        type CanvasNode,
        type ActiveTool,
        type CanvasState
    } from './canvasStore';

    import Button from './components/Button.svelte';
    import Hero from './components/Hero.svelte';
    import Navbar from './components/Navbar.svelte';
    import Card from './components/Card.svelte';
    import Image from './components/Image.svelte';
    import Text from './components/Text.svelte';
    import Form from './components/Form.svelte';
    import Footer from './components/Footer.svelte';
    import PropertiesPanel from './PropertiesPanel.svelte';
    import { getVsCodeApi } from './lib/vscode';

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

    const vscode = getVsCodeApi();

    // Send state to extension host whenever nodes change
    $effect(() => {
        if (vscode && $canvasStore) {
            vscode.postMessage({ command: 'syncNodes', nodes: $canvasStore.nodes, selectedIds: $canvasStore.selectedIds });
        }
    });

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
    let showProperties = true;

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
        return { bg: 'transparent', border: 'transparent', icon: '' };
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

    // ─── Auto-layout calculation ─────────────────────────────────────
    function calculatePlacement(state: CanvasState, cx: number, cy: number, compType: string) {
        let finalW = undefined;
        let finalH = undefined;
        let finalX = cx; // center x by default
        let finalY = cy; // center y by default

        for (const frame of DEVICE_FRAMES) {
            // Check if dropped inside this frame
            if (cx >= frame.x && cx <= frame.x + frame.width && cy >= frame.y && cy <= frame.y + frame.height) {
                // Find existing nodes mathematically contained in this frame
                const nodesInFrame = state.nodes.filter(n => {
                    const n_cx = n.x + n.width / 2;
                    return n_cx >= frame.x && n_cx <= frame.x + frame.width;
                }).sort((a, b) => (a.y + a.height) - (b.y + b.height)); // sort by bottom edge

                const size = DEFAULT_SIZES[compType] || { width: 200, height: 120 };
                let h = size.height;
                let w = size.width;

                // Snap blocks to be full-width
                if (['Navbar', 'Hero', 'Footer', 'Card'].includes(compType)) {
                    finalW = frame.width;
                    w = finalW;
                    finalX = frame.x + finalW / 2; // Snap center to frame center
                } else {
                    finalX = frame.x + w / 2; // Snap smaller elements to left 
                }
                
                // Stack vertically to prevent overlap
                let newTopY = frame.y;
                if (nodesInFrame.length > 0) {
                    const lastNode = nodesInFrame[nodesInFrame.length - 1];
                    newTopY = lastNode.y + lastNode.height;
                }
                
                // addNode takes the CENTER point, so the finalY passed to it should be the center
                finalY = newTopY + h / 2;
                break;
            }
        }

        return { finalX, finalY, finalW, finalH };
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
        const possibleParents = state.nodes.filter((n: CanvasNode) => 
            pos.x >= n.x && pos.x <= n.x + n.width &&
            pos.y >= n.y && pos.y <= n.y + n.height
        ).sort((a: CanvasNode, b: CanvasNode) => b.zIndex - a.zIndex);
        
        const parentId = possibleParents.length > 0 ? possibleParents[0].id : undefined;

        const { finalX, finalY, finalW } = calculatePlacement(state, pos.x, pos.y, compType);
        addNode(compType, finalX, finalY, parentId, finalW);
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
                const { finalX, finalY, finalW, finalH } = calculatePlacement(state, cx, cy, msg.type);
                addNode(msg.type, finalX, finalY, parentId, finalW, finalH);
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
        { id: "desktop", name: "Desktop", x: 100, y: 150, width: 1200, height: 900, resolution: "1200px" },
        { id: "tablet", name: "Tablet", x: 1400, y: 150, width: 991, height: 1024, resolution: "991px" },
        { id: "mobile", name: "Mobile", x: 2500, y: 150, width: 375, height: 812, resolution: "375px" },
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

        <div class="toolbar-spacer"></div>

        <div class="toolbar-group">
            <button class="tool-btn" onclick={() => showProperties = !showProperties} title="Toggle Properties" class:active={showProperties}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7v-2zm0 4h10v2H7v-2z"/>
                </svg>
            </button>
            <button class="save-btn">Save</button>
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

            {#snippet renderNode(node: any, offsetX: number, offsetY: number)}
                {@const selected = $canvasStore.selectedIds.includes(node.id)}
                {@const colors = getColor(node.type)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="canvas-node"
                    class:selected
                    style="
                        left: {node.x - offsetX}px;
                        top: {node.y - offsetY}px;
                        width: {node.width}px;
                        height: {node.height}px;
                        z-index: {node.zIndex};
                        background: {colors.bg};
                        border-color: {selected ? '#3b82f6' : colors.border};
                    "
                    onpointerdown={(e) => handleNodePointerDown(e, node)}
                >
                    <!-- Dynamically render the real Svelte component -->
                    <div class="component-wrapper">
                        {#if componentMap[node.type]}
                            <svelte:component this={componentMap[node.type]} {...node.props} />
                        {:else}
                            <div class="preview-generic">
                                <span style="opacity:0.3">{node.type}</span>
                            </div>
                        {/if}
                    </div>

                    <!-- Resize handles (only when selected) -->
                    {#if selected}
                        <div class="selection-overlay">
                            <div class="selection-label">
                                {node.type} • {Math.round(node.width)} × {Math.round(node.height)}
                            </div>
                        </div>
                        {#each HANDLE_KEYS as hk}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="resize-handle handle-{hk}"
                                onpointerdown={(e) => handleResizeStart(e, node.id, hk)}
                            ></div>
                        {/each}
                    {/if}
                </div>
            {/snippet}

            <!-- Device Frames -->
            {#each DEVICE_FRAMES as frame (frame.id)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="device-label-group" style="left: {frame.x + 8}px; top: {frame.y - 40}px;">
                    <span class="device-icon">
                        {#if frame.id === 'desktop'}<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 18H4v-1h16v1zm1-15v12H3V3h18zm-1 1H4v10h16V4z"/></svg>{/if}
                        {#if frame.id === 'tablet'}<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 18H7V4h10v14zm0-16H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>{/if}
                        {#if frame.id === 'mobile'}<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 19H7V5h10v14zm0-16H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>{/if}
                    </span>
                    <span class="device-name">{frame.name}</span>
                    <span class="device-resolution">{frame.resolution}</span>
                </div>
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="device-frame" style="left: {frame.x}px; top: {frame.y}px; width: {frame.width}px; height: {frame.height}px;">
                    {#each $canvasStore.nodes.sort((a, b) => a.zIndex - b.zIndex) as node(node.id)}
                        {@const cx = node.x + node.width / 2}
                        {#if cx >= frame.x && cx < frame.x + frame.width}
                            {@render renderNode(node, frame.x, frame.y)}
                        {/if}
                    {/each}
                </div>
            {/each}

            <!-- Nodes outside any frame -->
            {#each $canvasStore.nodes.sort((a, b) => a.zIndex - b.zIndex) as node(node.id)}
                {@const cx = node.x + node.width / 2}
                {@const inFrame = DEVICE_FRAMES.find(f => cx >= f.x && cx < f.x + f.width)}
                {#if !inFrame}
                    {@render renderNode(node, 0, 0)}
                {/if}
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
    {#if showProperties}
        <div class="properties-container">
            <PropertiesPanel />
        </div>
    {/if}
</div>

<style>
    /* ─── Global ─────────────────────────────────────────── */
    :global(body) {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000;
        color: #ddd;
        font-family: var(--vscode-font-family, system-ui, sans-serif);
        font-size: 13px;
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
        background: #0a0a0a;
    }

    /* ─── Toolbar ─────────────────────────────────────────── */
    .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 16px;
        background: #111;
        border-bottom: 1px solid #222;
        z-index: 1000;
        height: 48px;
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .toolbar-divider {
        width: 1px;
        height: 20px;
        background: #333;
        margin: 0 8px;
    }

    .toolbar-spacer {
        flex: 1;
    }

    .tool-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 32px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
    }

    .tool-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
    }

    .tool-btn.active {
        background: #2b4b7a;
        color: #fff;
    }

    .zoom-label {
        font-size: 11px;
        font-weight: 600;
        min-width: 40px;
        text-align: center;
        color: #888;
    }

    .save-btn {
        background: #2b4b7a;
        color: #fff;
        border: none;
        padding: 6px 16px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .save-btn:hover {
        background: #355ea0;
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
            radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 24px 24px;
        pointer-events: none;
    }

    /* ─── Device Frames ───────────────────────────────────── */
    .device-frame {
        position: absolute;
        background: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 10px 60px rgba(0, 0, 0, 0.6);
        pointer-events: auto;
        overflow: hidden;
        border-radius: 4px;
    }

    .device-label-group {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
        pointer-events: none;
        user-select: none;
        background: rgba(30,30,30, 0.95);
        padding: 5px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
    }

    .device-icon {
        display: flex;
        align-items: center;
        opacity: 0.6;
    }

    .device-name {
        font-size: 12px;
        font-weight: 700;
        color: #fff;
    }

    .device-resolution {
        font-size: 10px;
        opacity: 0.4;
        font-weight: 400;
    }

    /* ─── Selection Overlay ────────────────────────────────── */
    .selection-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .selection-label {
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        background: #2b4b7a;
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    /* ─── Canvas Node ─────────────────────────────────────── */
    .canvas-node {
        position: absolute;
        pointer-events: auto;
        border: 2px solid transparent;
        cursor: move;
        transition: border-color 0.1s;
    }

    .canvas-node:hover {
        border-color: rgba(59, 130, 246, 0.3);
    }

    .canvas-node.selected {
        border-color: #2563eb;
    }

    /* ─── Resize Handles ──────────────────────────────────── */
    .resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #fff;
        border: 2px solid #2563eb;
        border-radius: 50%;
        z-index: 10;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2);
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
        background: rgba(59, 130, 246, 0.05);
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
        background: #1e1e1e;
        border: 2px dashed #2b4b7a;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 500;
        color: #ddd;
    }

    .drop-icon {
        font-size: 24px;
        font-weight: bold;
        color: #2b4b7a;
    }

    /* ─── Properties Panel ────────────────────────────────── */
    .properties-panel {
        width: 300px;
        flex-shrink: 0;
        background: #111;
        border-left: 1px solid #222;
        display: flex;
        flex-direction: column;
        color: #ddd;
    }

    .properties-header {
        height: 48px;
        border-bottom: 1px solid #222;
        display: flex;
        align-items: center;
        padding: 0 12px;
    }

    .prop-section-header {
        padding: 12px 14px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        color: #444;
        letter-spacing: 1px;
    }

    .empty-properties {
        padding: 80px 20px;
        text-align: center;
        color: #444;
        font-size: 12px;
    }

    .context-menu {
        position: fixed;
        z-index: 10000;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 6px;
        min-width: 200px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8);
    }

    .ctx-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.1s;
    }

    .ctx-item:hover {
        background: #2b4b7a;
        color: #fff;
    }

    .ctx-item.danger {
        color: #ef4444;
    }
    .ctx-item.danger:hover {
        background: #ef4444;
        color: #fff;
    }

    .ctx-item kbd {
        font-size: 10px;
        opacity: 0.5;
        font-family: inherit;
        background: rgba(255,255,255,0.05);
        padding: 1px 4px;
        border-radius: 4px;
    }

    .ctx-divider {
        height: 1px;
        background: #222;
        margin: 6px 8px;
    }
</style>
