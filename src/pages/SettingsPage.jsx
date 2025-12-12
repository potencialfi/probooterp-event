import React, { useState, useEffect, useRef } from 'react';
import { Settings, Box, RefreshCw, Briefcase, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { Input, Button } from '../components/UI';
import { API_URL, uploadBrandLogo, IMG_URL } from '../api';
import { formatPhoneNumber } from '../utils'; // Импортируем форматтер

const SettingsPage = ({ sizeGrid, setSizeGrid, apiCall, triggerToast, settings, setSettings, highlightSetting, setHighlightSetting }) => {
  const [activeBoxTab, setActiveBoxTab] = useState('6');
  const [boxTemplates, setBoxTemplates] = useState(settings?.boxTemplates || { 6:{}, 8:{}, 10:{}, 12:{} });
  const [rates, setRates] = useState(settings?.exchangeRates || { usd: 0, eur: 0, isManual: false });
  const [mainCurrency, setMainCurrency] = useState(settings?.mainCurrency || 'USD');
  
  // Brand Settings
  const [brandName, setBrandName] = useState(settings?.brandName || 'SHOE EXPO');
  const [phones, setPhones] = useState(settings?.brandPhones || []);
  const [newPhone, setNewPhone] = useState('');
  const fileInputRef = useRef(null);

  const ratesRef = useRef(null);

  useEffect(() => {
    if(settings) {
        if(settings.boxTemplates) setBoxTemplates(settings.boxTemplates);
        if(settings.exchangeRates) setRates(settings.exchangeRates);
        else fetchNBU(); 
        if(settings.mainCurrency) setMainCurrency(settings.mainCurrency);
        if(settings.brandPhones) setPhones(settings.brandPhones);
        // brandName обновляется отдельно через debounce
    }
  }, [settings]);

  // АВТОСОХРАНЕНИЕ БРЕНДА (Debounce)
  useEffect(() => {
      const timer = setTimeout(() => {
          if (brandName !== settings?.brandName) {
              apiCall('/settings', 'POST', { brandName });
              setSettings(prev => ({ ...prev, brandName }));
          }
      }, 800);
      return () => clearTimeout(timer);
  }, [brandName, settings, setSettings]);

  useEffect(() => {
      if (highlightSetting === 'rates' && ratesRef.current) {
          ratesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          ratesRef.current.classList.add('ring-2', 'ring-green-500', 'bg-green-50');
          setTimeout(() => {
              ratesRef.current.classList.remove('ring-2', 'ring-green-500', 'bg-green-50');
              setHighlightSetting(null);
          }, 2000);
      }
  }, [highlightSetting, setHighlightSetting]);

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

  const saveMainCurrency = async (currency) => {
      setMainCurrency(currency);
      const newSettings = { ...settings, mainCurrency: currency };
      setSettings(newSettings);
      await apiCall('/settings', 'POST', { mainCurrency: currency });
      triggerToast(`Основная валюта: ${currency}`);
  };

  const handleLogoUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
          const fileName = await uploadBrandLogo(file, brandName || 'Brand');
          const newSettings = { ...settings, brandLogo: fileName };
          setSettings(newSettings);
          await apiCall('/settings', 'POST', { brandLogo: fileName });
          triggerToast("Логотип загружен");
      } catch (e) {
          console.error(e);
          triggerToast("Ошибка загрузки логотипа", "error");
      }
  };

  const deleteLogo = async () => {
      const newSettings = { ...settings, brandLogo: null };
      setSettings(newSettings);
      await apiCall('/settings', 'POST', { brandLogo: null });
      triggerToast("Логотип удален");
  };

  const savePhones = async (updatedPhones) => {
      setPhones(updatedPhones);
      setSettings(prev => ({ ...prev, brandPhones: updatedPhones }));
      await apiCall('/settings', 'POST', { brandPhones: updatedPhones });
  };

  const addPhone = () => {
      if(newPhone && phones.length < 3) {
          const updated = [...phones, newPhone];
          savePhones(updated);
          setNewPhone('');
      }
  };

  const removePhone = (idx) => {
      const updated = phones.filter((_, i) => i !== idx);
      savePhones(updated);
  };
  
  // Обработчик изменения телефона с форматированием
  const handlePhoneInput = (e) => {
      const formatted = formatPhoneNumber(e.target.value);
      setNewPhone(formatted);
  };

  const handleRateChange = (curr, val) => {
      const numVal = val === '' ? '' : Number(val);
      const newRates = { ...rates, [curr]: numVal, isManual: true };
      setRates(newRates);
      if (val !== '') {
          saveRates({ ...rates, [curr]: Number(val), isManual: true });
      }
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
  const rangeLength = Math.max(0, maxSize - minSize + 1);
  const sizeRange = (isNaN(minSize) || isNaN(maxSize)) ? [] : Array.from({ length: rangeLength }, (_, i) => minSize + i);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
       <div className="flex justify-between items-start">
           <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Настройки</h2>
           
           <div className="flex gap-4">
               <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2 text-sm">
                    <span className="font-bold text-gray-500">Основная валюта:</span>
                    <select 
                        className="font-bold text-blue-600 bg-transparent outline-none cursor-pointer"
                        value={mainCurrency}
                        onChange={(e) => saveMainCurrency(e.target.value)}
                    >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="UAH">UAH</option>
                    </select>
               </div>

               <div ref={ratesRef} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 text-sm transition-all duration-300">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-500">USD:</span>
                        <input 
                            className="w-16 border rounded px-1 py-0.5 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            type="number" 
                            value={rates.usd} 
                            onFocus={(e) => e.target.select()} 
                            onChange={e=>handleRateChange('usd', e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-500">EUR:</span>
                        <input 
                            className="w-16 border rounded px-1 py-0.5 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            type="number" 
                            value={rates.eur} 
                            onFocus={(e) => e.target.select()} 
                            onChange={e=>handleRateChange('eur', e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="font-bold">Cross:</span>
                        <span>{(rates.eur / rates.usd || 0).toFixed(2)}</span>
                    </div>
                    <button onClick={resetRates} className="text-blue-500 hover:text-blue-700" title="Сбросить к НБУ"><RefreshCw size={14}/></button>
               </div>
           </div>
       </div>

       {/* Настройки Бренда */}
       <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-3 mb-6 text-blue-900 border-b border-gray-100 pb-4">
               <Briefcase size={24} className="text-blue-600"/>
               <h3 className="font-bold text-lg">Настройки Бренда</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-4">
                   <Input label="Название бренда" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Например: SHOE EXPO" />
                   
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Телефоны (макс 3)</label>
                       {phones.map((phone, idx) => (
                           <div key={idx} className="flex gap-2 mb-2">
                               <input className="border rounded-xl px-4 py-2 w-full bg-gray-50" value={phone} readOnly />
                               <button onClick={() => removePhone(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button>
                           </div>
                       ))}
                       {phones.length < 3 && (
                           <div className="flex gap-2">
                               <input 
                                   className="border rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                   placeholder="+380..." 
                                   value={newPhone} 
                                   onChange={handlePhoneInput} // Форматирование на лету
                               />
                               <Button onClick={addPhone} size="compact" icon={Plus}>Добавить</Button>
                           </div>
                       )}
                   </div>
               </div>

               <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Логотип бренда</label>
                   {settings?.brandLogo ? (
                       <div className="relative group">
                           <img src={`${IMG_URL}/${settings.brandLogo}`} alt="Brand Logo" className="h-32 object-contain mb-4" />
                           <button onClick={deleteLogo} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                       </div>
                   ) : (
                       <div className="h-32 w-full flex flex-col items-center justify-center text-gray-400 mb-4">
                           <ImageIcon size={48} className="mb-2 opacity-50"/>
                           <span className="text-sm">Логотип не загружен</span>
                       </div>
                   )}
                   <input 
                       type="file" 
                       ref={fileInputRef} 
                       hidden 
                       accept="image/*" 
                       onChange={handleLogoUpload}
                   />
                   <Button onClick={() => fileInputRef.current.click()} variant="secondary" icon={Upload}>Загрузить лого</Button>
               </div>
           </div>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 text-blue-900 border-b border-gray-100 pb-4"><Settings size={24} className="text-blue-600"/><h3 className="font-bold text-lg">Размерная сетка</h3></div>
              <div className="grid grid-cols-2 gap-6">
                <Input label="Минимальный размер" type="number" value={sizeGrid?.min || ''} onChange={e => updateGrid('min', e.target.value)} onFocus={(e) => e.target.select()} />
                <Input label="Максимальный размер" type="number" value={sizeGrid?.max || ''} onChange={e => updateGrid('max', e.target.value)} onFocus={(e) => e.target.select()} />
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
                           onFocus={(e) => e.target.select()} 
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

export default SettingsPage;