import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import { Navigator, DEFAULT_SRC_NAME } from "./ladder";

export function activate(context: vscode.ExtensionContext) {
  let nav: Navigator | null = null;
  const config = vscode.workspace.getConfiguration("code-ladder");
  const srcName: string = config.get("src") || DEFAULT_SRC_NAME;

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const srcPath = path.join(rootPath, srcName);

    if (fs.existsSync(srcPath)) {
      nav = new Navigator(config);
    }

    const watcher = vscode.workspace.createFileSystemWatcher(srcPath);

    watcher.onDidChange(() => {
      vscode.window.showInformationMessage("Keywords source file updated. Reloading...");
      nav = new Navigator(config);
    });

    watcher.onDidDelete(() => {
      vscode.window.showWarningMessage("Keywords source file deleted. Jump functionality may not work.");
      nav = null;
    });

    watcher.onDidCreate(() => {
      vscode.window.showInformationMessage("Keywords source file created. Reloading...");
      nav = new Navigator(config);
    });

    context.subscriptions.push(watcher);
  }

  [
    vscode.commands.registerTextEditorCommand("code-ladder.jumpNext", (editor: vscode.TextEditor) => {
      if (nav) {
        nav.jumpToNextKeyword(editor);
      } else {
        vscode.window.showErrorMessage("Navigator is not initialized. Verify your configuration or reload workspace.");
      }
    }),
    vscode.commands.registerTextEditorCommand("code-ladder.jumpPrevious", (editor: vscode.TextEditor) => {
      if (nav) {
        nav.jumpToPreviousKeyword(editor);
      } else {
        vscode.window.showErrorMessage("Navigator is not initialized. Verify your configuration or reload workspace.");
      }
    }),
  ].forEach((disposable) => {
    context.subscriptions.push(disposable);
  });
}

export function deactivate() {}
