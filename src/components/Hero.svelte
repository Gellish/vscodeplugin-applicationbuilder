<script lang="ts">
    export let title = 'Welcome to Your App';
    export let subtitle = 'Build something amazing today.';
    export let primaryButtonText = 'Get Started';
    export let secondaryButtonText = 'Learn More';
    
    export let bgColor = '#f8fafc';
    export let textColor = '#0f172a';
    export let alignment = 'center'; // left, center, right
</script>

<div 
    class="ab-hero align-{alignment}"
    style="
        --ab-bg: {bgColor};
        --ab-text: {textColor};
    "
>
    <div class="hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div class="hero-actions">
            {#if primaryButtonText}
                <button class="hero-btn primary">{primaryButtonText}</button>
            {/if}
            {#if secondaryButtonText}
                <button class="hero-btn secondary">{secondaryButtonText}</button>
            {/if}
        </div>
    </div>
</div>

<style>
    .ab-hero {
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: var(--ab-bg);
        color: var(--ab-text);
        width: 100%;
        height: 100%;
        padding: 40px 24px;
        box-sizing: border-box;
    }

    .align-center { text-align: center; align-items: center; }
    .align-left { text-align: left; align-items: flex-start; }
    .align-right { text-align: right; align-items: flex-end; }

    .hero-content {
        max-width: 800px;
        width: 100%;
    }

    h1 {
        font-size: 2.5rem;
        font-weight: 800;
        margin: 0 0 16px 0;
        line-height: 1.2;
    }

    p {
        font-size: 1.25rem;
        margin: 0 0 32px 0;
        opacity: 0.8;
    }

    .hero-actions {
        display: flex;
        gap: 16px;
        justify-content: inherit;
    }

    .hero-btn {
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        border: none;
    }

    .hero-btn.primary {
        background: #2563eb;
        color: white;
    }
    
    .hero-btn.secondary {
        background: transparent;
        border: 1px solid currentColor;
        color: inherit;
    }
</style>
