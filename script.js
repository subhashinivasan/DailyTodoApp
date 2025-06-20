// DOM Element References
const newTodoInput = document.getElementById('new-todo-input');
const newTodoDate = document.getElementById('new-todo-date');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');

// addTodo Function
function addTodo(text, date, completed = false) {
    const li = document.createElement('li');
    li.classList.add('todo-item');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = completed;

    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    if (completed) {
        textSpan.classList.add('completed'); // Apply completed style if needed
    }

    const dateSpan = document.createElement('span');
    dateSpan.classList.add('todo-date'); // Add a class for easier selection
    let hasDate = false;
    if (date && date.trim() !== '') { // Ensure date is not just whitespace
        dateSpan.textContent = `Due: ${date}`;
        dateSpan.dataset.date = date; // Store raw date in data attribute
        // Styling for dateSpan will be handled by CSS class .todo-date
        hasDate = true;
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = 'Delete';

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    if (hasDate) { // Only append dateSpan if there is a date
        li.appendChild(dateSpan);
    }
    li.appendChild(deleteBtn);

    todoList.appendChild(li);

    // Add animation
    li.classList.add('new');
    setTimeout(() => {
        li.classList.remove('new');
    }, 300); // Match animation duration in CSS
}

// Event Listener for Adding Todos
addTodoBtn.addEventListener('click', () => {
    const text = newTodoInput.value.trim();
    const date = newTodoDate.value;

    if (text === '') {
        alert('Please enter a todo description.');
        newTodoInput.focus(); // Focus back if empty
        return;
    }

    addTodo(text, date); // completed defaults to false
    saveTodos(); // Save after adding a new todo

    newTodoInput.value = '';
    newTodoDate.value = '';
    newTodoInput.focus(); // Set focus back to the input field
});

// Event Listeners for Complete/Delete (Event Delegation)
todoList.addEventListener('click', (event) => {
    const target = event.target;
    const parentLi = target.closest('li.todo-item'); // Get the parent LI

    if (!parentLi) return; // Click was not inside a todo item's relevant part

    // Handle checkbox click
    if (target.type === 'checkbox') {
        const textSpan = parentLi.querySelector('span:not(.todo-date)'); // Get the text span
        if (textSpan) {
            textSpan.classList.toggle('completed', target.checked);
        }
        saveTodos();
    }

    // Handle delete button click
    if (target.classList.contains('delete-btn')) {
        parentLi.classList.add('removing');
        setTimeout(() => {
            parentLi.remove();
            saveTodos(); // Call saveTodos AFTER actual removal
        }, 300); // Match animation duration in CSS
    }
});

// Local Storage Implementation
function saveTodos() {
    const todos = [];
    const todoItems = todoList.querySelectorAll('li.todo-item');

    todoItems.forEach(item => {
        const textSpan = item.querySelector('span:not(.todo-date)');
        const dateSpan = item.querySelector('span.todo-date');
        const checkbox = item.querySelector('input[type="checkbox"]');

        const text = textSpan ? textSpan.textContent : '';
        let date = ''; // Default to empty string if no date
        if (dateSpan && dateSpan.parentNode) { // Check if dateSpan is part of the item in the DOM
            // Prioritize reading from data-date attribute
            if (dateSpan.dataset && dateSpan.dataset.date) {
                date = dateSpan.dataset.date;
            }
            // Fallback or alternative: parse from textContent if data-date is missing (optional)
            // else if (dateSpan.textContent) {
            //     const match = dateSpan.textContent.match(/Due: (.*)/);
            //     if (match && match[1]) {
            //         date = match[1];
            //     }
            // }
        }
        const completed = checkbox ? checkbox.checked : false;

        todos.push({ text, date, completed });
    });

    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        const todos = JSON.parse(storedTodos);
        todos.forEach(todo => {
            addTodo(todo.text, todo.date, todo.completed);
        });
    }
    console.log("renderTodos called and processed.");
}

// Initial Call
renderTodos();
