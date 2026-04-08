
const UI_TEXT = {
    pageTitle: 'My Todo List',
    heading: 'My Todo List',
    newTodoPlaceholder: 'Add a new todo...',
    addButtonLabel: 'Add',
    calendarHelper: 'Future home for a calendar view or date-based filtering. Use the date input above to set due dates for todos.',
    duePrefix: 'Due:',
    deleteButtonLabel: 'Delete',
    alerts: {
        saveFailed: 'Your todos could not be saved. Please check browser storage settings and try again.',
        loadFailed: 'Saved todos could not be loaded because the stored data is invalid. The list will start empty.',
        emptyTodo: 'Please enter a todo description.',
        invalidDate: 'Please choose a valid due date.'
    }
};

const newTodoInput = document.getElementById('new-todo-input');
const newTodoDate = document.getElementById('new-todo-date');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');
const appHeading = document.getElementById('app-heading');
const calendarHelper = document.getElementById('calendar-helper');


// Applies the centralized UI copy to the page.
function applyUIText() {
    document.title = UI_TEXT.pageTitle;
    appHeading.textContent = UI_TEXT.heading;
    newTodoInput.placeholder = UI_TEXT.newTodoPlaceholder;
    addTodoBtn.textContent = UI_TEXT.addButtonLabel;
    calendarHelper.textContent = UI_TEXT.calendarHelper;
}


// Checks whether a todo date string is valid.
function isValidTodoDate(dateString) {
    if (typeof dateString !== 'string' || dateString.trim() === '') {
        return false;
    }

    const trimmedDate = dateString.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(trimmedDate)) {
        return false;
    }

    const [yearText, monthText, dayText] = trimmedDate.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return false;
    }

    const parsedDate = new Date(Date.UTC(0, month - 1, day));
    parsedDate.setUTCFullYear(year);
    return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.getUTCFullYear() === year &&
        parsedDate.getUTCMonth() === month - 1 &&
        parsedDate.getUTCDate() === day
    );
}


// Returns a trimmed date string when it is valid.
function normalizeTodoDate(dateString) {
    return isValidTodoDate(dateString) ? dateString.trim() : '';
}


// Removes the temporary highlight from a new todo item.
function removeNewTodo State(todoItem) {
    todoItem.classList.remove('new');
}


// Deletes a todo item and persists the updated list.
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
        dateSpan.textContent = `${UI_TEXT.duePrefix} ${normalizedDate}`;
        dateSpan.dataset.date = normalizedDate;
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = UI_TEXT.deleteButtonLabel;

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


// Reads the current todo items from the DOM.
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


// Saves the current todo list to localStorage.
function saveTodos() {
    const todos = getTodosFromDom();

    try {
        localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
        console.error('Unable to save todos to localStorage.', error);
        alert(UI_TEXT.alerts.saveFailed);
    }
}


// Loads and validates saved todos from localStorage.
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
        alert(UI_TEXT.alerts.loadFailed);

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
function handleAddTodoClick() {
    const text = newTodoInput.value.trim();
    const date = newTodoDate.value;

    if (text === '') {
        alert(UI_TEXT.alerts.emptyTodo);
        newTodoInput.focus();
        return;
    }

    if (date && !isValidTodoDate(date)) {
        alert(UI_TEXT.alerts.invalidDate);
        newTodoDate.focus();
        return;
    }

    addTodo(text, date);
    saveTodos();

    newTodoInput.value = '';
    newTodoDate.value = '';
    newTodoInput.focus();
}

// Handles checkbox toggles and delete actions.
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
    applyUIText();
    addTodoBtn.addEventListener('click', handleAddTodoClick);
    todoList.addEventListener('click', handleTodoListClick);
    renderTodos();
}

// Starts the todo app once the script has loaded.
initializeTodoApp();
