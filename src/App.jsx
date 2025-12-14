import React, { useState, useEffect } from 'react';
import { apiCall } from './api';
import { ensureXLSX } from './utils';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewOrderPage from './pages/NewOrderPage';
import ClientsPage from './pages/ClientsPage';
import ModelsPage from './pages/ModelsPage';
import OrdersPage from './pages/OrdersPage';
import SettingsPage from './pages/SettingsPage';
import { Toast, ImportResultModal } from './components/UI';

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
  const [sizeGrid, setSizeGrid] = useState({ min: '', max: '' });
  const [settings, setSettings] = useState({ 
      sizeGrid: { min: '', max: '' }, 
      boxTemplates: { 6:{}, 8:{}, 10:{}, 12:{} }, 
      exchangeRates: { usd: 0, eur: 0, isManual: false },
      mainCurrency: 'USD',
      brandName: 'SHOE EXPO',
      brandPhones: [],
      brandLogo: null
  });

  const initialOrderState = {
      cart: [],
      clientPhone: '',
      clientName: '',
      clientCity: '',
      selectedClient: null,
      prepayment: '',
      paymentCurrency: 'USD',
      lumpDiscount: ''
  };
  const [orderDraft, setOrderDraft] = useState(initialOrderState);
  const [highlightSetting, setHighlightSetting] = useState(null);
  
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
             setSettings(prev => ({ ...prev, ...data.settings }));
             
             // Инициализация валюты для нового заказа
             setOrderDraft(prev => ({
                 ...prev,
                 paymentCurrency: prev.paymentCurrency || data.settings.mainCurrency || 'USD'
             }));
          }
      } catch (e) { triggerToast('Ошибка подключения', 'error'); } 
  };

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);
  
  const triggerToast = (msg, type = 'success') => setToast({ message: msg, type });
  
  const clearOrderDraft = () => {
      setOrderDraft({
          ...initialOrderState,
          paymentCurrency: settings.mainCurrency || 'USD'
      });
      triggerToast("Форма заказа очищена");
  };

  // ФУНКЦИЯ РЕДАКТИРОВАНИЯ ЗАКАЗА
  const handleEditOrder = (order) => {
      // Находим клиента, чтобы заполнить поля
      const client = clients.find(c => c.id === order.clientId);
      
      setOrderDraft({
          id: order.id, // Важно! Это флаг того, что мы редактируем
          orderId: order.orderId, // Номер для отображения
          cart: order.items,
          clientPhone: client ? client.phone : '',
          clientName: client ? client.name : '',
          clientCity: client ? client.city : '',
          selectedClient: client,
          prepayment: order.payment ? order.payment.originalAmount : '',
          paymentCurrency: order.payment ? order.payment.originalCurrency : (settings.mainCurrency || 'USD'),
          lumpDiscount: order.lumpDiscount || ''
      });
      
      setActiveTab('newOrder');
      triggerToast(`Редактирование заказа №${order.orderId || ''}`);
  };

  const goToSettingsAndHighlight = (section) => {
      setActiveTab('settings');
      setHighlightSetting(section);
  };
  
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

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto p-6 md:p-10 relative custom-scrollbar">
        {activeTab === 'dashboard' && <DashboardPage orders={orders} setActiveTab={setActiveTab} settings={settings} />}
        
        {activeTab === 'newOrder' && (
            <NewOrderPage 
                clients={clients} 
                setClients={setClients} 
                models={models} 
                sizeGrid={sizeGrid} 
                setOrders={setOrders} 
                orders={orders} 
                triggerToast={triggerToast} 
                settings={settings}
                orderDraft={orderDraft}
                setOrderDraft={setOrderDraft}
                clearOrderDraft={clearOrderDraft}
                goToSettingsAndHighlight={goToSettingsAndHighlight}
            />
        )}
        
        {activeTab === 'clients' && <ClientsPage clients={clients} setClients={setClients} triggerToast={triggerToast} handleFileImport={handleFileImport} loadAllData={loadAllData} setImportResult={setImportResult}/>}
        {activeTab === 'models' && <ModelsPage models={models} setModels={setModels} triggerToast={triggerToast} handleFileImport={handleFileImport} loadAllData={loadAllData} setImportResult={setImportResult} settings={settings}/>}
        
        {activeTab === 'history' && (
            <OrdersPage 
                orders={orders} 
                setOrders={setOrders} // Передаем сеттер для удаления
                clients={clients} 
                settings={settings} 
                triggerToast={triggerToast}
                onEdit={handleEditOrder} // Передаем функцию редактирования
            />
        )}
        
        {activeTab === 'settings' && <SettingsPage sizeGrid={sizeGrid} setSizeGrid={setSizeGrid} apiCall={apiCall} triggerToast={triggerToast} settings={settings} setSettings={setSettings} highlightSetting={highlightSetting} setHighlightSetting={setHighlightSetting}/>}
        
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />
      </main>
      <style>{`@keyframes slide-down { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } } .animate-slide-down { animation: slide-down 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; } @media print { body * { visibility: hidden; } #invoice, #invoice * { visibility: visible; } #invoice { position: absolute; left: 0; top: 0; width: 100%; } aside { display: none; } }`}</style>
    </div>
  );
}