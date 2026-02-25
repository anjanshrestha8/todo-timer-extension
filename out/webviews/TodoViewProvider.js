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
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
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
        };
        todos.push(newTodo);
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
            this._saveTodos(todos);
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
     */
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Todo List</title>

<!-- VS Code Codicons -->
<link href="https://unpkg.com/@vscode/codicons/dist/codicon.css" rel="stylesheet" />

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background-color: var(--vscode-editor-background);
    padding: 20px;
  }

  h1 {
    font-size: 22px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .codicon { font-size: 10px; }

  .add-todo-form {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  #todo-input {
    flex: 1;
    padding: 8px 12px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-size: 16px;
  }

  #add-btn {
    padding: 6px 12px;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #add-btn:hover {
    background-color: var(--vscode-button-hoverBackground);
  }

  #todo-list { list-style: none; }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 8px; /* Increased gap between drag handle, checkbox, and text */
    padding: 8px 10px; /* Increased padding for bigger text */
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    margin-bottom: 12px; /* Maintain spacing between tasks */
    cursor: move;
    word-break: break-word;
  }

  .drag-handle {
    cursor: grab;
    color: var(--vscode-descriptionForeground);
    user-select: none;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .todo-text {
    font-size: 16px; /* Increased font size for tasks */
  }

  .todo-text.completed { 
    text-decoration: line-through; 
    opacity: 0.6; 
  }

  .todo-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .todo-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }

  .icon-btn {
    padding: 4px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--vscode-icon-foreground);
    border-radius: 4px;
  }

  .icon-btn:hover {
    background-color: var(--vscode-toolbar-hoverBackground);
  }

  .priority-info {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .empty-state {
    text-align: center;
    padding: 30px;
    color: var(--vscode-descriptionForeground);
  }

  textarea.todo-edit-textarea {
    width: 100%;
    height: 90%;
    resize: none;
    padding: 6px;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 18px; /* Match display font size */
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
  }
</style>
</head>

<body>

<h1>
  <i class="codicon codicon-checklist"></i>
  Todo List
</h1>

<div class="add-todo-form">
  <input type="text" id="todo-input" placeholder="What needs to be done?" />
  <button id="add-btn" title="Add Todo">
    <i class="codicon codicon-add"></i>
  </button>
</div>

<div class="priority-info">
  <i class="codicon codicon-lightbulb"></i>
  Drag tasks to reorder (top = highest priority)
</div>

<ul id="todo-list"></ul>

<script>
const vscode = acquireVsCodeApi();
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');

let todos = [];
let editingId = null;

vscode.postMessage({ type: 'getTodos' });

window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'todosData') {
    todos = message.todos;
    renderTodos(todos);
  }
});

function renderTodos(todosToRender) {
  todoList.innerHTML = '';
  if (todosToRender.length === 0) {
    todoList.innerHTML = '<div class="empty-state">No todos yet</div>';
    return;
  }

  todosToRender.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.draggable = true;
    li.dataset.id = todo.id;

    const dragHandle = document.createElement('span');
    dragHandle.innerHTML = '<i class="codicon codicon-kebab-vertical"></i>';
    dragHandle.className = 'drag-handle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => {
      vscode.postMessage({ type: 'toggleTodo', id: todo.id });
    });

    const todoContent = document.createElement('div');
    todoContent.className = 'todo-content';

    if (editingId === todo.id) {
      const editTextarea = document.createElement('textarea');
      editTextarea.className = 'todo-edit-textarea';
      editTextarea.value = todo.text;

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'icon-btn';
      saveBtn.innerHTML = '<i class="codicon codicon-save"></i>';
      saveBtn.title = 'Save';
      saveBtn.onclick = () => {
        const newText = editTextarea.value.trim();
        if (newText) {
          vscode.postMessage({ type: 'editTodo', id: todo.id, text: newText });
          editingId = null;
        }
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'icon-btn';
      cancelBtn.innerHTML = '<i class="codicon codicon-close"></i>';
      cancelBtn.title = 'Cancel';
      cancelBtn.onclick = () => {
        editingId = null;
        renderTodos(todos);
      };

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);

      todoContent.appendChild(editTextarea);
      li.append(dragHandle, checkbox, todoContent, actions);
    } else {
      const span = document.createElement('span');
      span.className = 'todo-text' + (todo.completed ? ' completed' : '');
      span.textContent = todo.text;
      span.style.whiteSpace = 'pre-wrap';
      span.style.wordBreak = 'break-word';

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.innerHTML = '<i class="codicon codicon-edit"></i>';
      editBtn.title = 'Edit';
      editBtn.onclick = () => {
        editingId = todo.id;
        renderTodos(todos);
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn';
      deleteBtn.innerHTML = '<i class="codicon codicon-trash"></i>';
      deleteBtn.title = 'Delete';
      deleteBtn.onclick = () => {
        vscode.postMessage({ type: 'deleteTodo', id: todo.id });
      };

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      todoContent.appendChild(span);
      li.append(dragHandle, checkbox, todoContent, actions);
    }

    todoList.appendChild(li);
  });
}

addBtn.addEventListener('click', () => {
  const text = todoInput.value.trim();
  if (!text) return;
  vscode.postMessage({ type: 'addTodo', text });
  todoInput.value = '';
});

todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addBtn.click();
});
</script>
</body>
</html>`;
    }
}
exports.TodoViewProvider = TodoViewProvider;
TodoViewProvider.viewType = "timer-todo.todo";
// Storage key for saving todos
TodoViewProvider.STORAGE_KEY = "timer-todo.todos";
//# sourceMappingURL=TodoViewProvider.js.map