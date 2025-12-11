import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface Keyword {
  text: string;
  cursorOffset: number;
}

export class Bouncer {
  private readonly src: string;
  private readonly placeholder: string;
  private keywords: Keyword[] = [];

  constructor(src: string, placeholder: string = "$0") {
    this.src = src;
    this.placeholder = placeholder;
    this.loadKeywords();
  }

  private loadKeywords() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace is opened");
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const keywordsFilePath = path.join(rootPath, this.src);
    if (!fs.existsSync(keywordsFilePath)) {
      vscode.window.showInformationMessage(`src file \`${this.src}\` not found in the root of this workspace.`);
      return;
    }

    const content = fs.readFileSync(keywordsFilePath, "utf8");
    content
      .replaceAll("\r", "")
      .split("\n")
      .filter((line) => 0 < line.trim().length)
      .forEach((line) => {
        if (this.placeholder == "") {
          this.keywords.push({ text: line, cursorOffset: -1 });
          return;
        }
        const offset = line.indexOf(this.placeholder);
        this.keywords.push({ text: line.replace(this.placeholder, ""), cursorOffset: offset });
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
    let newSel: vscode.Selection | null = null;

    lineLoop: for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const keyword of this.keywords) {
        const wordStart = line.indexOf(keyword.text);
        if (wordStart != -1) {
          const lineStart = currentOffset + lineOffset;
          const matchStart = lineStart + wordStart;
          const matchEnd = matchStart + keyword.text.length;
          if (keyword.cursorOffset == -1) {
            const s = document.positionAt(matchStart);
            const e = document.positionAt(matchEnd);
            newSel = new vscode.Selection(s, e);
          } else {
            const c = document.positionAt(matchStart + keyword.cursorOffset);
            newSel = new vscode.Selection(c, c);
          }
          break lineLoop;
        }
      }

      lineOffset += line.length + 1; // +1 for newline character
    }

    if (newSel === null) {
      return;
    }
    editor.selection = newSel;
    editor.revealRange(newSel, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
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
    let newSel: vscode.Selection | null = null;

    lineLoop: for (let i = lines.length - 1; 0 <= i; i--) {
      const line = lines[i];

      for (const keyword of this.keywords) {
        const wordStart = line.lastIndexOf(keyword.text);
        if (wordStart != -1) {
          const lineStart = lineOffset - line.length;
          const matchStart = lineStart + wordStart;
          const matchEnd = matchStart + keyword.text.length;
          if (keyword.cursorOffset == -1) {
            const s = document.positionAt(matchStart);
            const e = document.positionAt(matchEnd);
            newSel = new vscode.Selection(s, e);
          } else {
            const c = document.positionAt(matchStart + keyword.cursorOffset);
            newSel = new vscode.Selection(c, c);
          }
          break lineLoop;
        }
      }

      lineOffset -= line.length + 1; // +1 for newline character
    }

    if (newSel === null) {
      return;
    }
    editor.selection = newSel;
    editor.revealRange(newSel, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
}
