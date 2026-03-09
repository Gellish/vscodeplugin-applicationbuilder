import { mount } from 'svelte';
import CanvasApp from './CanvasApp.svelte';

const app = mount(CanvasApp, {
    target: document.getElementById('app')!,
});

export default app;
