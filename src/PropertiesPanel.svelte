<script lang="ts">
    import { canvasStore, updateNodeContent, updateNodeProp, duplicateNodes, removeNodes } from './canvasStore';

    let { standalone = false } = $props();

    function handleDuplicate(id: string) {
        duplicateNodes([id]);
    }

    function handleDelete(id: string) {
       removeNodes([id]);
    }
</script>

<div class="properties-panel" class:standalone>
    <div class="properties-header">
        <div class="header-tabs">
            <span class="active">Design</span>
            <span>Interaction</span>
            <span>Settings</span>
        </div>
    </div>
    <div class="properties-body">
        {#if $canvasStore.selectedIds.length === 0}
            <div class="empty-properties">
                <div class="empty-icon"><svg viewBox="0 0 24 24" width="24" height="24" opacity="0.2" stroke="currentColor" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>
                No selection
            </div>
        {:else if $canvasStore.selectedIds.length === 1}
            {@const node = $canvasStore.nodes.find(n => n.id === $canvasStore.selectedIds[0])}
            {#if node}
                <div class="node-meta-row">
                    <span class="node-label-badge">{node.type}</span>
                    <div class="meta-tools">
                        <button title="Duplicate"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                        <button title="Delete"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z"/></svg></button>
                    </div>
                </div>

                <div class="prop-section">
                    <div class="prop-section-header">Position</div>
                    <div class="prop-row">
                        <div class="prop-field">
                            <label>
                                <span>X</span>
                                <input type="number" value={Math.round(node.x)} onchange={(e) => updateNodeProp(node.id, 'x', e.currentTarget.value)} />
                            </label>
                        </div>
                        <div class="prop-field">
                            <label>
                                <span>Y</span>
                                <input type="number" value={Math.round(node.y)} onchange={(e) => updateNodeProp(node.id, 'y', e.currentTarget.value)} />
                            </label>
                        </div>
                    </div>
                </div>

                <div class="prop-section">
                    <div class="prop-section-header">Sizing</div>
                    <div class="prop-row">
                        <div class="prop-field">
                            <label>
                                <span>W</span>
                                <div class="input-with-unit">
                                    <input type="number" value={Math.round(node.width)} onchange={(e) => updateNodeProp(node.id, 'w', e.currentTarget.value)} />
                                    <span class="unit">PX</span>
                                </div>
                            </label>
                        </div>
                        <div class="prop-field">
                            <label>
                                <span>H</span>
                                <div class="input-with-unit">
                                    <input type="number" value={Math.round(node.height)} onchange={(e) => updateNodeProp(node.id, 'h', e.currentTarget.value)} />
                                    <span class="unit">PX</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="prop-section">
                    <div class="prop-section-header">Style</div>
                    <div class="prop-row">
                        <div class="prop-field full">
                            <label>
                                <span>Fill</span>
                                <div class="color-swatch-input">
                                    <div class="swatch" style="background: #ffffff"></div>
                                    <input type="text" value="#FFFFFF" readonly />
                                </div>
                            </label>
                        </div>
                    </div>
                    <div class="prop-row">
                        <div class="prop-field">
                            <label>
                                <span>Radius</span>
                                <input type="number" value="0" />
                            </label>
                        </div>
                        <div class="prop-field">
                            <label>
                                <span>Opacity</span>
                                <input type="number" value="100" />
                            </label>
                        </div>
                    </div>
                </div>
                
                {#if Object.keys(node.props).length > 0}
                    <div class="prop-section">
                        <div class="prop-section-header">Content Properties</div>
                        {#each Object.entries(node.props) as [key, value]}
                            <div class="prop-row">
                                <div class="prop-field full">
                                    <label>
                                        <span>{key}</span>
                                        <input type="text" value={value} oninput={(e) => updateNodeContent(node.id, key, e.currentTarget.value)} />
                                    </label>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            {/if}
        {:else}
            <div class="mixed-properties">Multiple selected</div>
        {/if}
    </div>
</div>

<style>
    .properties-panel {
        width: 100%;
        height: 100%;
        background: #111;
        display: flex;
        flex-direction: column;
        color: #ddd;
    }

    .properties-panel.standalone {
         background: transparent;
    }

    .properties-header {
        height: 48px;
        border-bottom: 1px solid #222;
        display: flex;
        align-items: center;
        padding: 0 12px;
    }

    .header-tabs {
        display: flex;
        gap: 20px;
        font-size: 11px;
        font-weight: 700;
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .header-tabs span {
        cursor: pointer;
        transition: color 0.2s;
        padding: 14px 0;
    }

    .header-tabs span.active {
        color: #fff;
        border-bottom: 2px solid #2b4b7a;
    }

    .properties-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
    }

    .node-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        border-bottom: 1px solid #222;
        background: rgba(255, 255, 255, 0.02);
    }

    .node-label-badge {
        background: #2b4b7a;
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .meta-tools {
        display: flex;
        gap: 4px;
    }

    .meta-tools button {
        background: transparent;
        border: none;
        color: #666;
        padding: 4px;
        cursor: pointer;
        border-radius: 4px;
        transition: color 0.1s;
    }

    .meta-tools button:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
    }

    .prop-section {
        border-bottom: 1px solid #222;
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

    .prop-row {
        display: flex;
        gap: 1px;
        padding: 0 10px 10px 10px;
    }

    .prop-field {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 4px;
    }

    .prop-field.full {
        flex: none;
        width: 100%;
    }

    .prop-field label {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .prop-field label span {
        font-size: 9px;
        color: #333;
        font-weight: 800;
        text-transform: uppercase;
    }

    .prop-field input {
        background: #181818;
        border: 1px solid #252525;
        color: #bbb;
        padding: 6px 10px;
        font-size: 11px;
        border-radius: 6px;
        width: 100%;
        outline: none;
        transition: border-color 0.2s;
    }

    .prop-field input:focus {
        border-color: #2b4b7a;
        color: #fff;
    }

    .input-with-unit {
        position: relative;
    }

    .input-with-unit .unit {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 8px;
        color: #333;
        pointer-events: none;
        font-weight: 900;
    }

    .color-swatch-input {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #181818;
        border: 1px solid #252525;
        padding: 6px 10px;
        border-radius: 6px;
    }

    .color-swatch-input .swatch {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        border: 1px solid #333;
    }

    .color-swatch-input input {
        background: transparent;
        border: none;
        padding: 0;
        font-size: 10px;
        font-family: inherit;
    }
</style>
