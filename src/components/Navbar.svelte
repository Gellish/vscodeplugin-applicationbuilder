<script lang="ts">
    export let logoText = 'Brand';
    export let links = [
        { label: 'Home', href: '#' },
        { label: 'About', href: '#' },
        { label: 'Contact', href: '#' }
    ];
    
    export let bgColor = '#ffffff';
    export let textColor = '#333333';
    export let borderColor = '#e5e7eb';
</script>

<nav 
    class="ab-navbar"
    style="
        --ab-bg: {bgColor};
        --ab-text: {textColor};
        --ab-border: {borderColor};
    "
>
    <div class="nav-brand">{logoText}</div>
    <div class="nav-links">
        {#each links as link}
            <a href={link.href} class="nav-link">{link.label}</a>
        {/each}
    </div>
</nav>

<style>
    .ab-navbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--ab-bg);
        color: var(--ab-text);
        border-bottom: 1px solid var(--ab-border);
        width: 100%;
        height: 100%;
        padding: 0 24px;
        box-sizing: border-box;
    }

    .nav-brand {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: -0.5px;
    }

    .nav-links {
        display: flex;
        gap: 24px;
    }

    .nav-link {
        color: inherit;
        text-decoration: none;
        font-size: 0.95rem;
        font-weight: 500;
        opacity: 0.8;
        transition: opacity 0.2s;
    }

    .nav-link:hover {
        opacity: 1;
    }
</style>
