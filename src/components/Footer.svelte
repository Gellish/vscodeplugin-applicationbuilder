<script lang="ts">
    export let text = '&copy; 2026 Your Company. All rights reserved.';
    export let bgColor = '#f8fafc';
    export let textColor = '#64748b';
</script>

<footer 
    class="ab-footer"
    style="
        --ab-bg: {bgColor};
        --ab-text: {textColor};
    "
>
    <div class="footer-content">
        <p>{@html text}</p>
    </div>
</footer>

<style>
    .ab-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ab-bg);
        color: var(--ab-text);
        width: 100%;
        height: 100%;
        padding: 32px 24px;
        box-sizing: border-box;
    }

    .footer-content {
        text-align: center;
    }

    p {
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.5;
    }
</style>
