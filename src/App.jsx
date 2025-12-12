import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Package, ShoppingCart, FileText, Plus, Trash2, 
  Download, Upload, Printer, Search, Settings, X, Edit, 
  Check, AlertTriangle, LogIn, LayoutDashboard,
  Wallet, Footprints, CreditCard, Eye, EyeOff, ArrowRight,
  ShoppingBag, Phone, MapPin, User, Box, Eraser, 
  RefreshCw, DollarSign // <-- Добавил недостающие иконки
} from 'lucide-react';

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
    const contentType = res.headers.get("content-type");
    if (!contentType || contentType.indexOf("application/json") === -1) {
       throw new Error("Сервер не отвечает корректно.");
    }
    const data = await res.json();
    
    if (!res.ok) {
       const error = new Error(data.message || 'Ошибка сервера');
       error.field = data.field; 
       throw error;
    }
    return data;
  } catch (err) {
    throw err;
  }
};

const normalizePhone = (phone) => String(phone).replace(/\D/g, '');

const formatPhoneNumber = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  let clean = digits;
  
  if (digits.length === 10 && digits.startsWith('0')) {
    clean = '38' + digits;
  }
  
  if (clean.length === 12 && clean.startsWith('380')) {
    return `+${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 10)} ${clean.slice(10, 12)}`;
  }
  return value; 
};

const getNoun = (number, one, two, five) => {
  let n = Math.abs(number);
  n %= 100;
  if (n >= 5 && n <= 20) return five;
  n %= 10;
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return two;
  return five;
};

// --- Excel Helpers ---
async function ensureXLSX() {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load XLSX library"));
    document.head.appendChild(script);
  });
}

async function handleExportExcel(data, filename) {
  try {
    const XLSX = await ensureXLSX();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (e) { console.error(e); }
}

// --- UI Components ---
const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', icon: Icon }) => {
  const baseStyle = "flex items-center gap-2 rounded-xl transition-all duration-200 font-medium justify-center active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-2 py-1 text-xs", md: "px-4 py-2.5 text-sm", compact: "px-3 py-2 text-sm", lg: "px-6 py-3 text-lg" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
};

