import * as vscode from "vscode";
import { TimerViewProvider } from "./webviews/TimerViewProvider";
import { TodoViewProvider } from "./webviews/TodoViewProvider";

/**
 * This function is called when your extension is activated
 * Activation happens when VS Code starts OR when user runs a command
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Timer & Todo Extension is now active!");

  // ============================================
  // SECTION 1: TIMER SETUP
  // ============================================

  // Create the Timer webview provider
  // Think of this as creating a "Timer Manager"
  const timerProvider = new TimerViewProvider(context.extensionUri);

  // Register the Timer webview
  // This tells VS Code: "Hey, I have a custom view panel called 'timer-todo.timer'"
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "timer-todo.timer", // Unique ID for this webview
      timerProvider,
    ),
  );

  // Register the "Open Timer" command
  // When user clicks this command, it opens the Timer panel
  const openTimerCommand = vscode.commands.registerCommand(
    "timer-todo.openTimer",
    () => {
      // Execute the command to focus on the timer view
      vscode.commands.executeCommand("timer-todo.timer.focus");
    },
  );
  context.subscriptions.push(openTimerCommand);

  // ============================================
  // SECTION 2: TODO SETUP (COMPLETELY INDEPENDENT)
  // ============================================

  // Create the Todo webview provider
  // This is a separate "Todo Manager" - no connection to Timer
  const todoProvider = new TodoViewProvider(context.extensionUri, context);

  // Register the Todo webview
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "timer-todo.todo", // Different unique ID
      todoProvider,
    ),
  );

  // Register the "Open Todo" command
  const openTodoCommand = vscode.commands.registerCommand(
    "timer-todo.openTodo",
    () => {
      vscode.commands.executeCommand("timer-todo.todo.focus");
    },
  );
  context.subscriptions.push(openTodoCommand);

  // ============================================
  // SECTION 3: EXPORT / IMPORT COMMANDS
  // ============================================

  // Export todos — lets user pick a category then saves a JSON file
  const exportTodosCommand = vscode.commands.registerCommand(
    "timer-todo.exportTodos",
    async () => {
      const categories = todoProvider._getCategories();
      const options = [
        { label: "All Categories", id: "all" },
        ...categories.map((c) => ({ label: c.name, id: c.id })),
      ];
      const pick = await vscode.window.showQuickPick(
        options.map((o) => o.label),
        { placeHolder: "Export which category?" },
      );
      if (!pick) {
        return;
      }
      const chosen = options.find((o) => o.label === pick);
      await todoProvider.exportTodos(chosen?.id);
    },
  );
  context.subscriptions.push(exportTodosCommand);

  // Import todos from a previously exported JSON file
  const importTodosCommand = vscode.commands.registerCommand(
    "timer-todo.importTodos",
    async () => {
      await todoProvider.importTodos();
    },
  );
  context.subscriptions.push(importTodosCommand);

  // ============================================
  // SUCCESS MESSAGE
  // ============================================
  vscode.window.showInformationMessage(
    "Timer & Todo Extension loaded successfully!",
  );
}

/**
 * This function is called when your extension is deactivated
 * Clean up resources here if needed
 */
export function deactivate() {
  console.log("Timer & Todo Extension is now deactivated");
}
