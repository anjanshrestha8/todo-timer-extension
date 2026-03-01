"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimerViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * TimerViewProvider manages the Timer webview
 * It creates the HTML content and handles messages from the webview
 */
class TimerViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    /**
     * This function is called when VS Code wants to show your webview
     * It's like VS Code saying: "Hey, give me the HTML content for your Timer"
     */
    resolveWebviewView(webviewView, context, _token) {
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
    _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webviews', 'html', 'timer.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }
}
exports.TimerViewProvider = TimerViewProvider;
TimerViewProvider.viewType = 'timer-todo.timer';
//# sourceMappingURL=TimerViewProvider.js.map