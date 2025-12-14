import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ShoppingCart, User, Phone, MapPin, AlertTriangle, Box, Eraser, Edit, Trash2, CreditCard, CheckSquare, Square, X, Printer } from 'lucide-react';
import { apiCall } from '../api';
import { normalizePhone, formatPhoneNumber, getNoun, convertPrice, convertToUSD } from '../utils';
import { Button, Input, Modal } from '../components/UI';
import InvoicePreview from '../components/InvoicePreview';

// --- DISCOUNT MODAL ---
const DiscountModal = ({ isOpen, onClose, onApply, cart, mainCurrency }) => {
    if (!isOpen) return null;
    const [activeTab, setActiveTab] = useState('lump'); 
    const [lumpVal, setLumpVal] = useState('');
    const [pairVal, setPairVal] = useState('');
    const [selectedItems, setSelectedItems] = useState(cart.map((_, idx) => idx)); 

    const toggleItem = (idx) => { if (selectedItems.includes(idx)) setSelectedItems(selectedItems.filter(i => i !== idx)); else setSelectedItems([...selectedItems, idx]); };
    const toggleAll = () => { if (selectedItems.length === cart.length) setSelectedItems([]); else setSelectedItems(cart.map((_, idx) => idx)); };
    const handleApply = () => { let result = { type: activeTab }; if (activeTab === 'lump') result.value = parseFloat(lumpVal); else if (activeTab === 'pair') { result.value = parseFloat(pairVal); result.indices = selectedItems; } onApply(result); onClose(); };

    return (
        <Modal isOpen={true} onClose={onClose} title="Скидка" footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={handleApply} variant="success">Применить</Button></>}>
            <div className="flex gap-4 border-b border-gray-100 mb-6 pb-2">
                <button onClick={() => setActiveTab('lump')} className={`flex-1 py-3 text-lg font-bold rounded-2xl transition-all ${activeTab === 'lump' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>На весь заказ</button>
                <button onClick={() => setActiveTab('pair')} className={`flex-1 py-3 text-lg font-bold rounded-2xl transition-all ${activeTab === 'pair' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>На пару</button>
            </div>
            {activeTab === 'lump' && <Input label={`Сумма (${mainCurrency})`} type="number" value={lumpVal} onChange={e => setLumpVal(e.target.value)} autoFocus />}
            {activeTab === 'pair' && <div className="space-y-6"><Input label={`Скидка на пару (${mainCurrency})`} type="number" value={pairVal} onChange={e => setPairVal(e.target.value)} autoFocus placeholder="2" />
                <div className="border border-gray-200 rounded-3xl overflow-hidden"><div className="bg-gray-50 p-4 border-b flex items-center gap-3 font-bold text-sm text-gray-500 uppercase"><button onClick={toggleAll} className="hover:text-blue-600">{selectedItems.length === cart.length ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}</button><span>Применить к товарам:</span></div><div className="max-h-60 overflow-auto custom-scrollbar">{cart.map((item, idx) => (<div key={idx} className="p-4 border-b last:border-0 flex items-center gap-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggleItem(idx)}><div className={selectedItems.includes(idx) ? "text-blue-600" : "text-gray-400"}>{selectedItems.includes(idx) ? <CheckSquare size={20}/> : <Square size={20}/>}</div><div className="flex-1 text-base font-bold text-gray-800">{item.sku}</div></div>))}</div></div></div>}
        </Modal>
    );
};

const NewOrderPage = ({ clients, setClients, models, setOrders, orders, triggerToast, settings, orderDraft, setOrderDraft, clearOrderDraft }) => {
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
  const currentGrid = useMemo(() => { if (!currentM) return settings?.sizeGrids?.find(g => g.id === settings?.defaultSizeGridId) || settings?.sizeGrids?.[0]; return settings?.sizeGrids?.find(g => g.id === currentM.gridId) || settings?.sizeGrids?.find(g => g.id === settings?.defaultSizeGridId) || settings?.sizeGrids?.[0]; }, [currentM, settings]);
  const sizeRange = useMemo(() => { if (!currentGrid) return []; const min = parseInt(currentGrid.min), max = parseInt(currentGrid.max); return isNaN(min) ? [] : Array.from({ length: max - min + 1 }, (_, i) => String(min + i)); }, [currentGrid]);
  const currentBoxTemplates = settings?.boxTemplates?.[currentGrid?.id] || {};
  const availableBoxSizes = Object.keys(currentBoxTemplates).sort((a,b) => Number(a) - Number(b));

  const subTotalUSD = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const totalPairDiscountUSD = cart.reduce((acc, i) => acc + ((i.discountPerPair || 0) * i.qty), 0);
  const lumpDiscountUSD = convertToUSD(parseFloat(lumpDiscount) || 0, mainCurrency, settings?.exchangeRates);
  const totalDiscountUSD = totalPairDiscountUSD + lumpDiscountUSD;
  const totalCartUSD = Math.max(0, subTotalUSD - totalDiscountUSD);
  const totalPairsInCart = cart.reduce((acc, i) => acc + i.qty, 0);
  
  const getPaymentRate = (target) => { if (target === 'USD') return 1; const rates = settings?.exchangeRates || {}; if (target === 'UAH') return rates.usd || 1; if (target === 'EUR') return (rates.usd / rates.eur) || 1; return 1; };
  const paymentRate = getPaymentRate(paymentCurrency);
  const fullAmountInPaymentCurrency = (totalCartUSD * paymentRate).toFixed(2);
  const prepaymentInUSD = paymentRate > 0 ? Number(prepayment) / paymentRate : 0;

  const updateDraft = (f) => setOrderDraft(prev => ({ ...prev, ...f }));
  const handlePhoneChange = (e) => { const r = e.target.value; updateDraft({ clientPhone: formatPhoneNumber(r) }); setShowClientList(true); };
  const selectClientSuggestion = (c) => { updateDraft({ clientPhone: c.phone, clientName: c.name, clientCity: c.city, selectedClient: c }); setShowClientList(false); };
  const clearSelectedClient = () => { updateDraft({ selectedClient: null, clientName: '', clientCity: '', clientPhone: '' }); };
  
  const addToCart = () => { 
      const totalQty = Object.values(sizeQuantities).reduce((a, b) => a + b, 0); if (totalQty === 0) return triggerToast("Укажите количество", 'error');
      const note = Object.entries(sizeQuantities).filter(([_, q]) => q > 0).map(([s, q]) => `${s}(${q})`).join(', ');
      updateDraft({ cart: [...cart, { ...currentM, modelId: currentM.id, qty: totalQty, note, sizes: sizeQuantities, discountPerPair: 0, total: currentM.price * totalQty }] });
      setSizeQuantities({}); setSelModel(''); setSearch(''); setShowModelList(false);
  };
  const addBox = (boxSize) => { 
      const t = currentBoxTemplates[boxSize]; if (!t) return triggerToast(`Нет шаблона`, "error"); 
      setSizeQuantities(p => { const n = { ...p }; Object.entries(t).forEach(([s, q]) => { n[s] = (n[s] || 0) + Number(q); }); return n; }); 
      triggerToast(`+ Ящик ${boxSize}`); 
  };
  const saveOrder = async () => {
    if (!clientPhone || !clientName) return triggerToast("Клиент?", 'error'); if (!cart.length) return triggerToast("Пусто", 'error');
    let cid = selectedClient?.id;
    try {
        if (selectedClient) {
            if (selectedClient.name !== clientName || selectedClient.city !== clientCity || selectedClient.phone !== clientPhone) {
                const u = await apiCall(`/clients/${selectedClient.id}`, 'PUT', { name: clientName, city: clientCity, phone: clientPhone });
                setClients(p => p.map(c => c.id === u.id ? u : c)); updateDraft({ selectedClient: u });
            }
        } else {
            const s = await apiCall('/clients', 'POST', { name: clientName, city: clientCity, phone: clientPhone });
            setClients(p => [...p, s]); cid = s.id;
        }
        const d = { date: new Date().toISOString(), clientId: parseInt(cid || selectedClient.id), items: cart, total: totalCartUSD, lumpDiscount: lumpDiscountUSD, payment: { originalAmount: Number(prepayment), originalCurrency: paymentCurrency, rateAtMoment: paymentRate, prepaymentInUSD } };
        if(editingId) { await apiCall(`/orders/${editingId}`, 'PUT', d); setOrders(p => p.map(o=>o.id===editingId?{...o, ...d}:o)); triggerToast("Обновлено"); }
        else { const s = await apiCall('/orders', 'POST', d); setOrders([s, ...orders]); triggerToast("Создано"); }
        clearOrderDraft(); setShowInvoice(false);
    } catch(e) { triggerToast(e.message, 'error'); }
  };
  
  const filteredM = models.filter(m => m.sku.toLowerCase().includes(search.toLowerCase()));
  const filteredClients = useMemo(() => { const s = normalizePhone(clientPhone); return s.length < 2 ? [] : clients.filter(c => normalizePhone(c.phone).includes(s) && c.id !== selectedClient?.id); }, [clients, clientPhone, selectedClient]);

  if (showInvoice) return <InvoicePreview order={{ id: editingId||0, orderId: displayOrderId||0, date: new Date(), client: { name: clientName, city: clientCity, phone: clientPhone }, items: cart, lumpDiscount: lumpDiscountUSD, payment: { originalAmount: prepayment, originalCurrency: paymentCurrency, prepaymentInUSD } }} settings={settings} onBack={() => setShowInvoice(false)} />;

  return (
    <div className="page-container flex-row pb-6"> {/* page-container из index.css */}
      
      {/* ЛЕВАЯ КОЛОНКА */}
      <div className="flex flex-col flex-1 gap-6 min-h-0 overflow-hidden">
        {/* КЛИЕНТ */}
        <div className="ui-card shrink-0 z-30 overflow-visible">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h3 className="section-title mb-0 border-0 pb-0"><User size={22} className="text-blue-600"/> Клиент</h3>
              {selectedClient && <button onClick={clearSelectedClient} className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"><X size={14}/> Сброс</button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            <div className="md:col-span-6 lg:col-span-4 relative">
                <Input label="Телефон" icon={Phone} value={clientPhone} onChange={handlePhoneChange} autoComplete="off" />
                {showClientList && filteredClients.length > 0 && (<div className="absolute z-50 w-full bg-white border border-gray-200 rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto p-2">{filteredClients.map(c => (<div key={c.id} className="p-3 hover:bg-blue-50 cursor-pointer rounded-xl border-b border-gray-50 last:border-0" onClick={() => selectClientSuggestion(c)}><div className="font-bold text-base text-gray-800">{c.phone}</div><div className="text-sm text-gray-500">{c.name} ({c.city})</div></div>))}</div>)}
            </div>
            {!selectedClient && clientPhone.length > 5 && (<div className="md:col-span-12 lg:col-span-12 order-last lg:order-none bg-blue-50 text-blue-700 px-4 py-3 rounded-2xl border border-blue-100 flex items-center gap-3"><AlertTriangle size={20} className="shrink-0"/><span className="text-sm font-bold">Новый клиент</span></div>)}
            <div className="md:col-span-3 lg:col-span-4"><Input label="Имя" icon={User} value={clientName} onChange={e => updateDraft({ clientName: e.target.value })}/></div>
            <div className="md:col-span-3 lg:col-span-4"><Input label="Город" icon={MapPin} value={clientCity} onChange={e => updateDraft({ clientCity: e.target.value })}/></div>
          </div>
        </div>

        {/* ТОВАРЫ */}
        <div className="ui-card flex-1 flex flex-col min-h-0 relative z-10">
          <div className="shrink-0 pb-4 border-b border-gray-100 mb-4 bg-white z-10">
              <h3 className="section-title mb-4 border-0 pb-0"><ShoppingCart size={22} className="text-blue-600"/> Товары</h3>
              <div className="relative"><Search className="absolute left-4 top-3.5 text-gray-400" size={20} /><input className="ui-input pl-12" placeholder="Поиск модели..." value={search} onChange={e => { setSearch(e.target.value); setShowModelList(true); }} onFocus={() => setShowModelList(true)}/>{showModelList && search && (<div className="border border-gray-100 rounded-2xl mt-2 max-h-72 overflow-y-auto bg-white shadow-2xl absolute w-full z-20 custom-scrollbar p-2">{filteredM.map(m => (<div key={m.id} onClick={() => { setSelModel(m.id); setSearch(m.sku); setShowModelList(false); }} className="p-3 hover:bg-blue-50 rounded-xl cursor-pointer flex justify-between items-center text-base mb-1 border-b border-gray-50 last:border-0"><div><span className="font-bold text-gray-800">{m.sku}</span> <span className="text-gray-400 mx-2">|</span> <span className="text-gray-600">{m.color}</span></div><span className="font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">{convertPrice(m.price, mainCurrency, settings.exchangeRates)}</span></div>))}</div>)}</div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {currentM ? (
                  <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100 h-full flex flex-col">
                      <div className="font-bold text-xl text-blue-900 border-b border-blue-200 pb-3 mb-4 flex justify-between items-center"><span>{currentM.sku} / {currentM.color}</span><span className="text-green-600 bg-green-50 px-3 py-1 rounded-lg text-base">{convertPrice(currentM.price, mainCurrency, settings.exchangeRates)} {mainCurrency}</span></div>
                      {!currentGrid ? <div className="text-center p-6 bg-yellow-50 text-yellow-700 rounded-xl font-bold">Нет сетки</div> : (
                          <div className="flex-1">
                              <div className="mb-6"><div className="flex justify-between items-center mb-3"><label className="ui-label">Размеры</label><button onClick={() => setSizeQuantities({})} className="text-gray-400 hover:text-red-500 text-sm flex items-center gap-1 font-bold"><Eraser size={16}/> Сброс</button></div><div className="flex flex-wrap gap-3">{sizeRange.map(size => (<div key={size} className="flex flex-col items-center"><span className="text-xs text-gray-500 font-bold mb-1">{size}</span><input type="number" className="w-12 h-12 bg-white border border-gray-200 rounded-xl text-center font-bold text-xl text-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="0" value={sizeQuantities[size] > 0 ? sizeQuantities[size] : ''} onFocus={(e) => e.target.select()} onChange={e => setSizeQuantities(p => ({...p, [size]: Number(e.target.value)}))} /></div>))}</div></div>
                              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">{availableBoxSizes.length > 0 ? availableBoxSizes.map(bs => (<button key={bs} onClick={() => addBox(bs)} className="bg-white border-2 border-blue-100 text-blue-700 py-3 rounded-2xl text-sm font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2"><Box size={18}/> {bs}</button>)) : <div className="col-span-4 text-center text-sm text-gray-400 p-4 border-2 border-dashed border-gray-200 rounded-xl">Нет шаблонов</div>}</div>
                          </div>
                      )}
                      {/* КНОПКА В ЗАКАЗ - ЗЕЛЕНАЯ */}
                      <div className="flex justify-between items-center pt-4 mt-auto border-t border-blue-200"><div className="text-xl font-bold text-blue-900">{Object.values(sizeQuantities).reduce((a,b)=>a+b,0)} пар</div><Button onClick={addToCart} size="lg" icon={Plus} disabled={!currentGrid} variant="success">В заказ</Button></div>
                  </div>
              ) : <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4"><ShoppingCart size={80} className="opacity-20"/><p className="text-xl font-medium">Выберите модель</p></div>}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА */}
      <div className="w-full lg:w-[32rem] ui-card flex flex-col h-full shrink-0 overflow-hidden">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4 shrink-0"><h3 className="section-title mb-0 border-0 pb-0"><ShoppingCart className="text-blue-600" size={22}/> Корзина</h3>{cart.length > 0 && <button onClick={clearOrderDraft} className="text-sm text-gray-400 hover:text-red-600 flex items-center gap-1 font-bold transition-colors"><Trash2 size={16}/> Очистить</button>}</div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar my-4">
            {cart.map((i, idx) => (
                <div key={idx} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex justify-between group hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all" onClick={() => { setEditingCartIndex(idx); setSizeQuantities(i.sizes); }}>
                    <div><div className="font-bold text-gray-800 text-lg mb-1">{i.sku} <span className="font-normal text-gray-500">({i.color})</span></div><div className="text-base text-gray-600 font-medium">{i.qty} {getNoun(i.qty, 'пара', 'пары', 'пар')}</div>{i.discountPerPair > 0 && <div className="text-xs text-green-600 font-bold bg-green-100 inline-block px-2 py-0.5 rounded-lg mt-1">-{convertPrice(i.discountPerPair, mainCurrency, settings.exchangeRates)} /пара</div>}</div>
                    <div className="text-right flex flex-col justify-between items-end"><div className="font-bold text-gray-800 text-xl">{convertPrice(i.total, mainCurrency, settings.exchangeRates)}</div><button onClick={(e) => {e.stopPropagation(); updateDraft({ cart: cart.filter((_, x) => x !== idx) })}} className="text-red-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20}/></button></div>
                </div>
            ))}
            {cart.length === 0 && <div className="text-center text-gray-400 py-20 text-lg font-medium">Корзина пуста</div>}
        </div>
        <div className="border-t border-gray-100 pt-6 shrink-0 space-y-4">
          <div className="bg-green-50 p-5 rounded-3xl border border-green-100">
              <div className="flex justify-between items-center mb-3"><span className="text-sm font-bold text-green-800 uppercase tracking-wide flex items-center gap-2"><CreditCard size={16}/> Оплата</span><span onClick={() => updateDraft({ prepayment: fullAmountInPaymentCurrency })} className="text-sm font-bold text-green-700 cursor-pointer hover:underline decoration-dashed">Вся сумма: {fullAmountInPaymentCurrency}</span></div>
              <div className="flex gap-3"><div className="relative w-full"><input type="number" placeholder="0" value={prepayment} onChange={e => updateDraft({ prepayment: e.target.value })} className="w-full h-12 rounded-xl px-4 font-bold text-xl text-green-900 bg-white border border-green-200 focus:border-green-500 outline-none" /></div><select className="h-12 border border-green-200 rounded-xl px-3 bg-white font-bold text-green-800 text-base cursor-pointer outline-none" value={paymentCurrency} onChange={e => updateDraft({ paymentCurrency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option><option value="UAH">UAH</option></select></div>
              {paymentRate !== 1 && <div className="text-right text-xs text-green-600 mt-2 font-medium">Курс пересчета: {paymentRate.toFixed(2)}</div>}
          </div>
          <div className="flex justify-between items-end font-bold text-gray-800 py-1"><div className="flex flex-col"><span className="text-xs text-gray-500 uppercase tracking-wide">Итого к оплате</span><span className="text-4xl text-blue-600 leading-none">{convertPrice(totalCartUSD, mainCurrency, settings.exchangeRates)} <span className="text-xl text-blue-400">{mainCurrency}</span></span></div><div className="flex flex-col items-end">{totalDiscountUSD > 0 && <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg mb-2 font-bold">Скидка: -{convertPrice(totalDiscountUSD, mainCurrency, settings.exchangeRates)}</span>}<button onClick={() => setIsDiscountModalOpen(true)} className="p-2 bg-gray-100 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-colors"><Edit size={22}/></button></div></div>
          {/* КНОПКА ОФОРМИТЬ - ЗЕЛЕНАЯ */}
          <div className="grid grid-cols-4 gap-3"><Button onClick={() => setShowInvoice(true)} variant="secondary" className="col-span-1 h-14" icon={Printer}></Button><Button onClick={saveOrder} variant="success" className="col-span-3 h-14 text-xl">{editingId ? 'Сохранить изменения' : 'Оформить заказ'}</Button></div>
        </div>
      </div>
      
      <DiscountModal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} onApply={f => { if(f.type==='lump') updateDraft({lumpDiscount:f.value}); else { const d = convertToUSD(f.value||0,mainCurrency,settings.exchangeRates); updateDraft({cart:cart.map((i,x)=>f.indices.includes(x)?{...i, discountPerPair:d, total:(i.price-d)*i.qty}:i)}); } }} cart={cart} mainCurrency={mainCurrency} />
      {editingCartIndex !== null && <Modal title="Изменить количество" isOpen={true} onClose={()=>setEditingCartIndex(null)} footer={<Button onClick={()=>{ const q = Object.values(sizeQuantities).reduce((a,b)=>a+b,0); const n = Object.entries(sizeQuantities).filter(([_,v])=>v>0).map(([s,v])=>`${s}(${v})`).join(', '); updateDraft({ cart: cart.map((x,i)=>i===editingCartIndex?{...x,qty:q,sizes:sizeQuantities,note:n,total:(x.price-(x.discountPerPair||0))*q}:x) }); setEditingCartIndex(null); }} variant="success">Сохранить</Button>}>...</Modal>}
      {confirmDeleteIndex !== null && (<Modal title="Удаление" onClose={() => setConfirmDeleteIndex(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteIndex(null)}>Отмена</Button><Button variant="danger" onClick={() => deleteFromCart(confirmDeleteIndex)}>Удалить</Button></>}><div className="text-center text-xl text-gray-600 py-8">Удалить этот товар из корзины?</div></Modal>)}
    </div>
  );
};
export default NewOrderPage;