class TodoApp {
    constructor() {
        this.config = {
            ANIMATION_DURATION: 300,
            DEBOUNCE_DELAY: 16,
            MAX_TODO_LENGTH: 200
        };
        
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.currentCategory = 'general';
        this.currentTheme = this.loadTheme();
        this.charts = {};
        
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

        // Close modal on outside click
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeStats();
                }
            });
        }
    }

    // Theme Management
    loadTheme() {
        return localStorage.getItem('currentTheme') || 'default';
    }

    changeTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme);
        localStorage.setItem('currentTheme', theme);
        this.updateActiveThemeButton(theme);
        this.triggerHapticFeedback('soft');
    }

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
    }

    updateActiveThemeButton(theme) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event?.target.classList.add('active');
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
            createdAt: new Date().toISOString(),
            category: this.currentCategory
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
        
        if (trimmed.length > this.config.MAX_TODO_LENGTH) {
            this.showError(`Задача слишком длинная (максимум ${this.config.MAX_TODO_LENGTH} символов)`);
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
                this.sendCompletionNotification(todo.text);
            } else {
                todo.completedAt = null;
            }

            this.analyticsTrackCompletion(todo);
            this.saveTodos();
            this.render();
            this.triggerHapticFeedback('light');
        }, this.config.ANIMATION_DURATION / 2);
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
            }, this.config.ANIMATION_DURATION);
        }
    }

    clearCompleted() {
        const completedItems = document.querySelectorAll('.todo-item.completed');
        
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
        }, completedItems.length * 100 + this.config.ANIMATION_DURATION);
    }

    // Filtering and Categories
    setFilter(filter) {
        this.currentFilter = filter;
        this.updateActiveButton('.filter-btn', event.target);
        this.render();
    }

    setCategory(category) {
        this.currentCategory = category;
        this.updateActiveButton('.category-btn', event.target);
        this.render();
    }

    updateActiveButton(selector, target) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.classList.remove('active');
        });
        target.classList.add('active');
    }

    getFilteredTodos() {
        let filtered = this.todos.filter(todo => todo.category === this.currentCategory);
        
        switch (this.currentFilter) {
            case 'active':
                return filtered.filter(t => !t.completed);
            case 'completed':
                return filtered.filter(t => t.completed);
            default:
                return filtered;
        }
    }

    // Rendering
    render() {
        if (this.renderTimeout) clearTimeout(this.renderTimeout);
        
        this.renderTimeout = setTimeout(() => {
            this.renderTodos();
            this.updateStats();
        }, this.config.DEBOUNCE_DELAY);
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
                data-category="${todo.category}"
                style="animation-delay: ${index * 0.05}s">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                     onclick="app.toggleTodo(${todo.id})"
                     aria-label="${todo.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}">
                </div>
                <span class="category-icon">${this.getCategoryIcon(todo.category)}</span>
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
        return `
            <li class="empty-state">
                <div class="empty-state-icon">${this.getEmptyStateIcon()}</div>
                <div>${message}</div>
            </li>
        `;
    }

    getEmptyStateMessage() {
        if (this.currentFilter === 'completed') return 'Нет выполненных задач';
        if (this.currentFilter === 'active') return 'Нет активных задач';
        
        const messages = {
            'work': 'Нет рабочих задач',
            'personal': 'Нет личных задач', 
            'general': 'Нет задач'
        };
        return messages[this.currentCategory] || 'Нет задач';
    }

    getEmptyStateIcon() {
        const icons = {
            'work': '💼',
            'personal': '🏠',
            'general': '📝'
        };
        return icons[this.currentCategory] || '📝';
    }

    getCategoryIcon(category) {
        const icons = {
            'work': '💼',
            'personal': '🏠',
            'general': '📝'
        };
        return icons[category] || '📝';
    }

    updateStats() {
        const completed = this.todos.filter(t => t.completed).length;
        const pending = this.todos.filter(t => !t.completed).length;
        const efficiency = this.calculateEfficiency();

        this.updateElementText('completedCount', completed);
        this.updateElementText('pendingCount', pending);
        this.updateElementText('completionRate', efficiency + '%');
        this.updateElementText('todoCount', `Активных: ${pending}`);
    }

    updateElementText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    calculateEfficiency() {
        const completed = this.todos.filter(t => t.completed).length;
        const total = this.todos.length;
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    // Analytics
    analyticsTrackCompletion(todo) {
        const today = new Date().toDateString();
        const completionData = this.loadCompletionData();
        
        if (!completionData[today]) {
            completionData[today] = { completed: 0, created: 0, totalTime: 0 };
        }
        
        if (todo.completed && todo.completedAt) {
            completionData[today].completed++;
            
            if (todo.createdAt) {
                const created = new Date(todo.createdAt);
                const completed = new Date(todo.completedAt);
                const timeDiff = completed - created;
                completionData[today].totalTime += timeDiff;
            }
        } else if (!todo.completed) {
            completionData[today].created++;
        }
        
        this.saveCompletionData(completionData);
    }

    loadCompletionData() {
        try {
            return JSON.parse(localStorage.getItem('completionData')) || {};
        } catch {
            return {};
        }
    }

    saveCompletionData(data) {
        try {
            localStorage.setItem('completionData', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving analytics:', error);
        }
    }

    getStatsForPeriod(days = 7) {
        const completionData = this.loadCompletionData();
        const dates = Object.keys(completionData).sort().slice(-days);
        
        return {
            labels: dates.map(date => {
                const d = new Date(date);
                return `${d.getDate()}.${d.getMonth() + 1}`;
            }),
            completed: dates.map(date => completionData[date]?.completed || 0),
            created: dates.map(date => completionData[date]?.created || 0),
            averageTime: dates.map(date => {
                const data = completionData[date];
                return data?.completed > 0 ? 
                    Math.round(data.totalTime / data.completed / 60000) : 0;
            })
        };
    }

    // Notifications
    async sendTelegramNotification(chatId, message) {
        const botToken = 'YOUR_BOT_TOKEN';
        if (!botToken || botToken === 'YOUR_BOT_TOKEN') {
            console.log('Notification:', message);
            return;
        }
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Notification error:', error);
        }
    }

    sendCompletionNotification(todoText) {
        const user = this.tg?.initDataUnsafe?.user;
        if (user) {
            const message = `✅ Задача выполнена: <b>${todoText}</b>\n🎉 Так держать!`;
            this.sendTelegramNotification(user.id, message);
        }
    }

    // Stats Modal
    showStats() {
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateStats();
            this.renderCharts();
        }
    }

    closeStats() {
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    openTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const tabElement = document.getElementById(tabName);
        if (tabElement) {
            tabElement.classList.add('active');
        }
        
        if (event?.target) {
            event.target.classList.add('active');
        }
        
        this.renderCharts();
    }

    renderCharts() {
        const weeklyStats = this.getStatsForPeriod(7);
        const monthlyStats = this.getStatsForPeriod(30);
        
        this.renderChart('dailyChart', {
            type: 'bar',
            data: {
                labels: weeklyStats.labels,
                datasets: [
                    {
                        label: 'Выполнено',
                        data: weeklyStats.completed,
                        backgroundColor: '#34c759'
                    },
                    {
                        label: 'Создано',
                        data: weeklyStats.created,
                        backgroundColor: '#007aff'
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        
        this.renderChart('weeklyChart', {
            type: 'line',
            data: {
                labels: weeklyStats.labels,
                datasets: [{
                    label: 'Среднее время выполнения (мин)',
                    data: weeklyStats.averageTime,
                    borderColor: '#ff9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        
        this.renderChart('monthlyChart', {
            type: 'bar',
            data: {
                labels: monthlyStats.labels,
                datasets: [{
                    label: 'Выполнено задач',
                    data: monthlyStats.completed,
                    backgroundColor: '#af52de'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    renderChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Create new chart
        this.charts[canvasId] = new Chart(canvas, config);
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
