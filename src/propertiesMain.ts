import { mount } from 'svelte';
import SidebarPanel from './SidebarPanel.svelte';

const app = mount(SidebarPanel, {
    target: document.getElementById('app')!,
});

export default app;
