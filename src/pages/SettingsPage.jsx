import React, { useState, useEffect, useRef } from 'react';
import { Settings, Ruler, Box, DollarSign, Briefcase, Plus, Trash2, Upload, CheckSquare, Square, Image as ImageIcon, RefreshCw, AlertTriangle, X, Globe, Phone } from 'lucide-react';
import { Input, Button, Modal, Select } from '../components/UI';
import { apiCall, uploadBrandLogo, IMG_URL } from '../api';
import { formatPhoneNumber } from '../utils';

const SettingsPage = ({ apiCall, triggerToast, settings, setSettings, highlightSetting, setHighlightSetting, loadAllData }) => {
  const [activeBoxTab, setActiveBoxTab] = useState(null); 
  const [grids, setGrids] = useState(settings.sizeGrids || []);
  const [activeGridId, setActiveGridId] = useState(settings.defaultSizeGridId || 1);
  const [boxTemplates, setBoxTemplates] = useState(settings.boxTemplates || {});
  
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [newGridData, setNewGridData] = useState({ name: '', min: '', max: '' });
  const [isDeleteGridModalOpen, setIsDeleteGridModalOpen] = useState(false);
  const [gridToDelete, setGridToDelete] = useState(null);
  
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [newBoxSize, setNewBoxSize] = useState('');
  const [isDeleteBoxModalOpen, setIsDeleteBoxModalOpen] = useState(false);
  const [boxToDelete, setBoxToDelete] = useState(null);
  
  const [isDeletePhoneModalOpen, setIsDeletePhoneModalOpen] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState(null);

  const [rates, setRates] = useState(settings.exchangeRates || { usd: 0, eur: 0, isManual: false });
  const [mainCurrency, setMainCurrency] = useState(settings.mainCurrency || 'USD');
  const [brandName, setBrandName] = useState(settings.brandName || '');
  const [phones, setPhones] = useState(settings.brandPhones || []);
  const [newPhone, setNewPhone] = useState('');
  const [language, setLanguage] = useState('ru');

  const fileInputRef = useRef(null);
  const ratesRef = useRef(null);

  useEffect(() => {
     setGrids(settings.sizeGrids || []);
     setBoxTemplates(settings.boxTemplates || {});
     setRates(settings.exchangeRates || {});
     setMainCurrency(settings.mainCurrency || 'USD');
     setBrandName(settings.brandName || '');
     setPhones(settings.brandPhones || []);
     if (settings.sizeGrids && !settings.sizeGrids.find(g => g.id === activeGridId)) {
         setActiveGridId(settings.defaultSizeGridId || (settings.sizeGrids[0]?.id));
     }
  }, [settings]);

  useEffect(() => {
      if (highlightSetting === 'rates' && ratesRef.current) {
          ratesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          ratesRef.current.classList.add('ring-4', 'ring-green-400', 'bg-green-50', 'transition-all', 'duration-500');
          setTimeout(() => {
              ratesRef.current.classList.remove('ring-4', 'ring-green-400', 'bg-green-50');
              setHighlightSetting(null);
          }, 2500);
      }
  }, [highlightSetting, setHighlightSetting]);

  const saveAll = async (updates) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      try {
          await apiCall('/settings', 'POST', newSettings);
          if (updates.mainCurrency && loadAllData) await loadAllData();
          triggerToast("Сохранено");
      } catch(e) { triggerToast("Ошибка", "error"); }
  };

  const handleRateChange = (curr, val) => {
      const newRates = { ...rates, [curr]: Number(val), isManual: true };
      setRates(newRates);
      if (val !== '') saveAll({ exchangeRates: newRates });
  };
  const fetchNBU = async () => {
    try {
        const res = await fetch(`http://localhost:3001/api/nbu-rates`);
        const data = await res.json();
        const newRates = { usd: Number(data.usd.toFixed(2)), eur: Number(data.eur.toFixed(2)), isManual: false };
        setRates(newRates);
        saveAll({ exchangeRates: newRates });
        triggerToast("Курсы обновлены из НБУ");
    } catch (e) { triggerToast("Ошибка НБУ", "error"); }
  };
  const crossRate = (rates.usd > 0 && rates.eur > 0) ? (rates.eur / rates.usd).toFixed(3) : '-';

  const handleAddGrid = () => {
      if(!newGridData.name || !newGridData.min || !newGridData.max) return;
      if(grids.length >= 5) return triggerToast("Максимум 5 сеток", "error");
      const newId = grids.length > 0 ? Math.max(...grids.map(g=>g.id || 0))+1 : 1;
      const isFirst = grids.length === 0;
      const newGrid = { id: newId, ...newGridData, isDefault: isFirst };
      const newGrids = [...grids, newGrid];
      const newTemplates = { ...boxTemplates, [newId]: {} };
      saveAll({ sizeGrids: newGrids, boxTemplates: newTemplates, defaultSizeGridId: isFirst ? newId : settings.defaultSizeGridId });
      setNewGridData({ name: '', min: '', max: '' });
      setIsGridModalOpen(false);
      setActiveGridId(newId);
  };
  const confirmDeleteGrid = (id) => { if(grids.length <= 1) return triggerToast("Нельзя удалить последнюю сетку", "error"); setGridToDelete(id); setIsDeleteGridModalOpen(true); };
  const performDeleteGrid = () => {
      const newGrids = grids.filter(g => g.id !== gridToDelete);
      let newDef = settings.defaultSizeGridId;
      if (gridToDelete === newDef) { newDef = newGrids[0].id; newGrids[0].isDefault = true; }
      if (gridToDelete === activeGridId) setActiveGridId(newDef);
      const newTemplates = { ...boxTemplates };
      delete newTemplates[gridToDelete];
      saveAll({ sizeGrids: newGrids, defaultSizeGridId: newDef, boxTemplates: newTemplates });
      setIsDeleteGridModalOpen(false);
      setGridToDelete(null);
      triggerToast("Сетка удалена");
  };
  const handleSetDefault = (id, e) => { e.stopPropagation(); const newGrids = grids.map(g => ({ ...g, isDefault: g.id === id })); setGrids(newGrids); saveAll({ sizeGrids: newGrids, defaultSizeGridId: id }); };
  
  const handleAddBox = () => {
      if (!newBoxSize) return;
      const sizeKey = String(newBoxSize);
      const currentTemplates = boxTemplates[activeGridId] || {};
      if (Object.keys(currentTemplates).length >= 6) return triggerToast("Максимум 6 типов ящиков", "error");
      if (currentTemplates[sizeKey]) return triggerToast("Такой ящик уже есть", "error");
      const newTemplates = { ...boxTemplates };
      if(!newTemplates[activeGridId]) newTemplates[activeGridId] = {};
      newTemplates[activeGridId][sizeKey] = {}; 
      saveAll({ boxTemplates: newTemplates });
      setBoxTemplates(newTemplates);
      setActiveBoxTab(sizeKey);
      setIsAddBoxModalOpen(false);
      setNewBoxSize('');
  };
  const confirmDeleteBox = (e, boxSize) => { e.stopPropagation(); setBoxToDelete(boxSize); setIsDeleteBoxModalOpen(true); };
  const performDeleteBox = () => {
      const newTemplates = { ...boxTemplates };
      if (newTemplates[activeGridId]) { delete newTemplates[activeGridId][boxToDelete]; saveAll({ boxTemplates: newTemplates }); setBoxTemplates(newTemplates); if (activeBoxTab === boxToDelete) setActiveBoxTab(null); }
      setIsDeleteBoxModalOpen(false); setBoxToDelete(null); triggerToast("Ящик удален");
  };
  const handleUpdateBoxContent = (size, val) => {
      if (!activeBoxTab) return;
      const t = { ...boxTemplates };
      if(!t[activeGridId]) t[activeGridId] = {};
      if(!t[activeGridId][activeBoxTab]) t[activeGridId][activeBoxTab] = {};
      const numVal = Number(val);
      if (numVal > 0) t[activeGridId][activeBoxTab][size] = numVal; else delete t[activeGridId][activeBoxTab][size];
      saveAll({ boxTemplates: t });
  };
  const handleLogoUpload = async (e) => { if(!e.target.files[0]) return; const f = await uploadBrandLogo(e.target.files[0], brandName); saveAll({ brandLogo: f }); };
  const addPhone = () => { if(newPhone && phones.length < 3) { const p = [...phones, newPhone]; setPhones(p); setNewPhone(''); saveAll({ brandPhones: p }); } };
  const confirmDeletePhone = (phone) => { setPhoneToDelete(phone); setIsDeletePhoneModalOpen(true); };
  const performDeletePhone = () => { const n = phones.filter(p => p !== phoneToDelete); setPhones(n); saveAll({ brandPhones: n }); setIsDeletePhoneModalOpen(false); setPhoneToDelete(null); triggerToast("Номер удален"); };

  const currentGrid = grids.find(g => g.id === parseInt(activeGridId)) || grids[0];
  const sizeRange = currentGrid ? Array.from({ length: parseInt(currentGrid.max) - parseInt(currentGrid.min) + 1 }, (_, i) => parseInt(currentGrid.min) + i) : [];
  const availableBoxes = currentGrid ? Object.keys(boxTemplates[activeGridId] || {}).sort((a,b)=>Number(a)-Number(b)) : [];
  
  useEffect(() => {
      if (availableBoxes.length > 0) {
          if (!availableBoxes.includes(activeBoxTab)) setActiveBoxTab(availableBoxes[0]);
      } else { setActiveBoxTab(null); }
  }, [activeGridId, boxTemplates]);

  const currentTotal = (currentGrid && activeBoxTab) ? Object.values(boxTemplates[activeGridId]?.[activeBoxTab] || {}).reduce((a,b)=>a+b,0) : 0;
  const isBoxConfigValid = activeBoxTab && currentTotal === parseInt(activeBoxTab);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <h2 className="text-3xl font-bold text-gray-800">Настройки</h2>
           <div className="flex gap-4 w-full md:w-auto">
               <div className="bg-white px-4 py-3 rounded-2xl border flex items-center gap-3 shadow-sm flex-1 md:flex-none">
                   <span className="font-bold text-gray-500 uppercase text-xs tracking-wide whitespace-nowrap">Основная валюта</span>
                   <select className="font-bold text-blue-600 bg-transparent outline-none cursor-pointer text-lg" value={mainCurrency} onChange={e=>saveAll({mainCurrency:e.target.value})}><option value="USD">USD</option><option value="EUR">EUR</option><option value="UAH">UAH</option></select>
               </div>
               <div ref={ratesRef} className="bg-white px-4 py-3 rounded-2xl border flex items-center gap-4 md:gap-6 shadow-sm flex-1 md:flex-none justify-between md:justify-start">
                   <div className="flex items-center gap-2"><span className="font-bold text-gray-500">USD</span><input className="w-16 md:w-20 border rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none p-1" type="number" value={rates.usd} onFocus={(e) => e.target.select()} onChange={e=>handleRateChange('usd', e.target.value)}/></div>
                   <div className="flex items-center gap-2"><span className="font-bold text-gray-500">EUR</span><input className="w-16 md:w-20 border rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none p-1" type="number" value={rates.eur} onFocus={(e) => e.target.select()} onChange={e=>handleRateChange('eur', e.target.value)}/></div>
                   <div className="hidden md:flex flex-col text-xs text-gray-400 leading-tight border-l pl-3"><span>Кросс-курс</span><span className="font-bold text-gray-700 text-sm">{crossRate}</span></div>
                   <button onClick={fetchNBU} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-lg transition-colors" title="Сбросить к НБУ"><RefreshCw size={18}/></button>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
               <div className="flex items-center gap-3 border-b pb-4 mb-4"><Globe size={24} className="text-blue-600"/><h3 className="font-bold text-xl text-gray-800">Язык интерфейса</h3></div>
               <div className="space-y-2">{['ru', 'ua', 'en'].map(lang => (<button key={lang} onClick={()=>setLanguage(lang)} className={`w-full flex items-center justify-between p-3 rounded-xl border ${language===lang ? 'bg-blue-50 border-blue-500 text-blue-800' : 'border-gray-200 hover:bg-gray-50'}`}><span className="font-bold">{lang === 'ru' ? 'Русский' : lang === 'ua' ? 'Українська' : 'English'}</span> {language===lang && <CheckSquare size={16}/>}</button>))}</div>
           </div>
           <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-10 items-start">
               <div className="flex-1 space-y-6 w-full">
                   <div className="flex items-center gap-3 border-b pb-4"><Briefcase size={24} className="text-blue-600"/><h3 className="font-bold text-xl">Брендинг</h3></div>
                   <Input label="Название бренда" value={brandName} onChange={e=>{setBrandName(e.target.value); saveAll({brandName:e.target.value})}} className="text-lg" />
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Контактные телефоны</label>
                       <div className="space-y-2">{phones.map((p,i)=>(<div key={i} className="flex justify-between items-center text-base bg-gray-50 p-3 rounded-xl border border-gray-200 font-medium text-gray-700"><span>{formatPhoneNumber(p)}</span> <button onClick={() => confirmDeletePhone(p)} className="text-gray-400 hover:text-red-500 bg-white p-1 rounded-lg border border-gray-200 shadow-sm transition-colors"><Trash2 size={18}/></button></div>))}</div>
                       {phones.length < 3 && <div className="flex gap-2 mt-3"><Input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="+380..." className="flex-1" /><Button onClick={addPhone} icon={Plus}>Добавить</Button></div>}
                   </div>
               </div>
               <div className="w-full md:w-64 flex flex-col items-center md:items-start">
                   <label className="text-xs font-bold text-gray-500 uppercase mb-2 block w-full text-left">Логотип</label>
                   <div className="w-full aspect-video border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-all group" onClick={()=>fileInputRef.current.click()}>{settings.brandLogo ? <img src={`${IMG_URL}/${settings.brandLogo}`} className="h-24 object-contain mb-2" onError={(e)=>e.target.style.display='none'}/> : <ImageIcon size={40} className="text-gray-300 group-hover:text-blue-400 transition-colors mb-2"/>}<span className="text-sm text-gray-500 group-hover:text-blue-500 font-medium">Нажмите для загрузки</span><input type="file" ref={fileInputRef} hidden onChange={handleLogoUpload}/></div>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
               <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl flex items-center gap-2 text-gray-800"><Ruler className="text-blue-600"/> Размерные сетки</h3><button onClick={() => setIsGridModalOpen(true)} className="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-100 transition-colors" disabled={grids.length >= 5}><Plus size={20}/></button></div>
               <div className="space-y-3 flex-1">{grids.map(g => (<div key={g.id} onClick={() => setActiveGridId(g.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative group ${activeGridId === g.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200'}`}><div className="flex justify-between items-start"><div><div className="font-bold text-lg text-gray-800">{g.name}</div><div className="text-sm text-gray-500 font-medium mt-1 bg-white inline-block px-2 py-0.5 rounded border border-gray-200 shadow-sm">{g.min} — {g.max}</div></div><div className="flex items-center gap-2">{g.isDefault ? (<span className="text-[10px] uppercase font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">По умолчанию</span>) : (<button onClick={(e) => handleSetDefault(g.id, e)} className="opacity-0 group-hover:opacity-100 text-xs bg-gray-200 hover:bg-green-100 hover:text-green-700 px-2 py-1 rounded transition-all">Сделать главной</button>)}<button onClick={(e) => { e.stopPropagation(); confirmDeleteGrid(g.id); }} className="text-gray-300 hover:text-red-500 p-1 transition-colors" disabled={grids.length <= 1}><Trash2 size={18}/></button></div></div></div>))}</div>
           </div>
           <div className="xl:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
               {currentGrid ? (
                   <>
                   <div className="flex justify-between items-center mb-8">
                       <div><h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><Box className="text-blue-600"/> Типы ящиков</h3><p className="text-gray-400 text-sm mt-1">Выберите ящик для настройки (сетка: <b>{currentGrid.name}</b>)</p></div>
                   </div>
                   
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-8">
                       {availableBoxes.map(s => (
                           <div key={s} onClick={()=>setActiveBoxTab(s)} className={`relative h-28 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md ${activeBoxTab===s ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-200 bg-white'}`}>
                               <span className="text-4xl font-bold text-gray-800 mb-1">{s}</span><span className="text-xs text-gray-500 font-bold uppercase tracking-wider">пар</span>
                               <button onClick={(e) => confirmDeleteBox(e, s)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                           </div>
                       ))}
                       {availableBoxes.length < 6 && (<button onClick={() => setIsAddBoxModalOpen(true)} className="h-28 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 flex flex-col items-center justify-center text-blue-500 hover:bg-blue-50 hover:border-blue-400 transition-all"><Plus size={32}/><span className="text-xs font-bold mt-2 uppercase tracking-wide">Добавить тип</span></button>)}
                   </div>
                   
                   {activeBoxTab ? (
                       <div className="animate-slide-up bg-gray-50 rounded-2xl p-6 border border-gray-100">
                           <div className="flex justify-between items-center mb-6">
                               <h4 className="font-bold text-lg text-gray-700">Комплектация ящика на {activeBoxTab} пар</h4>
                               <div className={`text-sm font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isBoxConfigValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>{isBoxConfigValid ? <CheckSquare size={16}/> : <AlertTriangle size={16}/>}Собрано: {currentTotal} из {activeBoxTab}</div>
                           </div>
                           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">{sizeRange.map(s => { const val = boxTemplates[activeGridId]?.[activeBoxTab]?.[s] || 0; return (<div key={s} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${val > 0 ? 'border-blue-400 ring-2 ring-blue-100 bg-white' : 'border-gray-200 bg-gray-100/50'}`}><span className="text-gray-400 text-xs font-bold uppercase mb-1">Размер {s}</span><input type="number" min="0" className={`w-10 h-10 text-center text-lg font-bold bg-white rounded-lg outline-none border transition-colors ${val > 0 ? 'border-blue-400 text-blue-700' : 'border-gray-200 text-gray-300 focus:border-blue-400 focus:text-gray-800'}`} value={val || ''} onChange={e => handleUpdateBoxContent(s, e.target.value)} placeholder="0" onFocus={(e) => e.target.select()}/></div>)})}</div>
                       </div>
                   ) : (<div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">Выберите ящик выше, чтобы настроить его состав</div>)}
                   </>
               ) : <div className="text-center text-gray-400 py-10">Нет сеток</div>}
           </div>
       </div>

       <Modal title="Новая размерная сетка" isOpen={isGridModalOpen} onClose={()=>setIsGridModalOpen(false)} footer={<Button onClick={handleAddGrid}>Создать</Button>}><div className="space-y-5"><Input label="Название сетки" value={newGridData.name} onChange={e=>setNewGridData({...newGridData, name:e.target.value})} placeholder="Например: Подростковая" autoFocus/><div className="grid grid-cols-2 gap-4"><Input label="Минимальный размер" type="number" value={newGridData.min} onChange={e=>setNewGridData({...newGridData, min:e.target.value})} placeholder="36"/><Input label="Максимальный размер" type="number" value={newGridData.max} onChange={e=>setNewGridData({...newGridData, max:e.target.value})} placeholder="41"/></div></div></Modal>
       <Modal title="Удалить сетку?" isOpen={isDeleteGridModalOpen} onClose={()=>setIsDeleteGridModalOpen(false)} footer={<><Button variant="secondary" onClick={()=>setIsDeleteGridModalOpen(false)}>Отмена</Button><Button variant="danger" onClick={performDeleteGrid}>Удалить</Button></>}><div className="text-center text-gray-600 py-4">Вы действительно хотите удалить эту сетку?<br/>Это действие нельзя отменить.</div></Modal>
       <Modal title="Удалить ящик?" isOpen={isDeleteBoxModalOpen} onClose={()=>setIsDeleteBoxModalOpen(false)} footer={<><Button variant="secondary" onClick={()=>setIsDeleteBoxModalOpen(false)}>Отмена</Button><Button variant="danger" onClick={performDeleteBox}>Удалить</Button></>}><div className="text-center text-gray-600 py-4">Удалить тип ящика на <b>{boxToDelete}</b> пар?</div></Modal>
       <Modal title="Удалить телефон?" isOpen={isDeletePhoneModalOpen} onClose={()=>setIsDeletePhoneModalOpen(false)} footer={<><Button variant="secondary" onClick={()=>setIsDeletePhoneModalOpen(false)}>Отмена</Button><Button variant="danger" onClick={performDeletePhone}>Удалить</Button></>}><div className="text-center text-gray-600 py-4">Удалить номер <b>{phoneToDelete}</b>?</div></Modal>
       <Modal title="Новый тип ящика" isOpen={isAddBoxModalOpen} onClose={()=>setIsAddBoxModalOpen(false)} footer={<Button onClick={handleAddBox}>Добавить</Button>}><div className="py-2"><Input label="Количество пар в ящике" type="number" value={newBoxSize} onChange={e=>setNewBoxSize(e.target.value)} autoFocus placeholder="Например: 15"/><p className="text-xs text-gray-500 mt-2">После добавления вы сможете настроить состав размеров.</p></div></Modal>
    </div>
  );
};

export default SettingsPage;