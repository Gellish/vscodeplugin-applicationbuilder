<script lang="ts">
    import { appStore, type ComponentData } from "./responsiveStore";

    let { width, title, breakpoint } = $props<{
        width: string;
        title: string;
        breakpoint: "desktop" | "tablet" | "mobile";
    }>();

    let components: ComponentData[] = $derived($appStore.components);
</script>

<div class="canvas-frame" style="width: {width}">
    <div class="canvas-content">
        <div class="render-area">
            {#each components as comp}
                {@const currentStyles =
                    comp.styles[breakpoint as keyof typeof comp.styles]}
                <div
                    class="component-preview"
                    style={Object.entries(currentStyles)
                        .map(([k, v]) => `${k}:${v}`)
                        .join(";")}
                >
                    {comp.type}: {comp.props.title || ""}
                </div>
            {/each}
        </div>

        {#if components.length === 0}
            <div class="placeholder">
                <p>Drop Components Here</p>
                <span>{title} View</span>
            </div>
        {/if}
    </div>
</div>

<style>
    .canvas-frame {
        height: 700px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        overflow-y: auto;
        position: relative;
        transition: all 0.3s ease;
        border: 1px solid var(--vscode-widget-shadow, #000);
    }

    .canvas-content {
        width: 100%;
        min-height: 100%;
        background-color: #f5f5f7;
        color: #1d1d1f;
    }

    .render-area {
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    .component-preview {
        border: 1px dashed transparent;
        transition: border 0.2s;
        cursor: pointer;
    }

    .component-preview:hover {
        border: 1px dashed #007aff;
    }

    .placeholder {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        opacity: 0.3;
        user-select: none;
    }

    p {
        font-weight: bold;
        font-size: 1.2rem;
        margin-bottom: 0.5rem;
    }

    span {
        font-size: 0.9rem;
    }
</style>
