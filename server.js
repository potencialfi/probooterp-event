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
const DIST_DIR = path.join(__dirname, 'dist');

app.use(cors());
app.use(express.json());
app.use(express.static(DIST_DIR));

// Default data structure
const DEFAULT_DATA = {
  users: [{ id: 1, login: 'admin', password: '123', name: 'Администратор' }],
  clients: [],
  models: [],
  orders: [],
  settings: { 
    sizeGrid: { min: "", max: "" },
    boxTemplates: { 6:{}, 8:{}, 10:{}, 12:{} },
    exchangeRates: { usd: 0, eur: 0, isManual: false } // New field for rates
  }
};

const readDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Database read error:", e);
    return null;
  }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const initDB = () => {
  let db = readDB();
  if (!db) {
    writeDB(DEFAULT_DATA);
    return;
  }
  
  // Migration logic
  let changed = false;
  if (!db.settings) { db.settings = DEFAULT_DATA.settings; changed = true; }
  if (!db.settings.sizeGrid) { db.settings.sizeGrid = DEFAULT_DATA.settings.sizeGrid; changed = true; }
  if (!db.settings.boxTemplates) { db.settings.boxTemplates = DEFAULT_DATA.settings.boxTemplates; changed = true; }
  if (!db.settings.exchangeRates) { db.settings.exchangeRates = DEFAULT_DATA.settings.exchangeRates; changed = true; }
  
  if (changed) writeDB(db);
};

initDB();

const normalizePhone = (phone) => String(phone).replace(/\D/g, '');
const isValidPhone = (phone) => {
  const clean = normalizePhone(phone);
  if (!clean) return false;
  if (clean.startsWith('0')) return clean.length === 10;
  if (clean.startsWith('38')) return clean.length === 12;
  return clean.length >= 6;
};
const formatPhoneNumber = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  let clean = digits;
  if (digits.length === 10 && digits.startsWith('0')) clean = '38' + digits;
  if (clean.length === 12 && clean.startsWith('380')) {
    return `+${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 10)} ${clean.slice(10, 12)}`;
  }
  return value; 
};

// --- API ---

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  const db = readDB() || DEFAULT_DATA;
  const user = (db.users || []).find(u => u.login === login && u.password === password);
  if (user) {
    res.json({ success: true, user: { name: user.name, login: user.login } });
  } else {
    res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
  }
});

app.get('/api/data', (req, res) => {
  const db = readDB();
  if (!db) return res.json(DEFAULT_DATA);
  
  // Ensure settings exist in response even if missing in DB
  const safeSettings = {
      sizeGrid: db.settings?.sizeGrid || DEFAULT_DATA.settings.sizeGrid,
      boxTemplates: db.settings?.boxTemplates || DEFAULT_DATA.settings.boxTemplates,
      exchangeRates: db.settings?.exchangeRates || DEFAULT_DATA.settings.exchangeRates
  };

  const { users, settings, ...rest } = db;
  res.json({ ...rest, settings: safeSettings });
});

app.post('/api/settings', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  db.settings = {
      ...db.settings,
      ...req.body,
      // Ensure we don't lose nested keys during merge
      sizeGrid: req.body.sizeGrid || db.settings.sizeGrid || DEFAULT_DATA.settings.sizeGrid,
      boxTemplates: req.body.boxTemplates || db.settings.boxTemplates || DEFAULT_DATA.settings.boxTemplates,
      exchangeRates: req.body.exchangeRates || db.settings.exchangeRates || DEFAULT_DATA.settings.exchangeRates
  };
  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// --- PROXY FOR NBU (To avoid CORS issues on frontend) ---
app.get('/api/nbu-rates', async (req, res) => {
    try {
        const response = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
        const data = await response.json();
        const usd = data.find(c => c.cc === 'USD')?.rate || 0;
        const eur = data.find(c => c.cc === 'EUR')?.rate || 0;
        res.json({ usd, eur });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch rates" });
    }
});

// --- CLIENTS ---
app.post('/api/clients', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const { name, phone, city } = req.body;
  if (!name) return res.status(400).json({ field: 'name', message: "Введите имя" });
  if (!phone) return res.status(400).json({ field: 'phone', message: "Введите телефон" });
  if (!isValidPhone(phone)) return res.status(400).json({ field: 'phone', message: "Некорректный номер" });
  
  const cleanPhone = normalizePhone(phone);
  const exists = (db.clients || []).find(c => normalizePhone(c.phone) === cleanPhone);
  if (exists) return res.status(400).json({ field: 'phone', message: "Клиент уже существует" });

  const newClient = { id: Date.now(), name, city: city || "", phone: formatPhoneNumber(phone) };
  db.clients.push(newClient);
  writeDB(db);
  res.json(newClient);
});

