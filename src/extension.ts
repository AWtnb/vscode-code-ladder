import * as vscode from "vscode";

import { Bouncer } from "./bouncer";

export function activate(context: vscode.ExtensionContext) {
  const BOUNCER = new Bouncer(".keywords", "$0");

  [
    vscode.commands.registerTextEditorCommand("bounce-marks.jumpNext", (editor: vscode.TextEditor) => {
      BOUNCER.jumpToNextKeyword(editor);
    }),
    vscode.commands.registerTextEditorCommand("bounce-marks.jumpPrevious", (editor: vscode.TextEditor) => {
      BOUNCER.jumpToPreviousKeyword(editor);
    }),
  ].forEach((disposable) => {
    context.subscriptions.push(disposable);
  });
}

export function deactivate() {}

