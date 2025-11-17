// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();
tg.enableClosingConfirmation();

// Инициализация приложения
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let currentCategory = 'general';
let currentTheme = localStorage.getItem('currentTheme') || 'default';

// Применяем сохраненную тему
document.body.setAttribute('data-theme', currentTheme);

// Показываем информацию о пользователе
const user = tg.initDataUnsafe?.user;
if (user) {
    const userInfo = document.getElementById('userInfo');
    userInfo.textContent = `Привет, ${user.first_name || 'Пользователь'}!`;
}

// Загружаем задачи
renderTodos();

// Функции Todo
function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text) {
        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            category: currentCategory
        };
        
        todos.unshift(todo);
        saveTodos();
        renderTodos();
        input.value = '';
        
        // Трекинг в аналитике
        analytics.trackCompletion(todo);
        
        // Вибрация для feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
        if (todoElement) {
            todoElement.classList.add('completing');
        }
        
        setTimeout(() => {
            todo.completed = !todo.completed;
            
            if (todo.completed) {
                todo.completedAt = new Date().toISOString();
                // Отправляем уведомление о выполнении
                sendCompletionNotification(todo.text);
            } else {
                todo.completedAt = null;
            }
            
            // Трекинг в аналитике
            analytics.trackCompletion(todo);
            
            saveTodos();
            renderTodos();
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        }, 300);
    }
}

