import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export const DEFAULT_SRC_NAME = ".keywords";
export const DEFAULT_PLACEHOLDER = "$0";

interface Keyword {
  text: string;
  cursorOffsets: number[];
}

export class Navigator {
  private readonly src: string;
  private readonly placeholder: string;
  private keywords: Keyword[] = [];

  constructor(config: vscode.WorkspaceConfiguration) {
    this.src = config.get("src") || DEFAULT_SRC_NAME;
    this.placeholder = config.get("placeholder") || DEFAULT_PLACEHOLDER;
    this.loadKeywords();
    console.log(this.keywords);
  }

  private loadKeywords() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace is opened");
      return;
    }

    if (this.src == "") {
      vscode.window.showInformationMessage("src file not specified.");
      return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;
    const srcPath = path.join(rootPath, this.src);
    if (!fs.existsSync(srcPath)) {
      vscode.window.showInformationMessage(`src file \`${this.src}\` not found in the root of this workspace.`);
      return;
    }

    const content = fs.readFileSync(srcPath, "utf8");
    content
      .replaceAll("\r", "")
      .split("\n")
      .filter((line) => 0 < line.trim().length)
      .forEach((line) => {
        const offsets: number[] = [];
        line
          .split(this.placeholder)
          .slice(0, -1)
          .reduce((acc, cur) => {
            acc += cur.length;
            offsets.push(acc);
            return acc;
          }, 0);
        this.keywords.push({ text: line.replaceAll(this.placeholder, ""), cursorOffsets: offsets });
      });
  }

  public jumpToNextKeyword(editor: vscode.TextEditor) {
    if (this.keywords.length === 0) {
      vscode.window.showInformationMessage("No keyword to jump specified.");
      return;
    }

    const document = editor.document;
    const text = document.getText();
    const currentOffset = document.offsetAt(editor.selection.end);

    const remainingText = text.substring(currentOffset);

    const lines = remainingText.split("\n");
    let lineOffset = 0;
    let newSels: vscode.Selection[] = [];

    lineLoop: for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const keyword of this.keywords) {
        const wordStart = line.indexOf(keyword.text);

        if (wordStart != -1) {
          const lineStart = currentOffset + lineOffset;
          const matchStart = lineStart + wordStart;
          const matchEnd = matchStart + keyword.text.length;

          if (keyword.cursorOffsets.length < 1) {
            const s = document.positionAt(matchStart);
            const e = document.positionAt(matchEnd);
            newSels.push(new vscode.Selection(s, e));
          } else {
            keyword.cursorOffsets.forEach((o) => {
              const c = document.positionAt(matchStart + o);
              newSels.push(new vscode.Selection(c, c));
            });
          }

          break lineLoop;
        }
      }

      lineOffset += line.length + 1; // +1 for newline character
    }

    if (newSels.length < 1) {
      return;
    }
    editor.selections = newSels;
    editor.revealRange(newSels[0], vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }

  public jumpToPreviousKeyword(editor: vscode.TextEditor) {
    if (this.keywords.length === 0) {
      vscode.window.showInformationMessage("No keyword to jump specified.");
      return;
    }

    const document = editor.document;
    const text = document.getText();
    const currentOffset = document.offsetAt(editor.selection.start);

    const precedingText = text.substring(0, currentOffset);

    const lines = precedingText.split("\n");
    let lineOffset = precedingText.length;
    let newSels: vscode.Selection[] = [];

    lineLoop: for (let i = lines.length - 1; 0 <= i; i--) {
      const line = lines[i];

      for (const keyword of this.keywords) {
        const wordStart = line.lastIndexOf(keyword.text);

        if (wordStart != -1) {
          const lineStart = lineOffset - line.length;
          const matchStart = lineStart + wordStart;
          const matchEnd = matchStart + keyword.text.length;

          if (matchEnd === currentOffset || matchStart === currentOffset) {
            continue;
          }

          if (keyword.cursorOffsets.length < 1) {
            const s = document.positionAt(matchStart);
            const e = document.positionAt(matchEnd);
            newSels.push(new vscode.Selection(s, e));
          } else {
            keyword.cursorOffsets.forEach((o) => {
              const c = document.positionAt(matchStart + o);
              newSels.push(new vscode.Selection(c, c));
            });
          }

          break lineLoop;
        }
      }

      lineOffset -= line.length + 1; // +1 for newline character
    }

    if (newSels.length < 1) {
      return;
    }
    editor.selections = newSels;
    editor.revealRange(newSels[0], vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
}
