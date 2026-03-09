import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ─── Get all asset files we need to serve ────────────────────────────

function getAssetUri(webview: vscode.Webview, extensionUri: vscode.Uri, ...segments: string[]): vscode.Uri {
	return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...segments));
}

function getChunkName(extensionUri: vscode.Uri): string | null {
	// Find any shared chunk files in dist/assets
	try {
		const assetsDir = path.join(extensionUri.fsPath, 'dist', 'assets');
		const files = fs.readdirSync(assetsDir);
		const chunk = files.find(f => f.includes('-chunk') || (f.startsWith('legacy') && f.endsWith('.js')));
		return chunk || null;
	} catch {
		return null;
	}
}

declare const __DEV__: boolean;

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, name: string): string {
	if (__DEV__) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Allow connecting to local Vite dev server -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' http://localhost:5173; style-src 'unsafe-inline' http://localhost:5173; connect-src ws://localhost:5173 http://localhost:5173; img-src ${webview.cspSource} data: https:;">
<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:var(--vscode-editor-background,#1e1e1e);color:var(--vscode-foreground,#ccc);}</style>
</head>
<body>
<div id="app"></div>
<script type="module" src="http://localhost:5173/@vite/client"></script>
<script type="module" src="http://localhost:5173/src/${name}.ts"></script>
</body>
</html>`;
	}

	const scriptUri = getAssetUri(webview, extensionUri, 'dist', 'assets', `${name}.js`);
	const stylesUri = getAssetUri(webview, extensionUri, 'dist', 'assets', `${name}.css`);

	// Build importmap for shared chunks
	const chunkName = getChunkName(extensionUri);
	const importMapEntries: string[] = [];
	if (chunkName) {
		const chunkUri = getAssetUri(webview, extensionUri, 'dist', 'assets', chunkName);
		importMapEntries.push(`"./${chunkName}": "${chunkUri}"`);
		importMapEntries.push(`"/${chunkName}": "${chunkUri}"`);
	}
	const importMap = importMapEntries.length > 0
		? `<script type="importmap">{"imports":{${importMapEntries.join(',')}}}</script>`
		: '';

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; img-src ${webview.cspSource} data: https:;">
<link rel="stylesheet" href="${stylesUri}">
<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:var(--vscode-editor-background,#1e1e1e);color:var(--vscode-foreground,#ccc);}</style>
</head>
<body>
<div id="app"></div>
${importMap}
<script type="module" src="${scriptUri}"></script>
</body>
</html>`;
}

// ─── Sidebar View Provider ───────────────────────────────────────────

class AppBuilderSidebarProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'appBuilder';

	private readonly _extensionUri: vscode.Uri;
	private _onMessage?: (msg: any) => void;
	private _view?: vscode.WebviewView;

	constructor(extensionUri: vscode.Uri) {
		this._extensionUri = extensionUri;
	}

	public setMessageHandler(handler: (msg: any) => void) {
		this._onMessage = handler;
	}

	public postMessage(msg: any) {
		if (this._view) {
			this._view.webview.postMessage(msg);
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};
		webviewView.webview.html = getWebviewHtml(webviewView.webview, this._extensionUri, 'sidebarMain');
		webviewView.webview.onDidReceiveMessage((msg) => {
			if (this._onMessage) this._onMessage(msg);
		});
	}
}

// ─── Canvas Panel (Editor area) ──────────────────────────────────────

class CanvasPanel {
	public static currentPanel: CanvasPanel | undefined;
	public static readonly viewType = 'appBuilderCanvas';
	public static sidebarProvider: AppBuilderSidebarProvider | undefined;

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		if (CanvasPanel.currentPanel) {
			CanvasPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
			return;
		}
		const panel = vscode.window.createWebviewPanel(
			CanvasPanel.viewType,
			'🎨 Application Builder',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [extensionUri]
			}
		);
		CanvasPanel.currentPanel = new CanvasPanel(panel, extensionUri);
		
		panel.webview.onDidReceiveMessage(msg => {
			if (msg.command === 'syncNodes' && CanvasPanel.sidebarProvider) {
				CanvasPanel.sidebarProvider.postMessage(msg);
			}
		});
	}

	public postMessage(msg: any) {
		this._panel.webview.postMessage(msg);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._panel.webview.html = getWebviewHtml(this._panel.webview, this._extensionUri, 'canvasMain');
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public dispose() {
		CanvasPanel.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) x.dispose();
		}
	}
}

// ─── Activation ──────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
	const sidebarProvider = new AppBuilderSidebarProvider(context.extensionUri);
	CanvasPanel.sidebarProvider = sidebarProvider;
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(AppBuilderSidebarProvider.viewType, sidebarProvider)
	);

	sidebarProvider.setMessageHandler((msg) => {
		if (msg.command === 'addComponent' || msg.command === 'selectNode') {
			if (CanvasPanel.currentPanel) {
				CanvasPanel.currentPanel.postMessage(msg);
			} else {
				if (msg.command === 'addComponent') {
					CanvasPanel.createOrShow(context.extensionUri);
					setTimeout(() => CanvasPanel.currentPanel?.postMessage(msg), 1000);
				}
			}
		}
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('appBuilder.open', () => {
			CanvasPanel.createOrShow(context.extensionUri);
		})
	);

	CanvasPanel.createOrShow(context.extensionUri);
}

export function deactivate() {}
