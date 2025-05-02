document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('products-container');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    
    // Клиентская версия - не админ
    const isAdmin = false; 
    let lastMessage = null;

    // WebSocket клиент
    const ws = new WebSocket(`ws://${window.location.host}`);

    // Функция добавления сообщения
    const addMessage = (text, sender, isLocal = false) => {
        const messageDiv = document.createElement('div');
        let type, displaySender;
        
        if (sender === 'Система') {
            type = 'system';
            displaySender = '';
        } else if (sender === 'Администратор') {
            type = 'admin';
            displaySender = 'Администратор';
        } else {
            type = 'user';
            // Показываем только "Вы" для своих сообщений, остальные без подписи
            displaySender = isLocal ? `Вы` : '';
        }

        messageDiv.className = `message message-${type}`;
        
        if (displaySender) {
            const senderSpan = document.createElement('span');
            senderSpan.className = 'message-sender';
            senderSpan.textContent = `${displaySender}:`;
            messageDiv.appendChild(senderSpan);
            messageDiv.appendChild(document.createTextNode(' '));
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        messageDiv.appendChild(textSpan);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // Обработчик входящих сообщений
    ws.onmessage = (event) => {
        try {
            const { sender, text } = JSON.parse(event.data);
            
            // Показываем только сообщения от администратора (игнорируем свои же сообщения)
        if (sender === 'Администратор') {
            addMessage(text, sender);
        }

        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
        }
    };

    // Отправка сообщений
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (!text || ws.readyState !== WebSocket.OPEN) return;
        
        // Только локальное отображение (без дублирования)
        addMessage(text, 'Вы', true);

        // Проверка на дублирование
        // if (lastMessage && lastMessage.text === text && 
        //     Date.now() - lastMessage.timestamp < 1000) {
        //     return;
        // }
        
        // lastMessage = {
        //     text: text,
        //     timestamp: Date.now()
        // };
        
        // Локально добавляем сообщение
        // addMessage(text, 'Покупатель', true);
        
        // Отправляем на сервер
        ws.send(JSON.stringify({
            sender: 'Покупатель',
            text: text
        }));
        
        chatInput.value = '';
    };

    // Назначение обработчиков
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Тестовые сообщения
    addMessage("Добро пожаловать в чат!", "Система");

    // ===== Код для работы с товарами =====
    const loadProducts = async (category = 'all') => {
        try {
            const fields = getSelectedFields();
            const query = category === 'all' 
                ? `{ products { ${fields} } }`
                : `{ productsByCategory(category: "${category}") { ${fields} } }`;
    
            console.log('Отправка GraphQL запроса:', query); // Логирование
    
            const response = await fetch('http://localhost:8080/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            
            console.log('Получен ответ:', response); // Логирование
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('GraphQL результат:', result); // Логирование
            
            if (result.errors) {
                throw new Error(result.errors.map(e => e.message).join('\n'));
            }
            
            const products = category === 'all' 
                ? result.data.products 
                : result.data.productsByCategory;
                
            console.log('Загружены товары:', products); // Логирование
            
            container.innerHTML = products?.length 
                ? products.map(product => `
                    <div class="product-card">
                        ${product.name ? `<h2>${product.name}</h2>` : ''}
                        ${product.price ? `<div class="price">${product.price} руб.</div>` : ''}
                        ${product.description ? `<p>${product.description}</p>` : ''}
                        ${product.categories ? `<div class="categories">Категории: ${product.categories.join(', ')}</div>` : ''}
                    </div>
                `).join('')
                : '<div class="empty">Товары не найдены</div>';
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            container.innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
        }
    };

    const getSelectedFields = () => {
        return Array.from(document.querySelectorAll('input[name="fields"]:checked'))
               .map(cb => cb.value).join(' ');
    };
    
    // Обработчики категорий
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadProducts(btn.dataset.category);
        });
    });

    // Обработчики чекбоксов
    document.querySelectorAll('input[name="fields"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const activeCategory = document.querySelector('.category-btn.active').dataset.category;
            loadProducts(activeCategory);
        });
    });

    // Первоначальная загрузка
    loadProducts();
});
