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
                { type: 'Navbar', icon: '☰', label: 'Navbar' },
                { type: 'Hero', icon: '🏠', label: 'Hero' },
                { type: 'Footer', icon: '▬', label: 'Footer' },
            ],
        },
        {
            title: 'Basic',
            items: [
                { type: 'Button', icon: '🔘', label: 'Button' },
                { type: 'Text', icon: '📝', label: 'Text' },
                { type: 'Card', icon: '🎴', label: 'Card' },
                { type: 'Form', icon: '📋', label: 'Form' },
            ],
        },
        {
            title: 'Media',
            items: [
                { type: 'Image', icon: '🖼️', label: 'Image' },
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
                                <span class="card-icon">{comp.icon}</span>
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
                            <span class="node-icon">
                                {groups.flatMap(g => g.items).find(i => i.type === node.type)?.icon || '📦'}
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

    <div class="sidebar-footer">
        <span class="hint">{activeTab === 'components' ? 'Drag onto canvas or click to add' : 'Layer hierarchy'}</span>
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
        gap: 6px;
        padding: 12px 6px;
        background: var(--vscode-button-secondaryBackground, #2d2d2d);
        border: 1px solid transparent;
        border-radius: 6px;
        color: var(--vscode-button-secondaryForeground, #ccc);
        cursor: grab;
        transition: all 0.15s ease;
        font-family: inherit;
        font-size: inherit;
    }

    .component-card:hover {
        background: var(--vscode-list-hoverBackground, #383838);
        border-color: var(--vscode-focusBorder, #007fd4);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .component-card:active {
        cursor: grabbing;
        transform: scale(0.96);
    }

    .card-icon {
        font-size: 20px;
        line-height: 1;
    }

    .card-label {
        font-size: 10px;
        font-weight: 500;
        opacity: 0.8;
    }

    .sidebar-footer {
        margin-top: auto;
        padding: 12px 14px;
        border-top: 1px solid var(--vscode-panel-border, #333);
    }

    .hint {
        font-size: 10px;
        opacity: 0.4;
        font-style: italic;
    }
</style>
