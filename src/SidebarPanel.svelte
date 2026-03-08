<script lang="ts">
    // @ts-ignore — vscode API injected in webview
    const vscode = (window as any).acquireVsCodeApi?.() ?? null;

    let activeTab: 'layers' | 'components' = 'layers';
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
                { type: 'Navbar', icon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="11" rx="2"/></svg>', label: 'Navbar' },
                { type: 'Hero', icon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7"/></svg>', label: 'Hero' },
                { type: 'Footer', icon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg>', label: 'Footer' },
            ],
        },
        {
            title: 'Elements',
            items: [
                { type: 'Button', icon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M8 12h8"/></svg>', label: 'Button' },
                { type: 'Text', icon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>', label: 'Text' },
                { type: 'Card', icon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>', label: 'Card' },
                { type: 'Image', icon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>', label: 'Image' },
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
        <button class="tab-btn" class:active={activeTab === 'layers'} onclick={() => activeTab = 'layers'}>Layers</button>
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
        {:else if activeTab === 'layers'}
            <div class="navigator-tree">
                {#if nodes.length === 0}
                    <div class="empty-state">No elements on canvas</div>
                {:else}
                    <!-- Fake structure defs -->
                    {#snippet fakeChild(type: string, depth: number, children: any[] = [])}
                        <div class="tree-node fake-node" style="padding-left: {12 + depth * 14}px">
                            <span class="tree-chevron"></span>
                            <span class="node-icon svg-wrapper">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-opacity="0.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
                            </span>
                            <span class="node-name" style="opacity:0.6">{type}</span>
                        </div>
                        {#each children as c}
                            {@render fakeChild(c.type, depth + 1, c.children || [])}
                        {/each}
                    {/snippet}

                    {#snippet treeNode(node: any, depth: number)}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="tree-node" style="padding-left: {12 + depth * 14}px" class:selected={selectedIds.includes(node.id)} onclick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}>
                            <span class="tree-chevron" class:has-children={true}>
                                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" opacity="0.4"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                            </span>
                            <span class="node-icon svg-wrapper main-icon">
                                {@html groups.flatMap(g => g.items).find(i => i.type === node.type)?.icon || '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'}
                            </span>
                            <span class="node-name">{node.type}</span>
                        </div>
                        
                        {#if node.type === 'Navbar'}
                            {@render fakeChild('Header', depth + 1, [
                                { type: 'Container', children: [
                                    { type: 'Wrapper', children: [
                                        { type: 'Brand (Text)' },
                                        { type: 'Navigation' }
                                    ]}
                                ]}
                            ])}
                        {/if}
                        {#if node.type === 'Hero'}
                            {@render fakeChild('Section', depth + 1, [
                                { type: 'Container', children: [
                                    { type: 'Flex', children: [
                                        { type: 'Heading (H1)' },
                                        { type: 'Paragraph (p)' },
                                        { type: 'Button Group' }
                                    ]}
                                ]}
                            ])}
                        {/if}
                        {#if node.type === 'Card'}
                            {@render fakeChild('div.card', depth + 1, [
                                { type: 'div.card-header' },
                                { type: 'div.card-body' }
                            ])}
                        {/if}

                        {#each nodes.filter(n => n.parentId === node.id) as child}
                            {@render treeNode(child, depth + 1)}
                        {/each}
                    {/snippet}

                    <!-- Group everything under a virtual "Page" node to match standard builders -->
                    <div class="tree-node root-node">
                        <span class="tree-chevron has-children">
                             <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" opacity="0.4"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                        </span>
                        <span class="node-icon svg-wrapper"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                        <span class="node-name">Page</span>
                    </div>
                    {#each nodes.filter(n => !n.parentId) as node}
                        {@render treeNode(node, 1)}
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
        color: #fff;
        font-weight: 600;
    }

    .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 20px;
        background: #141414;
    }

    /* ─── Layers Tree ────────────────────────────────────────── */
    .navigator-tree {
        padding: 4px 0;
    }

    .empty-state {
        padding: 40px 20px;
        text-align: center;
        opacity: 0.4;
        font-size: 11px;
    }

    .tree-node {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 11px;
        transition: background 0.1s;
        height: 28px;
        user-select: none;
    }

    .tree-node:hover {
        background: rgba(255, 255, 255, 0.04);
    }

    .tree-node.selected {
        background: #2b4b7a;
        color: #fff;
    }

    .tree-chevron {
        width: 14px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .tree-node.fake-node .node-name {
        font-style: italic;
    }

    .node-icon {
        display: flex;
        align-items: center;
        width: 16px;
        opacity: 0.7;
    }

    .main-icon {
        color: #8da6ff;
    }

    .node-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
