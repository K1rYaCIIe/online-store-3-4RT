
// Единое WebSocket соединение
const socket = new WebSocket('ws://localhost:8080');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Создаем элемент статуса соединения
const connectionStatus = document.createElement('div');
connectionStatus.id = 'connection-status';
connectionStatus.textContent = "Статус: подключение...";
chatForm.before(connectionStatus);

// Обработчик входящих сообщений
socket.addEventListener('message', async (event) => {
    try {

        const messageData = event.data instanceof Blob ? await event.data.text() : event.data;
        const message = JSON.parse(messageData);
        
        // Показываем только сообщения от клиентов (игнорируем свои же сообщения)
        if (message.sender === 'Пользователь') {
            const messageElement = document.createElement('div');
            messageElement.className = 'message-client';
            messageElement.innerHTML = `Клиент: ${message.text}`; //<strong>Клиент:</strong>
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

    } catch (error) {
        console.error('Ошибка обработки сообщения:', error);
    }
});

// Обработчики состояния соединения
socket.addEventListener('open', () => {
    console.log('WebSocket connection established');
    connectionStatus.textContent = "Статус: онлайн";
    connectionStatus.style.color = "green";

    // Можно добавить дополнительное системное сообщение
    addMessage('Соединение с сервером установлено');
});

socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
    connectionStatus.textContent = "Статус: ошибка";
    connectionStatus.style.color = "red";
});

socket.addEventListener('close', () => {
    console.log('WebSocket connection closed');
    connectionStatus.textContent = "Статус: оффлайн"; 
    connectionStatus.style.color = "gray";
});


// ЗАМЕНИТЕ текущий обработчик формы на этот:
chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const text = chatInput.value.trim();

    if (!text) {
        alert('Введите текст сообщения');
        return;
    }
    
    if (socket.readyState !== WebSocket.OPEN) {
        alert('Нет соединения с сервером. Попробуйте обновить страницу.');
        return;
    }

    // Локально добавляем сообщение админа
    const messageElement = document.createElement('div');
    messageElement.className = 'message-admin';
    messageElement.innerHTML = `Вы: ${text}`; //<strong>Вы:</strong>
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Отправляем на сервер
    socket.send(JSON.stringify({
        sender: 'Администратор',
        text: text
    }));
    
    chatInput.value = '';
});

// Загрузка товаров
async function loadProducts() {
    const response = await fetch('http://localhost:3000/products');
    const products = await response.json();
    const tbody = document.querySelector('#products-table tbody');
    
    tbody.innerHTML = products.map(product => `
        <tr data-id="${product.id}">
            <td>${product.id}</td>
            <td><input type="text" value="${product.name}" class="edit-name"></td>
            <td><input type="number" value="${product.price}" class="edit-price"></td>
            <td><textarea class="edit-description">${product.description}</textarea></td>
            <td><input type="text" value="${product.categories.join(', ')}" class="edit-categories"></td>
            <td>
                <button class="update-btn">Обновить</button>
                <button class="delete-btn">Удалить</button>
            </td>
        </tr>
    `).join('');
    
    // Добавляем обработчики для кнопок
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            const product = {
                name: row.querySelector('.edit-name').value,
                price: parseFloat(row.querySelector('.edit-price').value),
                description: row.querySelector('.edit-description').value,
                categories: row.querySelector('.edit-categories').value.split(',').map(c => c.trim())
            };
            
            await fetch(`http://localhost:3000/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            
            alert('Товар обновлен');
            loadProducts();
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Вы уверены, что хотите удалить этот товар?')) {
                const id = e.target.closest('tr').dataset.id;
                await fetch(`http://localhost:3000/products/${id}`, { method: 'DELETE' });
                alert('Товар удален');
                loadProducts();
            }
        });
    });
}

// Добавление нового товара
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;


    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        const name = document.getElementById('name').value.trim();
        const price = parseFloat(document.getElementById('price').value);
        const description = document.getElementById('description').value.trim();
        const categories = document.getElementById('categories').value
            .split(',')
            .map(cat => cat.trim())
            .filter(cat => cat.length > 0);

        if (!name || isNaN(price) || price <= 0 || !description || categories.length === 0) {
            throw new Error('Пожалуйста, заполните все поля корректно!');
        }

        const response = await fetch('http://localhost:3000/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, description, categories })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка сервера');
        }

        alert('Товар успешно добавлен!');
        document.getElementById('add-product-form').reset();
        await loadProducts();
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Добавьте в начало скрипта (после получения элементов DOM)
window.onload = function() {
    // Приветственные системные сообщения
    // addSystemMessage('Добро пожаловать в чат!');
    // addSystemMessage('Добро пожаловать в чат поддержки!');
    addMessage('Добро пожаловать в чат!', 'Система');
    addMessage('Добро пожаловать в чат поддержки!', 'Система');
};

// Добавьте новую функцию для системных сообщений
function addMessage(text, sender, isLocal = false) {
    const messageElement = document.createElement('div');
    const messageClass = sender === 'Администратор' ? 'message-admin' : 
                       sender === 'Пользователь' ? 'message-client' : 'message-system';
    
    messageElement.className = messageClass;
    
    if (sender !== 'Система') {
        const senderSpan = document.createElement('span');
        senderSpan.className = 'message-sender';
        senderSpan.textContent = isLocal ? 'Вы' : 'Клиент';
        messageElement.appendChild(senderSpan);
    }
    
    const textSpan = document.createElement('div');
    textSpan.className = 'message-text';
    textSpan.textContent = text;
    messageElement.appendChild(textSpan);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// function addSystemMessage(text) {
//     const messageElement = document.createElement('div');
//     messageElement.className = 'message-system';
//     messageElement.textContent = text;
//     chatMessages.appendChild(messageElement);
//     chatMessages.scrollTop = chatMessages.scrollHeight;
// }

// Первоначальная загрузка
loadProducts();