import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ShoppingCart, User, Phone, MapPin, AlertTriangle, Box, Eraser, Edit, Trash2, CreditCard, CheckSquare, Square, X } from 'lucide-react';
import { apiCall } from '../api';
import { normalizePhone, formatPhoneNumber, getNoun, convertPrice, convertToUSD } from '../utils';
import { Button, Input, Modal } from '../components/UI';
import InvoicePreview from '../components/InvoicePreview';

// --- Компонент модального окна скидок ---
const DiscountModal = ({ isOpen, onClose, onApply, cart, mainCurrency }) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('lump'); 
    const [lumpVal, setLumpVal] = useState('');
    const [pairVal, setPairVal] = useState('');
    const [selectedItems, setSelectedItems] = useState(cart.map((_, idx) => idx)); 

    const toggleItem = (idx) => {
        if (selectedItems.includes(idx)) {
            setSelectedItems(selectedItems.filter(i => i !== idx));
        } else {
            setSelectedItems([...selectedItems, idx]);
        }
    };

    const toggleAll = () => {
        if (selectedItems.length === cart.length) setSelectedItems([]);
        else setSelectedItems(cart.map((_, idx) => idx));
    };

    const handleApply = () => {
        let result = { type: activeTab };
        if (activeTab === 'lump') {
            result.value = parseFloat(lumpVal);
        } else if (activeTab === 'pair') {
            result.value = parseFloat(pairVal);
            result.indices = selectedItems;
        }
        onApply(result);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h3 className="font-bold text-xl text-gray-800">Управление ценой</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                </div>
                
                <div className="p-2 bg-gray-50 flex gap-2 border-b border-gray-100">
                    <button onClick={() => setActiveTab('lump')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'lump' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Скидка на заказ</button>
                    <button onClick={() => setActiveTab('pair')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'pair' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Скидка на пару</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {activeTab === 'lump' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">Укажите сумму скидки на весь заказ в основной валюте (вычитается из итоговой суммы).</p>
                            <Input label={`Сумма скидки (${mainCurrency})`} type="number" value={lumpVal} onChange={e => setLumpVal(e.target.value)} autoFocus />
                        </div>
                    )}

                    {activeTab === 'pair' && (
                        <div className="space-y-4">
                            <div className="flex items-end gap-4">
                                <div className="flex-1">
                                    <Input label={`Скидка на пару (${mainCurrency})`} type="number" value={pairVal} onChange={e => setPairVal(e.target.value)} autoFocus placeholder="2" />
                                </div>
                            </div>
                            
                            <div className="border rounded-xl overflow-hidden mt-4">
                                <div className="bg-gray-50 p-3 border-b flex items-center gap-3 font-bold text-xs text-gray-500 uppercase tracking-wider">
                                    <button onClick={toggleAll} className="hover:text-blue-600 transition-colors">
                                        {selectedItems.length === cart.length ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}
                                    </button>
                                    <span>Все товары</span>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="p-3 border-b last:border-0 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleItem(idx)}>
                                            <div className={selectedItems.includes(idx) ? "text-blue-600" : "text-gray-400"}>
                                                {selectedItems.includes(idx) ? <CheckSquare size={18}/> : <Square size={18}/>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-sm text-gray-800">{item.sku} <span className="font-normal text-gray-500">({item.color})</span></div>
                                                <div className="text-xs text-gray-500">{item.qty} пар</div>
                                            </div>
                                            <div className="font-mono text-sm">{item.price} USD</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Отмена</Button>
                    <Button onClick={handleApply}>Применить</Button>
                </div>
            </div>
        </div>
    );
};

const NewOrderPage = ({ 
    clients, setClients, models, sizeGrid, setOrders, orders, triggerToast, settings,
    orderDraft, setOrderDraft, clearOrderDraft, goToSettingsAndHighlight 
}) => {
  const [selModel, setSelModel] = useState(''); 
  const [search, setSearch] = useState('');
  const [showModelList, setShowModelList] = useState(false);
  
  const [sizeQuantities, setSizeQuantities] = useState({});
  const [editingCartIndex, setEditingCartIndex] = useState(null);
  const [editingDiscount, setEditingDiscount] = useState(''); 
  
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);
  const [showClientList, setShowClientList] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  const { cart, clientPhone, clientName, clientCity, selectedClient, prepayment, paymentCurrency, lumpDiscount } = orderDraft;
  const mainCurrency = settings?.mainCurrency || 'USD';

  // --- РАСЧЕТЫ ---
  const subTotalUSD = cart.reduce((acc, i) => {
      const priceWithDiscount = Math.max(0, i.price - (i.discountPerPair || 0));
      return acc + (priceWithDiscount * i.qty);
  }, 0);

  // Скидка на весь заказ вычитается в конце (в USD)
  // lumpDiscount в черновике хранится в той валюте, в которой его ввели? 
  // Предположим, мы вводим в основной валюте, значит нужно конвертировать в USD для расчетов?
  // Для простоты, пока считаем что lumpDiscount вводится в USD (так как база в USD).
  // Если нужно вводить в UAH/EUR, надо конвертировать. 
  // ДОРАБОТКА: Считаем lumpDiscount введенным в mainCurrency и конвертируем в USD для хранения
  const lumpDiscountUSD = convertToUSD(parseFloat(lumpDiscount) || 0, mainCurrency, settings?.exchangeRates);

  const totalCartUSD = Math.max(0, subTotalUSD - lumpDiscountUSD);
  const totalPairsInCart = cart.reduce((acc, i) => acc + i.qty, 0);

  const getPaymentRate = (targetCurr, rates) => {
      const t = targetCurr.toUpperCase();
      const r = rates || { usd: 1, eur: 1 };
      const usdToUah = r.usd || 1;
      const eurToUah = r.eur || 1;

      if (t === 'USD') return 1; 
      if (t === 'UAH') return usdToUah;
      if (t === 'EUR') return usdToUah / eurToUah;
      return 1;
  };

  const paymentRate = getPaymentRate(paymentCurrency, settings?.exchangeRates);
  const fullAmountInPaymentCurrency = (totalCartUSD * paymentRate).toFixed(2);
  const prepaymentInUSD = paymentRate > 0 ? Number(prepayment) / paymentRate : 0;
  const remainingTotalUSD = Math.max(0, totalCartUSD - prepaymentInUSD);

  // --- HANDLERS ---
  const updateDraft = (fields) => { setOrderDraft(prev => ({ ...prev, ...fields })); };
  
  const applyDiscount = (result) => {
      if (result.type === 'lump') {
          updateDraft({ lumpDiscount: result.value });
      } else if (result.type === 'pair') {
          // Важно: скидка на пару вводится в mainCurrency, конвертируем в USD для хранения в item
          const discountInUSD = convertToUSD(result.value || 0, mainCurrency, settings?.exchangeRates);
          const newCart = cart.map((item, idx) => {
              if (result.indices.includes(idx)) {
                  return { ...item, discountPerPair: discountInUSD, total: (item.price - discountInUSD) * item.qty };
              }
              return item;
          });
          updateDraft({ cart: newCart });
      }
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw);
    updateDraft({ clientPhone: formatted });
    setShowClientList(true);
  };
  
  // ... (useEffects и handlers для клиента, добавления товара, редактирования - без изменений, см. ниже полный код)
  useEffect(() => {
    const cleanInput = normalizePhone(clientPhone);
    if (!cleanInput) { updateDraft({ selectedClient: null }); return; }
    const found = clients.find(c => {
       const dbPhone = normalizePhone(c.phone);
       if (dbPhone === cleanInput) return true;
       if (cleanInput.startsWith('0') && dbPhone === '38' + cleanInput) return true;
       return false;
    });
    if (found) { updateDraft({ selectedClient: found, clientName: found.name, clientCity: found.city }); } 
    else { updateDraft({ selectedClient: null }); }
  }, [clientPhone, clients]);

  const selectClientSuggestion = (client) => {
    updateDraft({ clientPhone: client.phone, clientName: client.name, clientCity: client.city, selectedClient: client });
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
         triggerToast("Ящики не прописаны", "error"); return;
     }
     setSizeQuantities(prev => {
        const next = { ...prev };
        Object.entries(template).forEach(([size, qty]) => { next[size] = (next[size] || 0) + Number(qty); });
        return next;
     });
     triggerToast(`Добавлен ящик ${boxSize} пар`);
  };
  const addToCart = () => {
    if (!currentM) return;
    const totalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
    if (totalQty === 0) { triggerToast("Укажите количество", 'error'); return; }
    
    // Форматирование: добавляем пробел перед скобкой
    const noteParts = Object.entries(sizeQuantities).filter(([_, q]) => q > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([s, q]) => `${s} (${q})`);
    
    const note = noteParts.join(', ');
    updateDraft({ cart: [...cart, { ...currentM, modelId: currentM.id, qty: totalQty, note, sizes: sizeQuantities, discountPerPair: 0, total: currentM.price * totalQty }] });
    setSizeQuantities({}); setSelModel(''); setSearch(''); setShowModelList(false);
  };
  const openEditModal = (index) => {
      setEditingCartIndex(index);
      const itemToEdit = cart[index];
      if (itemToEdit.sizes) { setSizeQuantities({ ...itemToEdit.sizes }); } else { setSizeQuantities({}); }
      // Конвертируем сохраненную скидку (USD) обратно в mainCurrency для редактирования
      const discountInMain = convertPrice(itemToEdit.discountPerPair || 0, mainCurrency, settings.exchangeRates);
      setEditingDiscount(discountInMain === '0.00' ? '' : discountInMain);
  };
  const saveEditedItem = () => {
      if (editingCartIndex === null) return;
      const item = cart[editingCartIndex];
      const totalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
      if (totalQty === 0) { triggerToast("Количество не может быть 0", "error"); return; }
      
      const noteParts = Object.entries(sizeQuantities).filter(([_, q]) => q > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([s, q]) => `${s} (${q})`);
      const note = noteParts.join(', ');
      
      // Конвертируем введенную скидку в USD
      const discountUSD = convertToUSD(parseFloat(editingDiscount) || 0, mainCurrency, settings.exchangeRates);

      const updatedItem = { ...item, qty: totalQty, note, sizes: sizeQuantities, discountPerPair: discountUSD, total: (item.price - discountUSD) * totalQty };
      const newCart = [...cart];
      newCart[editingCartIndex] = updatedItem;
      updateDraft({ cart: newCart });
      setEditingCartIndex(null);
      setSizeQuantities({}); 
      setEditingDiscount('');
  };
  const deleteFromCart = (index) => {
      const newCart = cart.filter((_, x) => x !== index);
      updateDraft({ cart: newCart });
      setConfirmDeleteIndex(null);
  }
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
        date: new Date().toISOString(), clientId: parseInt(finalClientId), items: cart, total: totalCartUSD, lumpDiscount: lumpDiscountUSD,
        payment: { originalAmount: Number(prepayment), originalCurrency: paymentCurrency, rateAtMoment: paymentRate, prepaymentInUSD: prepaymentInUSD }
    };
    try {
      const saved = await apiCall('/orders', 'POST', order);
      setOrders([saved, ...orders]);
      clearOrderDraft();
      setShowInvoice(false);
      triggerToast("Заказ успешно сохранен");
    } catch(e) { triggerToast("Ошибка сохранения заказа", 'error'); }
  };

  const currentTotalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);

  // --- RENDER ---
  if (showInvoice) {
      // Собираем объект для превью, похожий на сохраненный
      const orderForPreview = {
          id: orders.length + 1, 
          date: new Date(),
          client: { name: clientName, city: clientCity, phone: clientPhone },
          items: cart,
          lumpDiscount: lumpDiscountUSD,
          payment: { originalAmount: prepayment, originalCurrency: paymentCurrency, prepaymentInUSD: prepaymentInUSD }
      };

      return <InvoicePreview 
          order={orderForPreview}
          settings={settings} 
          onBack={() => setShowInvoice(false)}
      />;
  }

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
               <Input label="Имя" icon={User} value={clientName} onChange={e => updateDraft({ clientName: e.target.value })} placeholder="Имя клиента"/>
               <Input label="Город" icon={MapPin} value={clientCity} onChange={e => updateDraft({ clientCity: e.target.value })} placeholder="Яготин"/>
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
                        {convertPrice(m.price, mainCurrency, settings.exchangeRates)} {mainCurrency}
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
                    {convertPrice(currentM.price, mainCurrency, settings.exchangeRates)} {mainCurrency}
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
                                  <input 
                                    type="text" 
                                    inputMode="numeric" 
                                    className="w-11 h-11 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-lg font-bold text-gray-700 placeholder-gray-200" 
                                    placeholder="0" 
                                    value={sizeQuantities[size] > 0 ? sizeQuantities[size] : ''} 
                                    onFocus={(e) => e.target.select()}
                                    onChange={e => handleSizeChange(size, e.target.value)} 
                                  />
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
                <div className="flex items-baseline gap-2">
                    <div className="text-sm font-bold text-blue-900">
                        Итого: {currentTotalQty} {getNoun(currentTotalQty, 'пара', 'пары', 'пар')}
                    </div>
                </div>
                <Button onClick={addToCart} size="md" icon={Plus} className="h-[46px] px-8">В заказ</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart & Payment */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-100px)] sticky top-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
            <h3 className="font-bold flex gap-2 text-gray-800 items-center text-lg"><ShoppingCart className="text-blue-600"/> Корзина</h3>
            {cart.length > 0 && <button onClick={clearOrderDraft} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"><Trash2 size={12}/> Очистить</button>}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar mb-4">
          {cart.map((i, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between group hover:border-blue-200 transition-colors hover:shadow-sm">
              <div>
                <div className="font-bold text-gray-800 text-sm">{i.sku} <span className="font-normal text-gray-500">({i.color})</span></div>
                <div className="text-xs text-gray-500 mt-1">{i.qty} {getNoun(i.qty, 'пара', 'пары', 'пар')}
                   {i.note && <div className="mt-1 flex flex-wrap gap-1">{i.note.split(', ').map((n, ni) => (<span key={ni} className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 shadow-sm">{n}</span>))}</div>}
                </div>
                {i.discountPerPair > 0 && <div className="text-[10px] text-green-600 font-bold bg-green-50 inline-block px-1 rounded mt-1">Скидка: -{convertPrice(i.discountPerPair, mainCurrency, settings.exchangeRates)} {mainCurrency}</div>}
              </div>
              <div className="text-right flex flex-col justify-between items-end">
                <div className="font-bold text-gray-800">
                    {convertPrice(i.total, mainCurrency, settings.exchangeRates)} {mainCurrency}
                </div>
                <div className="flex gap-2 mt-1">
                   <button onClick={() => openEditModal(idx)} className="text-blue-400 hover:text-blue-600 p-1 bg-blue-50 rounded transition-colors"><Edit size={16}/></button>
                   <button onClick={() => setConfirmDeleteIndex(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
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
                        onFocus={(e) => e.target.select()}
                        onChange={e => updateDraft({ prepayment: e.target.value })}
                    />
                 </div>
                 <select 
                    className="border border-gray-200 rounded-lg px-2 bg-white font-bold text-gray-700 focus:border-green-500 focus:outline-none"
                    value={paymentCurrency}
                    onChange={e => updateDraft({ paymentCurrency: e.target.value })}
                 >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="UAH">UAH</option>
                 </select>
             </div>
             <div className="text-right text-xs text-green-700 font-medium">
                 Полная сумма заказа: 
                 <span 
                    onClick={() => updateDraft({ prepayment: fullAmountInPaymentCurrency })}
                    className="font-bold text-base cursor-pointer hover:text-green-900 border-b border-dashed border-green-400 ml-1 transition-colors"
                    title="Вставить полную сумму"
                 >
                    {fullAmountInPaymentCurrency} {paymentCurrency}
                 </span>
                 <br/>
                 <span className="text-green-500/70 flex justify-end items-center gap-1">
                     Курс: {paymentRate.toFixed(2)}
                     <button onClick={() => goToSettingsAndHighlight('rates')} className="p-1 bg-green-100 rounded hover:bg-green-200 text-green-700 transition-colors" title="Изменить курс">
                         <Edit size={10}/>
                     </button>
                 </span>
             </div>
          </div>

          <div className="flex justify-between items-end font-bold text-xl text-gray-800">
            <div className="flex flex-col">
                <span>Итого:</span>
                <span className="text-sm text-gray-500 font-normal">{totalPairsInCart} {getNoun(totalPairsInCart, 'пара', 'пары', 'пар')}</span>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-blue-600">
                    {convertPrice(remainingTotalUSD, mainCurrency, settings.exchangeRates)} {mainCurrency}
                </span>
                <button onClick={() => setIsDiscountModalOpen(true)} className="p-1.5 bg-gray-100 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors">
                    <Edit size={18}/>
                </button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
             <Button onClick={() => setShowInvoice(true)} variant="secondary" className="col-span-1" icon={Printer} title="Печать"></Button>
             <Button onClick={saveOrder} variant="success" className="col-span-3 text-lg shadow-xl shadow-green-100 hover:shadow-green-200 transform hover:-translate-y-1 transition-all">Оформить</Button>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <DiscountModal 
          isOpen={isDiscountModalOpen} 
          onClose={() => setIsDiscountModalOpen(false)} 
          onApply={applyDiscount} 
          cart={cart}
          mainCurrency={mainCurrency}
          currentTotal={totalCartUSD}
      />

      {editingCartIndex !== null && (
        <Modal title="Редактирование позиции" onClose={() => setEditingCartIndex(null)} footer={<Button onClick={saveEditedItem}>Сохранить изменения</Button>}>
            <div className="space-y-4">
                 <div className="text-center font-bold text-lg mb-4 text-gray-700">{cart[editingCartIndex].sku} / {cart[editingCartIndex].color}</div>
                 
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <Input 
                        label={`Скидка на пару (${mainCurrency})`} 
                        type="number" 
                        value={editingDiscount} 
                        onChange={e => setEditingDiscount(e.target.value)} 
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                    />
                 </div>

                 <div className="mb-4">
                    <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Размеры</label><button onClick={() => setSizeQuantities({})} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"><Eraser size={14}/>Очистить</button></div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: Math.max(0, parseInt(sizeGrid.max) - parseInt(sizeGrid.min) + 1) }, (_, i) => parseInt(sizeGrid.min) + i).map(size => (
                            <div key={size} className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 font-medium mb-1">{size}</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric" 
                                    className="w-11 h-11 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-lg font-bold text-gray-700 placeholder-gray-200" 
                                    placeholder="0" 
                                    value={sizeQuantities[size] > 0 ? sizeQuantities[size] : ''} 
                                    onFocus={(e) => e.target.select()}
                                    onChange={e => handleSizeChange(size, e.target.value)} 
                                  />
                            </div>
                        ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    {[6, 8, 10, 12].map(boxSize => (
                        <button key={boxSize} onClick={() => addBox(boxSize)} className="bg-white border border-blue-200 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1"><Box size={14}/> {boxSize}-ти парный +1</button>
                    ))}
                 </div>
            </div>
        </Modal>
      )}

      {confirmDeleteIndex !== null && (
          <Modal title="Удаление" onClose={() => setConfirmDeleteIndex(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteIndex(null)}>Отмена</Button><Button variant="danger" onClick={() => deleteFromCart(confirmDeleteIndex)}>Удалить</Button></>}>
              <p className="text-center text-gray-600">Удалить этот товар из корзины?</p>
          </Modal>
      )}
    </div>
  );
};

export default NewOrderPage;