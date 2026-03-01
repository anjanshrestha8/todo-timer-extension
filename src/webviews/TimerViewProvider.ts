import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TimerViewProvider manages the Timer webview
 * It creates the HTML content and handles messages from the webview
 */
export class TimerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'timer-todo.timer';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * This function is called when VS Code wants to show your webview
   * It's like VS Code saying: "Hey, give me the HTML content for your Timer"
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Configure webview options
    webviewView.webview.options = {
      // Allow scripts to run in the webview
      enableScripts: true,
      // Restrict resources to our extension's folder
      localResourceRoots: [this._extensionUri],
    };

    // Set the HTML content for the webview
    webviewView.webview.html = this._getHtmlForWebview();

    // Listen for messages from the webview (HTML/JS side)
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'info':
          // If webview sends an 'info' message, show it to user
          vscode.window.showInformationMessage(message.text);
          break;
      }
    });
  }

  /**
   * Generate the HTML content for the Timer
   * Reads from the external timer.html file
   */
  private _getHtmlForWebview(): string {
    const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webviews', 'html', 'timer.html');
    return fs.readFileSync(htmlPath, 'utf8');
  }
}