function deleteTodo(id) {
    const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
    if (todoElement) {
        todoElement.classList.add('removing');
        
        setTimeout(() => {
            todos = todos.filter(t => t.id !== id);
            saveTodos();
            renderTodos();
            
            // Вибрация
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
        }, 400);
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

function setActiveCategory(category) {
    currentCategory = category;
    
    // Обновляем активные кнопки категорий
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Анимация переключения категорий
    const todoList = document.getElementById('todoList');
    todoList.style.opacity = '0.5';
    todoList.style.transform = 'translateX(-10px)';
    
    setTimeout(() => {
        renderTodos();
        todoList.style.opacity = '1';
        todoList.style.transform = 'translateX(0)';
    }, 200);
}

function clearCompleted() {
    const completedItems = document.querySelectorAll('.todo-item.completed');
    
    // Анимация удаления всех выполненных
    completedItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('removing');
        }, index * 100);
    });
    
    setTimeout(() => {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderTodos();
        
        // Вибрация
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('heavy');
        }
    }, completedItems.length * 100 + 400);
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    const todoCount = document.getElementById('todoCount');
    
    // Фильтруем задачи
    let filteredTodos = todos.filter(todo => todo.category === currentCategory);
    if (currentFilter === 'active') {
        filteredTodos = filteredTodos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTodos = filteredTodos.filter(t => t.completed);
    }
    
    // Обновляем счетчик
    const activeCount = todos.filter(t => !t.completed && t.category === currentCategory).length;
    todoCount.textContent = `Активных: ${activeCount}`;
    
    // Рендерим список
    todoList.innerHTML = '';
    
    if (filteredTodos.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-state';
        emptyMessage.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; opacity: 0.5;">
                <div style="font-size: 48px; margin-bottom: 10px;">📝</div>
                <div>${getEmptyStateMessage()}</div>
            </div>
        `;
        todoList.appendChild(emptyMessage);
    } else {
        filteredTodos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.setAttribute('data-todo-id', todo.id);
            li.setAttribute('data-category', todo.category);
            li.style.animationDelay = `${index * 0.1}s`;
            
            const categoryIcon = getCategoryIcon(todo.category);
            
            li.innerHTML = `
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                     onclick="toggleTodo(${todo.id})"></div>
                <span class="category-icon">${categoryIcon}</span>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" onclick="deleteTodo(${todo.id})">🗑️</button>
            `;
            
            todoList.appendChild(li);
        });
    }
}

function getCategoryIcon(category) {
    const icons = {
        'work': '💼',
        'personal': '🏠',
        'shopping': '🛒',
        'general': '📝'
    };
    return icons[category] || '📝';
}

function getEmptyStateMessage() {
    if (currentFilter === 'completed') return 'Нет выполненных задач';
    if (currentFilter === 'active') return 'Нет активных задач';
    
    const messages = {
        'work': 'Нет рабочих задач',
        'personal': 'Нет личных задач', 
        'shopping': 'Нет списка покупок',
        'general': 'Нет задач'
    };
    return messages[currentCategory] || 'Нет задач';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Смена темы
function changeTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('currentTheme', theme);
    
    // Анимация смены темы
    document.body.style.opacity = '0.8';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 300);
    
    // Обновляем активную кнопку темы
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Вибрация
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('soft');
    }
}

// Обработка Enter в поле ввода
document.getElementById('todoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// Система уведомлений (остается без изменений)
async function sendTelegramNotification(chatId, message) {
    const botToken = 'YOUR_BOT_TOKEN';
    if (!botToken || botToken === 'YOUR_BOT_TOKEN') {
        console.log('Уведомление (для отправки нужен токен бота):', message);
        return;
    }
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Ошибка отправки уведомления:', error);
    }
}

function sendCompletionNotification(todoText) {
    const user = tg.initDataUnsafe?.user;
    if (user) {
        const message = `✅ Задача выполнена: <b>${todoText}</b>\n🎉 Так держать!`;
        sendTelegramNotification(user.id, message);
    }
}

// Аналитика и статистика (остается без изменений)
const analytics = {
    trackCompletion(todo) {
        const today = new Date().toDateString();
        const completionData = JSON.parse(localStorage.getItem('completionData')) || {};
        
        if (!completionData[today]) {
            completionData[today] = {
                completed: 0,
                created: 0,
                totalTime: 0
            };
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
        
        localStorage.setItem('completionData', JSON.stringify(completionData));
    },
    
    getStatsForPeriod(days = 7) {
        const completionData = JSON.parse(localStorage.getItem('completionData')) || {};
        const dates = Object.keys(completionData).sort().slice(-days);
        
        return {
            labels: dates.map(date => {
                const d = new Date(date);
                return `${d.getDate()}.${d.getMonth() + 1}`;
            }),
            completed: dates.map(date => completionData[date].completed || 0),
            created: dates.map(date => completionData[date].created || 0),
            averageTime: dates.map(date => {
                const data = completionData[date];
                return data.completed > 0 ? 
                    Math.round(data.totalTime / data.completed / 60000) : 0;
            })
        };
    },
    
    calculateEfficiency() {
        const completed = todos.filter(t => t.completed).length;
        const total = todos.length;
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }
};

// Функции для модального окна статистики (остаются без изменений)
function showStats() {
    document.getElementById('statsModal').style.display = 'block';
    updateStats();
    renderCharts();
}

function closeStats() {
    document.getElementById('statsModal').style.display = 'none';
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    renderCharts();
}

function updateStats() {
    const completed = todos.filter(t => t.completed).length;
    const pending = todos.filter(t => !t.completed).length;
    const efficiency = analytics.calculateEfficiency();
    
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('completionRate').textContent = efficiency + '%';
}

function renderCharts() {
    const weeklyStats = analytics.getStatsForPeriod(7);
    const monthlyStats = analytics.getStatsForPeriod(30);
    
    // Графики остаются без изменений
    const dailyCtx = document.getElementById('dailyChart');
    if (dailyCtx) {
        new Chart(dailyCtx, {
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
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    const weeklyCtx = document.getElementById('weeklyChart');
    if (weeklyCtx) {
        new Chart(weeklyCtx, {
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
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: monthlyStats.labels,
                datasets: [{
                    label: 'Выполнено задач',
                    data: monthlyStats.completed,
                    backgroundColor: '#af52de'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Инициализация основной кнопки Telegram
tg.MainButton.setText('Сохранить всё');
tg.MainButton.onClick(() => {
    tg.showPopup({
        title: 'Успех',
        message: 'Все задачи сохранены локально!',
        buttons: [{ type: 'ok' }]
    });
});