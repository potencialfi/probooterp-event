import React, { useState, useEffect } from 'react';
import { Settings, Box, RefreshCw } from 'lucide-react';
import { Input, Button } from '../components/UI';
import { API_URL } from '../api';

const SettingsPage = ({ sizeGrid, setSizeGrid, apiCall, triggerToast, settings, setSettings }) => {
  const [activeBoxTab, setActiveBoxTab] = useState('6');
  const [boxTemplates, setBoxTemplates] = useState(settings?.boxTemplates || { 6:{}, 8:{}, 10:{}, 12:{} });
  const [rates, setRates] = useState(settings?.exchangeRates || { usd: 0, eur: 0, isManual: false });

  useEffect(() => {
    if(settings?.boxTemplates) setBoxTemplates(settings.boxTemplates);
    if(settings?.exchangeRates) setRates(settings.exchangeRates);
    else fetchNBU(); 
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

export default SettingsPage;