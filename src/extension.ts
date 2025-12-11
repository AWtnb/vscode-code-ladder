import * as vscode from "vscode";
import * as path from "path";

import { Bouncer, DEFAULT_SRC_NAME } from "./bouncer";

export function activate(context: vscode.ExtensionContext) {
  let bouncer: Bouncer | null = null;
  const config = vscode.workspace.getConfiguration("bounce-marks");
  const srcName: string = config.get("src") || DEFAULT_SRC_NAME;

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const srcFilePath = path.join(rootPath, srcName);

    const watcher = vscode.workspace.createFileSystemWatcher(srcFilePath);

    watcher.onDidChange(() => {
      vscode.window.showInformationMessage("Keywords source file updated. Reloading...");
      bouncer = new Bouncer(config);
    });

    watcher.onDidDelete(() => {
      vscode.window.showWarningMessage("Keywords source file deleted. Jump functionality may not work.");
      bouncer = null;
    });

    watcher.onDidCreate(() => {
      vscode.window.showInformationMessage("Keywords source file created. Reloading...");
      bouncer = new Bouncer(config);
    });

    context.subscriptions.push(watcher);
  }

  [
    vscode.commands.registerTextEditorCommand("bounce-marks.jumpNext", (editor: vscode.TextEditor) => {
      if (bouncer) {
        bouncer.jumpToNextKeyword(editor);
      } else {
        vscode.window.showErrorMessage("Bouncer is not initialized. Verify your configuration or reload workspace.");
      }
    }),
    vscode.commands.registerTextEditorCommand("bounce-marks.jumpPrevious", (editor: vscode.TextEditor) => {
      if (bouncer) {
        bouncer.jumpToPreviousKeyword(editor);
      } else {
        vscode.window.showErrorMessage("Bouncer is not initialized. Verify your configuration or reload workspace.");
      }
    }),
  ].forEach((disposable) => {
    context.subscriptions.push(disposable);
  });
}

export function deactivate() {}

