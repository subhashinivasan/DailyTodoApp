// script.js — Main application logic for the Daily Todo App.
// Handles creating, displaying, completing, deleting, and persisting todo items.

// ------- DOM element references -------
const newTodoInput = document.getElementById('new-todo-input');  // Text input for a new todo description
const newTodoDate = document.getElementById('new-todo-date');    // Date input for the optional due date
const addTodoBtn = document.getElementById('add-todo-btn');      // Button that triggers adding a new todo
const todoList = document.getElementById('todo-list');           // The <ul> element that holds all todo items


// Checks whether a todo date string is valid.
// Returns true only when the string matches YYYY-MM-DD and represents a real calendar date.
function isValidTodoDate(dateString) {
    // Reject non-strings and blank values immediately
    if (typeof dateString !== 'string' || dateString.trim() === '') {
        return false;
    }

    const trimmedDate = dateString.trim();
    // Enforce the ISO 8601 date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(trimmedDate)) {
        return false;
    }

    // Parse the date and confirm it round-trips correctly to guard against
    // values like "2024-02-30" that pass the regex but are not real dates
    const parsedDate = new Date(`${trimmedDate}T00:00:00`);
    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === trimmedDate;
}


// Returns a trimmed date string when it is valid.
function normalizeTodoDate(dateString) {
    return isValidTodoDate(dateString) ? dateString.trim() : '';
}


// Removes the temporary highlight from a new todo item.
function removeNewTodoState(todoItem) {
    todoItem.classList.remove('new');
}


// Deletes a todo item and persists the updated list.
function removeTodoItem(todoItem) {
    todoItem.remove();
    saveTodos();
}


// Creates and appends a todo item to the list.
// text     — the description of the todo task
// date     — an optional due-date string in YYYY-MM-DD format
// completed — whether the item should start in a completed state (used when restoring from storage)
function addTodo(text, date, completed = false) {
    // Build the list item container
    const li = document.createElement('li');
    li.classList.add('todo-item');

    // Checkbox lets the user mark the todo as complete/incomplete
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = completed;

    // Text label, struck-through when the todo is completed
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    if (completed) {
        textSpan.classList.add('completed');
    }

    // Validate and normalize the date before rendering it
    const normalizedDate = normalizeTodoDate(date);
    if (date && normalizedDate === '') {
        console.warn(`Ignoring invalid todo date: ${date}`);
    }

    // Only render the due-date badge when a valid date was provided
    let dateSpan = null;
    if (normalizedDate) {
        dateSpan = document.createElement('span');
        dateSpan.classList.add('todo-date');
        dateSpan.textContent = `Due: ${normalizedDate}`;
        // Store the raw date value for easy retrieval when saving
        dateSpan.dataset.date = normalizedDate;
    }

    // Delete button removes the item from the list and updates storage
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = 'Delete';

    // Assemble the list item
    li.appendChild(checkbox);
    li.appendChild(textSpan);
    if (dateSpan) {
        li.appendChild(dateSpan);
    }

    li.appendChild(deleteBtn);
    todoList.appendChild(li);

    // Briefly apply the 'new' class so CSS can animate the item in
    li.classList.add('new');
    setTimeout(removeNewTodoState, 300, li);
}


// Reads the current todo items from the DOM.
// Returns an array of plain objects ready to be serialised to localStorage.
function getTodosFromDom() {
    const todos = [];
    // Select every rendered todo item
    const todoItems = todoList.querySelectorAll('li.todo-item');

    for (const item of todoItems) {
        // The description span is any span that is NOT the date badge
        const textSpan = item.querySelector('span:not(.todo-date)');
        const dateSpan = item.querySelector('span.todo-date');
        const checkbox = item.querySelector('input[type="checkbox"]');
        // Re-validate the stored date to ensure only clean data is persisted
        const normalizedDate = dateSpan ? normalizeTodoDate(dateSpan.dataset.date || '') : '';

        todos.push({
            text: textSpan ? textSpan.textContent : '',
            date: normalizedDate,
            completed: checkbox ? checkbox.checked : false
        });
    }

    return todos;
}


