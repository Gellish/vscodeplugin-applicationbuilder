<script lang="ts">
    export let src = 'https://picsum.photos/600/400';
    export let alt = 'Placeholder Image';
    export let objectFit = 'cover'; // cover, contain, fill
    export let borderRadius = '8px';
</script>

<div 
    class="ab-image-wrapper"
    style="
        --ab-radius: {borderRadius};
        --ab-fit: {objectFit};
    "
>
    <!-- svelte-ignore a11y_missing_attribute -->
    <img {src} {alt} />
</div>

<style>
    .ab-image-wrapper {
        width: 100%;
        height: 100%;
        border-radius: var(--ab-radius);
        overflow: hidden;
        background: #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: var(--ab-fit);
        display: block;
    }
</style>
