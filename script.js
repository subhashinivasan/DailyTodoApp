// DOM Element References
// Grab the text input where the user types the new todo description.
const newTodoInput = document.getElementById('new-todo-input');
// Grab the date picker input for setting an optional due date.
const newTodoDate = document.getElementById('new-todo-date');
// Grab the "Add" button that triggers the add-todo action.
const addTodoBtn = document.getElementById('add-todo-btn');
// Grab the <ul> element that contains all rendered todo items.
const todoList = document.getElementById('todo-list');

// Returns true when the provided value is a valid YYYY-MM-DD date string.
function isValidTodoDate(dateString) {
    // Reject non-string values and blank strings immediately.
    if (typeof dateString !== 'string' || dateString.trim() === '') {
        return false;
    }

    const trimmedDate = dateString.trim();
    // Only accept dates that strictly follow the YYYY-MM-DD format.
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(trimmedDate)) {
        return false;
    }

    // Parse the date using a local midnight time to avoid timezone-offset issues.
    const parsedDate = new Date(`${trimmedDate}T00:00:00`);
    // Confirm the Date object is valid and that the ISO string round-trips to the
    // same value (guards against out-of-range dates such as 2024-02-30).
    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === trimmedDate;
}

// Returns a safe date string for display and storage.
// Returns the trimmed date when valid, or an empty string when the input is
// missing or malformed so that downstream code never works with a bad date.
function normalizeTodoDate(dateString) {
    return isValidTodoDate(dateString) ? dateString.trim() : '';
}

// Removes the temporary animation class after a new todo is rendered.
// Called via setTimeout so the CSS "new" transition has time to play.
function removeNewTodoState(todoItem) {
    todoItem.classList.remove('new');
}

// Removes a todo from the list after its exit animation completes.
// Called via setTimeout so the CSS "removing" transition has time to play
// before the element is detached from the DOM.
function removeTodoItem(todoItem) {
    todoItem.remove();
    // Persist the updated list now that one item has been deleted.
    saveTodos();
}

// Creates and appends a todo item to the list.
// text      – the todo description entered by the user
// date      – an optional YYYY-MM-DD due-date string
// completed – whether the item should be rendered as already checked off
function addTodo(text, date, completed = false) {
    // Create the list item that wraps the entire todo row.
    const li = document.createElement('li');
    li.classList.add('todo-item');

    // Checkbox that lets the user mark the todo as done.
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = completed;

    // Span that holds the todo description text.
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    // Apply the "completed" style immediately when restoring a finished todo.
    if (completed) {
        textSpan.classList.add('completed');
    }

    // Validate and normalize the due date before using it.
    const normalizedDate = normalizeTodoDate(date);
    // Warn in the console when a date was provided but failed validation so
    // that developers can spot data quality issues without disrupting the user.
    if (date && normalizedDate === '') {
        console.warn(`Ignoring invalid todo date: ${date}`);
    }

    // Only create the date label when a valid due date exists.
    let dateSpan = null;
    if (normalizedDate) {
        dateSpan = document.createElement('span');
        dateSpan.classList.add('todo-date');
        dateSpan.textContent = `Due: ${normalizedDate}`;
        // Store the raw date value in a data attribute for easy retrieval later.
        dateSpan.dataset.date = normalizedDate;
    }

    // Delete button that triggers the removal animation and then removes the item.
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = 'Delete';

    // Assemble the todo row: checkbox → text → (optional date) → delete button.
    li.appendChild(checkbox);
    li.appendChild(textSpan);
    if (dateSpan) {
        li.appendChild(dateSpan);
    }

    li.appendChild(deleteBtn);
    todoList.appendChild(li);

    // Trigger the entrance animation, then remove the class after 300 ms.
    li.classList.add('new');
    setTimeout(removeNewTodoState, 300, li);
}

// Collects the current todo list into a serializable array.
// Reads directly from the DOM so that the saved data always reflects what
// the user currently sees, including any in-session changes.
function getTodosFromDom() {
    const todos = [];
    // Select every rendered todo row.
    const todoItems = todoList.querySelectorAll('li.todo-item');

    for (const item of todoItems) {
        // The text span is any span that is NOT the date label.
        const textSpan = item.querySelector('span:not(.todo-date)');
        // The date span may not exist when no due date was set.
        const dateSpan = item.querySelector('span.todo-date');
        const checkbox = item.querySelector('input[type="checkbox"]');
        // Read the date from the data attribute and normalize it for safety.
        const normalizedDate = dateSpan ? normalizeTodoDate(dateSpan.dataset.date || '') : '';

        todos.push({
            text: textSpan ? textSpan.textContent : '',
            date: normalizedDate,
            completed: checkbox ? checkbox.checked : false
        });
    }

    return todos;
}

