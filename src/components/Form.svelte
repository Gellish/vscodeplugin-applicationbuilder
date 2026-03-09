<script lang="ts">
    export let title = 'Contact Us';
    export let submitText = 'Send Message';
    export let bgColor = '#ffffff';
    export let textColor = '#333333';
</script>

<div 
    class="ab-form-container"
    style="
        --ab-bg: {bgColor};
        --ab-text: {textColor};
    "
>
    {#if title}
        <h2>{title}</h2>
    {/if}
    <form class="ab-form" on:submit|preventDefault>
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" placeholder="John Doe" />
        </div>
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="john@example.com" />
        </div>
        <div class="form-group">
            <label for="message">Message</label>
            <textarea id="message" rows="4" placeholder="How can we help?"></textarea>
        </div>
        <button type="button" class="form-submit">{submitText}</button>
    </form>
</div>

<style>
    .ab-form-container {
        display: flex;
        flex-direction: column;
        background: var(--ab-bg);
        color: var(--ab-text);
        width: 100%;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }

    h2 {
        margin: 0 0 20px 0;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .ab-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex: 1;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    label {
        font-size: 0.875rem;
        font-weight: 500;
        opacity: 0.9;
    }

    input, textarea {
        padding: 10px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.95rem;
        background: #f8fafc;
        color: inherit;
        outline: none;
        transition: border-color 0.2s;
    }

    input:focus, textarea:focus {
        border-color: #3b82f6;
    }

    .form-submit {
        margin-top: auto;
        padding: 12px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .form-submit:hover {
        background: #1d4ed8;
    }
</style>
