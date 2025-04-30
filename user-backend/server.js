const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const WebSocket = require('ws'); //+

const app = express();
const PORT = 8080;

// GraphQL схема
const schema = buildSchema(`
  type Product {
    id: ID!
    name: String!
    price: Float!
    description: String
    categories: [String!]!
  }

  type Query {
    products: [Product!]!
    productsByCategory(category: String!): [Product!]!
    product(id: ID!): Product
  }
`);

// Модель сообщения чата
class ChatMessage {
    constructor(sender, text, timestamp = new Date()) {
      this.sender = sender;
      this.text = text;
      this.timestamp = timestamp.toISOString();
    }
  }

// Создаем HTTP сервер для Express
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`GraphQL IDE available at http://localhost:${PORT}/graphql`); // Перенесено сюда
});

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

// Хранилище для клиентов чата
const chatClients = new Set();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  // Отправляем приветственное сообщение
  ws.send(JSON.stringify({
      sender: 'Система',
      text: 'Добро пожаловать в чат поддержки!'
  }));

  ws.on('message', (message) => {
      try {
          // Парсим входящее сообщение
          const parsedMsg = typeof message === 'string' 
              ? JSON.parse(message) 
              : JSON.parse(message.toString());
          
          console.log('Received:', parsedMsg);

          // Рассылаем всем клиентам (включая отправителя)
          wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                      sender: parsedMsg.sender,
                      text: parsedMsg.text,
                      timestamp: new Date().toISOString()
                  }));
              }
          });
      } catch (error) {
          console.error('Error processing message:', error);
      }
  });
});



// Улучшенная функция для загрузки товаров с обработкой ошибок
function loadProducts() {
  try {
    const filePath = path.join(__dirname, '../admin-backend/products.json');
    
    // Проверка существования файла
    if (!fs.existsSync(filePath)) {
      throw new Error('Products file not found');
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const adminData = JSON.parse(fileContent);
    
    // Валидация структуры данных
    if (!adminData.products || !Array.isArray(adminData.products)) {
      throw new Error('Invalid products data structure');
    }
    
    return adminData.products;
  } catch (error) {
    console.error('Error loading products:', error);
    throw error; // Перебрасываем ошибку для обработки в резолверах
  }
}

// GraphQL резолверы с улучшенной обработкой ошибок
const root = {
  products: () => {
    try {
      return loadProducts();
    } catch (error) {
      throw new Error('Failed to load products: ' + error.message);
    }
  },
  productsByCategory: ({ category }) => {
    try {
      const products = loadProducts();
      return products.filter(p => p.categories.includes(category));
    } catch (error) {
      throw new Error(`Failed to filter products by category ${category}: ` + error.message);
    }
  },
  product: ({ id }) => {
    try {
      const products = loadProducts();
      const product = products.find(p => p.id === parseInt(id));
      
      if (!product) {
        throw new Error(`Product with id ${id} not found`);
      }
      
      return product;
    } catch (error) {
      throw new Error('Failed to get product: ' + error.message);
    }
  }
};

// Настройка CORS с явным указанием разрешенных источников
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  methods: ['GET', 'POST']
}));
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// GraphQL endpoint с дополнительными настройками
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
  customFormatErrorFn: (error) => ({
    message: error.message,
    locations: error.locations,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: error.path
  })
}));

// REST endpoint для товаров
app.get('/products', (req, res) => {
  try {
    const products = loadProducts();
    res.json(products);
  } catch (error) {
    console.error('REST endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to load products',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Кэширование статических файлов
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Обработка 404
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