app.put('/api/clients/:id', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const id = Number(req.params.id);
  const index = db.clients.findIndex(c => c.id === id);
  if (index !== -1) {
    const { name, phone, city } = req.body;
    if (!name) return res.status(400).json({ field: 'name', message: "Имя обязательно" });
    if (!phone) return res.status(400).json({ field: 'phone', message: "Телефон обязателен" });
    if (!isValidPhone(phone)) return res.status(400).json({ field: 'phone', message: "Некорректный номер" });

    const cleanPhone = normalizePhone(phone);
    const duplicate = db.clients.find(c => c.id !== id && normalizePhone(c.phone) === cleanPhone);
    if (duplicate) return res.status(400).json({ field: 'phone', message: "Номер занят" });

    db.clients[index] = { ...db.clients[index], name, city: city || "", phone: formatPhoneNumber(phone) };
    writeDB(db);
    res.json(db.clients[index]);
  } else {
    res.status(404).json({ message: "Клиент не найден" });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  db.clients = db.clients.filter(c => c.id !== Number(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/clients/import', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const importedData = req.body;
  let added = 0; let updated = 0; const errors = [];

  importedData.forEach((item, idx) => {
    const rawName = item.name || item.Name || item.Имя || item.ФИО;
    const rawCity = item.city || item.City || item.Город || "";
    const rawPhone = item.phone || item.Phone || item.Телефон || item.Номер;

    if (!rawName || !rawPhone) { errors.push(`Строка ${idx + 2}: Нет имени/телефона`); return; }
    const phoneStr = String(rawPhone);
    if (!isValidPhone(phoneStr)) { errors.push(`Строка ${idx + 2}: Неверный телефон`); return; }

    const cleanPhone = normalizePhone(phoneStr);
    const formattedPhone = formatPhoneNumber(phoneStr);
    const existIndex = db.clients.findIndex(c => normalizePhone(c.phone) === cleanPhone);

    if (existIndex !== -1) {
      let wasUpdated = false;
      if (db.clients[existIndex].name !== rawName) { db.clients[existIndex].name = rawName; wasUpdated = true; }
      if (rawCity && db.clients[existIndex].city !== rawCity) { db.clients[existIndex].city = rawCity; wasUpdated = true; }
      if (db.clients[existIndex].phone !== formattedPhone) { db.clients[existIndex].phone = formattedPhone; wasUpdated = true; }
      if (wasUpdated) updated++;
    } else {
      db.clients.push({ id: Date.now() + idx, name: String(rawName).trim(), city: String(rawCity).trim(), phone: formattedPhone });
      added++;
    }
  });
  writeDB(db);
  res.json({ added, updated, errors });
});

// --- MODELS ---
app.post('/api/models', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const newModel = { ...req.body, id: Date.now() };
  db.models.push(newModel);
  writeDB(db);
  res.json(newModel);
});

app.put('/api/models/:id', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const id = Number(req.params.id);
  const index = db.models.findIndex(m => m.id === id);
  if (index !== -1) {
    db.models[index] = { ...db.models[index], ...req.body };
    writeDB(db);
    res.json(db.models[index]);
  } else { res.status(404).json({ error: "Not found" }); }
});

app.delete('/api/models/:id', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  db.models = db.models.filter(m => m.id !== Number(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/models/import', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const importedData = req.body;
  let added = 0; let updated = 0; const errors = [];

  importedData.forEach((item, idx) => {
    const rawSku = item.sku || item.Артикул;
    const rawColor = item.color || item.Цвет;
    const rawPrice = item.price !== undefined ? item.price : item.Цена;

    if (!rawSku || !rawColor || rawPrice === undefined) { errors.push(`Строка ${idx + 2}: Нет полей`); return; }
    const sku = String(rawSku).trim();
    const color = String(rawColor).trim();
    const price = Number(rawPrice);
    const existIndex = db.models.findIndex(m => String(m.sku).toLowerCase() === sku.toLowerCase() && String(m.color).toLowerCase() === color.toLowerCase());

    if (existIndex !== -1) {
      if (db.models[existIndex].price !== price) { db.models[existIndex].price = price; updated++; }
    } else {
      db.models.push({ id: Date.now() + idx, sku, color, price });
      added++;
    }
  });
  writeDB(db);
  res.json({ added, updated, errors });
});

app.post('/api/orders', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const newOrder = { ...req.body, id: Date.now() };
  db.orders.unshift(newOrder);
  writeDB(db);
  res.json(newOrder);
});

app.use((req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('API endpoint not found (and frontend not built)');
  }
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON http://localhost:${PORT}`);
});