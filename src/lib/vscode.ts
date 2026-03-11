/**
 * Mocking the VS Code API for browser-based development.
 * Allows the UI to run in a standard browser/preview without crashing.
 */
export function getVsCodeApi() {
    if (typeof (window as any).acquireVsCodeApi === 'function') {
        return (window as any).acquireVsCodeApi();
    }
    
    // In-browser mock
    console.warn('[AppBuilder] acquireVsCodeApi not found. Running in browser mock mode.');
    return {
        postMessage: (msg: any) => {
            console.log('[Mock VS Code API] postMessage:', msg);
        },
        setState: (state: any) => {
            console.log('[Mock VS Code API] setState:', state);
            localStorage.setItem('vscode_state', JSON.stringify(state));
        },
        getState: () => {
            const state = localStorage.getItem('vscode_state');
            return state ? JSON.parse(state) : undefined;
        }
    };
}
