import * as vscode from 'vscode';

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
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

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
   * This is a self-contained HTML page with CSS and JavaScript
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timer</title>
  <style>
    /* Reset default styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    h1 {
      color: var(--vscode-foreground);
      font-size: 24px;
      margin-bottom: 10px;
    }

    /* Timer display - the big numbers */
    #timer-display {
      font-size: 48px;
      font-weight: bold;
      color: var(--vscode-editor-foreground);
      font-family: 'Courier New', monospace;
      letter-spacing: 4px;
      padding: 20px;
      border: 2px solid var(--vscode-input-border);
      border-radius: 8px;
      background-color: var(--vscode-input-background);
      min-width: 200px;
      text-align: center;
    }

    /* Button container */
    .button-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* Buttons */
    button {
      padding: 10px 20px;
      font-size: 14px;
      cursor: pointer;
      border: 1px solid var(--vscode-button-border);
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    button:active {
      transform: scale(0.98);
    }

    /* Status text */
    #status {
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>⏱️ Timer</h1>
  
  <!-- The timer display showing MM:SS -->
  <div id="timer-display">00:00</div>
  
  <!-- Status text (Running, Paused, Stopped) -->
  <div id="status">Ready</div>
  
  <!-- Control buttons -->
  <div class="button-group">
    <button id="start-btn">Start</button>
    <button id="pause-btn">Pause</button>
    <button id="reset-btn">Reset</button>
  </div>

  <script>
    // Get access to VS Code API (allows communication with extension)
    const vscode = acquireVsCodeApi();

    // ==========================================
    // TIMER STATE VARIABLES
    // ==========================================
    let seconds = 0;           // Total seconds elapsed
    let intervalId = null;     // Reference to setInterval (for stopping it)
    let isRunning = false;     // Is timer currently running?

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const display = document.getElementById('timer-display');
    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');

    // ==========================================
    // HELPER FUNCTION: Format seconds to MM:SS
    // ==========================================
    function formatTime(totalSeconds) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      // Pad with zeros: 5 becomes "05"
      return mins.toString().padStart(2, '0') + ':' + 
             secs.toString().padStart(2, '0');
    }

    // ==========================================
    // UPDATE DISPLAY
    // ==========================================
    function updateDisplay() {
      display.textContent = formatTime(seconds);
    }

    // ==========================================
    // START TIMER
    // ==========================================
    startBtn.addEventListener('click', () => {
      if (isRunning) return; // Already running, do nothing

      isRunning = true;
      statusEl.textContent = 'Running...';
      
      // Increment seconds every 1000ms (1 second)
      intervalId = setInterval(() => {
        seconds++;
        updateDisplay();
      }, 1000);
    });

    // ==========================================
    // PAUSE TIMER
    // ==========================================
    pauseBtn.addEventListener('click', () => {
      if (!isRunning) return; // Not running, do nothing

      isRunning = false;
      statusEl.textContent = 'Paused';
      
      // Stop the interval
      clearInterval(intervalId);
      intervalId = null;
    });

    // ==========================================
    // RESET TIMER
    // ==========================================
    resetBtn.addEventListener('click', () => {
      // Stop if running
      if (isRunning) {
        clearInterval(intervalId);
        intervalId = null;
        isRunning = false;
      }

      // Reset to zero
      seconds = 0;
      updateDisplay();
      statusEl.textContent = 'Ready';

      // Optional: Send message to extension
      vscode.postMessage({
        type: 'info',
        text: 'Timer has been reset!'
      });
    });

    // ==========================================
    // INITIALIZE
    // ==========================================
    updateDisplay();
  </script>
</body>
</html>`;
  }
}
