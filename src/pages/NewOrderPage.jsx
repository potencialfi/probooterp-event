import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ShoppingCart, User, Phone, MapPin, AlertTriangle, Box, Eraser, Edit, Trash2, CreditCard } from 'lucide-react';
import { apiCall } from '../api';
import { normalizePhone, formatPhoneNumber, getNoun, convertPrice, CURRENCY_SYMBOLS } from '../utils';
import { Button, Input, Modal } from '../components/UI';

const NewOrderPage = ({ clients, setClients, models, sizeGrid, setOrders, orders, triggerToast, settings }) => {
  const [selModel, setSelModel] = useState(''); 
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

  // --- Payment States ---
  const [prepayment, setPrepayment] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState(settings?.mainCurrency || 'USD');

  // Основная валюта приложения
  const mainCurrency = settings?.mainCurrency || 'USD';
  const mainSymbol = CURRENCY_SYMBOLS[mainCurrency];

  // Расчет курсов
  const totalCartUSD = cart.reduce((acc, i) => acc + i.total, 0);
  
  // Расчет суммы предоплаты (подсказка полной суммы)
  // Мы пересчитываем общую сумму заказа из USD в валюту ОПЛАТЫ, которую выбрал пользователь
  const paymentRate = settings?.exchangeRates?.[paymentCurrency.toLowerCase()] || 1;
  const fullAmountInPaymentCurrency = (totalCartUSD * paymentRate).toFixed(2);

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
        sizes: sizeQuantities,
        total: currentM.price * totalQty // total in USD
    }]);
    
    setSizeQuantities({}); setSelModel(''); setSearch(''); setShowModelList(false);
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

    const order = { 
        date: new Date().toISOString(), 
        clientId: parseInt(finalClientId), 
        items: cart, 
        total: totalCartUSD, // Total USD
        payment: {
            prepayment: Number(prepayment),
            currency: paymentCurrency,
            rate: paymentRate,
            totalInPaymentCurrency: Number(fullAmountInPaymentCurrency)
        }
    };

    try {
      const saved = await apiCall('/orders', 'POST', order);
      setOrders([saved, ...orders]);
      setCart([]); setClientPhone(''); setClientName(''); setClientCity(''); setSelectedClient(null); setPrepayment('');
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
  const rangeLength = Math.max(0, maxSize - minSize + 1);
  const sizeRange = (isNaN(minSize) || isNaN(maxSize)) ? [] : Array.from({ length: rangeLength }, (_, i) => minSize + i);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-fade-in pb-20 md:pb-0">
      <div className="lg:col-span-2 space-y-6">
        {/* Client Block */}
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
                <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-start"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div><span className="font-bold">Клиента нет в базе.</span><br/>Заполните Имя и Город, и он будет создан автоматически.</div></div>
            )}
            <div className="grid grid-cols-2 gap-4">
               <Input label="Имя" icon={User} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Имя клиента"/>
               <Input label="Город" icon={MapPin} value={clientCity} onChange={e => setClientCity(e.target.value)} placeholder="Яготин"/>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-2 mb-2 text-blue-900 border-b border-gray-100 pb-2"><ShoppingCart size={20} /><h3 className="font-bold text-lg">Товары</h3></div>
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
                    <div><span className="font-bold text-gray-800">{m.sku}</span> <span className="text-gray-300 mx-2">|</span> <span className="text-gray-600">{m.color}</span></div>
                    <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded text-sm">
                        {convertPrice(m.price, mainCurrency, settings.exchangeRates)} {mainSymbol}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {currentM && (
            <div className="bg-blue-50/30 p-6 rounded-xl border border-blue-100 animate-fade-in">
              <div className="font-bold text-xl text-blue-900 border-b border-blue-100 pb-3 mb-4 flex justify-between items-center">
                <span>{currentM.sku} / {currentM.color}</span>
                <span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                    {convertPrice(currentM.price, mainCurrency, settings.exchangeRates)} {mainSymbol}
                </span>
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

      {/* Cart & Payment */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-100px)] sticky top-4">
        <h3 className="font-bold border-b border-gray-100 pb-4 mb-4 flex gap-2 text-gray-800 items-center text-lg"><ShoppingCart className="text-blue-600"/> Корзина</h3>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar mb-4">
          {cart.map((i, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between group hover:border-blue-200 transition-colors hover:shadow-sm">
              <div>
                <div className="font-bold text-gray-800 text-sm">{i.sku} <span className="font-normal text-gray-500">({i.color})</span></div>
                <div className="text-xs text-gray-500 mt-1">{i.qty} {getNoun(i.qty, 'пара', 'пары', 'пар')}
                   {i.note && <div className="mt-1 flex flex-wrap gap-1">{i.note.split(', ').map((n, ni) => (<span key={ni} className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 shadow-sm">{n}</span>))}</div>}
                </div>
              </div>
              <div className="text-right flex flex-col justify-between items-end">
                {/* Отображаем цену в основной валюте */}
                <div className="font-bold text-gray-800">
                    {convertPrice(i.total, mainCurrency, settings.exchangeRates)} {mainSymbol}
                </div>
                <div className="flex gap-2 mt-1">
                   <button onClick={() => setConfirmDeleteIndex(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="text-center text-gray-400 py-10 flex flex-col items-center gap-2"><ShoppingCart size={48} className="opacity-20"/>Корзина пуста</div>}
        </div>
        
        {/* Payment Block */}
        <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
             <div className="flex items-center gap-2 font-bold text-green-800 mb-3 text-sm uppercase tracking-wide">
                 <CreditCard size={16}/> Оплата
             </div>
             <div className="flex gap-2 mb-2">
                 <div className="relative w-full">
                    <input 
                        type="number" 
                        placeholder="Сумма предоплаты" 
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:border-green-500 transition-colors"
                        value={prepayment}
                        onChange={e => setPrepayment(e.target.value)}
                    />
                 </div>
                 {/* Выбор валюты оплаты */}
                 <select 
                    className="border border-gray-200 rounded-lg px-2 bg-white font-bold text-gray-700 focus:border-green-500 focus:outline-none"
                    value={paymentCurrency}
                    onChange={e => setPaymentCurrency(e.target.value)}
                 >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="UAH">UAH</option>
                 </select>
             </div>
             <div className="text-right text-xs text-green-700 font-medium">
                 Полная сумма заказа: <span className="font-bold text-base">{fullAmountInPaymentCurrency} {paymentCurrency}</span>
                 <br/><span className="text-green-500/70">Курс: {paymentRate}</span>
             </div>
          </div>

          <div className="flex justify-between font-bold text-xl text-gray-800">
            <span>Итого:</span>
            {/* Итого показываем в ОСНОВНОЙ валюте, а не в валюте оплаты (для единообразия интерфейса) */}
            <span className="text-blue-600">
                {convertPrice(totalCartUSD, mainCurrency, settings.exchangeRates)} {mainSymbol}
            </span>
          </div>
          <Button onClick={saveOrder} variant="success" className="w-full py-4 text-lg shadow-xl shadow-green-100 hover:shadow-green-200 transform hover:-translate-y-1 transition-all">Оформить заказ</Button>
        </div>
      </div>
      
      {confirmDeleteIndex !== null && (
          <Modal title="Удаление" onClose={() => setConfirmDeleteIndex(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteIndex(null)}>Отмена</Button><Button variant="danger" onClick={() => {setCart(cart.filter((_, x) => x !== confirmDeleteIndex)); setConfirmDeleteIndex(null);}}>Удалить</Button></>}>
              <p className="text-center text-gray-600">Удалить этот товар из корзины?</p>
          </Modal>
      )}
    </div>
  );
};

export default NewOrderPage;