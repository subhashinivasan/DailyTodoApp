// DOM Element References
const newTodoInput = document.getElementById('new-todo-input');
const newTodoDate = document.getElementById('new-todo-date');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');

// Returns true when the provided value is a valid YYYY-MM-DD date string.
function isValidTodoDate(dateString) {
    if (typeof dateString !== 'string' || dateString.trim() === '') {
        return false;
    }

    const trimmedDate = dateString.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(trimmedDate)) {
        return false;
    }

    const [yearStr, monthStr, dayStr] = trimmedDate.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Use setUTCFullYear to avoid Date.UTC()'s 0–99 year coercion to 1900–1999.
    const parsedDate = new Date(0);
    parsedDate.setUTCFullYear(year, month - 1, day);
    return parsedDate.getUTCFullYear() === year &&
        parsedDate.getUTCMonth() === month - 1 &&
        parsedDate.getUTCDate() === day;
}

// Returns a safe date string for display and storage.
function normalizeTodoDate(dateString) {
    return isValidTodoDate(dateString) ? dateString.trim() : '';
}

// Removes the temporary animation class after a new todo is rendered.
function removeNewTodoState(todoItem) {
    todoItem.classList.remove('new');
}

// Removes a todo from the list after its exit animation completes.
function removeTodoItem(todoItem) {
    todoItem.remove();
    saveTodos();
}

// Creates and appends a todo item to the list.
function addTodo(text, date, completed = false) {
    const li = document.createElement('li');
    li.classList.add('todo-item');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = completed;

    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    if (completed) {
        textSpan.classList.add('completed');
    }

    const normalizedDate = normalizeTodoDate(date);
    if (date && normalizedDate === '') {
        console.warn(`Ignoring invalid todo date: ${date}`);
    }

    let dateSpan = null;
    if (normalizedDate) {
        dateSpan = document.createElement('span');
        dateSpan.classList.add('todo-date');
        dateSpan.textContent = `Due: ${normalizedDate}`;
        dateSpan.dataset.date = normalizedDate;
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = 'Delete';

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    if (dateSpan) {
        li.appendChild(dateSpan);
    }

    li.appendChild(deleteBtn);
    todoList.appendChild(li);

    li.classList.add('new');
    setTimeout(removeNewTodoState, 300, li);
}

// Collects the current todo list into a serializable array.
function getTodosFromDom() {
    const todos = [];
    const todoItems = todoList.querySelectorAll('li.todo-item');

    for (const item of todoItems) {
        const textSpan = item.querySelector('span:not(.todo-date)');
        const dateSpan = item.querySelector('span.todo-date');
        const checkbox = item.querySelector('input[type="checkbox"]');
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
function saveTodos() {
    const todos = getTodosFromDom();

    try {
        localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
        console.error('Unable to save todos to localStorage.', error);
        alert('Your todos could not be saved. Please check browser storage settings and try again.');
    }
}

// Loads and validates the stored todo list from localStorage.
function loadStoredTodos() {
    try {
        const storedTodos = localStorage.getItem('todos');
        if (!storedTodos) {
            return [];
        }

        const parsedTodos = JSON.parse(storedTodos);
        if (!Array.isArray(parsedTodos)) {
            throw new Error('Stored todos value is not an array.');
        }

        const validTodos = [];
        for (const todo of parsedTodos) {
            if (!todo || typeof todo.text !== 'string') {
                console.warn('Skipping invalid stored todo item.', todo);
                continue;
            }

            validTodos.push({
                text: todo.text,
                date: normalizeTodoDate(typeof todo.date === 'string' ? todo.date : ''),
                completed: Boolean(todo.completed)
            });
        }

        return validTodos;
    } catch (error) {
        console.error('Unable to load todos from localStorage.', error);
        alert('Saved todos could not be loaded because the stored data is invalid. The list will start empty.');

        try {
            localStorage.removeItem('todos');
        } catch (removeError) {
            console.error('Unable to clear invalid stored todos.', removeError);
        }

        return [];
    }
}

// Renders all stored todos into the list on page load.
function renderTodos() {
    const todos = loadStoredTodos();

    for (const todo of todos) {
        addTodo(todo.text, todo.date, todo.completed);
    }
}

// Handles adding a new todo from the input controls.
function handleAddTodoClick() {
    const text = newTodoInput.value.trim();
    const date = newTodoDate.value;

    if (text === '') {
        alert('Please enter a todo description.');
        newTodoInput.focus();
        return;
    }

    if (date && !isValidTodoDate(date)) {
        alert('Please choose a valid due date.');
        newTodoDate.focus();
        return;
    }

    addTodo(text, date);
    saveTodos();

    newTodoInput.value = '';
    newTodoDate.value = '';
    newTodoInput.focus();
}

// Handles checkbox toggles and delete actions using event delegation.
function handleTodoListClick(event) {
    const target = event.target;
    const parentLi = target.closest('li.todo-item');

    if (!parentLi) {
        return;
    }

    if (target.type === 'checkbox') {
        const textSpan = parentLi.querySelector('span:not(.todo-date)');
        if (textSpan) {
            textSpan.classList.toggle('completed', target.checked);
        }
        saveTodos();
    }

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
