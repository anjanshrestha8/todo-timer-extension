# Timer & Todo Extension

A VS Code extension with a timer and a categorized todo list.

## Features

### Timer
- Start, pause, and reset functionality
- Clean, easy-to-read display
- Independent from the todo list

### Todo List
- Add, edit, complete, and delete todos
- **Categories** — todos are grouped into sections (Personal, Work, or any custom category)
- **Color-coded cards** — each todo card is tinted with its category color for instant visual separation
- **Rename & delete categories** — hover over a category header to reveal edit and delete actions
- **Drag-and-drop reordering** — prioritize tasks by dragging them within a section
- **Export & Import** — save todos to a JSON file and import them back
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
- Todos are displayed as **grouped sections** — one section per category
- Click **Category** in the top-right header to create a new category (you'll pick a name and color)
- **Hover over a category header** to reveal two action buttons:
  - ✏️ **Rename** — update the category name and/or color (available for all categories)
  - 🗑️ **Delete** — remove the category; any todos inside will be moved to the next available category. You must always have at least one category

#### Todo actions
| Action   | How |
|----------|-----|
| Complete | Check the checkbox — completed todos move to the bottom |
| Edit     | Hover the todo and click ✏️ — you can change the text and reassign the category |
| Delete   | Hover the todo and click 🗑️ |
| Reorder  | Drag the ⋮ handle — top of the section = highest priority |

> The creation date of each todo is shown in the top-right corner of its card.

### Exporting & Importing

**From the todo panel:**
- Click **Export** in the header to export all todos to a `.json` file

**From the Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`):
| Command | Description |
|---------|-------------|
| `Timer & Todo: Export Todos` | Choose a category (or all) and save to a `.json` file |
| `Timer & Todo: Import Todos` | Load todos from a previously exported `.json` file (merge or replace) |

## Development

To run this extension in development mode:

1. Clone this repository
2. Run `npm install`
3. Press `F5` to open a new VS Code window with the extension loaded
4. Look for the **Timer & Todo** icon in the Activity Bar

## Credits

Built as a learning project for VS Code extension development.
