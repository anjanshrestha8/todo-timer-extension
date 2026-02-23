import * as vscode from "vscode";

/**
 * Interface defining the structure of a Todo item
 */
interface Todo {
  id: string; // Unique identifier (timestamp-based)
  text: string; // The actual todo text
  completed: boolean; // Is it done?
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
    };
    todos.push(newTodo);
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
      this._saveTodos(todos);
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
  <style>
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
    }

    h1 {
      color: var(--vscode-foreground);
      font-size: 24px;
      margin-bottom: 20px;
    }

    /* Add Todo Form */
    .add-todo-form {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    #todo-input {
      flex: 1;
      padding: 8px 12px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 14px;
    }

    #todo-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    #add-btn {
      padding: 8px 16px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    #add-btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    /* Todo List */
    #todo-list {
      list-style: none;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      margin-bottom: 8px;
      transition: background-color 0.2s;
      cursor: move;
      position: relative;
    }

    .todo-item:hover {
      background-color: var(--vscode-list-hoverBackground);
    }

    /* Dragging state */
    .todo-item.dragging {
      opacity: 0.5;
      background-color: var(--vscode-list-activeSelectionBackground);
    }

    /* Drag handle */
    .drag-handle {
      cursor: grab;
      color: var(--vscode-descriptionForeground);
      font-size: 16px;
      padding: 0 4px;
      user-select: none;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .todo-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .todo-text {
      flex: 1;
      font-size: 14px;
      color: var(--vscode-foreground);
      word-break: break-word;
    }

    .todo-text.completed {
      text-decoration: line-through;
      opacity: 0.6;
    }

    /* Edit mode */
    .todo-edit-input {
      flex: 1;
      padding: 4px 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-focusBorder);
      border-radius: 3px;
      font-size: 14px;
    }

    .todo-edit-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    /* Buttons */
    .todo-actions {
      display: flex;
      gap: 6px;
    }

    .edit-btn, .save-btn, .cancel-btn, .delete-btn {
      padding: 4px 12px;
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .edit-btn:hover, .save-btn:hover, .cancel-btn:hover, .delete-btn:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .save-btn {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .save-btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
    }

    /* Priority indicator */
    .priority-info {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 10px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>📝 Todo List</h1>
  
  <!-- Add Todo Form -->
  <div class="add-todo-form">
    <input 
      type="text" 
      id="todo-input" 
      placeholder="What needs to be done?"
      autocomplete="off"
    />
    <button id="add-btn">Add</button>
  </div>
  
  <div class="priority-info">💡 Tip: Drag tasks to reorder by priority (top = highest)</div>
  
  <!-- Todo List -->
  <ul id="todo-list">
    <!-- Todos will be inserted here dynamically -->
  </ul>

  <script>
    const vscode = acquireVsCodeApi();

    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');

    // Store current todos in memory
    let todos = [];

    // Track editing state
    let editingId = null;

    // ==========================================
    // REQUEST INITIAL TODO DATA
    // ==========================================
    vscode.postMessage({ type: 'getTodos' });

    // ==========================================
    // LISTEN FOR MESSAGES FROM EXTENSION
    // ==========================================
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      if (message.type === 'todosData') {
        todos = message.todos;
        renderTodos(todos);
      }
    });

    // ==========================================
    // RENDER TODOS TO THE DOM
    // ==========================================
    function renderTodos(todosToRender) {
      todoList.innerHTML = '';

      if (todosToRender.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No todos yet. Add one above! 🎯</div>';
        return;
      }

      todosToRender.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.draggable = true;
        li.dataset.id = todo.id;
        li.dataset.index = index;

        // Drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.title = 'Drag to reorder';

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => {
          vscode.postMessage({
            type: 'toggleTodo',
            id: todo.id,
          });
        });

        // Check if this todo is being edited
        const isEditing = editingId === todo.id;

        if (isEditing) {
          // Edit mode: show input field
          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.className = 'todo-edit-input';
          editInput.value = todo.text;
          editInput.id = 'edit-input-' + todo.id;

          // Save button
          const saveBtn = document.createElement('button');
          saveBtn.className = 'save-btn';
          saveBtn.textContent = 'Save';
          saveBtn.addEventListener('click', () => {
            const newText = editInput.value.trim();
            if (newText) {
              vscode.postMessage({
                type: 'editTodo',
                id: todo.id,
                text: newText,
              });
              editingId = null;
            }
          });

          // Cancel button
          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'cancel-btn';
          cancelBtn.textContent = 'Cancel';
          cancelBtn.addEventListener('click', () => {
            editingId = null;
            renderTodos(todos);
          });

          // Handle Enter key to save
          editInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              saveBtn.click();
            } else if (e.key === 'Escape') {
              cancelBtn.click();
            }
          });

          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'todo-actions';
          actionsDiv.appendChild(saveBtn);
          actionsDiv.appendChild(cancelBtn);

          li.appendChild(dragHandle);
          li.appendChild(checkbox);
          li.appendChild(editInput);
          li.appendChild(actionsDiv);

          // Focus the input
          setTimeout(() => {
            editInput.focus();
            editInput.select();
          }, 0);

        } else {
          // View mode: show text and edit/delete buttons
          const span = document.createElement('span');
          span.className = 'todo-text' + (todo.completed ? ' completed' : '');
          span.textContent = todo.text;

          // Edit button
          const editBtn = document.createElement('button');
          editBtn.className = 'edit-btn';
          editBtn.textContent = 'Edit';
          editBtn.addEventListener('click', () => {
            editingId = todo.id;
            renderTodos(todos);
          });

          // Delete button
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-btn';
          deleteBtn.textContent = 'Delete';
          deleteBtn.addEventListener('click', () => {
            vscode.postMessage({
              type: 'deleteTodo',
              id: todo.id,
            });
          });

          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'todo-actions';
          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(deleteBtn);

          li.appendChild(dragHandle);
          li.appendChild(checkbox);
          li.appendChild(span);
          li.appendChild(actionsDiv);
        }

        // Add drag event listeners
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragleave', handleDragLeave);

        todoList.appendChild(li);
      });
    }

    // ==========================================
    // DRAG AND DROP HANDLERS
    // ==========================================
    let draggedElement = null;

    function handleDragStart(e) {
      draggedElement = this;
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragEnd(e) {
      this.classList.remove('dragging');
      
      // Remove all drag-over classes
      const items = todoList.querySelectorAll('.todo-item');
      items.forEach(item => {
        item.classList.remove('drag-over');
      });
    }

    function handleDragOver(e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = 'move';
      return false;
    }

    function handleDragEnter(e) {
      if (this !== draggedElement) {
        this.classList.add('drag-over');
      }
    }

    function handleDragLeave(e) {
      this.classList.remove('drag-over');
    }

    function handleDrop(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }

      if (draggedElement !== this) {
        // Get the indices
        const draggedIndex = parseInt(draggedElement.dataset.index);
        const targetIndex = parseInt(this.dataset.index);

        // Reorder the todos array
        const newTodos = [...todos];
        const [removed] = newTodos.splice(draggedIndex, 1);
        newTodos.splice(targetIndex, 0, removed);

        // Send the new order to the extension
        vscode.postMessage({
          type: 'reorderTodos',
          todos: newTodos,
        });
      }

      return false;
    }

    // ==========================================
    // ADD TODO BUTTON HANDLER
    // ==========================================
    addBtn.addEventListener('click', () => {
      const text = todoInput.value.trim();
      
      if (text === '') {
        return;
      }

      vscode.postMessage({
        type: 'addTodo',
        text: text,
      });

      todoInput.value = '';
    });

    // ==========================================
    // ADD TODO ON ENTER KEY
    // ==========================================
    todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });
  </script>
</body>
</html>`;
  }
}
