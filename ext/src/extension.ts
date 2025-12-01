import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'extension.copyDirFilesWithContent',
    async (uri: vscode.Uri) => {
      if (!uri || uri.scheme !== 'file') {
        vscode.window.showErrorMessage('Select a folder in the explorer.');
        return;
      }

      const root = uri.fsPath;

      async function collect(dir: string, base: string): Promise<string[]> {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const result: string[] = [];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path
            .relative(base, fullPath)
            .replace(/\\/g, '/'); // windows -> posix style

          if (entry.isDirectory()) {
            const sub = await collect(fullPath, base);
            result.push(...sub);
          } else if (entry.isFile()) {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            result.push(`${relPath}:\n${content}`);
          }
        }

        return result;
      }

      try {
        const blocks = await collect(root, root);
        const finalText = blocks.join('\n\n');
        await vscode.env.clipboard.writeText(finalText);
        vscode.window.showInformationMessage('Folder files copied to clipboard.');
      } catch (err: any) {
        vscode.window.showErrorMessage('Error: ' + (err?.message ?? String(err)));
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}


