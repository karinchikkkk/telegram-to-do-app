class TodoApp {
    constructor() {
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.currentTheme = this.loadTheme();
        
        this.init();
    }

    init() {
        this.setupTelegram();
        this.applyTheme(this.currentTheme);
        this.bindEvents();
        this.render();
    }

    setupTelegram() {
        if (window.Telegram?.WebApp) {
            this.tg = Telegram.WebApp;
            this.tg.expand();
            this.setupUserInfo();
        }
    }

    setupUserInfo() {
        const user = this.tg?.initDataUnsafe?.user;
        const userInfo = document.getElementById('userInfo');
        if (user && userInfo) {
            userInfo.textContent = `Привет, ${user.first_name || 'Пользователь'}!`;
        }
    }

    bindEvents() {
        const todoInput = document.getElementById('todoInput');
        if (todoInput) {
            todoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTodoFromInput();
                }
            });
        }
    }

    // Theme Management
    loadTheme() {
        return localStorage.getItem('currentTheme') || 'light';
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('currentTheme', this.currentTheme);
        this.updateThemeButton();
        this.triggerHapticFeedback('soft');
    }

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
    }

    updateThemeButton() {
        const button = document.querySelector('.theme-toggle');
        if (button) {
            button.textContent = this.currentTheme === 'light' ? '🌙' : '🌞';
        }
    }

    // Todo Management
    loadTodos() {
        try {
            return JSON.parse(localStorage.getItem('todos')) || [];
        } catch (error) {
            console.error('Error loading todos:', error);
            return [];
        }
    }

    saveTodos() {
        try {
            localStorage.setItem('todos', JSON.stringify(this.todos));
        } catch (error) {
            console.error('Error saving todos:', error);
            this.showError('Не удалось сохранить задачи');
        }
    }

    addTodo(text) {
        if (!this.validateTodo(text)) return false;

        const todo = {
            id: Date.now(),
            text: text.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.render();
        this.triggerHapticFeedback('light');
        return true;
    }

    addTodoFromInput() {
        const input = document.getElementById('todoInput');
        if (this.addTodo(input.value)) {
            input.value = '';
        }
    }

    validateTodo(text) {
        const trimmed = text.trim();
        
        if (!trimmed) {
            this.showError('Введите текст задачи');
            return false;
        }
        
        if (trimmed.length > 200) {
            this.showError('Задача слишком длинная (максимум 200 символов)');
            return false;
        }
        
        return true;
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
        if (todoElement) {
            todoElement.classList.add('completing');
        }

        setTimeout(() => {
            todo.completed = !todo.completed;
            
            if (todo.completed) {
                todo.completedAt = new Date().toISOString();
            } else {
                todo.completedAt = null;
            }

            this.saveTodos();
            this.render();
            this.triggerHapticFeedback('light');
        }, 150);
    }

    deleteTodo(id) {
        const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
        if (todoElement) {
            todoElement.classList.add('removing');
            
            setTimeout(() => {
                this.todos = this.todos.filter(t => t.id !== id);
                this.saveTodos();
                this.render();
                this.triggerHapticFeedback('medium');
            }, 300);
        }
    }

    clearCompleted() {
        const completedItems = document.querySelectorAll('.todo-item.completed');
        
        if (completedItems.length === 0) {
            this.showError('Нет выполненных задач для удаления');
            return;
        }

        completedItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('removing');
            }, index * 100);
        });
        
        setTimeout(() => {
            this.todos = this.todos.filter(t => !t.completed);
            this.saveTodos();
            this.render();
            this.triggerHapticFeedback('heavy');
        }, completedItems.length * 100 + 300);
    }

    // Filtering
    setFilter(filter) {
        this.currentFilter = filter;
        this.updateActiveButton('.filter-btn', event.target);
        this.render();
    }

    updateActiveButton(selector, target) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.classList.remove('active');
        });
        target.classList.add('active');
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    // Rendering
    render() {
        this.renderTodos();
        this.updateStats();
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        if (!todoList) return;

        const filteredTodos = this.getFilteredTodos();
        
        if (filteredTodos.length === 0) {
            todoList.innerHTML = this.renderEmptyState();
        } else {
            todoList.innerHTML = this.renderTodoList(filteredTodos);
        }
    }

    renderTodoList(todos) {
        return todos.map((todo, index) => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" 
                data-todo-id="${todo.id}"
                style="animation-delay: ${index * 0.05}s">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                     onclick="app.toggleTodo(${todo.id})"
                     aria-label="${todo.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}">
                </div>
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <button class="delete-btn" onclick="app.deleteTodo(${todo.id})"
                        aria-label="Удалить задачу">
                    🗑️
                </button>
            </li>
        `).join('');
    }

    renderEmptyState() {
        const message = this.getEmptyStateMessage();
        const icon = this.getEmptyStateIcon();
        
        return `
            <li class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-text">${message}</div>
            </li>
        `;
    }

    getEmptyStateMessage() {
        switch (this.currentFilter) {
            case 'active': return 'Нет активных задач';
            case 'completed': return 'Нет выполненных задач';
            default: return 'Нет задач';
        }
    }

    getEmptyStateIcon() {
        switch (this.currentFilter) {
            case 'active': return '📝';
            case 'completed': return '✅';
            default: return '📋';
        }
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const active = total - completed;

        const todoCount = document.getElementById('todoCount');
        if (todoCount) {
            todoCount.textContent = `Задач: ${active} активных, ${completed} выполнено`;
        }
    }

    // Utilities
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    triggerHapticFeedback(type) {
        if (this.tg?.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred(type);
        }
    }

    showError(message) {
        if (this.tg) {
            this.tg.showPopup({
                title: 'Ошибка',
                message: message,
                buttons: [{ type: 'ok' }]
            });
        } else {
            alert(message);
        }
    }
}

// Global functions for HTML attributes
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
});

function addTodo() {
    app.addTodoFromInput();
}

function toggleTodo(id) {
    app.toggleTodo(id);
}

function deleteTodo(id) {
    app.deleteTodo(id);
}