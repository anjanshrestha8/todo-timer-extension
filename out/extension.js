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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const TimerViewProvider_1 = require("./webviews/TimerViewProvider");
const TodoViewProvider_1 = require("./webviews/TodoViewProvider");
/**
 * This function is called when your extension is activated
 * Activation happens when VS Code starts OR when user runs a command
 */
function activate(context) {
    console.log("Timer & Todo Extension is now active!");
    // ============================================
    // SECTION 1: TIMER SETUP
    // ============================================
    // Create the Timer webview provider
    // Think of this as creating a "Timer Manager"
    const timerProvider = new TimerViewProvider_1.TimerViewProvider(context.extensionUri);
    // Register the Timer webview
    // This tells VS Code: "Hey, I have a custom view panel called 'timer-todo.timer'"
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("timer-todo.timer", // Unique ID for this webview
    timerProvider));
    // Register the "Open Timer" command
    // When user clicks this command, it opens the Timer panel
    const openTimerCommand = vscode.commands.registerCommand("timer-todo.openTimer", () => {
        // Execute the command to focus on the timer view
        vscode.commands.executeCommand("timer-todo.timer.focus");
    });
    context.subscriptions.push(openTimerCommand);
    // ============================================
    // SECTION 2: TODO SETUP (COMPLETELY INDEPENDENT)
    // ============================================
    // Create the Todo webview provider
    // This is a separate "Todo Manager" - no connection to Timer
    const todoProvider = new TodoViewProvider_1.TodoViewProvider(context.extensionUri, context);
    // Register the Todo webview
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("timer-todo.todo", // Different unique ID
    todoProvider));
    // Register the "Open Todo" command
    const openTodoCommand = vscode.commands.registerCommand("timer-todo.openTodo", () => {
        vscode.commands.executeCommand("timer-todo.todo.focus");
    });
    context.subscriptions.push(openTodoCommand);
    // ============================================
    // SUCCESS MESSAGE
    // ============================================
    vscode.window.showInformationMessage("Timer & Todo Extension loaded successfully!");
}
/**
 * This function is called when your extension is deactivated
 * Clean up resources here if needed
 */
function deactivate() {
    console.log("Timer & Todo Extension is now deactivated");
}
//# sourceMappingURL=extension.js.map