// Saves the current todo list to localStorage.
function saveTodos() {
    const todos = getTodosFromDom();

    try {
        localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
        console.error('Unable to save todos to localStorage.', error);
        alert('Your todos could not be saved. Please check browser storage settings and try again.');
    }
}


// Loads and validates saved todos from localStorage.
// Returns an array of validated todo objects, or an empty array when none exist or the data is corrupt.
function loadStoredTodos() {
    try {
        const storedTodos = localStorage.getItem('todos');
        // Nothing stored yet — return an empty list so the app starts fresh
        if (!storedTodos) {
            return [];
        }

        const parsedTodos = JSON.parse(storedTodos);
        // Guard against stored data that has been corrupted into a non-array shape
        if (!Array.isArray(parsedTodos)) {
            throw new Error('Stored todos value is not an array.');
        }

        // Filter out any malformed entries before rendering
        const validTodos = [];
        for (const todo of parsedTodos) {
            if (!todo || typeof todo.text !== 'string') {
                console.warn('Skipping invalid stored todo item.', todo);
                continue;
            }

            validTodos.push({
                text: todo.text,
                // Normalize the date in case the stored value has extra whitespace
                date: normalizeTodoDate(typeof todo.date === 'string' ? todo.date : ''),
                completed: Boolean(todo.completed)
            });
        }

        return validTodos;
    } catch (error) {
        console.error('Unable to load todos from localStorage.', error);
        alert('Saved todos could not be loaded because the stored data is invalid. The list will start empty.');

        // Remove the corrupted entry so the next page load starts clean
        try {
            localStorage.removeItem('todos');
        } catch (removeError) {
            console.error('Unable to clear invalid stored todos.', removeError);
        }

        return [];
    }
}

// Renders saved todos into the list.
function renderTodos() {
    const todos = loadStoredTodos();

    for (const todo of todos) {
        addTodo(todo.text, todo.date, todo.completed);
    }
}

// Adds a new todo from the input controls.
// Validates the description and date before creating the item and persisting it.
function handleAddTodoClick() {
    const text = newTodoInput.value.trim();
    const date = newTodoDate.value;

    // A description is required — reject empty submissions
    if (text === '') {
        alert('Please enter a todo description.');
        newTodoInput.focus();
        return;
    }

    // The date field is optional, but if the user typed something it must be valid
    if (date && !isValidTodoDate(date)) {
        alert('Please choose a valid due date.');
        newTodoDate.focus();
        return;
    }

    addTodo(text, date);
    saveTodos(); // Persist the updated list immediately

    // Reset the inputs and return focus to the description field for quick entry
    newTodoInput.value = '';
    newTodoDate.value = '';
    newTodoInput.focus();
}

// Handles checkbox toggles and delete actions.
// Uses event delegation on the list so individual items don't need their own listeners.
function handleTodoListClick(event) {
    const target = event.target;
    // Walk up the DOM to find the parent todo item, ignoring clicks outside list items
    const parentLi = target.closest('li.todo-item');

    if (!parentLi) {
        return;
    }

    // Toggling the checkbox flips the visual 'completed' style and saves the new state
    if (target.type === 'checkbox') {
        const textSpan = parentLi.querySelector('span:not(.todo-date)');
        if (textSpan) {
            textSpan.classList.toggle('completed', target.checked);
        }
        saveTodos();
    }

    // Clicking Delete adds the 'removing' class (triggers a CSS exit animation),
    // then waits 300 ms before actually removing the element to let the animation finish
    if (target.classList.contains('delete-btn')) {
        parentLi.classList.add('removing');
        setTimeout(removeTodoItem, 300, parentLi);
    }
}

// Wires up the app event listeners.
function initializeTodoApp() {
    addTodoBtn.addEventListener('click', handleAddTodoClick);
    todoList.addEventListener('click', handleTodoListClick);
    renderTodos();
}

// Starts the todo app once the script has loaded.
initializeTodoApp();
