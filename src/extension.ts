import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ─── Logging ─────────────────────────────────────────────────────────

const outputChannel = vscode.window.createOutputChannel('Application Builder');

function log(message: string, data?: any) {
	const timestamp = new Date().toLocaleTimeString();
	outputChannel.appendLine(`[${timestamp}] ${message}`);
	if (data) {
		outputChannel.appendLine(JSON.stringify(data, null, 2));
	}
}

// ─── Asset Helpers ───────────────────────────────────────────────────

function getAssetUri(webview: vscode.Webview, extensionUri: vscode.Uri, ...segments: string[]): vscode.Uri {
	return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...segments));
}

function findAssetFile(extensionUri: vscode.Uri, prefix: string, extension: string): string | null {
	try {
		const assetsDir = path.join(extensionUri.fsPath, 'dist', 'assets');
		const files = fs.readdirSync(assetsDir);
		const found = files.find(f => f.startsWith(prefix) && f.endsWith(extension));
		return found || null;
	} catch {
		return null;
	}
}

declare const __DEV__: boolean;

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, name: string): string {
	log(`Generating HTML for ${name} (Dev: ${__DEV__})`);

	if (__DEV__) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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

	const scriptFile = findAssetFile(extensionUri, name, '.js') || `${name}.js`;
	const styleFile = findAssetFile(extensionUri, name, '.css') || `${name}.css`;
	const scriptUri = getAssetUri(webview, extensionUri, 'dist', 'assets', scriptFile);
	const stylesUri = getAssetUri(webview, extensionUri, 'dist', 'assets', styleFile);

	const chunkFile = findAssetFile(extensionUri, 'legacy-chunk', '.js');
	const importMap = chunkFile 
		? `<script type="importmap">{"imports":{"./${chunkFile}": "${getAssetUri(webview, extensionUri, 'dist', 'assets', chunkFile)}"}}</script>`
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

// ─── View Management ─────────────────────────────────────────────────

interface WebviewInstance {
	id: string;
	postMessage: (msg: any) => void;
}

const activeViews = new Set<WebviewInstance>();

function broadcast(message: any, excludeId?: string) {
	log(`Broadcasting: ${message.command}`, message);
	for (const view of activeViews) {
		if (view.id !== excludeId) {
			view.postMessage(message);
		}
	}
}

// ─── Providers ───────────────────────────────────────────────────────

class AppBuilderViewProvider implements vscode.WebviewViewProvider {
	private readonly _extensionUri: vscode.Uri;
	private readonly _id: string;
	private readonly _entryName: string;

	constructor(extensionUri: vscode.Uri, id: string, entryName: string) {
		this._extensionUri = extensionUri;
		this._id = id;
		this._entryName = entryName;
	}

	public resolveWebviewView(webviewView: vscode.WebviewView) {
		const instance: WebviewInstance = {
			id: this._id,
			postMessage: (msg: any) => webviewView.webview.postMessage(msg)
		};
		
		activeViews.add(instance);
		webviewView.onDidDispose(() => {
			log(`View disposed: ${this._id}`);
			activeViews.delete(instance);
		});

		webviewView.webview.options = { 
			enableScripts: true, 
			localResourceRoots: [this._extensionUri] 
		};
		webviewView.webview.html = getWebviewHtml(webviewView.webview, this._extensionUri, this._entryName);

		webviewView.webview.onDidReceiveMessage(msg => handleIncomingMessage(msg, this._id));
	}
}

class CanvasPanel {
	private static _current: CanvasPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	public static open(extensionUri: vscode.Uri) {
		if (this._current) {
			this._current._panel.reveal(vscode.ViewColumn.One);
			return;
		}

		const panel = vscode.window.createWebviewPanel('appBuilderCanvas', '🎨 Application Builder', vscode.ViewColumn.One, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [extensionUri]
		});

		this._current = new CanvasPanel(panel, extensionUri);
	}

	public static post(msg: any) {
		this._current?._panel.webview.postMessage(msg);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		const instance: WebviewInstance = {
			id: 'canvas',
			postMessage: (msg: any) => this._panel.webview.postMessage(msg)
		};
		
		activeViews.add(instance);
		this._panel.onDidDispose(() => {
			log('Canvas panel disposed');
			activeViews.delete(instance);
			CanvasPanel._current = undefined;
			this.dispose();
		}, null, this._disposables);

		this._panel.webview.html = getWebviewHtml(this._panel.webview, extensionUri, 'canvasMain');
		this._panel.webview.onDidReceiveMessage(msg => handleIncomingMessage(msg, 'canvas'), null, this._disposables);
	}

	private dispose() {
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) x.dispose();
		}
	}
}

// ─── Router ──────────────────────────────────────────────────────────

function handleIncomingMessage(msg: any, sourceId: string) {
	log(`Message from ${sourceId}: ${msg.command}`, msg);

	switch (msg.command) {
		case 'syncNodes':
		case 'selectNode':
		case 'addComponent':
			// Broadcast to everyone else
			broadcast(msg, sourceId);
			
			// If canvas is not open and we are adding a component, open it
			if (msg.command === 'addComponent' && !CanvasPanel['_current']) {
				vscode.commands.executeCommand('appBuilder.open');
			}
			break;
		
		case 'error':
			vscode.window.showErrorMessage(`[AppBuilder] ${msg.message}`);
			break;
		
		case 'log':
			log(`[Client Log]: ${msg.message}`, msg.data);
			break;
	}
}

// ─── Activation ──────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
	log('Application Builder active');

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('appBuilder', new AppBuilderViewProvider(context.extensionUri, 'layers', 'sidebarMain')),
		vscode.window.registerWebviewViewProvider('appBuilderProperties', new AppBuilderViewProvider(context.extensionUri, 'properties', 'propertiesMain'))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('appBuilder.open', () => CanvasPanel.open(context.extensionUri))
	);

	// Automatically open canvas on start
	CanvasPanel.open(context.extensionUri);
}

export function deactivate() {}
