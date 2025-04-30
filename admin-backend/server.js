const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'products.json');

// Настройка CORS (один раз!)
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация файла данных
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        products: [
            { id: 1, name: "Ноутбук", price: 50000, description: "Мощный ноутбук для работы", categories: ["Электроника"] },
            { id: 2, name: "Смартфон", price: 30000, description: "Новейший смартфон", categories: ["Электроника"] },
            { id: 3, name: "Книга", price: 500, description: "Интересная книга", categories: ["Книги"] },
            { id: 4, name: "Наушники", price: 5000, description: "Беспроводные наушники", categories: ["Электроника"] },
            { id: 5, name: "Электронная книга", price: 8000, description: "Удобный ридер", categories: ["Электроника", "Книги"] }
        ]
    }, null, 2));
}

// Роуты
app.get('/admin/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-chat.html'));
});

app.get('/products', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        res.json(data.products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load products' });
    }
});



// Добавить товар
app.post('/products', (req, res) => {
    console.log('Получен POST запрос:', req.body); // Логируем входящие данные
    
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE));

      const maxId = data.products.reduce((max, product) => 
        Math.max(max, product.id), 0);


      const newProduct = {
        id: maxId + 1, // Новый ID = максимальный существующий + 1
        name: req.body.name,
        price: parseFloat(req.body.price),
        description: req.body.description,
        categories: Array.isArray(req.body.categories) 
            ? req.body.categories 
            : [req.body.categories || 'Без категории']
      };
        // Проверяем, что все ID являются числами
      const allIdsAreValid = data.products.every(product => Number.isInteger(product.id));
        if (!allIdsAreValid) {
          throw new Error('Обнаружены некорректные ID товаров');
      }
      
      data.products.push(newProduct);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      
      console.log('Добавлен товар:', newProduct); // Логируем результат
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Ошибка при добавлении:', error);
      res.status(500).json({ error: error.message });
    }
  });

// Обновить товар
app.put('/products/:id', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const index = data.products.findIndex(p => p.id === parseInt(req.params.id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    data.products[index] = {
        ...data.products[index],
        ...req.body,
        id: parseInt(req.params.id)
    };
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(data.products[index]);
});

// Удалить товар
app.delete('/products/:id', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    const initialLength = data.products.length;
    data.products = data.products.filter(p => p.id !== parseInt(req.params.id));
    
    if (data.products.length === initialLength) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.status(204).end();
});

// Запуск сервера (один раз!)
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Admin server running on http://localhost:${PORT}`);
});

