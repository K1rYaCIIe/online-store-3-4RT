const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Получить данные о товарах (из файла админки)
app.get('/products', (req, res) => {
    try {
        const adminData = JSON.parse(fs.readFileSync('../admin-backend/products.json'));
        res.json(adminData.products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load products' });
    }
});

app.listen(PORT, () => {
    console.log(`User server running on http://localhost:${PORT}`);
});