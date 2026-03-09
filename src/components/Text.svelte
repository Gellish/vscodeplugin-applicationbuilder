<script lang="ts">
    export let text = 'Welcome to the application builder.';
    export let fontSize = '16px';
    export let fontWeight = '400';
    export let color = 'inherit';
    export let textAlign = 'left';
</script>

<div
    class="ab-text"
    style="
        font-size: {fontSize};
        font-weight: {fontWeight};
        color: {color};
        text-align: {textAlign};
    "
>
    {text}
</div>

<style>
    .ab-text {
        width: 100%;
        height: 100%;
        font-family: inherit;
        line-height: 1.5;
        box-sizing: border-box;
        padding: 4px;
    }
</style>
