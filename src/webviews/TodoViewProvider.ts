import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Interface defining the structure of a Todo item
 */
interface Todo {
  id: string; // Unique identifier (timestamp-based)
  text: string; // The actual todo text
  completed: boolean; // Is it done?
  createdAt: string; // ISO date string for when todo was created
}

/**
 * TodoViewProvider manages the Todo List webview
 * It handles storage, adding/deleting/editing todos, and UI updates
 */
export class TodoViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "timer-todo.todo";
  private _view?: vscode.WebviewView;

  // Storage key for saving todos
  private static readonly STORAGE_KEY = "timer-todo.todos";

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  /**
   * Called when VS Code shows the Todo webview
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    // ==========================================
    // MESSAGE HANDLING FROM WEBVIEW
    // ==========================================
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getTodos":
          // Webview is asking for the current list of todos
          const todos = this._getTodos();
          webviewView.webview.postMessage({
            type: "todosData",
            todos: todos,
          });
          break;

        case "addTodo":
          // Webview wants to add a new todo
          this._addTodo(message.text);
          // Send updated list back to webview
          const updatedTodos = this._getTodos();
          webviewView.webview.postMessage({
            type: "todosData",
            todos: updatedTodos,
          });
          vscode.window.showInformationMessage("Todo added!");
          break;

        case "editTodo":
          // Webview wants to edit a todo
          this._editTodo(message.id, message.text);
          // Send updated list back
          const editedTodos = this._getTodos();
          webviewView.webview.postMessage({
            type: "todosData",
            todos: editedTodos,
          });
          vscode.window.showInformationMessage("Todo updated!");
          break;

        case "deleteTodo":
          // Webview wants to delete a todo
          this._deleteTodo(message.id);
          // Send updated list back
          const remainingTodos = this._getTodos();
          webviewView.webview.postMessage({
            type: "todosData",
            todos: remainingTodos,
          });
          vscode.window.showInformationMessage("Todo deleted!");
          break;

        case "toggleTodo":
          // Webview wants to toggle todo completion status
          this._toggleTodo(message.id);
          // Send updated list back
          const toggledTodos = this._getTodos();
          webviewView.webview.postMessage({
            type: "todosData",
            todos: toggledTodos,
          });
          break;

        case "reorderTodos":
          // Webview wants to reorder todos (drag and drop)
          this._reorderTodos(message.todos);
          // Send updated list back
          const reorderedTodos = this._getTodos();
          webviewView.webview.postMessage({
            type: "todosData",
            todos: reorderedTodos,
          });
          break;
      }
    });
  }

  /**
   * Get todos from VS Code's persistent storage
   * This data survives VS Code restarts!
   */
  private _getTodos(): Todo[] {
    // globalState: persists across workspaces
    // workspaceState: only for current workspace
    const todos = this._context.globalState.get<Todo[]>(
      TodoViewProvider.STORAGE_KEY,
      [], // Default to empty array if no todos exist
    );
    return todos;
  }

  /**
   * Save todos to persistent storage
   */
  private _saveTodos(todos: Todo[]): void {
    this._context.globalState.update(TodoViewProvider.STORAGE_KEY, todos);
  }

  /**
   * Add a new todo
   */
  private _addTodo(text: string): void {
    const todos = this._getTodos();
    const newTodo: Todo = {
      id: Date.now().toString(), // Simple unique ID using timestamp
      text: text,
      completed: false,
      createdAt: new Date().toISOString(), // Store creation date
    };
    todos.unshift(newTodo); // Add to beginning of array (top of list)
    this._saveTodos(todos);
  }

  /**
   * Edit an existing todo
   */
  private _editTodo(id: string, newText: string): void {
    const todos = this._getTodos();
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.text = newText;
      this._saveTodos(todos);
    }
  }

  /**
   * Delete a todo by ID
   */
  private _deleteTodo(id: string): void {
    const todos = this._getTodos();
    const filteredTodos = todos.filter((todo) => todo.id !== id);
    this._saveTodos(filteredTodos);
  }

  /**
   * Toggle todo completion status
   */
  private _toggleTodo(id: string): void {
    const todos = this._getTodos();
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      // Sort: incomplete tasks first, then completed tasks
      const sortedTodos = [
        ...todos.filter((t) => !t.completed),
        ...todos.filter((t) => t.completed),
      ];
      this._saveTodos(sortedTodos);
    }
  }

  /**
   * Reorder todos (for drag and drop)
   */
  private _reorderTodos(newOrder: Todo[]): void {
    this._saveTodos(newOrder);
  }

  /**
   * Generate HTML for Todo webview
   * Reads from the external todo.html file
   */
  private _getHtmlForWebview(): string {
    const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webviews', 'html', 'todo.html');
    return fs.readFileSync(htmlPath, 'utf8');
  }
}
