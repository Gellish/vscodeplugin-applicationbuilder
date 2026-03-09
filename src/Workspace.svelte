<script lang="ts">
    import Canvas from "./Canvas.svelte";
    import Sidebar from "./Sidebar.svelte";

    let views = [
        {
            id: "desktop",
            name: "Desktop",
            width: "1000px",
            breakpoint: "desktop" as const,
        },
        {
            id: "tablet",
            name: "Tablet",
            width: "768px",
            breakpoint: "tablet" as const,
        },
        {
            id: "mobile",
            name: "Mobile",
            width: "375px",
            breakpoint: "mobile" as const,
        },
    ];
</script>

<div class="app-layout">
    <Sidebar />

    <main class="workspace">
        <header class="workspace-header">
            <h1>Application Builder</h1>
        </header>

        <div class="canvas-container">
            {#each views as view}
                <div class="canvas-wrapper">
                    <div class="canvas-label">{view.name} ({view.width})</div>
                    <Canvas
                        width={view.width}
                        title={view.name}
                        breakpoint={view.breakpoint}
                    />
                </div>
            {/each}
        </div>
    </main>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background-color: var(--vscode-editor-background, #1e1e1e);
        color: var(--vscode-editor-foreground, #cccccc);
        font-family: var(--vscode-font-family, sans-serif);
        overflow: hidden;
    }

    .app-layout {
        display: flex;
        height: 100vh;
        width: 100vw;
    }

    .workspace {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
    }

    .workspace-header {
        padding: 1rem;
        border-bottom: 1px solid var(--vscode-panel-border, #333);
        background-color: var(--vscode-sideBar-background, #252526);
    }

    h1 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 500;
    }

    .canvas-container {
        display: flex;
        flex: 1;
        gap: 3rem;
        padding: 3rem;
        overflow: auto;
        background-image: linear-gradient(45deg, #252526 25%, transparent 25%),
            linear-gradient(-45deg, #252526 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #252526 75%),
            linear-gradient(-45deg, transparent 75%, #252526 75%);
        background-size: 20px 20px;
        background-position:
            0 0,
            0 10px,
            10px -10px,
            -10px 0px;
    }

    .canvas-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        min-width: fit-content;
    }

    .canvas-label {
        font-size: 0.8rem;
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
</style>
