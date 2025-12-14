import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ShoppingCart, User, Phone, MapPin, AlertTriangle, Box, Eraser, Edit, Trash2, CreditCard, CheckSquare, Square, X, Printer, Globe } from 'lucide-react';
import { apiCall } from '../api';
import { normalizePhone, formatPhoneNumber, getNoun, convertPrice, convertToUSD } from '../utils';
import { Button, Input, Modal } from '../components/UI';
import InvoicePreview from '../components/InvoicePreview';

// --- MODAL COMPONENT ---
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
                            <p className="text-sm text-gray-600">Укажите сумму скидки на весь заказ в основной валюте.</p>
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

  const { cart, clientPhone, clientName, clientCity, selectedClient, prepayment, paymentCurrency, lumpDiscount, id: editingId, orderId: displayOrderId } = orderDraft;
  const mainCurrency = settings?.mainCurrency || 'USD';
  
  const currentM = models.find(m => m.id === parseInt(selModel) || m.id === selModel);
  const currentGrid = useMemo(() => {
      if (!currentM) return settings?.sizeGrids?.find(g => g.id === settings?.defaultSizeGridId) || settings?.sizeGrids?.[0];
      return settings?.sizeGrids?.find(g => g.id === currentM.gridId) || settings?.sizeGrids?.find(g => g.id === settings?.defaultSizeGridId) || settings?.sizeGrids?.[0];
  }, [currentM, settings]);
  
  const sizeRange = useMemo(() => {
    if (!currentGrid) return [];
    const min = parseInt(currentGrid.min);
    const max = parseInt(currentGrid.max);
    return isNaN(min) || isNaN(max) ? [] : Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
  }, [currentGrid]);

  const currentBoxTemplates = settings?.boxTemplates?.[currentGrid?.id] || {};
  const availableBoxSizes = Object.keys(currentBoxTemplates).sort((a,b) => Number(a) - Number(b));

  // --- РАСЧЕТЫ ---
  const subTotalUSD = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const totalPairDiscountUSD = cart.reduce((acc, i) => acc + ((i.discountPerPair || 0) * i.qty), 0);
  const lumpDiscountUSD = convertToUSD(parseFloat(lumpDiscount) || 0, mainCurrency, settings?.exchangeRates);
  const totalDiscountUSD = totalPairDiscountUSD + lumpDiscountUSD;
  const totalCartUSD = Math.max(0, subTotalUSD - totalDiscountUSD);
  const totalPairsInCart = cart.reduce((acc, i) => acc + i.qty, 0);

  const getPaymentRate = (targetCurr, rates) => {
      const t = targetCurr.toUpperCase();
      const r = rates || { usd: 1, eur: 1 };
      if (t === 'USD') return 1; 
      if (t === 'UAH') return r.usd || 1;
      if (t === 'EUR') return (r.usd / r.eur) || 1;
      return 1;
  };

  const paymentRate = getPaymentRate(paymentCurrency, settings?.exchangeRates);
  const fullAmountInPaymentCurrency = (totalCartUSD * paymentRate).toFixed(2);
  const prepaymentInUSD = paymentRate > 0 ? Number(prepayment) / paymentRate : 0;

  // --- HANDLERS ---
  const updateDraft = (fields) => { setOrderDraft(prev => ({ ...prev, ...fields })); };
  
  const applyDiscount = (result) => {
      if (result.type === 'lump') {
          updateDraft({ lumpDiscount: result.value });
      } else if (result.type === 'pair') {
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

  const handleSizeChange = (size, val) => {
    const intVal = parseInt(val) || 0;
    setSizeQuantities(prev => ({ ...prev, [size]: intVal >= 0 ? intVal : 0 }));
  };
  
  const addBox = (boxSize) => {
     const template = currentBoxTemplates[boxSize];
     if (!currentGrid) return triggerToast(`Не выбрана сетка.`, "error");
     if (!template) return triggerToast(`Комплектация не задана.`, "error");
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
    const note = Object.entries(sizeQuantities).filter(([_, q]) => q > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([s, q]) => `${s}(${q})`).join(', ');
    updateDraft({ cart: [...cart, { ...currentM, modelId: currentM.id, qty: totalQty, note, sizes: sizeQuantities, discountPerPair: 0, total: currentM.price * totalQty }] });
    setSizeQuantities({}); setSelModel(''); setSearch(''); setShowModelList(false);
  };
  
  const openEditModal = (index) => {
      setEditingCartIndex(index);
      const item = cart[index];
      setSizeQuantities(item.sizes || {});
      setEditingDiscount(item.discountPerPair ? convertPrice(item.discountPerPair, mainCurrency, settings.exchangeRates) : '');
  };
  
  const saveEditedItem = () => {
      if (editingCartIndex === null) return;
      const item = cart[editingCartIndex];
      const totalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
      if (totalQty === 0) { triggerToast("Количество 0", "error"); return; }
      const note = Object.entries(sizeQuantities).filter(([_, q]) => q > 0).sort(([a], [b]) => Number(a) - Number(b)).map(([s, q]) => `${s}(${q})`).join(', ');
      const discountUSD = convertToUSD(parseFloat(editingDiscount) || 0, mainCurrency, settings.exchangeRates);
      const newCart = [...cart];
      newCart[editingCartIndex] = { ...item, qty: totalQty, note, sizes: sizeQuantities, discountPerPair: discountUSD, total: (item.price - discountUSD) * totalQty };
      updateDraft({ cart: newCart });
      setEditingCartIndex(null); setSizeQuantities({}); setEditingDiscount('');
  };
  
  const deleteFromCart = (index) => {
      updateDraft({ cart: cart.filter((_, x) => x !== index) });
      setConfirmDeleteIndex(null);
  }
  
  const saveOrder = async () => {
    if (!clientPhone || !clientName) { triggerToast("Заполните клиента", 'error'); return; }
    if (cart.length === 0) { triggerToast("Корзина пуста", 'error'); return; }
    
    let finalClientId = selectedClient?.id;
    if (!finalClientId) {
        try {
            const saved = await apiCall('/clients', 'POST', { name: clientName, city: clientCity, phone: clientPhone });
            setClients(prev => [...prev, saved]); finalClientId = saved.id;
        } catch (e) { triggerToast(`Ошибка клиента: ${e.message}`, 'error'); return; }
    }
    const orderData = { 
        date: new Date().toISOString(), clientId: parseInt(finalClientId), items: cart, total: totalCartUSD, lumpDiscount: lumpDiscountUSD,
        payment: { originalAmount: Number(prepayment), originalCurrency: paymentCurrency, rateAtMoment: paymentRate, prepaymentInUSD: prepaymentInUSD }
    };
    try {
      if (editingId) {
          const updated = await apiCall(`/orders/${editingId}`, 'PUT', orderData);
          setOrders(prev => prev.map(o => o.id === editingId ? updated : o));
          triggerToast(`Заказ обновлен`);
          clearOrderDraft(); 
      } else {
          const saved = await apiCall('/orders', 'POST', orderData);
          setOrders([saved, ...orders]);
          clearOrderDraft();
          triggerToast("Заказ создан");
      }
      setShowInvoice(false);
    } catch(e) { triggerToast("Ошибка", 'error'); }
  };

  const filteredM = models.filter(m => m.sku.toLowerCase().includes(search.toLowerCase()) || m.color.toLowerCase().includes(search.toLowerCase()));
  const filteredClients = useMemo(() => {
     if (clientPhone.length < 2) return [];
     const searchClean = normalizePhone(clientPhone);
     return clients.filter(c => {
        const dbPhone = normalizePhone(c.phone);
        if (selectedClient && c.id === selectedClient.id) return false;
        if (dbPhone.includes(searchClean)) return true;
        if (searchClean.startsWith('0') && dbPhone.includes('38' + searchClean)) return true;
        return false;
     });
  }, [clients, clientPhone, selectedClient]);

  const currentTotalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0);
  const currentTotalSumUSD = currentM ? currentM.price * currentTotalQty : 0;

  if (showInvoice) {
      const nextId = editingId ? displayOrderId : (orders.reduce((max, o) => Math.max(max, o.orderId || 0), 0) + 1);
      return <InvoicePreview order={{ id: editingId || 0, orderId: nextId, date: new Date(), client: { name: clientName, city: clientCity, phone: clientPhone }, items: cart, lumpDiscount: lumpDiscountUSD, payment: { originalAmount: prepayment, originalCurrency: paymentCurrency, prepaymentInUSD: prepaymentInUSD } }} settings={settings} onBack={() => setShowInvoice(false)} />;
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-6 overflow-hidden bg-slate-50 animate-fade-in">
      
      {/* LEFT COLUMN */}
      <div className="flex flex-col flex-1 gap-6 min-h-0 overflow-hidden">
        
        {/* CLIENT BLOCK */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-3 text-blue-900 border-b border-gray-100 pb-2"><User size={20} /><h3 className="font-bold text-lg">Данные клиента</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
                <Input label="Телефон" icon={Phone} value={clientPhone} onChange={handlePhoneChange} placeholder="Номер..." autoComplete="off" />
                {showClientList && filteredClients.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-2 max-h-60 overflow-y-auto p-1">
                        {filteredClients.map(c => (
                            <div key={c.id} className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border-b border-gray-50 last:border-0" onClick={() => selectClientSuggestion(c)}>
                                <div className="font-bold text-sm text-gray-800">{c.phone}</div>
                                <div className="text-xs text-gray-500">{c.name} ({c.city})</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Input label="Имя" icon={User} value={clientName} onChange={e => updateDraft({ clientName: e.target.value })} placeholder="Имя"/>
            <Input label="Город" icon={MapPin} value={clientCity} onChange={e => updateDraft({ clientCity: e.target.value })} placeholder="Город"/>
          </div>
        </div>

        {/* PRODUCTS BLOCK */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0 relative">
          <div className="shrink-0 pb-4 border-b border-gray-100 mb-4 bg-white z-10">
              <div className="flex items-center gap-3 mb-3 text-blue-900"><ShoppingCart size={20} /><h3 className="font-bold text-lg">Товары</h3></div>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input className="w-full border border-gray-200 bg-gray-50 p-2.5 pl-12 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400" placeholder="Поиск модели..." value={search} onChange={e => { setSearch(e.target.value); setShowModelList(true); }} onFocus={() => setShowModelList(true)}/>
                {showModelList && search && (<div className="border border-gray-100 rounded-xl mt-2 max-h-60 overflow-y-auto bg-white shadow-xl absolute w-full z-20 custom-scrollbar p-1">{filteredM.map(m => (<div key={m.id} onClick={() => { setSelModel(m.id); setSearch(m.sku); setShowModelList(false); }} className="p-3 px-4 cursor-pointer hover:bg-blue-50 rounded-lg flex justify-between items-center transition-colors mb-1 border-b border-gray-50 last:border-0"><div><span className="font-bold text-sm text-gray-800">{m.sku}</span> <span className="text-gray-400 mx-2">|</span> <span className="text-xs text-gray-600">{m.color}</span></div><span className="font-bold text-xs text-green-600 bg-green-50 px-2 py-1 rounded">{convertPrice(m.price, mainCurrency, settings.exchangeRates)} {mainCurrency}</span></div>))}</div>)}
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {currentM ? (
                  <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 animate-fade-in h-full flex flex-col">
                      <div className="font-bold text-base text-blue-900 border-b border-blue-200 pb-3 mb-4 flex justify-between items-center">
                          <span>{currentM.sku} / {currentM.color}</span>
                          <span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg text-sm">{convertPrice(currentM.price, mainCurrency, settings.exchangeRates)} {mainCurrency}</span>
                      </div>
                      
                      {!currentGrid ? (
                          <div className="text-center p-4 bg-yellow-50 text-yellow-700 rounded-lg mb-4 border border-yellow-200 font-bold text-sm">⚠ Нет сетки!</div>
                      ) : (
                          <div className="flex-1">
                              <div className="mb-6">
                                  <div className="flex justify-between items-center mb-3">
                                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Размеры ({currentGrid.name}: {currentGrid.min}-{currentGrid.max})</label>
                                      <button onClick={() => setSizeQuantities({})} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors font-medium"><Eraser size={14}/>Очистить</button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {sizeRange.map(size => (
                                          <div key={size} className="flex flex-col items-center">
                                              <span className="text-xs text-gray-500 font-medium mb-1">{size}</span>
                                              <input type="text" inputMode="numeric" className="w-11 h-11 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white shadow-sm text-lg font-bold text-gray-800 placeholder-gray-200 transition-all" placeholder="0" value={sizeQuantities[size] > 0 ? sizeQuantities[size] : ''} onFocus={(e) => e.target.select()} onChange={e => handleSizeChange(size, e.target.value)} />
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {availableBoxSizes.length > 0 ? availableBoxSizes.map(boxSize => (<button key={boxSize} onClick={() => addBox(boxSize)} className="bg-white border border-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1 h-10"><Box size={16}/> Ящик {boxSize}</button>)) : <div className="col-span-4 text-center text-gray-400 py-4 border border-dashed rounded-xl bg-gray-50 text-xs">Нет ящиков</div>}
                              </div>
                          </div>
                      )}
                      
                      <div className="flex justify-between items-center border-t border-blue-200 pt-4 mt-auto">
                          <div className="flex items-baseline gap-2">
                              <div className="text-sm font-bold text-blue-900">Итого: {currentTotalQty} {getNoun(currentTotalQty, 'пара', 'пары', 'пар')}</div>
                              {currentTotalQty > 0 && (<div className="text-sm font-bold text-green-600">({convertPrice(currentTotalSumUSD, mainCurrency, settings.exchangeRates)} {mainCurrency})</div>)}
                          </div>
                          <Button onClick={addToCart} size="md" icon={Plus} className="h-10 px-6 text-sm" disabled={!currentGrid}>В заказ</Button>
                      </div>
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300">
                      <ShoppingCart size={48} className="mb-2 opacity-20"/>
                      <p className="text-sm font-medium">Выберите модель</p>
                  </div>
              )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: CART */}
      <div className="w-full lg:w-[28rem] xl:w-[30rem] bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full shrink-0 overflow-hidden">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3 shrink-0">
            <h3 className="font-bold flex gap-2 text-gray-800 items-center text-lg"><ShoppingCart className="text-blue-600" size={20}/> Корзина</h3>
            {cart.length > 0 && <button onClick={clearOrderDraft} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors font-medium"><Trash2 size={14}/> Очистить</button>}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar my-4">
            {cart.map((i, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between group hover:border-blue-300 hover:bg-blue-50/30 transition-all hover:shadow-sm cursor-pointer" onClick={() => openEditModal(idx)}>
                    <div>
                        <div className="font-bold text-gray-800 text-sm mb-0.5">{i.sku} <span className="font-normal text-gray-500">({i.color})</span></div>
                        <div className="text-xs text-gray-600">{i.qty} {getNoun(i.qty, 'пара', 'пары', 'пар')}</div>
                        {i.note && <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{i.note}</div>}
                        {i.discountPerPair > 0 && <div className="text-[10px] text-green-600 font-bold bg-green-100 inline-block px-1.5 py-0.5 rounded mt-1">-{convertPrice(i.discountPerPair, mainCurrency, settings.exchangeRates)}</div>}
                    </div>
                    <div className="text-right flex flex-col justify-between items-end">
                        <div className="font-bold text-sm text-gray-800">{convertPrice(i.total, mainCurrency, settings.exchangeRates)} {mainCurrency}</div>
                        <div className="flex gap-1">
                            <button onClick={(e) => {e.stopPropagation(); setConfirmDeleteIndex(idx)}} className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </div>
                    </div>
                </div>
            ))}
            {cart.length === 0 && <div className="text-center text-gray-400 py-10 text-sm">Корзина пуста</div>}
        </div>
        
        <div className="border-t border-gray-100 pt-4 shrink-0 space-y-3">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 font-bold text-green-800 mb-2 text-xs uppercase tracking-wide"><CreditCard size={14}/> Оплата</div>
              <div className="flex gap-2 mb-2">
                  <div className="relative w-full"><Input type="number" placeholder="Предоплата" value={prepayment} onChange={e => updateDraft({ prepayment: e.target.value })} className="w-full border border-green-200 bg-white rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm font-bold text-green-900 placeholder-green-300/50" onFocus={(e) => e.target.select()}/></div>
                  <select className="border border-green-200 rounded-lg px-2 bg-white font-bold text-green-800 focus:border-green-500 focus:outline-none text-sm cursor-pointer" value={paymentCurrency} onChange={e => updateDraft({ paymentCurrency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option><option value="UAH">UAH</option></select>
              </div>
              <div className="text-right text-xs text-green-700 font-medium">Полная сумма: <span onClick={() => updateDraft({ prepayment: fullAmountInPaymentCurrency })} className="font-bold text-sm cursor-pointer hover:text-green-900 border-b border-dashed border-green-400 ml-1 transition-colors">{fullAmountInPaymentCurrency} {paymentCurrency}</span></div>
          </div>
          
          {totalDiscountUSD > 0 && (<div className="flex justify-between items-center text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-xl border border-green-100"><span>Скидка:</span><span className="text-sm">-{convertPrice(totalDiscountUSD, mainCurrency, settings.exchangeRates)} {mainCurrency}</span></div>)}
          
          <div className="flex justify-between items-end font-bold text-gray-800 py-1">
              <div className="flex flex-col"><span className="text-xs text-gray-500 font-normal">Всего пар: {totalPairsInCart}</span><span className="text-xl">Итого:</span></div>
              <div className="flex items-center gap-2">
                  <span className="text-blue-600 text-lg">{convertPrice(totalCartUSD, mainCurrency, settings.exchangeRates)} {mainCurrency}</span>
                  <button onClick={() => setIsDiscountModalOpen(true)} className="p-1.5 bg-gray-100 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors"><Edit size={16}/></button>
              </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
              <Button onClick={() => setShowInvoice(true)} variant="secondary" className="col-span-1 h-12" icon={Printer}></Button>
              <Button onClick={saveOrder} variant="success" className="col-span-3 text-lg h-12 shadow-md shadow-green-200 hover:shadow-green-300 transform hover:-translate-y-0.5 transition-all font-bold tracking-wide">{editingId ? 'Сохранить' : 'Оформить'}</Button>
          </div>
        </div>
      </div>
      
      <DiscountModal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} onApply={applyDiscount} cart={cart} mainCurrency={mainCurrency} />
      {editingCartIndex !== null && (<Modal title="Редактировать позицию" onClose={() => setEditingCartIndex(null)} footer={<Button onClick={saveEditedItem}>Сохранить</Button>}><div className="space-y-4"><div className="text-center font-bold text-lg mb-4 text-gray-800">{cart[editingCartIndex].sku} / {cart[editingCartIndex].color}</div><div className="bg-gray-50 p-3 rounded-lg border border-gray-100"><Input label={`Скидка на пару (${mainCurrency})`} type="number" value={editingDiscount} onChange={e => setEditingDiscount(e.target.value)} onFocus={(e) => e.target.select()} placeholder="0"/></div><div className="mb-4"><div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Размеры</label><button onClick={() => setSizeQuantities({})} className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"><Eraser size={14}/>Очистить</button></div><div className="flex flex-wrap gap-2">{sizeRange.map(size => (<div key={size} className="flex flex-col items-center"><span className="text-xs text-gray-500 font-medium mb-1">{size}</span><input type="text" inputMode="numeric" className="w-11 h-11 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white shadow-sm text-lg font-bold text-gray-800 placeholder-gray-200" placeholder="0" value={sizeQuantities[size] > 0 ? sizeQuantities[size] : ''} onFocus={(e) => e.target.select()} onChange={e => handleSizeChange(size, e.target.value)} /></div>))}</div></div><div className="grid grid-cols-2 gap-2">{availableBoxSizes.map(boxSize => (<button key={boxSize} onClick={() => addBox(boxSize)} className="bg-white border border-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-1"><Box size={16}/> Ящик {boxSize}</button>))}</div></div></Modal>)}
      {confirmDeleteIndex !== null && (<Modal title="Удаление" onClose={() => setConfirmDeleteIndex(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteIndex(null)}>Отмена</Button><Button variant="danger" onClick={() => deleteFromCart(confirmDeleteIndex)}>Удалить</Button></>}><div className="text-center text-gray-600 py-4">Удалить этот товар?</div></Modal>)}
    </div>
  );
};

export default NewOrderPage;