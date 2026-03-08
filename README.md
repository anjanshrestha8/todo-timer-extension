# Timer & Todo Extension

A VS Code extension with a timer and a categorized todo list.

## Features

### Timer
- Start, pause, and reset functionality
- Clean, easy-to-read display
- Independent from the todo list

### Todo List
- Add, edit, complete, and delete todos
- **Categories** — organize todos into Personal, Work, or any custom category
- **Category tab bar** — filter your list by category with one click
- **Color-coded badges** — each todo shows which category it belongs to
- **Drag-and-drop reordering** — prioritize tasks by dragging them
- **Export & Import** — save todos to a JSON file (per category or all at once) and import them back
- Persistent storage — todos and categories survive VS Code restarts

## How to Use

1. Look for the **Timer & Todo** icon in the Activity Bar (left sidebar)
2. Click to open the sidebar — you'll see two panels: **Timer** and **Todo List**

### Using the Timer
| Action | How |
|--------|-----|
| Start  | Click **Start** |
| Pause  | Click **Pause** |
| Reset  | Click **Reset** to go back to 00:00 |

### Using the Todo List

#### Adding a todo
1. Type your task in the input box
2. Select a category from the dropdown beneath the input
3. Click **Add** or press `Enter`

#### Managing categories
- The tab bar at the top shows **All**, **Personal**, **Work**, and any custom categories you create
- Click a tab to filter todos by that category
- Click **+ New** to create a custom category — you'll be prompted for a name and a color
- Right-click a custom category tab to delete it (its todos move to Personal)

#### Other actions
| Action   | How |
|----------|-----|
| Complete | Check the checkbox next to a todo |
| Edit     | Click the ✏️ icon — you can change both the text and the category |
| Delete   | Click the 🗑️ icon |
| Reorder  | Drag the ⋮ handle — top of the list = highest priority |

### Exporting & Importing

**From the todo panel:**
- Click the **Export** button in the top-right corner of the Todo panel to export the currently visible category (or all todos if "All" is selected)

**From the Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`):
| Command | Description |
|---------|-------------|
| `Timer & Todo: Export Todos` | Choose a category and save todos to a `.json` file |
| `Timer & Todo: Import Todos` | Load todos from a previously exported `.json` file (merge or replace) |

## Development

To run this extension in development mode:

1. Clone this repository
2. Run `npm install`
3. Press `F5` to open a new VS Code window with the extension loaded
4. Look for the **Timer & Todo** icon in the Activity Bar

## Credits

Built as a learning project for VS Code extension development.
