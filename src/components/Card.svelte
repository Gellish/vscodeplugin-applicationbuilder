<script lang="ts">
    export let title = 'Card Title';
    export let description = 'This is a beautifully designed card component.';
    export let showImage = true;
    export let buttonText = 'Action';
    
    export let bgColor = '#ffffff';
    export let textColor = '#1e293b';
</script>

<div 
    class="ab-card"
    style="
        --ab-bg: {bgColor};
        --ab-text: {textColor};
    "
>
    {#if showImage}
        <div class="card-img"></div>
    {/if}
    <div class="card-body">
        <h3>{title}</h3>
        <p>{description}</p>
        {#if buttonText}
            <button class="card-action">{buttonText}</button>
        {/if}
    </div>
</div>

<style>
    .ab-card {
        display: flex;
        flex-direction: column;
        background: var(--ab-bg);
        color: var(--ab-text);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        width: 100%;
        height: 100%;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }

    .card-img {
        height: 45%;
        background: #cbd5e1;
        width: 100%;
    }

    .card-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    h3 {
        margin: 0 0 8px 0;
        font-size: 1.125rem;
        font-weight: 600;
    }

    p {
        margin: 0 0 16px 0;
        font-size: 0.9rem;
        line-height: 1.5;
        opacity: 0.8;
        flex: 1;
    }

    .card-action {
        align-self: flex-start;
        padding: 8px 16px;
        background: #f1f5f9;
        color: #0f172a;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
    }

    .card-action:hover {
        background: #e2e8f0;
    }
</style>