// Persists the current todo list to localStorage.
// Serializes the DOM state to JSON so it survives page refreshes.
function saveTodos() {
    const todos = getTodosFromDom();

    try {
        localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
        // Storage may be full or disabled (e.g. private-browsing restrictions).
        console.error('Unable to save todos to localStorage.', error);
        alert('Your todos could not be saved. Please check browser storage settings and try again.');
    }
}

// Loads and validates the stored todo list from localStorage.
// Returns a clean array of todo objects, or an empty array when nothing is
// stored or the stored data cannot be parsed.
function loadStoredTodos() {
    try {
        const storedTodos = localStorage.getItem('todos');
        // No data stored yet – return an empty list to start fresh.
        if (!storedTodos) {
            return [];
        }

        const parsedTodos = JSON.parse(storedTodos);
        // Guard against corrupted storage that contains a non-array value.
        if (!Array.isArray(parsedTodos)) {
            throw new Error('Stored todos value is not an array.');
        }

        // Filter out any malformed entries so bad data never reaches the UI.
        const validTodos = [];
        for (const todo of parsedTodos) {
            if (!todo || typeof todo.text !== 'string') {
                console.warn('Skipping invalid stored todo item.', todo);
                continue;
            }

            // Build a clean todo object, normalizing the date and coercing the
            // completed flag to a proper boolean.
            validTodos.push({
                text: todo.text,
                date: normalizeTodoDate(typeof todo.date === 'string' ? todo.date : ''),
                completed: Boolean(todo.completed)
            });
        }

        return validTodos;
    } catch (error) {
        // The stored JSON is unreadable – notify the user and clear the bad data.
        console.error('Unable to load todos from localStorage.', error);
        alert('Saved todos could not be loaded because the stored data is invalid. The list will start empty.');

        try {
            // Best-effort removal of the corrupt entry so future loads succeed.
            localStorage.removeItem('todos');
        } catch (removeError) {
            console.error('Unable to clear invalid stored todos.', removeError);
        }

        return [];
    }
}

// Renders all stored todos into the list on page load.
// Restores the previous session's state so the user picks up where they left off.
function renderTodos() {
    const todos = loadStoredTodos();

    // Re-create each stored todo as a DOM item.
    for (const todo of todos) {
        addTodo(todo.text, todo.date, todo.completed);
    }
}

// Handles adding a new todo from the input controls.
// Validates both fields before creating the item and then resets the inputs.
function handleAddTodoClick() {
    // Strip surrounding whitespace so blank-looking entries are caught.
    const text = newTodoInput.value.trim();
    const date = newTodoDate.value;

    // A description is required – refuse to add an empty todo.
    if (text === '') {
        alert('Please enter a todo description.');
        newTodoInput.focus();
        return;
    }

    // Only validate the date when the user actually provided one.
    if (date && !isValidTodoDate(date)) {
        alert('Please choose a valid due date.');
        newTodoDate.focus();
        return;
    }

    // Add the new todo to the DOM and immediately persist the updated list.
    addTodo(text, date);
    saveTodos();

    // Clear both inputs and return focus to the text field for quick re-entry.
    newTodoInput.value = '';
    newTodoDate.value = '';
    newTodoInput.focus();
}

// Handles checkbox toggles and delete actions using event delegation.
// A single listener on the parent <ul> catches clicks from all child items,
// which means it works correctly even for items added after page load.
function handleTodoListClick(event) {
    const target = event.target;
    // Find the closest ancestor <li> so we can act on the whole todo row.
    const parentLi = target.closest('li.todo-item');

    // Click was outside any todo item – nothing to do.
    if (!parentLi) {
        return;
    }

    // Toggle the "completed" style when the user checks or unchecks the box.
    if (target.type === 'checkbox') {
        const textSpan = parentLi.querySelector('span:not(.todo-date)');
        if (textSpan) {
            textSpan.classList.toggle('completed', target.checked);
        }
        // Persist the updated checked state.
        saveTodos();
    }

    // Start the exit animation and schedule DOM removal after it finishes.
    if (target.classList.contains('delete-btn')) {
        parentLi.classList.add('removing');
        setTimeout(removeTodoItem, 300, parentLi);
    }
}

// Wires up the app event listeners.
// Attaches click handlers to the "Add" button and the todo list, then
// restores any todos that were saved in a previous session.
function initializeTodoApp() {
    addTodoBtn.addEventListener('click', handleAddTodoClick);
    todoList.addEventListener('click', handleTodoListClick);
    renderTodos();
}

// Starts the todo app once the script has loaded.
initializeTodoApp();
