import * as vscode from 'vscode';
import { fractalHash } from 'fractal-hash';

// ---------------------------------------------------------------------------
// Hash detection patterns
// ---------------------------------------------------------------------------

/** Matches common hash formats found in source files */
const HASH_PATTERN = new RegExp(
  [
    // SSH fingerprint: SHA256:<base64> or MD5:xx:xx:...
    'SHA256:[A-Za-z0-9+/]{43}={0,1}',
    'MD5(?::[0-9a-fA-F]{2}){16}',
    // Hex hashes: 32 (MD5), 40 (SHA1), 56 (SHA224), 64 (SHA256), 96 (SHA384), 128 (SHA512)
    '[0-9a-fA-F]{128}',
    '[0-9a-fA-F]{96}',
    '[0-9a-fA-F]{64}',
    '[0-9a-fA-F]{56}',
    '[0-9a-fA-F]{40}',
    '[0-9a-fA-F]{32}',
  ].join('|'),
  'g',
);

// ---------------------------------------------------------------------------
// Hover provider
// ---------------------------------------------------------------------------

class FractalHashHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Hover | null> {
    const config  = vscode.workspace.getConfiguration('fractalHash');
    if (!config.get<boolean>('enabled', true)) return null;

    const line      = document.lineAt(position.line).text;
    const wordRange = document.getWordRangeAtPosition(position, HASH_PATTERN);
    if (!wordRange) return null;

    const hashString = document.getText(wordRange);
    if (hashString.length < 32) return null;

    const size = config.get<number>('size', 128);
    const bg   = config.get<string>('background', 'dark') as 'dark' | 'light';

    let dataUrl: string;
    try {
      dataUrl = await fractalHash(hashString, { format: 'png', size, background: bg });
    } catch {
      return null;
    }

    const markdown = new vscode.MarkdownString();
    markdown.isTrusted     = true;
    markdown.supportHtml   = true;
    markdown.supportThemeIcons = true;

    // VS Code MarkdownString supports embedded images via data URIs
    markdown.appendMarkdown(`**Fractal-Hash Fingerprint**\n\n`);
    markdown.appendMarkdown(`![fractal fingerprint](${dataUrl})\n\n`);

    // Show truncated hash and type hint
    const typeHint = detectHashType(hashString);
    const display  = hashString.length > 40
      ? `${hashString.substring(0, 32)}…`
      : hashString;
    markdown.appendMarkdown(`\`${display}\`${typeHint ? `  _(${typeHint})_` : ''}`);

    return new vscode.Hover(markdown, wordRange);
  }
}

// ---------------------------------------------------------------------------
// Hash type detection
// ---------------------------------------------------------------------------

function detectHashType(hash: string): string {
  if (hash.startsWith('SHA256:')) return 'SSH SHA256 fingerprint';
  if (hash.startsWith('MD5:'))    return 'SSH MD5 fingerprint';
  switch (hash.length) {
    case 32:  return 'MD5';
    case 40:  return 'SHA-1';
    case 56:  return 'SHA-224';
    case 64:  return 'SHA-256';
    case 96:  return 'SHA-384';
    case 128: return 'SHA-512';
    default:  return '';
  }
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
  const provider = vscode.languages.registerHoverProvider(
    { scheme: '*', language: '*' },
    new FractalHashHoverProvider(),
  );

  context.subscriptions.push(provider);

  // Register a command to manually render the selected hash
  const command = vscode.commands.registerCommand('fractalHash.renderSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const text      = editor.document.getText(selection).trim();
    if (!text) {
      vscode.window.showWarningMessage('Select a hash string first.');
      return;
    }

    const config = vscode.workspace.getConfiguration('fractalHash');
    const size   = config.get<number>('size', 256);
    const bg     = config.get<string>('background', 'dark') as 'dark' | 'light';

    try {
      const dataUrl = await fractalHash(text, { format: 'png', size, background: bg });
      const panel   = vscode.window.createWebviewPanel(
        'fractalHash',
        `Fractal: ${text.substring(0, 20)}…`,
        vscode.ViewColumn.Beside,
        { enableScripts: false },
      );
      panel.webview.html = buildWebviewHtml(dataUrl, text, size);
    } catch (err) {
      vscode.window.showErrorMessage(`Fractal-Hash error: ${String(err)}`);
    }
  });

  context.subscriptions.push(command);
}

export function deactivate(): void {}

// ---------------------------------------------------------------------------
// Webview HTML
// ---------------------------------------------------------------------------

function buildWebviewHtml(dataUrl: string, hash: string, size: number): string {
  const escaped = hash.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fractal-Hash</title>
  <style>
    body {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100vh;
      background: #0f0f0f; color: #e8e8e8;
      font-family: system-ui, sans-serif; margin: 0; padding: 24px;
    }
    img { border-radius: 8px; image-rendering: pixelated; }
    pre {
      margin-top: 16px; font-size: 11px; color: #888;
      word-break: break-all; max-width: ${size}px; text-align: center;
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" width="${size}" height="${size}" alt="Fractal fingerprint">
  <pre>${escaped}</pre>
</body>
</html>`;
}
