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
const IMAGES_DIR = path.join(__dirname, 'images');

if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(DIST_DIR));
app.use('/images', express.static(IMAGES_DIR));

// Обновленная структура данных по умолчанию
const DEFAULT_DATA = {
  users: [{ id: 1, login: 'admin', password: '123', name: 'Администратор' }],
  clients: [],
  models: [],
  orders: [],
  settings: { 
    // Массив сеток
    sizeGrids: [
        { id: 1, name: 'Стандарт', min: '40', max: '45', isDefault: true },
    ],
    defaultSizeGridId: 1, // ID сетки по умолчанию
    boxTemplates: { 
        // Шаблоны ящиков, ключом является ID сетки
        '1': { 
            6: {40:1, 41:1, 42:2, 43:1, 44:1}, // Пример комплектации
        }
    }, 
    exchangeRates: { usd: 0, eur: 0, isManual: false },
    mainCurrency: 'USD',
    brandName: 'SHOE EXPO',
    brandPhones: [],
    brandLogo: null 
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
  
  let changed = false;
  
  // Миграция настроек (обеспечение наличия всех полей)
  if (!db.settings) { db.settings = DEFAULT_DATA.settings; changed = true; }
  if (db.settings.brandName === undefined) { db.settings.brandName = DEFAULT_DATA.settings.brandName; changed = true; }
  if (db.settings.brandPhones === undefined) { db.settings.brandPhones = DEFAULT_DATA.settings.brandPhones; changed = true; }
  if (db.settings.brandLogo === undefined) { db.settings.brandLogo = DEFAULT_DATA.settings.brandLogo; changed = true; }
  
  // Миграция старой структуры sizeGrid в sizeGrids
  if (db.settings && db.settings.sizeGrid && !db.settings.sizeGrids) {
       console.log("Migrating sizeGrid structure...");
       db.settings.sizeGrids = [{ 
           id: 1, 
           name: 'Основная', 
           min: db.settings.sizeGrid.min || '40', 
           max: db.settings.sizeGrid.max || '45', 
           isDefault: true 
       }];
       db.settings.defaultSizeGridId = 1;
       // Удаляем старый объект sizeGrid, чтобы не мешал
       delete db.settings.sizeGrid; 
       changed = true;
  }
  
  // Миграция старых шаблонов ящиков в формат { '1': templates }
  if (db.settings && db.settings.boxTemplates) {
       // Если это старый формат { 6:{...}, 8:{...} } и нет ключа '1', переносим
       if (!db.settings.boxTemplates['1'] && Object.keys(db.settings.boxTemplates).some(k => k.match(/^\d+$/))) {
            console.log("Migrating boxTemplates structure...");
            db.settings.boxTemplates = { '1': db.settings.boxTemplates };
            changed = true;
       }
  }

  // Миграция ID заказов
  if (db.orders && db.orders.length > 0) {
      const missingIds = db.orders.some(o => !o.orderId);
      if (missingIds) {
          console.log("Migrating Order IDs...");
          const sortedOrders = [...db.orders].sort((a, b) => a.id - b.id);
          sortedOrders.forEach((order, index) => { order.orderId = index + 1; });
          db.orders = sortedOrders.reverse();
          changed = true;
      }
  }

  if (changed) writeDB(db);
};

initDB();

// --- Служебные функции (валидация/форматирование) ---
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
  const safeSettings = { ...DEFAULT_DATA.settings, ...db.settings };
  const { users, settings, ...rest } = db;
  res.json({ ...rest, settings: safeSettings });
});

app.post('/api/settings', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

app.post('/api/upload-logo', (req, res) => {
    try {
        const { image, brandName } = req.body;
        if (!image) return res.status(400).json({ message: "Нет изображения" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        const safeBrand = brandName ? brandName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'brand';
        const fileName = `${safeBrand}_${Date.now()}.png`;
        const filePath = path.join(IMAGES_DIR, fileName);

        fs.writeFileSync(filePath, buffer);

        const db = readDB();
        if (db.settings.brandLogo) {
             const oldPath = path.join(IMAGES_DIR, db.settings.brandLogo);
             if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        db.settings.brandLogo = fileName;
        writeDB(db);

        res.json({ success: true, fileName });
    } catch (e) {
        console.error("Upload error:", e);
        res.status(500).json({ message: "Ошибка сохранения файла" });
    }
});

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
  } else { res.status(404).json({ message: "Клиент не найден" }); }
});

app.delete('/api/clients/:id', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  db.clients = db.clients.filter(c => c.id !== Number(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/clients/import', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  const newClients = req.body.map((c, i) => ({ ...c, id: Date.now() + i }));
  db.clients = [...db.clients, ...newClients];
  writeDB(db);
  res.json(newClients);
});

// --- MODELS ---
app.post('/api/models', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  // Добавляем gridId, если он пришел
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

// --- ORDERS ---
app.post('/api/orders', (req, res) => {
  const db = readDB() || DEFAULT_DATA;
  
  const maxOrderId = db.orders.reduce((max, o) => Math.max(max, o.orderId || 0), 0);
  const nextId = maxOrderId + 1;

  const newOrder = { 
      ...req.body, 
      id: Date.now(), 
      orderId: nextId 
  };
  
  db.orders.unshift(newOrder);
  writeDB(db);
  res.json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
    const db = readDB() || DEFAULT_DATA;
    const id = Number(req.params.id);
    const index = db.orders.findIndex(o => o.id === id);
    
    if (index !== -1) {
        const existing = db.orders[index];
        db.orders[index] = { 
            ...req.body, 
            id: id, 
            orderId: existing.orderId 
        };
        writeDB(db);
        res.json(db.orders[index]);
    } else {
        res.status(404).json({ message: "Заказ не найден" });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    const db = readDB() || DEFAULT_DATA;
    const id = Number(req.params.id);
    db.orders = db.orders.filter(o => o.id !== id);
    writeDB(db);
    res.json({ success: true });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON http://localhost:${PORT}`);
});