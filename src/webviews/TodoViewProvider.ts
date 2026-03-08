import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Interface defining the structure of a Todo item
 */
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  category: string; // category id
}

/**
 * Interface defining a category
 */
interface Category {
  id: string;
  name: string;
  color: string; // hex color
}

/**
 * TodoViewProvider manages the Todo List webview
 * It handles storage, adding/deleting/editing todos, and UI updates
 */
export class TodoViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "timer-todo.todo";
  private _view?: vscode.WebviewView;

  private static readonly STORAGE_KEY = "timer-todo.todos";
  private static readonly CATEGORIES_KEY = "timer-todo.categories";

  private static readonly DEFAULT_CATEGORIES: Category[] = [
    { id: "personal", name: "Personal", color: "#4fc3f7" },
    { id: "work", name: "Work", color: "#81c784" },
  ];

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

    const sendData = () => {
      webviewView.webview.postMessage({
        type: "todosData",
        todos: this._getTodos(),
        categories: this._getCategories(),
      });
    };

    // ==========================================
    // MESSAGE HANDLING FROM WEBVIEW
    // ==========================================
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getTodos":
          sendData();
          break;

        case "addTodo":
          this._addTodo(message.text, message.category);
          sendData();
          vscode.window.showInformationMessage("Todo added!");
          break;

        case "editTodo":
          this._editTodo(message.id, message.text, message.category);
          sendData();
          vscode.window.showInformationMessage("Todo updated!");
          break;

        case "deleteTodo":
          this._deleteTodo(message.id);
          sendData();
          vscode.window.showInformationMessage("Todo deleted!");
          break;

        case "toggleTodo":
          this._toggleTodo(message.id);
          sendData();
          break;

        case "reorderTodos":
          this._reorderTodos(message.todos);
          sendData();
          break;

        case "addCategory":
          await this._promptAndAddCategory();
          sendData();
          break;

        case "renameCategory":
          await this._promptAndRenameCategory(message.categoryId);
          sendData();
          break;

        case "deleteCategory":
          await this._promptAndDeleteCategory(message.categoryId);
          sendData();
          break;

        case "exportTodos":
          await this.exportTodos(message.categoryId);
          break;
      }
    });
  }

  // ==========================================
  // CATEGORY METHODS
  // ==========================================

  public _getCategories(): Category[] {
    return this._context.globalState.get<Category[]>(
      TodoViewProvider.CATEGORIES_KEY,
      TodoViewProvider.DEFAULT_CATEGORIES,
    );
  }

  private _saveCategories(categories: Category[]): void {
    this._context.globalState.update(
      TodoViewProvider.CATEGORIES_KEY,
      categories,
    );
  }

  private async _promptAndAddCategory(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: "Enter category name (e.g. 'Side Project', 'Errands')",
      placeHolder: "Category name",
    });
    if (!name) {
      return;
    }

    const colorOptions = [
      { label: "🔵 Blue", color: "#4fc3f7" },
      { label: "🟢 Green", color: "#81c784" },
      { label: "🟣 Purple", color: "#ce93d8" },
      { label: "🟠 Orange", color: "#ffb74d" },
      { label: "🔴 Red", color: "#e57373" },
      { label: "🟡 Yellow", color: "#fff176" },
    ];

    const colorPick = await vscode.window.showQuickPick(
      colorOptions.map((o) => o.label),
      { placeHolder: "Pick a color for this category" },
    );
    if (!colorPick) {
      return;
    }

    const color = colorOptions.find((o) => o.label === colorPick)!.color;
    const categories = this._getCategories();
    categories.push({ id: Date.now().toString(), name, color });
    this._saveCategories(categories);
    vscode.window.showInformationMessage(`Category "${name}" added!`);
  }

  private async _promptAndRenameCategory(categoryId: string): Promise<void> {
    const categories = this._getCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return;
    }

    const newName = await vscode.window.showInputBox({
      prompt: `Rename category "${category.name}"`,
      value: category.name,
      placeHolder: "New category name",
    });
    if (!newName || newName === category.name) {
      return;
    }

    const colorOptions = [
      { label: "🔵 Blue", color: "#4fc3f7" },
      { label: "🟢 Green", color: "#81c784" },
      { label: "🟣 Purple", color: "#ce93d8" },
      { label: "🟠 Orange", color: "#ffb74d" },
      { label: "🔴 Red", color: "#e57373" },
      { label: "🟡 Yellow", color: "#fff176" },
      { label: "⬜ Keep current color", color: category.color },
    ];

    const colorPick = await vscode.window.showQuickPick(
      colorOptions.map((o) => o.label),
      { placeHolder: "Pick a color (or keep current)" },
    );
    if (!colorPick) {
      return;
    }

    category.name = newName;
    category.color = colorOptions.find((o) => o.label === colorPick)!.color;
    this._saveCategories(categories);
    vscode.window.showInformationMessage(`Category renamed to "${newName}"!`);
  }

  private async _promptAndDeleteCategory(categoryId: string): Promise<void> {
    const categories = this._getCategories();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return;
    }

    const remaining = categories.filter((c) => c.id !== categoryId);
    if (remaining.length === 0) {
      vscode.window.showWarningMessage("You must have at least one category.");
      return;
    }

    const fallback = remaining[0];
    const todos = this._getTodos();
    const affected = todos.filter((t) => t.category === categoryId).length;
    const detail =
      affected > 0
        ? ` ${affected} todo(s) will be moved to "${fallback.name}".`
        : "";

    const confirm = await vscode.window.showWarningMessage(
      `Delete category "${category.name}"?${detail}`,
      { modal: true },
      "Delete",
    );
    if (confirm !== "Delete") {
      return;
    }

    todos.forEach((t) => {
      if (t.category === categoryId) {
        t.category = fallback.id;
      }
    });
    this._saveTodos(todos);
    this._saveCategories(remaining);
    vscode.window.showInformationMessage(
      `Category "${category.name}" deleted.`,
    );
  }

  // ==========================================
  // EXPORT / IMPORT
  // ==========================================

  public async exportTodos(categoryId?: string): Promise<void> {
    const todos = this._getTodos();
    const categories = this._getCategories();

    const filtered =
      categoryId && categoryId !== "all"
        ? todos.filter((t) => t.category === categoryId)
        : todos;

    const categoryName =
      categoryId && categoryId !== "all"
        ? (categories.find((c) => c.id === categoryId)?.name ?? categoryId)
        : "All";

    const exportData = {
      exportedAt: new Date().toISOString(),
      category: categoryName,
      todos: filtered.map((t) => ({
        ...t,
        categoryName:
          categories.find((c) => c.id === t.category)?.name ?? "Uncategorized",
      })),
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(
        `todos-${categoryName.toLowerCase().replace(/\s+/g, "-")}.json`,
      ),
      filters: { JSON: ["json"] },
    });

    if (uri) {
      fs.writeFileSync(uri.fsPath, JSON.stringify(exportData, null, 2), "utf8");
      vscode.window.showInformationMessage(
        `Exported ${filtered.length} todo(s) to ${path.basename(uri.fsPath)}`,
      );
    }
  }

  public async importTodos(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      filters: { JSON: ["json"] },
      canSelectMany: false,
    });
    if (!uris || uris.length === 0) {
      return;
    }

    try {
      const raw = fs.readFileSync(uris[0].fsPath, "utf8");
      const data = JSON.parse(raw);
      const importedTodos: Todo[] = data.todos ?? [];

      const choice = await vscode.window.showQuickPick(
        ["Merge (keep existing)", "Replace all"],
        { placeHolder: "How do you want to import?" },
      );
      if (!choice) {
        return;
      }

      const existing = this._getTodos();
      const merged =
        choice === "Merge (keep existing)"
          ? [
              ...importedTodos.filter(
                (i) => !existing.find((e) => e.id === i.id),
              ),
              ...existing,
            ]
          : importedTodos;

      this._saveTodos(merged);
      this._view?.webview.postMessage({
        type: "todosData",
        todos: merged,
        categories: this._getCategories(),
      });
      vscode.window.showInformationMessage(
        `Imported ${importedTodos.length} todo(s)!`,
      );
    } catch {
      vscode.window.showErrorMessage(
        "Failed to import: invalid or corrupt file.",
      );
    }
  }

  // ==========================================
  // TODO CRUD
  // ==========================================

  private _getTodos(): Todo[] {
    return this._context.globalState.get<Todo[]>(
      TodoViewProvider.STORAGE_KEY,
      [],
    );
  }

  private _saveTodos(todos: Todo[]): void {
    this._context.globalState.update(TodoViewProvider.STORAGE_KEY, todos);
  }

  private _addTodo(text: string, category: string = "personal"): void {
    const todos = this._getTodos();
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      category,
    };
    todos.unshift(newTodo);
    this._saveTodos(todos);
  }

  private _editTodo(id: string, newText: string, newCategory?: string): void {
    const todos = this._getTodos();
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.text = newText;
      if (newCategory) {
        todo.category = newCategory;
      }
      this._saveTodos(todos);
    }
  }

  private _deleteTodo(id: string): void {
    this._saveTodos(this._getTodos().filter((t) => t.id !== id));
  }

  private _toggleTodo(id: string): void {
    const todos = this._getTodos();
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this._saveTodos([
        ...todos.filter((t) => !t.completed),
        ...todos.filter((t) => t.completed),
      ]);
    }
  }

  private _reorderTodos(newOrder: Todo[]): void {
    this._saveTodos(newOrder);
  }

  private _getHtmlForWebview(): string {
    const htmlPath = path.join(
      this._extensionUri.fsPath,
      "src",
      "webviews",
      "html",
      "todo.html",
    );
    return fs.readFileSync(htmlPath, "utf8");
  }
}
