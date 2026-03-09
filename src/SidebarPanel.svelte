<script lang="ts">
    // @ts-ignore — vscode API injected in webview
    const vscode = (window as any).acquireVsCodeApi?.() ?? null;

    let activeTab: 'navigator' | 'components' = 'components';
    let nodes: any[] = [];
    let selectedIds: string[] = [];

    if (typeof window !== 'undefined') {
        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.command === 'syncNodes') {
                nodes = msg.nodes || [];
                selectedIds = msg.selectedIds || [];
            }
        });
    }

    interface ComponentDef {
        type: string;
        icon: string;
        label: string;
    }

    interface ComponentGroup {
        title: string;
        items: ComponentDef[];
    }

    const groups: ComponentGroup[] = [
        {
            title: 'Layout',
            items: [
                { type: 'Navbar', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>', label: 'Navbar' },
                { type: 'Hero', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>', label: 'Hero' },
                { type: 'Footer', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 15h18"/></svg>', label: 'Footer' },
            ],
        },
        {
            title: 'Basic',
            items: [
                { type: 'Button', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="6" rx="3"/></svg>', label: 'Button' },
                { type: 'Text', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>', label: 'Text' },
                { type: 'Card', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>', label: 'Card' },
                { type: 'Form', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>', label: 'Form' },
            ],
        },
        {
            title: 'Media',
            items: [
                { type: 'Image', icon: '<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>', label: 'Image' },
            ],
        },
    ];

    function handleDragStart(e: DragEvent, type: string) {
        e.dataTransfer?.setData('application/x-component-type', type);
        e.dataTransfer!.effectAllowed = 'copy';
    }

    function handleClick(type: string) {
        // Send message to extension host to relay to canvas
        if (vscode) {
            vscode.postMessage({ command: 'addComponent', type });
        }
    }

    function handleNodeClick(id: string) {
        if (vscode) {
            vscode.postMessage({ command: 'selectNode', id });
        }
    }
</script>

<div class="sidebar-root">
    <div class="sidebar-header">
        <button class="tab-btn" class:active={activeTab === 'navigator'} onclick={() => activeTab = 'navigator'}>Navigator</button>
        <button class="tab-btn" class:active={activeTab === 'components'} onclick={() => activeTab = 'components'}>Components</button>
    </div>

    <div class="sidebar-content">
        {#if activeTab === 'components'}
            {#each groups as group}
                <div class="group">
                    <div class="group-title">{group.title}</div>
                    <div class="component-grid">
                        {#each group.items as comp}
                            <button
                                class="component-card"
                                draggable="true"
                                ondragstart={(e) => handleDragStart(e, comp.type)}
                                onclick={() => handleClick(comp.type)}
                                title="Drag to canvas or click to add"
                            >
                                <span class="card-icon">{@html comp.icon}</span>
                                <span class="card-label">{comp.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        {:else if activeTab === 'navigator'}
            <div class="navigator-tree">
                {#if nodes.length === 0}
                    <div class="empty-state">No elements on canvas</div>
                {:else}
                    {#snippet treeNode(node: any, depth: number)}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="tree-node" style="padding-left: {16 + depth * 12}px" class:selected={selectedIds.includes(node.id)} onclick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}>
                            <span class="node-icon svg-wrapper">
                                {@html groups.flatMap(g => g.items).find(i => i.type === node.type)?.icon || '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'}
                            </span>
                            <span class="node-name">{node.type}</span>
                        </div>
                        {#each nodes.filter(n => n.parentId === node.id) as child}
                            {@render treeNode(child, depth + 1)}
                        {/each}
                    {/snippet}

                    {#each nodes.filter(n => !n.parentId) as node}
                        {@render treeNode(node, 0)}
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background: transparent;
        color: var(--vscode-foreground, #ccc);
        font-family: var(--vscode-font-family, system-ui, sans-serif);
        font-size: var(--vscode-font-size, 13px);
    }

    .sidebar-root {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow-y: auto;
    }

    .sidebar-header {
        display: flex;
        align-items: center;
        border-bottom: 1px solid var(--vscode-panel-border, #333);
        background: var(--vscode-editor-background, #1e1e1e);
    }

    .tab-btn {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--vscode-foreground, #ccc);
        padding: 10px 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        opacity: 0.6;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
    }

    .tab-btn:hover {
        opacity: 0.9;
        background: var(--vscode-list-hoverBackground, #2a2d2e);
    }

    .tab-btn.active {
        opacity: 1;
        border-bottom-color: var(--vscode-focusBorder, #007fd4);
        color: var(--vscode-focusBorder, #007fd4);
        font-weight: 600;
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 20px;
    }

    /* ─── Navigator Tree ────────────────────────────────────────── */
    .navigator-tree {
        padding: 8px 0;
    }

    .empty-state {
        padding: 20px;
        text-align: center;
        opacity: 0.5;
        font-size: 11px;
        font-style: italic;
    }

    .tree-node {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        cursor: pointer;
        font-size: 12px;
        border-left: 2px solid transparent;
        transition: background 0.1s;
    }

    .tree-node:hover {
        background: var(--vscode-list-hoverBackground, #2a2d2e);
    }

    .tree-node.selected {
        background: var(--vscode-list-inactiveSelectionBackground, #37373d);
        border-left-color: var(--vscode-focusBorder, #007fd4);
        color: var(--vscode-list-activeSelectionForeground, #fff);
    }

    .node-icon {
        font-size: 14px;
        opacity: 0.8;
    }

    .node-name {
        font-weight: 500;
    }

    /* ─── Component Grid ────────────────────────────────────────── */
    .group {
        padding: 8px 10px;
    }

    .group-title {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        opacity: 0.5;
        margin-bottom: 8px;
        padding-left: 4px;
    }

    .component-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
    }

    .component-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        color: var(--vscode-foreground, #ececec);
        cursor: grab;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
        font-size: inherit;
    }

    .component-card:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .component-card:active {
        cursor: grabbing;
        transform: translateY(0);
        background: rgba(255, 255, 255, 0.05);
    }

    .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--vscode-foreground, #fff);
        opacity: 0.9;
    }

    .card-label {
        font-size: 10px;
        font-weight: 500;
        opacity: 0.8;
    }


</style>
