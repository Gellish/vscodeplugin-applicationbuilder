<script lang="ts">
    export let text = 'Button';
    export let variant = 'primary'; // primary, secondary, outline

    // For later styling from properties sidebar
    export let bgColor = '';
    export let textColor = '';
    export let borderRadius = '4px';
    export let padding = '8px 16px';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<button
    class="ab-button variant-{variant}"
    style="
        --ab-bg: {bgColor || 'var(--vscode-button-background, #0078d4)'};
        --ab-color: {textColor || 'var(--vscode-button-foreground, #ffffff)'};
        --ab-radius: {borderRadius};
        --ab-padding: {padding};
    "
>
    {text}
</button>

<style>
    .ab-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--ab-bg);
        color: var(--ab-color);
        border: 1px solid transparent;
        border-radius: var(--ab-radius);
        padding: var(--ab-padding);
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        width: 100%;
        height: 100%;
        transition: opacity 0.2s;
        box-sizing: border-box;
    }

    .ab-button:hover {
        opacity: 0.9;
    }

    .variant-secondary {
        --ab-bg: var(--vscode-button-secondaryBackground, #3a3d41);
        --ab-color: var(--vscode-button-secondaryForeground, #ffffff);
    }

    .variant-outline {
        background: transparent;
        border: 1px solid var(--ab-bg);
        color: var(--ab-bg);
    }
</style>
