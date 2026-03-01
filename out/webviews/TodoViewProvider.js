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
exports.TodoViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * TodoViewProvider manages the Todo List webview
 * It handles storage, adding/deleting/editing todos, and UI updates
 */
class TodoViewProvider {
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
    }
    /**
     * Called when VS Code shows the Todo webview
     */
    resolveWebviewView(webviewView, context, _token) {
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
    _getTodos() {
        // globalState: persists across workspaces
        // workspaceState: only for current workspace
        const todos = this._context.globalState.get(TodoViewProvider.STORAGE_KEY, []);
        return todos;
    }
    /**
     * Save todos to persistent storage
     */
    _saveTodos(todos) {
        this._context.globalState.update(TodoViewProvider.STORAGE_KEY, todos);
    }
    /**
     * Add a new todo
     */
    _addTodo(text) {
        const todos = this._getTodos();
        const newTodo = {
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
    _editTodo(id, newText) {
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
    _deleteTodo(id) {
        const todos = this._getTodos();
        const filteredTodos = todos.filter((todo) => todo.id !== id);
        this._saveTodos(filteredTodos);
    }
    /**
     * Toggle todo completion status
     */
    _toggleTodo(id) {
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
    _reorderTodos(newOrder) {
        this._saveTodos(newOrder);
    }
    /**
     * Generate HTML for Todo webview
     * Reads from the external todo.html file
     */
    _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webviews', 'html', 'todo.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }
}
exports.TodoViewProvider = TodoViewProvider;
TodoViewProvider.viewType = "timer-todo.todo";
// Storage key for saving todos
TodoViewProvider.STORAGE_KEY = "timer-todo.todos";
//# sourceMappingURL=TodoViewProvider.js.map