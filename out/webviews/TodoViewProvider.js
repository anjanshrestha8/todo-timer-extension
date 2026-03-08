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
    _getCategories() {
        return this._context.globalState.get(TodoViewProvider.CATEGORIES_KEY, TodoViewProvider.DEFAULT_CATEGORIES);
    }
    _saveCategories(categories) {
        this._context.globalState.update(TodoViewProvider.CATEGORIES_KEY, categories);
    }
    async _promptAndAddCategory() {
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
        const colorPick = await vscode.window.showQuickPick(colorOptions.map((o) => o.label), { placeHolder: "Pick a color for this category" });
        if (!colorPick) {
            return;
        }
        const color = colorOptions.find((o) => o.label === colorPick).color;
        const categories = this._getCategories();
        categories.push({ id: Date.now().toString(), name, color });
        this._saveCategories(categories);
        vscode.window.showInformationMessage(`Category "${name}" added!`);
    }
    async _promptAndRenameCategory(categoryId) {
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
        const colorPick = await vscode.window.showQuickPick(colorOptions.map((o) => o.label), { placeHolder: "Pick a color (or keep current)" });
        if (!colorPick) {
            return;
        }
        category.name = newName;
        category.color = colorOptions.find((o) => o.label === colorPick).color;
        this._saveCategories(categories);
        vscode.window.showInformationMessage(`Category renamed to "${newName}"!`);
    }
    async _promptAndDeleteCategory(categoryId) {
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
        const detail = affected > 0
            ? ` ${affected} todo(s) will be moved to "${fallback.name}".`
            : "";
        const confirm = await vscode.window.showWarningMessage(`Delete category "${category.name}"?${detail}`, { modal: true }, "Delete");
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
        vscode.window.showInformationMessage(`Category "${category.name}" deleted.`);
    }
    // ==========================================
    // EXPORT / IMPORT
    // ==========================================
    async exportTodos(categoryId) {
        const todos = this._getTodos();
        const categories = this._getCategories();
        const filtered = categoryId && categoryId !== "all"
            ? todos.filter((t) => t.category === categoryId)
            : todos;
        const categoryName = categoryId && categoryId !== "all"
            ? (categories.find((c) => c.id === categoryId)?.name ?? categoryId)
            : "All";
        const exportData = {
            exportedAt: new Date().toISOString(),
            category: categoryName,
            todos: filtered.map((t) => ({
                ...t,
                categoryName: categories.find((c) => c.id === t.category)?.name ?? "Uncategorized",
            })),
        };
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`todos-${categoryName.toLowerCase().replace(/\s+/g, "-")}.json`),
            filters: { JSON: ["json"] },
        });
        if (uri) {
            fs.writeFileSync(uri.fsPath, JSON.stringify(exportData, null, 2), "utf8");
            vscode.window.showInformationMessage(`Exported ${filtered.length} todo(s) to ${path.basename(uri.fsPath)}`);
        }
    }
    async importTodos() {
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
            const importedTodos = data.todos ?? [];
            const choice = await vscode.window.showQuickPick(["Merge (keep existing)", "Replace all"], { placeHolder: "How do you want to import?" });
            if (!choice) {
                return;
            }
            const existing = this._getTodos();
            const merged = choice === "Merge (keep existing)"
                ? [
                    ...importedTodos.filter((i) => !existing.find((e) => e.id === i.id)),
                    ...existing,
                ]
                : importedTodos;
            this._saveTodos(merged);
            this._view?.webview.postMessage({
                type: "todosData",
                todos: merged,
                categories: this._getCategories(),
            });
            vscode.window.showInformationMessage(`Imported ${importedTodos.length} todo(s)!`);
        }
        catch {
            vscode.window.showErrorMessage("Failed to import: invalid or corrupt file.");
        }
    }
    // ==========================================
    // TODO CRUD
    // ==========================================
    _getTodos() {
        return this._context.globalState.get(TodoViewProvider.STORAGE_KEY, []);
    }
    _saveTodos(todos) {
        this._context.globalState.update(TodoViewProvider.STORAGE_KEY, todos);
    }
    _addTodo(text, category = "personal") {
        const todos = this._getTodos();
        const newTodo = {
            id: Date.now().toString(),
            text,
            completed: false,
            createdAt: new Date().toISOString(),
            category,
        };
        todos.unshift(newTodo);
        this._saveTodos(todos);
    }
    _editTodo(id, newText, newCategory) {
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
    _deleteTodo(id) {
        this._saveTodos(this._getTodos().filter((t) => t.id !== id));
    }
    _toggleTodo(id) {
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
    _reorderTodos(newOrder) {
        this._saveTodos(newOrder);
    }
    _getHtmlForWebview() {
        const htmlPath = path.join(this._extensionUri.fsPath, "src", "webviews", "html", "todo.html");
        return fs.readFileSync(htmlPath, "utf8");
    }
}
exports.TodoViewProvider = TodoViewProvider;
TodoViewProvider.viewType = "timer-todo.todo";
TodoViewProvider.STORAGE_KEY = "timer-todo.todos";
TodoViewProvider.CATEGORIES_KEY = "timer-todo.categories";
TodoViewProvider.DEFAULT_CATEGORIES = [
    { id: "personal", name: "Personal", color: "#4fc3f7" },
    { id: "work", name: "Work", color: "#81c784" },
];
//# sourceMappingURL=TodoViewProvider.js.map