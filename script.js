// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();
tg.enableClosingConfirmation();

// Инициализация приложения
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';

// Показываем информацию о пользователе
const user = tg.initDataUnsafe?.user;
if (user) {
    const userInfo = document.getElementById('userInfo');
    userInfo.textContent = `Привет, ${user.first_name || 'Пользователь'}!`;
}

// Загружаем задачи
renderTodos();

// Функции
function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text) {
        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        todos.unshift(todo);
        saveTodos();
        renderTodos();
        input.value = '';
        
        // Вибрация для feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
        
        // Вибрация
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

function filterTodos(filter) {
    currentFilter = filter;
    
    // Обновляем активные кнопки
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderTodos();
}

function clearCompleted() {
    todos = todos.filter(t => !t.completed);
    saveTodos();
    renderTodos();
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
    }
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    const todoCount = document.getElementById('todoCount');
    
    // Фильтруем задачи
    let filteredTodos = todos;
    if (currentFilter === 'active') {
        filteredTodos = todos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTodos = todos.filter(t => t.completed);
    }
    
    // Обновляем счетчик
    const activeCount = todos.filter(t => !t.completed).length;
    todoCount.textContent = `Активных: ${activeCount}`;
    
    // Рендерим список
    todoList.innerHTML = '';
    
    if (filteredTodos.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.textContent = currentFilter === 'all' ? 'Нет задач' : 
                                  currentFilter === 'active' ? 'Нет активных задач' : 'Нет выполненных задач';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.opacity = '0.5';
        emptyMessage.style.padding = '20px';
        todoList.appendChild(emptyMessage);
    } else {
        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                     onclick="toggleTodo(${todo.id})"></div>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" onclick="deleteTodo(${todo.id})">🗑️</button>
            `;
            
            todoList.appendChild(li);
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработка Enter в поле ввода
document.getElementById('todoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// Инициализация основной кнопки Telegram
tg.MainButton.setText('Сохранить всё');
tg.MainButton.onClick(() => {
    // Можно добавить синхронизацию с сервером
    tg.showPopup({
        title: 'Успех',
        message: 'Все задачи сохранены!',
        buttons: [{ type: 'ok' }]
    });
});