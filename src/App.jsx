import React, { useState, useEffect } from 'react';
import { 
  Users, Package, ShoppingCart, FileText, Plus, Trash2, Save, 
  Download, Upload, Printer, Search, Settings, X, Edit, 
  ArrowDownAZ, ArrowUpAZ, Filter, CheckCircle, AlertCircle, LogIn
} from 'lucide-react';

// Адрес сервера
const API_URL = 'http://localhost:3001/api';

// --- Helpers ---
const apiCall = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (!res.ok) {
       let errorMessage = 'Ошибка сервера';
       try {
          const errData = await res.json();
          errorMessage = errData.message || errorMessage;
       } catch (e) {}
       throw new Error(errorMessage);
    }
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
};

// --- UI Components ---
const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', icon: Icon }) => {
  const baseStyle = "flex items-center gap-2 rounded transition-colors duration-200 font-medium justify-center";
  const sizes = { sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", compact: "px-3 py-2 text-sm", lg: "px-6 py-3 text-lg" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-xs font-semibold text-gray-600 uppercase">{label}</label>}
    <input className={`border rounded px-3 py-2 focus:outline-none focus:border-blue-500 w-full ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} {...props} />
    {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
  </div>
);

// --- Modals ---
const Modal = ({ title, children, onClose, footer }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b bg-gray-50">
        <h3 className="font-bold text-lg text-gray-800">{title}</h3>
        <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-gray-700"/></button>
      </div>
      <div className="p-6 overflow-y-auto">{children}</div>
      {footer && <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">{footer}</div>}
    </div>
  </div>
);

const NotificationModal = ({ type, message, onClose }) => {
  if (!message) return null;
  return (
    <Modal title={type === 'success' ? "Успешно" : "Внимание"} onClose={onClose} footer={<Button onClick={onClose} variant="secondary">Закрыть</Button>}>
      <div className="flex flex-col items-center text-center gap-4">
        {type === 'success' ? <CheckCircle size={48} className="text-green-500" /> : <AlertCircle size={48} className="text-red-500" />}
        <p className="text-lg">{message}</p>
      </div>
    </Modal>
  );
};

const ImportResultModal = ({ result, onClose }) => {
  if (!result) return null;
  return (
    <Modal title="Результаты импорта" onClose={onClose} footer={<Button onClick={onClose} variant="primary">Отлично</Button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded text-center border border-green-200">
            <div className="text-2xl font-bold text-green-700">{result.added}</div>
            <div className="text-xs text-green-600 uppercase font-bold">Добавлено</div>
          </div>
          <div className="bg-blue-50 p-3 rounded text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
            <div className="text-xs text-blue-600 uppercase font-bold">Обновлено</div>
          </div>
        </div>
        {result.errors.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-bold text-red-600 mb-2">Ошибки ({result.errors.length}):</div>
            <div className="bg-red-50 border border-red-200 rounded max-h-40 overflow-y-auto p-2 text-sm text-red-700 space-y-1">
              {result.errors.map((err, idx) => <div key={idx} className="border-b border-red-100 pb-1">{err}</div>)}
            </div>
          </div>
        )}
        {result.errors.length === 0 && <div className="text-center text-gray-500 text-sm">Ошибок нет.</div>}
      </div>
    </Modal>
  );
};

// --- Excel Lib ---
const ensureXLSX = async () => {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load XLSX library"));
    document.head.appendChild(script);
  });
};

const handleExportExcel = async (data, filename) => {
  try {
    const XLSX = await ensureXLSX();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (e) { console.error(e); }
};

// --- APP ---
export default function App() {
  const [user, setUser] = useState(null);
  
  const [activeTab, setActiveTab] = useState('newOrder');
  const [clients, setClients] = useState([]);
  const [models, setModels] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sizeGrid, setSizeGrid] = useState({ min: 36, max: 41 });
  
  const [notification, setNotification] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const loadAllData = async () => {
    try {
      const data = await apiCall('/data');
      setClients(data.clients || []);
      setModels(data.models || []);
      setOrders(data.orders || []);
      if(data.settings?.sizeGrid) setSizeGrid(data.settings.sizeGrid);
    } catch (e) {
      setNotification({ type: 'error', message: 'Ошибка: Сервер не запущен. Запустите server.js' });
    }
  };

  const showSuccess = (msg) => setNotification({ type: 'success', message: msg });
  const showError = (msg) => setNotification({ type: 'error', message: msg });

  const handleFileImport = async (e, endpoint, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      const XLSX = await ensureXLSX();
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const wb = XLSX.read(event.target.result, { type: 'binary' });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          const res = await apiCall(endpoint, 'POST', data);
          callback(res);
        } catch (err) { showError("Ошибка обработки файла"); }
      };
      reader.readAsBinaryString(file);
    } catch (err) { showError("Ошибка Excel библиотеки"); }
  };

  if (!user) {
    return <LoginPage onLogin={(u) => { setUser(u); loadAllData(); }} />;
  }

  const ClientsPage = () => {
    const [newClient, setNewClient] = useState({ name: '', city: '', phone: '' });
    const [deleteId, setDeleteId] = useState(null);

    const addClient = async () => {
      if (!newClient.name) return showError("Введите имя");
      try {
        const saved = await apiCall('/clients', 'POST', newClient);
        setClients([...clients, saved]);
        setNewClient({ name: '', city: '', phone: '' });
        showSuccess("Клиент добавлен");
      } catch(e) { showError(e.message); }
    };

    const removeClient = async () => {
      try {
        await apiCall(`/clients/${deleteId}`, 'DELETE');
        setClients(clients.filter(c => c.id !== deleteId));
        setDeleteId(null);
      } catch(e) { showError("Ошибка удаления"); }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Клиенты</h2>
          <div className="flex gap-2">
            <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded flex gap-2 hover:bg-gray-300 text-sm">
              <Upload size={16}/> Импорт
              <input type="file" hidden onChange={(e) => handleFileImport(e, '/clients/import', (res) => {
                 setClients([...clients, ...res]);
                 showSuccess(`Импортировано ${res.length}`);
              })} accept=".xlsx,.xls"/>
            </label>
            <Button onClick={() => handleExportExcel(clients, 'clients')} variant="outline" icon={Download}>Экспорт</Button>
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input label="Имя" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
          <Input label="Город" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} />
          <Input label="Телефон" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
          <Button onClick={addClient} size="compact" icon={Plus}>Добавить</Button>
        </div>
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b"><tr><th className="p-3">Имя</th><th className="p-3">Город</th><th className="p-3">Телефон</th><th className="p-3"></th></tr></thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b"><td className="p-3">{c.name}</td><td className="p-3">{c.city}</td><td className="p-3">{c.phone}</td><td className="p-3"><button onClick={() => setDeleteId(c.id)} className="text-red-500"><Trash2 size={18}/></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {deleteId && <Modal title="Удалить?" onClose={() => setDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Нет</Button><Button variant="danger" onClick={removeClient}>Да</Button></>}><p>Удалить клиента?</p></Modal>}
      </div>
    );
  };

  const ModelsPage = () => {
    const [newModel, setNewModel] = useState({ sku: '', color: '', price: '' });
    const [delId, setDelId] = useState(null);
    const [editM, setEditM] = useState(null);
    const [skuFilter, setSkuFilter] = useState('');
    
    const updateGrid = async (field, val) => {
      const newGrid = { ...sizeGrid, [field]: val };
      setSizeGrid(newGrid);
      await apiCall('/settings', 'POST', { sizeGrid: newGrid });
    };

    const addModel = async () => {
      if (!newModel.sku || !newModel.color) return showError("Заполните поля");
      if (models.some(m => m.sku === newModel.sku && m.color === newModel.color)) return showError("Дубликат");
      try {
        const saved = await apiCall('/models', 'POST', newModel);
        setModels([...models, saved]);
        setNewModel({ sku: '', color: '', price: '' });
        showSuccess("Модель создана");
      } catch(e) { showError(e.message); }
    };

    const removeModel = async () => {
      try {
        await apiCall(`/models/${delId}`, 'DELETE');
        setModels(models.filter(m => m.id !== delId));
        setDelId(null);
      } catch(e) { showError("Ошибка удаления"); }
    };

    const saveEdit = async () => {
      try {
        const updated = await apiCall(`/models/${editM.id}`, 'PUT', { price: Number(editM.price) });
        setModels(models.map(m => m.id === editM.id ? updated : m));
        setEditM(null);
      } catch(e) { showError("Ошибка сохранения"); }
    };

    const filtered = models.filter(m => m.sku.toLowerCase().includes(skuFilter.toLowerCase()));

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Модели</h2>
          <div className="flex gap-2">
            <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded flex gap-2 hover:bg-gray-300 text-sm">
              <Upload size={16}/> Импорт
              <input type="file" hidden onChange={(e) => handleFileImport(e, '/models/import', (res) => {
                 loadAllData();
                 setImportResult(res);
              })} accept=".xlsx,.xls"/>
            </label>
            <Button onClick={() => handleExportExcel(models, 'models')} variant="outline" icon={Download}>Экспорт</Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-800 font-bold"><Settings size={20}/><span>Размерная сетка:</span></div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2"><span className="text-sm">Min:</span><input type="number" className="border rounded w-16 px-2" value={sizeGrid.min} onChange={e => updateGrid('min', e.target.value)}/></div>
             <div className="flex items-center gap-2"><span className="text-sm">Max:</span><input type="number" className="border rounded w-16 px-2" value={sizeGrid.max} onChange={e => updateGrid('max', e.target.value)}/></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-l-4 border-green-500">
          <Input label="Артикул" value={newModel.sku} onChange={e => setNewModel({...newModel, sku: e.target.value})} />
          <Input label="Цвет" value={newModel.color} onChange={e => setNewModel({...newModel, color: e.target.value})} />
          <Input label="Цена" type="number" value={newModel.price} onChange={e => setNewModel({...newModel, price: e.target.value})} />
          <Button onClick={addModel} size="compact" icon={Plus}>Добавить</Button>
        </div>

        <div className="bg-white rounded shadow">
          <div className="p-2 border-b"><Search className="inline mr-2" size={16}/><input placeholder="Поиск по артикулу..." className="outline-none" value={skuFilter} onChange={e => setSkuFilter(e.target.value)}/></div>
          <table className="w-full text-left">
            <thead className="bg-gray-100"><tr><th className="p-3">Артикул</th><th className="p-3">Цвет</th><th className="p-3 text-right">Цена ($)</th><th className="p-3 text-center">Действия</th></tr></thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-blue-600">{m.sku}</td>
                  <td className="p-3">{m.color}</td>
                  <td className="p-3 text-right font-bold text-green-700">${m.price}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button onClick={() => setEditM({...m})} className="text-blue-500"><Edit size={18}/></button>
                    <button onClick={() => setDelId(m.id)} className="text-red-500"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {delId && <Modal title="Удаление" onClose={() => setDelId(null)} footer={<><Button variant="secondary" onClick={() => setDelId(null)}>Отмена</Button><Button variant="danger" onClick={removeModel}>Удалить</Button></>}><p>Удалить модель?</p></Modal>}
        {editM && <Modal title="Цена" onClose={() => setEditM(null)} footer={<Button onClick={saveEdit}>Сохранить</Button>}><Input label="Новая цена" type="number" value={editM.price} onChange={e => setEditM({...editM, price: e.target.value})} autoFocus /></Modal>}
      </div>
    );
  };

  const NewOrderPage = () => {
    const [selClient, setSelClient] = useState('');
    const [selModel, setSelModel] = useState(''); 
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState('');
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');

    const currentM = models.find(m => m.id === parseInt(selModel));

    const addToCart = () => {
      if (!currentM) return;
      setCart([...cart, { ...currentM, modelId: currentM.id, qty: parseInt(qty), note, total: currentM.price * parseInt(qty) }]);
      setQty(1); setNote(''); setSelModel(''); setSearch('');
    };

    const saveOrder = async () => {
      if (!selClient || cart.length === 0) return showError("Выберите клиента и товары");
      const order = {
        date: new Date().toISOString(),
        clientId: parseInt(selClient),
        items: cart,
        total: cart.reduce((acc, i) => acc + i.total, 0)
      };
      try {
        const saved = await apiCall('/orders', 'POST', order);
        setOrders([saved, ...orders]);
        setCart([]); setSelClient('');
        showSuccess("Заказ сохранен");
        setActiveTab('history');
      } catch(e) { showError("Ошибка сохранения заказа"); }
    };

    const filteredM = models.filter(m => m.sku.toLowerCase().includes(search.toLowerCase()) || m.color.toLowerCase().includes(search.toLowerCase()));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded shadow">
            <label className="block text-sm font-bold text-gray-600 mb-1">Клиент</label>
            <select className="w-full border p-2 rounded" value={selClient} onChange={e => setSelClient(e.target.value)}>
              <option value="">-- Выбрать --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="bg-white p-4 rounded shadow space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input className="w-full border p-2 pl-10 rounded" placeholder="Поиск модели..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <div className="border rounded mt-1 max-h-40 overflow-y-auto bg-gray-50 absolute w-full z-10">
                  {filteredM.map(m => (
                    <div key={m.id} onClick={() => { setSelModel(m.id); setSearch(m.sku); }} className="p-2 cursor-pointer hover:bg-blue-100 flex justify-between">
                      <span>{m.sku} - {m.color}</span><span className="font-bold">${m.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {currentM && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-4 font-bold">{currentM.sku} / {currentM.color} <span className="text-gray-500 text-sm">(${currentM.price})</span></div>
                <Input type="number" label="Кол-во" value={qty} onChange={e => setQty(e.target.value)} />
                <div className="md:col-span-2"><Input label="Размеры" value={note} onChange={e => setNote(e.target.value)} placeholder={`${sizeGrid.min}...`} /></div>
                <Button onClick={addToCart} size="compact" icon={Plus}>В заказ</Button>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white p-4 rounded shadow flex flex-col h-[calc(100vh-100px)] sticky top-4">
          <h3 className="font-bold border-b pb-2 mb-2 flex gap-2"><ShoppingCart/> Корзина</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {cart.map((i, idx) => (
              <div key={idx} className="bg-gray-50 p-2 rounded border flex justify-between">
                <div><div className="font-bold text-sm">{i.sku}</div><div className="text-xs">{i.qty} x ${i.price} {i.note && `[${i.note}]`}</div></div>
                <div className="text-right font-bold">${i.total} <button onClick={() => setCart(cart.filter((_, x) => x !== idx))} className="text-red-500 ml-2">x</button></div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between font-bold text-lg mb-4"><span>Итого:</span><span>${cart.reduce((a,b)=>a+b.total,0)}</span></div>
            <Button onClick={saveOrder} variant="success" className="w-full">Сохранить</Button>
          </div>
        </div>
      </div>
    );
  };

  const OrdersPage = () => {
    const [viewId, setViewId] = useState(null);
    const order = orders.find(o => o.id === viewId);
    
    if (order) {
      const client = clients.find(c => c.id === order.clientId) || { name: 'Удален' };
      return (
        <div className="bg-white p-8 max-w-4xl mx-auto shadow-lg">
          <div className="flex justify-between mb-8 print:hidden"><Button onClick={() => setViewId(null)} variant="secondary" icon={X}>Назад</Button><Button onClick={() => window.print()} icon={Printer}>Печать</Button></div>
          <div className="border-b-2 border-gray-800 pb-4 mb-6"><h1 className="text-3xl font-bold">INVOICE #{order.id}</h1><p>{new Date(order.date).toLocaleString()}</p></div>
          <div className="grid grid-cols-2 gap-8 mb-8"><div><h3 className="font-bold text-gray-500 text-sm">FROM</h3><p className="font-bold text-lg">SHOE EXPO</p></div><div className="text-right"><h3 className="font-bold text-gray-500 text-sm">TO</h3><p className="font-bold text-lg">{client.name}</p><p>{client.city}</p></div></div>
          <table className="w-full text-left mb-8">
            <thead><tr className="border-b-2 border-gray-800"><th>Model</th><th>Sizes</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
            <tbody>{order.items.map((i, x) => <tr key={x} className="border-b"><td><span className="font-bold">{i.sku}</span><br/>{i.color}</td><td>{i.note}</td><td className="text-center">{i.qty}</td><td className="text-right">${i.price}</td><td className="text-right font-bold">${i.total}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan="4" className="pt-4 text-right font-bold text-xl">TOTAL:</td><td className="pt-4 text-right font-bold text-xl">${order.total}</td></tr></tfoot>
          </table>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">История</h2><Button onClick={exportOrdersXLSX} variant="success" icon={FileText}>Отчет (XLSX)</Button></div>
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-left"><thead className="bg-gray-100"><tr><th className="p-3">#</th><th className="p-3">Дата</th><th className="p-3">Клиент</th><th className="p-3 text-right">Сумма</th><th className="p-3"></th></tr></thead><tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b hover:bg-gray-50"><td className="p-3 text-gray-500">{o.id}</td><td className="p-3">{new Date(o.date).toLocaleDateString()}</td><td className="p-3">{clients.find(c=>c.id===o.clientId)?.name}</td><td className="p-3 text-right font-bold">${o.total}</td><td className="p-3 text-center"><Button onClick={() => setViewId(o.id)} size="sm">Открыть</Button></td></tr>
            ))}
          </tbody></table>
        </div>
      </div>
    );
  };

  const menu = [ { id: 'newOrder', label: 'Новый заказ', icon: ShoppingCart }, { id: 'models', label: 'Модели', icon: Package }, { id: 'clients', label: 'Клиенты', icon: Users }, { id: 'history', label: 'История', icon: FileText } ];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 font-sans">
      <aside className="w-64 bg-slate-800 text-white flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">👟 ShoeExpo <span className="text-blue-400">Pro</span></h1>
          <div className="text-xs text-gray-400 mt-2">Пользователь: {user.name}</div>
        </div>
        <nav className="flex-1 p-4 space-y-2">{menu.map(i => <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded ${activeTab===i.id?'bg-blue-600':'hover:bg-slate-700'}`}><i.icon size={20}/>{i.label}</button>)}</nav>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-8">
        {activeTab === 'newOrder' && <NewOrderPage />}
        {activeTab === 'clients' && <ClientsPage />}
        {activeTab === 'models' && <ModelsPage />}
        {activeTab === 'history' && <OrdersPage />}
      </main>
      <NotificationModal type={notification?.type} message={notification?.message} onClose={() => setNotification(null)} />
      <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />
      <style>{`@media print { body * { visibility: hidden; } #invoice, #invoice * { visibility: visible; } #invoice { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
}

// --- Login Page Component ---
const LoginPage = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiCall('/login', 'POST', { login, password });
      if (res.success) {
        onLogin(res.user);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message || 'Ошибка подключения');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Вход в систему</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Логин" value={login} onChange={e => setLogin(e.target.value)} />
          <Input label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <Button className="w-full" size="lg" icon={LogIn}>Войти</Button>
        </form>
        <div className="mt-4 text-center text-xs text-gray-400">
          admin / 123
        </div>
      </div>
    </div>
  );
};