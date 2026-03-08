import { mount } from 'svelte';

/**
 * Common entry point for all Application Builder webview views.
 * Handles mounting and standard error logging.
 */
export function initWebview(component: any, props: Record<string, any> = {}) {
    console.log(`[AppBuilder] Initializing webview with ${component.name || 'component'}`);
    
    try {
        const target = document.getElementById('app');
        if (!target) {
            throw new Error('Could not find #app element in DOM');
        }

        const app = mount(component, {
            target,
            props
        });

        // Add global error handling for easier debugging
        window.addEventListener('error', (event) => {
            console.error('[AppBuilder Runtime Error]:', event.error);
            logHost('Error recorded in webview: ' + (event.error?.message || 'Unknown window error'), event.error);
            const vscode = (window as any).acquireVsCodeApi?.();
            if (vscode) {
                vscode.postMessage({ 
                    command: 'error', 
                    message: event.error?.message || 'Unknown window error' 
                });
            }
        });

        logHost(`Mounted ${component.name || 'component'} successfully`);
        return app;
    } catch (err) {
        logHost('Failed to mount component', err);
        console.error('[AppBuilder Mount Failed]:', err);
        document.body.innerHTML = `
            <div style="padding: 20px; color: #f44; font-family: sans-serif;">
                <h3>Failed to load view</h3>
                <pre>${err instanceof Error ? err.stack : String(err)}</pre>
            </div>
        `;
    }
}

export function logHost(message: string, data?: any) {
    const vscode = (window as any).acquireVsCodeApi?.();
    if (vscode) {
        vscode.postMessage({ command: 'log', message, data });
    }
    console.log(`[HostLog] ${message}`, data);
}
