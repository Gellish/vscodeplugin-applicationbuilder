import PropertiesPanel from './PropertiesPanel.svelte';
import { initWebview } from './webEntry';

export default initWebview(PropertiesPanel, { standalone: true });
