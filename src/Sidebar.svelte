<script lang="ts">
    import { addComponent } from "./responsiveStore";

    const availableComponents = [
        { type: "Hero", icon: "🏠" },
        { type: "Button", icon: "🔘" },
        { type: "Image", icon: "🖼️" },
        { type: "Card", icon: "🎴" },
        { type: "Text", icon: "📝" },
    ];

    function handleAdd(type: string) {
        addComponent(type);
    }
</script>

<aside class="sidebar">
    <div class="sidebar-header">
        <h2>Components</h2>
    </div>

    <div class="component-list">
        {#each availableComponents as comp}
            <button class="component-item" onclick={() => handleAdd(comp.type)}>
                <span class="icon">{comp.icon}</span>
                <span class="name">{comp.type}</span>
            </button>
        {/each}
    </div>
</aside>

<style>
    .sidebar {
        width: 250px;
        background-color: var(--vscode-sideBar-background, #252526);
        border-right: 1px solid var(--vscode-panel-border, #333);
        display: flex;
        flex-direction: column;
    }

    .sidebar-header {
        padding: 1rem;
        border-bottom: 1px solid var(--vscode-panel-border, #333);
    }

    h2 {
        margin: 0;
        font-size: 0.9rem;
        text-transform: uppercase;
        opacity: 0.6;
        letter-spacing: 0.5px;
    }

    .component-list {
        padding: 0.5rem;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }

    .component-item {
        background-color: var(--vscode-button-secondaryBackground, #3a3d41);
        border: 1px solid transparent;
        color: var(--vscode-button-secondaryForeground, #ffffff);
        padding: 1rem 0.5rem;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .component-item:hover {
        background-color: var(
            --vscode-button-secondaryHoverBackground,
            #45494e
        );
        border-color: var(--vscode-focusBorder, #007fd4);
    }

    .icon {
        font-size: 1.5rem;
    }

    .name {
        font-size: 0.75rem;
    }
</style>
