import * as vscode from "vscode";

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
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
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
    transition: opacity 0.2s, transform 0.4s ease-out, max-height 0.4s ease-out;
    transform-origin: top;
  }

  .todo-item.dragging {
    opacity: 0.5;
  }

  .todo-item.moving-down {
    animation: slideDown 0.5s ease-out;
  }

  @keyframes slideDown {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    50% {
      transform: translateY(-10px);
      opacity: 0.7;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .drag-handle {
    cursor: grab;
    color: var(--vscode-descriptionForeground);
    user-select: none;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .todo-text {
    font-size: 14px; /* Reduced font size for tasks */
  }

  .todo-text.completed { 
    text-decoration: line-through; 
    opacity: 0.6; 
  }

  .todo-date {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
    margin-top: 2px;
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
    font-size: 14px; /* Match display font size */
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
let lastToggledId = null;

vscode.postMessage({ type: 'getTodos' });

window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'todosData') {
    todos = message.todos;
    renderTodos(todos, lastToggledId);
    lastToggledId = null; // Reset after rendering
  }
});

function renderTodos(todosToRender, animateCompletedId = null) {
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

    // Add animation class if this todo was just completed
    if (animateCompletedId === todo.id && todo.completed) {
      li.classList.add('moving-down');
      // Remove animation class after animation completes
      setTimeout(() => {
        li.classList.remove('moving-down');
      }, 500);
    }

    const dragHandle = document.createElement('span');
    dragHandle.innerHTML = '<i class="codicon codicon-kebab-vertical"></i>';
    dragHandle.className = 'drag-handle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => {
      // Store the ID for animation
      lastToggledId = todo.id;
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

      // Add creation date
      const dateSpan = document.createElement('div');
      dateSpan.className = 'todo-date';
      const createdDate = todo.createdAt ? new Date(todo.createdAt).toISOString().split('T')[0] : '';
      dateSpan.textContent = createdDate;

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
      todoContent.appendChild(dateSpan);
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

// ==========================================
// DRAG AND DROP FUNCTIONALITY
// ==========================================
let draggedElement = null;

todoList.addEventListener('dragstart', (e) => {
  if (e.target.classList.contains('todo-item')) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
  }
});

todoList.addEventListener('dragend', (e) => {
  if (e.target.classList.contains('todo-item')) {
    e.target.classList.remove('dragging');
    draggedElement = null;
  }
});

todoList.addEventListener('dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(todoList, e.clientY);
  if (draggedElement) {
    if (afterElement == null) {
      todoList.appendChild(draggedElement);
    } else {
      todoList.insertBefore(draggedElement, afterElement);
    }
  }
});

todoList.addEventListener('drop', (e) => {
  e.preventDefault();
  // Get the new order of todos based on DOM
  const todoItems = Array.from(todoList.querySelectorAll('.todo-item'));
  const reorderedTodos = todoItems.map(item => {
    const id = item.dataset.id;
    return todos.find(t => t.id === id);
  }).filter(Boolean);
  
  vscode.postMessage({ type: 'reorderTodos', todos: reorderedTodos });
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.todo-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
</script>
</body>
</html>`;
  }
}