const Input = ({ label, error, icon: Icon, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full text-left relative">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
    <div className="relative">
      {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon size={18} /></div>}
      <input 
        className={`border rounded-xl ${Icon ? 'pl-10' : 'px-4'} pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all placeholder:text-gray-300 ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`} 
        {...props} 
      />
    </div>
    {error && <span className="text-xs text-red-500 font-bold flex items-center gap-1 animate-fade-in"><AlertTriangle size={12}/> {error}</span>}
  </div>
);

// --- Portals ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const isSuccess = type === 'success';
  return createPortal(
    <div className={`fixed top-6 left-1/2 md:left-[calc(50%+9rem)] transform -translate-x-1/2 z-[110] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-slide-down transition-all duration-300 border ${isSuccess ? 'bg-white border-green-100 text-gray-800' : 'bg-white border-red-100 text-gray-800'}`}>
      <div className={`rounded-full p-2 ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {isSuccess ? <Check size={20} strokeWidth={3} /> : <AlertTriangle size={20} />}
      </div>
      <div>
        <h4 className={`font-bold text-sm leading-tight ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>{isSuccess ? 'Успешно' : 'Ошибка'}</h4>
        <p className="text-sm text-gray-600 leading-tight">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"><X size={18}/></button>
    </div>, document.body
  );
};

const Modal = ({ title, children, onClose, footer }) => {
  return createPortal(
    <div className="fixed inset-0 md:left-72 bg-gray-900/20 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all scale-100 border border-gray-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="font-bold text-xl text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>, document.body
  );
};

const ImportResultModal = ({ result, onClose }) => {
  if (!result) return null;
  return (
    <Modal title="Результаты импорта" onClose={onClose} footer={<Button onClick={onClose} variant="primary">Отлично</Button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
            <div className="text-3xl font-bold text-green-600 mb-1">{result.added}</div>
            <div className="text-xs text-green-600/80 uppercase font-bold tracking-wider">Добавлено</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
            <div className="text-3xl font-bold text-blue-600 mb-1">{result.updated}</div>
            <div className="text-xs text-blue-600/80 uppercase font-bold tracking-wider">Обновлено</div>
          </div>
        </div>
        {result.errors.length > 0 ? (
          <div className="mt-4">
            <div className="text-sm font-bold text-red-600 mb-2">Ошибки ({result.errors.length}):</div>
            <div className="bg-red-50 border border-red-100 rounded-lg max-h-40 overflow-y-auto p-3 text-sm text-red-700 space-y-1 custom-scrollbar">
              {result.errors.map((err, idx) => <div key={idx} className="border-b border-red-100 last:border-0 pb-1">{err}</div>)}
            </div>
          </div>
        ) : <div className="text-center text-gray-400 text-sm mt-2 flex items-center justify-center gap-2"><Check size={16}/> Ошибок нет</div>}
      </div>
    </Modal>
  );
};

// --- Pages ---

const DashboardPage = ({ orders = [], setActiveTab }) => {
  const [showStats, setShowStats] = useState(false);
  const stats = useMemo(() => {
    if (!orders) return { totalOrders: 0, totalSum: 0, totalPairs: 0, prepayment: 0, avgCheck: 0 };
    const totalOrders = orders.length;
    const totalSum = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalPairs = orders.reduce((acc, o) => acc + (o.items || []).reduce((sum, i) => sum + (i.qty || 0), 0), 0);
    const prepayment = totalSum * 0.3;
    const avgCheck = totalOrders > 0 ? totalSum / totalOrders : 0;
    return { totalOrders, totalSum, totalPairs, prepayment, avgCheck };
  }, [orders]);

  const displayValue = (value, type = 'number') => {
    if (showStats) {
      if (type === 'money') return `${Math.round(value).toLocaleString()} USD`;
      return Math.round(value).toLocaleString();
    }
    if (type === 'money') return '💰💰💰';
    return '🤫';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">Главная</h2>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mx-2">Статистика:</span>
          <button onClick={() => setShowStats(true)} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${showStats ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Eye size={16}/> Отображать</button>
          <button onClick={() => setShowStats(false)} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${!showStats ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><EyeOff size={16}/> Скрыть</button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-3xl font-bold mb-1">Оформление заказа</h3>
          <p className="text-blue-100/90 text-lg font-medium">Создайте новый заказ прямо сейчас</p>
        </div>
        <button 
          onClick={() => setActiveTab('newOrder')} 
          className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={24} strokeWidth={3}/> Новый заказ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all relative overflow-hidden group"><div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><ShoppingBag size={64} className="text-gray-800"/></div><div className="flex items-center gap-3 mb-3 text-gray-400 uppercase text-xs font-bold tracking-wider relative z-10"><ShoppingBag size={16} /> Всего заказов</div><div className="text-3xl font-black text-gray-800 relative z-10">{displayValue(stats.totalOrders)}</div></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all relative overflow-hidden group"><div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><Footprints size={64} className="text-indigo-600"/></div><div className="flex items-center gap-3 mb-3 text-indigo-500 uppercase text-xs font-bold tracking-wider relative z-10"><Footprints size={16} /> Продано пар</div><div className="text-3xl font-black text-gray-800 relative z-10">{displayValue(stats.totalPairs)}</div></div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 transition-all relative overflow-hidden group"><div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><Wallet size={64} className="text-green-600"/></div><div className="flex items-center gap-3 mb-3 text-green-600 uppercase text-xs font-bold tracking-wider relative z-10"><Wallet size={16} /> Общая сумма</div><div className="text-3xl font-black text-gray-800 relative z-10">{displayValue(stats.totalSum, 'money')}</div>{showStats && <div className="text-xs text-green-600/80 mt-2 font-medium relative z-10">Средний чек: {Math.round(stats.avgCheck).toLocaleString()} USD</div>}</div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all relative overflow-hidden group"><div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><CreditCard size={64} className="text-blue-600"/></div><div className="flex items-center gap-3 mb-3 text-blue-600 uppercase text-xs font-bold tracking-wider relative z-10"><CreditCard size={16} /> Предоплата</div><div className="text-3xl font-black text-gray-800 relative z-10">{displayValue(stats.prepayment, 'money')}</div></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">Последние заказы</h3>
          <button onClick={() => setActiveTab('history')} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">Все заказы <ArrowRight size={14}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr><th className="p-4 pl-6">ID</th><th className="p-4">Дата</th><th className="p-4 text-right">Сумма</th><th className="p-4"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map(o => (
                <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 pl-6 font-mono text-gray-500">#{o.id.toString().slice(-6)}</td>
                  <td className="p-4 text-gray-800 font-medium">{new Date(o.date).toLocaleDateString()}</td>
                  <td className="p-4 text-right font-bold text-green-600">{showStats ? `${o.total} USD` : '💰'}</td>
                  <td className="p-4 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">Завершен</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400">Пока нет заказов</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = ({ sizeGrid, setSizeGrid, apiCall, triggerToast, settings, setSettings }) => {
  const [activeBoxTab, setActiveBoxTab] = useState('6');
  const [boxTemplates, setBoxTemplates] = useState(settings?.boxTemplates || { 6:{}, 8:{}, 10:{}, 12:{} });
  const [rates, setRates] = useState(settings?.exchangeRates || { usd: 0, eur: 0, isManual: false });

  useEffect(() => {
    if(settings?.boxTemplates) setBoxTemplates(settings.boxTemplates);
    if(settings?.exchangeRates) setRates(settings.exchangeRates);
    else fetchNBU(); // Fetch if not present
  }, [settings]);

  const fetchNBU = async () => {
    try {
        const res = await fetch(`${API_URL}/nbu-rates`);
        const data = await res.json();
        if (!rates.isManual) {
            const newRates = {
                usd: Number(data.usd.toFixed(2)),
                eur: Number(data.eur.toFixed(2)),
                isManual: false
            };
            setRates(newRates);
            saveRates(newRates);
        }
    } catch (e) { console.error("NBU Error"); }
  };

  const saveRates = async (newRates) => {
     const newSettings = { ...settings, exchangeRates: newRates };
     setSettings(newSettings);
     await apiCall('/settings', 'POST', { exchangeRates: newRates });
  };

  const handleRateChange = (curr, val) => {
      const newRates = { ...rates, [curr]: Number(val), isManual: true };
      setRates(newRates);
      saveRates(newRates);
  };

  const resetRates = async () => {
      try {
        const res = await fetch(`${API_URL}/nbu-rates`);
        const data = await res.json();
        const newRates = { 
            usd: Number(data.usd.toFixed(2)), 
            eur: Number(data.eur.toFixed(2)), 
            isManual: false 
        };
        setRates(newRates);
        saveRates(newRates);
        triggerToast("Курс обновлен из НБУ");
      } catch (e) { triggerToast("Ошибка НБУ", "error"); }
  };

  const updateGrid = async (field, val) => {
    const newGrid = { ...sizeGrid, [field]: val };
    setSizeGrid(newGrid);
    setSettings(prev => ({ ...prev, sizeGrid: newGrid }));
    await apiCall('/settings', 'POST', { sizeGrid: newGrid });
    triggerToast("Размерная сетка сохранена");
  };

  const updateBoxTemplate = async (size, qty) => {
    const val = Number(qty);
    const newTemplates = { 
        ...boxTemplates, 
        [activeBoxTab]: { ...(boxTemplates[activeBoxTab] || {}), [size]: val } 
    };
    
    setBoxTemplates(newTemplates);
    setSettings(prev => ({ ...prev, boxTemplates: newTemplates })); 
    await apiCall('/settings', 'POST', { boxTemplates: newTemplates });
  };

  const minSize = parseInt(sizeGrid?.min);
  const maxSize = parseInt(sizeGrid?.max);
  
  if (isNaN(minSize) || isNaN(maxSize)) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-10 text-gray-500 space-y-4">
            <Settings size={48} className="opacity-20"/>
            <p>Пожалуйста, укажите диапазон размеров (Min/Max).</p>
            <div className="flex gap-4">
                <Input label="Min" type="number" value={sizeGrid?.min || ''} onChange={e => updateGrid('min', e.target.value)} />
                <Input label="Max" type="number" value={sizeGrid?.max || ''} onChange={e => updateGrid('max', e.target.value)} />
            </div>
        </div>
    );
  }
  
  const rangeLength = Math.max(0, maxSize - minSize + 1);
  const sizeRange = Array.from({ length: rangeLength }, (_, i) => minSize + i);

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-start">
           <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Настройки</h2>
           {/* Exchange Rates Block */}
           <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-500">USD:</span>
                    <input className="w-16 border rounded px-1 py-0.5 text-center font-bold" type="number" value={rates.usd} onChange={e=>handleRateChange('usd', e.target.value)}/>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-500">EUR:</span>
                    <input className="w-16 border rounded px-1 py-0.5 text-center font-bold" type="number" value={rates.eur} onChange={e=>handleRateChange('eur', e.target.value)}/>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-bold">Cross:</span>
                    <span>{(rates.eur / rates.usd || 0).toFixed(2)}</span>
                </div>
                <button onClick={resetRates} className="text-blue-500 hover:text-blue-700" title="Сбросить к НБУ"><RefreshCw size={14}/></button>
           </div>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 text-blue-900 border-b border-gray-100 pb-4"><Settings size={24} className="text-blue-600"/><h3 className="font-bold text-lg">Размерная сетка</h3></div>
              <div className="grid grid-cols-2 gap-6">
                <Input label="Минимальный размер" type="number" value={sizeGrid?.min || ''} onChange={e => updateGrid('min', e.target.value)} />
                <Input label="Максимальный размер" type="number" value={sizeGrid?.max || ''} onChange={e => updateGrid('max', e.target.value)} />
              </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6 text-blue-900 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3"><Box size={24} className="text-blue-600"/><h3 className="font-bold text-lg">Комплектация ящиков</h3></div>
              </div>
              
              <div className="flex gap-2 mb-6">
                {['6', '8', '10', '12'].map(box => (
                  <button 
                    key={box}
                    onClick={() => setActiveBoxTab(box)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeBoxTab === box ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {box} пар
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                 {sizeRange.map(size => (
                    <div key={size} className="flex flex-col items-center">
                        <label className="text-xs text-gray-500 mb-1">{size}</label>
                        <input 
                           type="number" 
                           min="0"
                           className="w-full border border-gray-300 rounded p-2 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                           value={boxTemplates[activeBoxTab]?.[size] || ''}
                           onChange={e => updateBoxTemplate(size, e.target.value)}
                           placeholder="0"
                        />
                    </div>
                 ))}
              </div>
              <div className="mt-4 text-center text-sm text-gray-400">
                 Всего в ящике: {Object.values(boxTemplates[activeBoxTab] || {}).reduce((a,b) => a + (Number(b)||0), 0)} пар
              </div>
          </div>
       </div>
    </div>
  );
};

const NewOrderPage = ({ clients, setClients, models, sizeGrid, setOrders, orders, triggerToast, settings }) => {
  const [selModel, setSelModel] = useState(''); 
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [showModelList, setShowModelList] = useState(false);
  
  const [sizeQuantities, setSizeQuantities] = useState({});
  const [editingCartIndex, setEditingCartIndex] = useState(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);

  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [selectedClient, setSelectedClient] = useState(null); 
  const [showClientList, setShowClientList] = useState(false);

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw);
    setClientPhone(formatted);
    setShowClientList(true);
  };

  useEffect(() => {
    const cleanInput = normalizePhone(clientPhone);
    if (!cleanInput) { setSelectedClient(null); return; }
    const found = clients.find(c => {
       const dbPhone = normalizePhone(c.phone);
       if (dbPhone === cleanInput) return true;
       if (cleanInput.startsWith('0') && dbPhone === '38' + cleanInput) return true;
       return false;
    });
    if (found) {
      setSelectedClient(found);
      setClientName(found.name);
      setClientCity(found.city);
    } else {
      setSelectedClient(null);
    }
  }, [clientPhone, clients]);

  const selectClientSuggestion = (client) => {
    setClientPhone(client.phone);
    setClientName(client.name);
    setClientCity(client.city);
    setSelectedClient(client);
    setShowClientList(false);
  };

  const currentM = models.find(m => m.id === parseInt(selModel) || m.id === selModel);

  const handleSizeChange = (size, val) => {
    const intVal = parseInt(val) || 0;
    setSizeQuantities(prev => ({ ...prev, [size]: intVal >= 0 ? intVal : 0 }));
  };

  const addBox = (boxSize) => {
     const template = settings?.boxTemplates?.[boxSize];
     if (!template || Object.keys(template).length === 0 || Object.values(template).reduce((a,b)=>a+b,0) === 0) {
         triggerToast("Ящики не прописаны. Перейдите в настройки", "error");
         return;
     }
     setSizeQuantities(prev => {
        const next = { ...prev };
        Object.entries(template).forEach(([size, qty]) => {
           next[size] = (next[size] || 0) + Number(qty);
        });
        return next;
     });
     triggerToast(`Добавлен ящик ${boxSize} пар`);
  };

  const addToCart = () => {
    if (!currentM) return;
    const totalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
    if (totalQty === 0) { triggerToast("Укажите количество", 'error'); return; }
    
    const noteParts = Object.entries(sizeQuantities)
        .filter(([_, q]) => q > 0)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([s, q]) => `${s}(${q})`);
    
    const note = noteParts.join(', ');

    setCart([...cart, { 
        ...currentM, 
        modelId: currentM.id, 
        qty: totalQty, 
        note,
        sizes: sizeQuantities, // Сохраняем для редактирования
        total: currentM.price * totalQty 
    }]);
    
    setSizeQuantities({}); setSelModel(''); setSearch(''); setShowModelList(false);
  };

  const openEditModal = (index) => {
      setEditingCartIndex(index);
      const itemToEdit = cart[index];
      if (itemToEdit.sizes) { setSizeQuantities({ ...itemToEdit.sizes }); } 
      else { setSizeQuantities({}); }
  };

  const saveEditedItem = () => {
      if (editingCartIndex === null) return;
      const item = cart[editingCartIndex];
      const totalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);

      if (totalQty === 0) { triggerToast("Количество не может быть 0", "error"); return; }

      const noteParts = Object.entries(sizeQuantities)
        .filter(([_, q]) => q > 0)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([s, q]) => `${s}(${q})`);
    
      const note = noteParts.join(', ');

      const updatedItem = { ...item, qty: totalQty, note, sizes: sizeQuantities, total: item.price * totalQty };
      const newCart = [...cart];
      newCart[editingCartIndex] = updatedItem;
      setCart(newCart);
      setEditingCartIndex(null);
      setSizeQuantities({}); 
  };
  
  const confirmDelete = () => {
      if (confirmDeleteIndex !== null) {
          setCart(cart.filter((_, x) => x !== confirmDeleteIndex));
          setConfirmDeleteIndex(null);
      }
  };

  const saveOrder = async () => {
    if (!clientPhone || !clientName) { triggerToast("Заполните данные клиента", 'error'); return; }
    if (cart.length === 0) { triggerToast("Корзина пуста", 'error'); return; }
    
    let finalClientId = selectedClient?.id;
    if (!finalClientId) {
        try {
            const newClientData = { name: clientName, city: clientCity, phone: clientPhone };
            const savedClient = await apiCall('/clients', 'POST', newClientData);
            setClients(prev => [...prev, savedClient]);
            finalClientId = savedClient.id;
        } catch (e) { triggerToast(`Ошибка клиента: ${e.message}`, 'error'); return; }
    }

    const order = { date: new Date().toISOString(), clientId: parseInt(finalClientId), items: cart, total: cart.reduce((acc, i) => acc + i.total, 0) };
    try {
      const saved = await apiCall('/orders', 'POST', order);
      setOrders([saved, ...orders]);
      setCart([]); setClientPhone(''); setClientName(''); setClientCity(''); setSelectedClient(null);
      triggerToast("Заказ успешно сохранен");
    } catch(e) { triggerToast("Ошибка сохранения заказа", 'error'); }
  };

  const filteredM = models.filter(m => m.sku.toLowerCase().includes(search.toLowerCase()) || m.color.toLowerCase().includes(search.toLowerCase()));
  const filteredClients = useMemo(() => {
     if (clientPhone.length < 2) return [];
     const search = normalizePhone(clientPhone);
     return clients.filter(c => {
        const dbPhone = normalizePhone(c.phone);
        if (selectedClient && c.id === selectedClient.id) return false;
        if (dbPhone.includes(search)) return true;
        if (search.startsWith('0') && dbPhone.includes('38' + search)) return true;
        return false;
     });
  }, [clients, clientPhone, selectedClient]);

  const minSize = parseInt(sizeGrid?.min);
  const maxSize = parseInt(sizeGrid?.max);
  // Show message if no grid set
  if (isNaN(minSize) || isNaN(maxSize)) {
      if (!currentM) return null; // Wait for selection
  }

  const rangeLength = Math.max(0, maxSize - minSize + 1);
  const sizeRange = (isNaN(minSize) || isNaN(maxSize)) ? [] : Array.from({ length: rangeLength }, (_, i) => minSize + i);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-blue-900 border-b border-gray-100 pb-2"><User size={20} /><h3 className="font-bold text-lg">Данные клиента</h3></div>
          <div className="space-y-4">
            <div className="relative">
                <Input label="Телефон" icon={Phone} value={clientPhone} onChange={handlePhoneChange} placeholder="Введите номер..." autoComplete="off" />
                {showClientList && filteredClients.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto">
                        {filteredClients.map(c => (
                            <div key={c.id} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0" onClick={() => selectClientSuggestion(c)}>
                                <div className="font-bold text-gray-800">{c.phone}</div><div className="text-xs text-gray-500">{c.name} ({c.city})</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {!selectedClient && clientPhone.length > 5 && (
                <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-start animate-fade-in"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div><span className="font-bold">Клиента нет в базе.</span><br/>Заполните Имя и Город, и он будет создан автоматически.</div></div>
            )}
            <div className="grid grid-cols-2 gap-4">
               <Input label="Имя" icon={User} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Имя клиента"/>
               <Input label="Город" icon={MapPin} value={clientCity} onChange={e => setClientCity(e.target.value)} placeholder="Яготин"/>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-2 mb-2 text-blue-900 border-b border-gray-100 pb-2"><Package size={20} /><h3 className="font-bold text-lg">Товары</h3></div>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input 
                className="w-full border border-gray-300 p-3 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400" 
                placeholder="Поиск модели..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setShowModelList(true); }}
                onFocus={() => setShowModelList(true)}
            />
            {showModelList && search && (
              <div className="border border-gray-100 rounded-xl mt-2 max-h-60 overflow-y-auto bg-white shadow-xl absolute w-full z-20 custom-scrollbar">
                {filteredM.map(m => (
                  <div key={m.id} onClick={() => { setSelModel(m.id); setSearch(m.sku); setShowModelList(false); }} className="p-3 px-4 cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0 flex justify-between items-center transition-colors">
                    <div><span className="font-bold text-gray-800">{m.sku}</span> <span className="text-gray-300 mx-2">|</span> <span className="text-gray-600">{m.color}</span></div><span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded text-sm">{m.price} USD</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {currentM && (
            <div className="bg-blue-50/30 p-6 rounded-xl border border-blue-100 animate-fade-in">
              <div className="font-bold text-xl text-blue-900 border-b border-blue-100 pb-3 mb-4 flex justify-between items-center">
                <span>{currentM.sku} / {currentM.color}</span><span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg">{currentM.price} USD</span>
              </div>
              
              {sizeRange.length === 0 ? (
                  <div className="text-center p-4 bg-yellow-50 text-yellow-700 rounded mb-4 border border-yellow-200 font-bold">
                      ⚠ Размерная сетка не настроена! Перейдите в настройки.
                  </div>
              ) : (
                  <>
                  <div className="mb-4">
                      <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Размеры ({minSize}-{maxSize})</label><button onClick={() => setSizeQuantities({})} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"><Eraser size={14}/>Очистить</button></div>
                      <div className="flex flex-wrap gap-2">
                          {sizeRange.map(size => (
                              <div key={size} className="flex flex-col items-center">
                                  <span className="text-xs text-gray-500 font-medium mb-1">{size}</span>
                                  <input type="text" inputMode="numeric" className="w-11 h-11 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-lg font-bold text-gray-700 placeholder-gray-200" placeholder="0" value={sizeQuantities[size] > 0 ? sizeQuantities[size] : ''} onChange={e => handleSizeChange(size, e.target.value)} />
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                     {[6, 8, 10, 12].map(boxSize => (
                        <button key={boxSize} onClick={() => addBox(boxSize)} className="bg-white border border-blue-200 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1"><Box size={14}/> {boxSize}-ти парный +1</button>
                     ))}
                  </div>
                  </>
              )}

              <div className="flex justify-between items-center border-t border-blue-100 pt-4">
                <div className="text-sm font-bold text-blue-900">Итого пар: {Object.values(sizeQuantities).reduce((a,b)=>a+b,0)}</div>
                <Button onClick={addToCart} size="md" icon={Plus} className="h-[46px] px-8">В заказ</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-100px)] sticky top-4">
        <h3 className="font-bold border-b border-gray-100 pb-4 mb-4 flex gap-2 text-gray-800 items-center text-lg"><ShoppingCart className="text-blue-600"/> Корзина</h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {cart.map((i, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between group hover:border-blue-200 transition-colors hover:shadow-sm">
              <div>
                <div className="font-bold text-gray-800 text-sm">{i.sku} <span className="font-normal text-gray-500">({i.color})</span></div>
                <div className="text-xs text-gray-500 mt-1">{i.qty} {getNoun(i.qty, 'пара', 'пары', 'пар')} x {i.price} USD
                   {i.note && <div className="mt-1 flex flex-wrap gap-1">{i.note.split(', ').map((n, ni) => (<span key={ni} className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 shadow-sm">{n}</span>))}</div>}
                </div>
              </div>
              <div className="text-right flex flex-col justify-between items-end">
                <div className="font-bold text-gray-800">{i.total} USD</div>
                <div className="flex gap-2 mt-1">
                   <button onClick={() => openEditModal(idx)} className="text-blue-400 hover:text-blue-600 p-1 bg-blue-50 rounded"><Edit size={16}/></button>
                   <button onClick={() => setConfirmDeleteIndex(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="text-center text-gray-400 py-20 flex flex-col items-center gap-2"><ShoppingCart size={48} className="opacity-20"/>Корзина пуста</div>}
        </div>
        
        {/* Total & Action Buttons */}
        <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="text-xs py-2 bg-gray-100 border-0" icon={CreditCard}>Оплата</Button>
            <Button variant="secondary" className="text-xs py-2 bg-gray-100 border-0" icon={DollarSign}>Скидка</Button>
          </div>
          <div className="flex justify-between font-bold text-xl text-gray-800">
            <span>Итого:</span><span className="text-blue-600">${cart.reduce((a,b)=>a+b.total,0)} USD</span>
          </div>
          <Button onClick={saveOrder} variant="success" className="w-full py-4 text-lg shadow-xl shadow-green-100 hover:shadow-green-200 transform hover:-translate-y-1 transition-all">Сохранить заказ</Button>
        </div>
      </div>
      
      {/* Edit Modal */}
      {editingCartIndex !== null && (
        <Modal title="Редактирование позиции" onClose={() => setEditingCartIndex(null)} footer={<Button onClick={saveEditedItem}>Сохранить изменения</Button>}>
            <div className="space-y-4">
                 <div className="text-center font-bold text-lg mb-4 text-gray-700">{cart[editingCartIndex].sku} / {cart[editingCartIndex].color}</div>
                 
                 {sizeRange.length === 0 ? (
                     <div className="text-center p-4 bg-yellow-50 text-yellow-700 rounded mb-4">Настройте размерную сетку</div>
                 ) : (
                     <div className="mb-4">
                        <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Размеры</label><button onClick={() => setSizeQuantities({})} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"><Eraser size={14}/>Очистить</button></div>
                        <div className="flex flex-wrap gap-2">
                            {sizeRange.map(size => (
                                <div key={size} className="flex flex-col items-center">
                                    <span className="text-xs text-gray-500 font-medium mb-1">{size}</span>
                                    <input type="text" inputMode="numeric" className="w-11 h-11 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-lg font-bold text-gray-700 placeholder-gray-200" placeholder="0" value={sizeQuantities[size] > 0 ? sizeQuantities[size] : ''} onChange={e => handleSizeChange(size, e.target.value)} />
                                </div>
                            ))}
                        </div>
                     </div>
                 )}

                 <div className="grid grid-cols-2 gap-2">
                    {[6, 8, 10, 12].map(boxSize => (
                        <button key={boxSize} onClick={() => addBox(boxSize)} className="bg-white border border-blue-200 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1"><Box size={14}/> {boxSize}-ти парный +1</button>
                    ))}
                 </div>
            </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteIndex !== null && (
          <Modal title="Удаление" onClose={() => setConfirmDeleteIndex(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteIndex(null)}>Отмена</Button><Button variant="danger" onClick={confirmDelete}>Удалить</Button></>}>
              <p className="text-center text-gray-600">Вы уверены, что хотите удалить этот товар из корзины?</p>
          </Modal>
      )}
    </div>
  );
};

const ClientsPage = ({ clients, setClients, triggerToast, handleFileImport, loadAllData, setImportResult }) => {
  const [newClient, setNewClient] = useState({ name: '', city: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [search, setSearch] = useState('');

  const handlePhoneBlur = (field, obj, setObj) => {
    const formatted = formatPhoneNumber(obj[field]);
    setObj({ ...obj, [field]: formatted });
  };

  const addClient = async () => {
    const errs = {};
    if (!newClient.name.trim()) errs.name = "Введите имя клиента";
    if (!newClient.phone.trim()) errs.phone = "Введите номер";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      const saved = await apiCall('/clients', 'POST', newClient);
      setClients([...clients, saved]);
      setNewClient({ name: '', city: '', phone: '' });
      setErrors({});
      triggerToast("Клиент успешно добавлен");
    } catch(e) {
        if (e.field) { setErrors({ [e.field]: e.message }); } else { triggerToast(e.message, 'error'); }
    }
  };

  const saveEdit = async () => {
    const errs = {};
    if (!editClient.name.trim()) errs.name = "Введите имя клиента";
    if (!editClient.phone.trim()) errs.phone = "Введите номер";
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    try {
      const updated = await apiCall(`/clients/${editClient.id}`, 'PUT', editClient);
      setClients(clients.map(c => c.id === editClient.id ? updated : c));
      setEditClient(null);
      setEditErrors({});
      triggerToast("Данные клиента обновлены");
    } catch(e) { 
        if (e.field) { setEditErrors({ [e.field]: e.message }); } else { triggerToast(e.message, 'error'); }
    }
  };

  const removeClient = async () => {
    try {
      await apiCall(`/clients/${deleteId}`, 'DELETE');
      setClients(clients.filter(c => c.id !== deleteId));
      setDeleteId(null);
      triggerToast("Клиент удален", 'success'); 
    } catch(e) { triggerToast("Ошибка удаления", 'error'); }
  };

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800 tracking-tight">Клиенты</h2><div className="flex gap-2"><label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-xl flex gap-2 hover:bg-gray-50 text-sm transition-all text-gray-700 font-medium shadow-sm active:scale-95 items-center"><Upload size={16}/> Импорт<input type="file" hidden onChange={(e) => handleFileImport(e, '/clients/import', (res) => { loadAllData(); setImportResult(res); })} accept=".xlsx,.xls"/></label><Button onClick={() => handleExportExcel(clients, 'clients')} variant="secondary" icon={Download}>Экспорт</Button></div></div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-start relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div><Input label="Имя" value={newClient.name} onChange={e => {setNewClient({...newClient, name: e.target.value}); setErrors({...errors, name: ''})}} error={errors.name} placeholder="Шевченко Андрій"/><Input label="Город" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} placeholder="Яготин"/><Input label="Телефон" value={newClient.phone} onChange={e => {setNewClient({...newClient, phone: e.target.value}); setErrors({...errors, phone: ''})}} onBlur={() => handlePhoneBlur('phone', newClient, setNewClient)} error={errors.phone} placeholder="+380 59 083 12 79"/><div className="pt-6"><Button onClick={addClient} size="md" icon={Plus} className="w-full h-[46px]">Добавить</Button></div></div>
      <div className="space-y-4"><div className="relative"><Search className="absolute left-4 top-3.5 text-gray-400" size={20}/><input placeholder="Поиск по имени или телефону..." className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-semibold">Имя</th><th className="p-4 font-semibold">Город</th><th className="p-4 font-semibold">Телефон</th><th className="p-4 text-center font-semibold">Действия</th></tr></thead><tbody className="divide-y divide-gray-50">{filteredClients.map(c => (<tr key={c.id} className="hover:bg-gray-50/80 transition-colors group"><td className="p-4 font-medium text-gray-800">{c.name}</td><td className="p-4 text-gray-600">{c.city || '-'}</td><td className="p-4 text-gray-600 font-mono text-sm">{c.phone}</td><td className="p-4 flex justify-center gap-2"><button onClick={() => {setEditClient(c); setEditErrors({})}} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => setDeleteId(c.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div></div></div>
      {deleteId && <Modal title="Удаление клиента" onClose={() => setDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={removeClient}>Удалить</Button></>}><p className="text-gray-600">Вы действительно хотите удалить этого клиента?</p></Modal>}
      {editClient && (<Modal title="Редактирование" onClose={() => setEditClient(null)} footer={<Button onClick={saveEdit}>Сохранить</Button>}><div className="space-y-4"><Input label="Имя" value={editClient.name} onChange={e => {setEditClient({...editClient, name: e.target.value}); setEditErrors({...editErrors, name: ''})}} error={editErrors.name}/><Input label="Город" value={editClient.city} onChange={e => setEditClient({...editClient, city: e.target.value})}/><Input label="Телефон" value={editClient.phone} onChange={e => {setEditClient({...editClient, phone: e.target.value}); setEditErrors({...editErrors, phone: ''})}} onBlur={() => handlePhoneBlur('phone', editClient, setEditClient)} error={editErrors.phone}/></div></Modal>)}
    </div>
  );
};

const ModelsPage = ({ models, setModels, triggerToast, handleFileImport, loadAllData, setImportResult }) => {
  const [newModel, setNewModel] = useState({ sku: '', color: '', price: '' });
  const [errors, setErrors] = useState({});
  const [delId, setDelId] = useState(null);
  const [editM, setEditM] = useState(null);
  const [skuFilter, setSkuFilter] = useState('');

  const validate = () => {
    const errs = {};
    if (!newModel.sku.trim()) errs.sku = "Введите артикул";
    if (!newModel.color.trim()) errs.color = "Укажите цвет";
    if (!newModel.price) errs.price = "Укажите цену";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addModel = async () => {
    if (!validate()) return;
    if (models.some(m => m.sku === newModel.sku && m.color === newModel.color)) {
       triggerToast("Такая модель уже существует", 'error');
       return;
    }
    try {
      const saved = await apiCall('/models', 'POST', newModel);
      setModels([...models, saved]);
      setNewModel({ sku: '', color: '', price: '' });
      setErrors({});
      triggerToast("Модель успешно сохранена");
    } catch(e) { triggerToast(e.message, 'error'); }
  };

  const removeModel = async () => {
    try {
      await apiCall(`/models/${delId}`, 'DELETE');
      setModels(models.filter(m => m.id !== delId));
      setDelId(null);
      triggerToast("Модель удалена", 'success');
    } catch(e) { triggerToast("Ошибка удаления", 'error'); }
  };

  const saveEdit = async () => {
    try {
      const updated = await apiCall(`/models/${editM.id}`, 'PUT', { price: Number(editM.price) });
      setModels(models.map(m => m.id === editM.id ? updated : m));
      setEditM(null);
      triggerToast("Цена обновлена");
    } catch(e) { triggerToast("Ошибка сохранения", 'error'); }
  };

  const filtered = models.filter(m => m.sku.toLowerCase().includes(skuFilter.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Модели</h2>
        <div className="flex gap-2">
          <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-xl flex gap-2 hover:bg-gray-50 text-sm transition-all text-gray-700 font-medium shadow-sm active:scale-95 items-center">
            <Upload size={16}/> Импорт
            <input type="file" hidden onChange={(e) => handleFileImport(e, '/models/import', (res) => { loadAllData(); setImportResult(res); })} accept=".xlsx,.xls"/>
          </label>
          <Button onClick={() => handleExportExcel(models, 'models')} variant="secondary" icon={Download}>Экспорт</Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-start relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
        <Input label="Артикул" placeholder="ART-1" value={newModel.sku} onChange={e => {setNewModel({...newModel, sku: e.target.value}); setErrors({...errors, sku: ''})}} error={errors.sku} />
        <Input label="Цвет" placeholder="Чорний" value={newModel.color} onChange={e => {setNewModel({...newModel, color: e.target.value}); setErrors({...errors, color: ''})}} error={errors.color} />
        <Input label="Цена (USD)" placeholder="10" type="number" value={newModel.price} onChange={e => {setNewModel({...newModel, price: e.target.value}); setErrors({...errors, price: ''})}} error={errors.price} />
        <div className="pt-6">
           <Button onClick={addModel} size="md" icon={Plus} className="w-full h-[46px]">Добавить</Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search Bar Separated */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20}/>
          <input 
            placeholder="Поиск по артикулу..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            value={skuFilter} 
            onChange={e => setSkuFilter(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-semibold">Артикул</th><th className="p-4 font-semibold">Цвет</th><th className="p-4 text-right font-semibold">Цена</th><th className="p-4 text-center font-semibold">Действия</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-4 font-mono font-bold text-gray-700">{m.sku}</td>
                  <td className="p-4 text-gray-600">{m.color}</td>
                  <td className="p-4 text-right font-bold text-green-600">{m.price} USD</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => setEditM({...m})} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit size={18}/></button>
                    <button onClick={() => setDelId(m.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
               {filtered.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-gray-400">Модели не найдены</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      
      {delId && <Modal title="Удаление модели" onClose={() => setDelId(null)} footer={<><Button variant="secondary" onClick={() => setDelId(null)}>Отмена</Button><Button variant="danger" onClick={removeModel}>Удалить</Button></>}><p>Вы действительно хотите удалить эту модель?</p></Modal>}
      {editM && <Modal title={`${editM.sku} — ${editM.color}`} onClose={() => setEditM(null)} footer={<Button onClick={saveEdit}>Сохранить</Button>}><Input label="Новая цена (USD)" type="number" value={editM.price} onChange={e => setEditM({...editM, price: e.target.value})} autoFocus /></Modal>}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [models, setModels] = useState([]);
  const [orders, setOrders] = useState([]);
  // Initial state should be empty strings to avoid "36-41" default
  const [sizeGrid, setSizeGrid] = useState({ min: '', max: '' });
  const [settings, setSettings] = useState({ sizeGrid: { min: '', max: '' }, boxTemplates: { 6:{}, 8:{}, 10:{}, 12:{} }, exchangeRates: { usd: 0, eur: 0, isManual: false } });
  
  const [toast, setToast] = useState(null); 
  const [importResult, setImportResult] = useState(null);

  const loadAllData = async () => { 
      try { 
          const data = await apiCall('/data'); 
          setClients(data.clients || []); 
          setModels(data.models || []); 
          setOrders(data.orders || []); 
          if(data.settings) {
             if(data.settings.sizeGrid) setSizeGrid(data.settings.sizeGrid);
             // Merge with default to ensure boxTemplates exist even if DB is old
             setSettings(prev => ({ ...prev, ...data.settings }));
          }
      } catch (e) { triggerToast('Ошибка подключения', 'error'); } 
  };

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);
  
  const triggerToast = (msg, type = 'success') => setToast({ message: msg, type });
  
  const handleFileImport = async (e, endpoint, cb = null) => { 
    const file = e.target.files[0]; 
    if (!file) return; 
    e.target.value = ''; 
    try { 
      const XLSX = await ensureXLSX(); 
      const reader = new FileReader(); 
      reader.onload = async (ev) => { 
        try { 
          const wb = XLSX.read(ev.target.result, { type: 'binary' }); 
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); 
          const res = await apiCall(endpoint, 'POST', data); 
          if(cb) cb(res); else { loadAllData(); setImportResult(res); } 
        } catch (err) { triggerToast("Ошибка файла", 'error'); } 
      }; 
      reader.readAsBinaryString(file); 
    } catch (err) { triggerToast("Ошибка Excel", 'error'); } 
  };

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLoginSuccess} />;

  const menu = [ { id: 'dashboard', label: 'Главная', icon: LayoutDashboard }, { id: 'newOrder', label: 'Новый заказ', icon: ShoppingCart }, { id: 'models', label: 'Модели', icon: Package }, { id: 'clients', label: 'Клиенты', icon: Users }, { id: 'history', label: 'История', icon: FileText }, { id: 'settings', label: 'Настройки', icon: Settings } ];

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800 font-sans">
      <aside className="w-72 bg-slate-900 text-white flex-col hidden md:flex shadow-2xl z-30">
        <div className="p-6 border-b border-slate-800"><h1 className="text-2xl font-black flex items-center gap-2">👟 ShoeExpo <span className="text-blue-500">Pro</span></h1><div className="text-xs text-slate-400 mt-2 flex justify-between"><span>{user.name}</span><button onClick={handleLogout}>Выход</button></div></div>
        <nav className="flex-1 p-4 space-y-2">{menu.map(i => (<button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab===i.id ? 'bg-blue-600 text-white translate-x-1' : 'text-slate-400 hover:bg-slate-800'}`}><i.icon size={20}/>{i.label}</button>))}</nav>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-10 relative custom-scrollbar">
        {activeTab === 'dashboard' && <DashboardPage orders={orders} setActiveTab={setActiveTab} />}
        {activeTab === 'newOrder' && <NewOrderPage clients={clients} setClients={setClients} models={models} sizeGrid={sizeGrid} setOrders={setOrders} orders={orders} triggerToast={triggerToast} settings={settings}/>}
        {activeTab === 'clients' && <ClientsPage clients={clients} setClients={setClients} triggerToast={triggerToast} handleFileImport={handleFileImport} loadAllData={loadAllData} setImportResult={setImportResult}/>}
        {activeTab === 'models' && <ModelsPage models={models} setModels={setModels} triggerToast={triggerToast} handleFileImport={handleFileImport} loadAllData={loadAllData} setImportResult={setImportResult}/>}
        {activeTab === 'history' && <OrdersPage orders={orders} clients={clients} />}
        {activeTab === 'settings' && <SettingsPage sizeGrid={sizeGrid} setSizeGrid={setSizeGrid} apiCall={apiCall} triggerToast={triggerToast} settings={settings} setSettings={setSettings} />}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />
      </main>
      <style>{`@keyframes slide-down { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } } .animate-slide-down { animation: slide-down 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; } @media print { body * { visibility: hidden; } #invoice, #invoice * { visibility: visible; } #invoice { position: absolute; left: 0; top: 0; width: 100%; } aside { display: none; } }`}</style>
    </div>
  );
}

const LoginPage = ({ onLogin }) => {
  const [login, setLogin] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const handleSubmit = async (e) => { e.preventDefault(); try { const res = await apiCall('/login', 'POST', { login, password }); if (res.success) onLogin(res.user); else setError(res.message); } catch (err) { setError('Ошибка'); } };
  return (<div className="flex h-screen items-center justify-center bg-gray-50"><div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm"><h1 className="text-2xl font-bold mb-8 text-center">Вход</h1><form onSubmit={handleSubmit} className="space-y-6"><Input label="Логин" value={login} onChange={e=>setLogin(e.target.value)}/><Input label="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><Button className="w-full">Войти</Button></form></div></div>);
};