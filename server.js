import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// --- Инициализация БД ---
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    users: [{ id: 1, login: 'admin', password: '123', name: 'Администратор' }],
    clients: [],
    models: [],
    orders: [],
    settings: { sizeGrid: { min: 36, max: 41 } }
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- API ---

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.login === login && u.password === password);
  if (user) {
    res.json({ success: true, user: { name: user.name, login: user.login } });
  } else {
    res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
  }
});

app.get('/api/data', (req, res) => {
  const data = readDB();
  const { users, ...safeData } = data;
  res.json(safeData);
});

app.post('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = req.body;
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/clients', (req, res) => {
  const db = readDB();
  const newClient = { ...req.body, id: Date.now() };
  db.clients.push(newClient);
  writeDB(db);
  res.json(newClient);
});

app.delete('/api/clients/:id', (req, res) => {
  const db = readDB();
  db.clients = db.clients.filter(c => c.id !== Number(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/clients/import', (req, res) => {
  const db = readDB();
  const newClients = req.body.map((c, i) => ({ ...c, id: Date.now() + i }));
  db.clients = [...db.clients, ...newClients];
  writeDB(db);
  res.json(newClients);
});

app.post('/api/models', (req, res) => {
  const db = readDB();
  const newModel = { ...req.body, id: Date.now() };
  db.models.push(newModel);
  writeDB(db);
  res.json(newModel);
});

app.put('/api/models/:id', (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const index = db.models.findIndex(m => m.id === id);
  if (index !== -1) {
    db.models[index] = { ...db.models[index], ...req.body };
    writeDB(db);
    res.json(db.models[index]);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.delete('/api/models/:id', (req, res) => {
  const db = readDB();
  db.models = db.models.filter(m => m.id !== Number(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/models/import', (req, res) => {
  const db = readDB();
  const importedData = req.body;
  let added = 0;
  let updated = 0;
  const errors = [];

  importedData.forEach((item, idx) => {
    const rawSku = item.sku || item.Артикул || item.ARTIKUL;
    const rawColor = item.color || item.Цвет || item.COLOR;
    const rawPrice = item.price !== undefined ? item.price : (item.Цена !== undefined ? item.Цена : item.PRICE);

    if (!rawSku || !rawColor || rawPrice === undefined) {
      errors.push(`Строка ${idx + 2}: Нет обязательных полей`);
      return;
    }

    const sku = String(rawSku).trim();
    const color = String(rawColor).trim();
    const price = Number(rawPrice);

    const existIndex = db.models.findIndex(m => 
      String(m.sku).toLowerCase() === sku.toLowerCase() &&
      String(m.color).toLowerCase() === color.toLowerCase()
    );

    if (existIndex !== -1) {
      if (db.models[existIndex].price !== price) {
        db.models[existIndex].price = price;
        updated++;
      }
    } else {
      db.models.push({ id: Date.now() + Math.random(), sku, color, price });
      added++;
    }
  });

  writeDB(db);
  res.json({ added, updated, errors });
});

app.post('/api/orders', (req, res) => {
  const db = readDB();
  const newOrder = { ...req.body, id: Date.now() };
  db.orders.unshift(newOrder);
  writeDB(db);
  res.json(newOrder);
});

// Исправленный блок для отдачи сайта
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON http://localhost:${PORT}`);
});