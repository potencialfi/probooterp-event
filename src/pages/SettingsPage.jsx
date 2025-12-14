import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Ruler, Box, DollarSign, Phone, Image, Save, Plus, Trash2, Edit, CheckSquare, Square, Upload } from 'lucide-react';
import { Button, Input, Select, Modal } from '../components/UI';
import { apiCall, uploadBrandLogo } from '../api';

// --- Менеджер Размерных Сеток и Ящиков ---
const SizeGridManager = ({ settings, setSettings, apiCall, triggerToast }) => {
    const [grids, setGrids] = useState(settings.sizeGrids || []);
    const [boxTemplates, setBoxTemplates] = useState(settings.boxTemplates || {});
    const [selectedGridId, setSelectedGridId] = useState(settings.defaultSizeGridId || (grids[0] ? grids[0].id : null));
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGridName, setNewGridName] = useState('');
    const [newGridMin, setNewGridMin] = useState('');
    const [newGridMax, setNewGridMax] = useState('');
    
    const [editingBoxGridId, setEditingBoxGridId] = useState(null);
    const [editingBoxSize, setEditingBoxSize] = useState(null);
    const [currentBoxConfig, setCurrentBoxConfig] = useState({});

    // Обновляем локальные стейты при изменении глобальных настроек
    useEffect(() => {
        setGrids(settings.sizeGrids || []);
        setBoxTemplates(settings.boxTemplates || {});
        // Устанавливаем выбранную сетку на дефолтную, если она не выбрана
        setSelectedGridId(settings.defaultSizeGridId || (settings.sizeGrids?.[0]?.id || null));
    }, [settings]);

    const currentGrid = grids.find(g => g.id === selectedGridId);
    
    const availableBoxSizes = [6, 8, 10, 12];
    const currentGridTemplates = boxTemplates[selectedGridId] || {};

    const handleSaveSettings = async (updates) => {
        try {
            const updatedSettings = { ...settings, ...updates };
            const saved = await apiCall('/settings', 'POST', updatedSettings);
            setSettings(saved.settings);
            triggerToast("Настройки успешно сохранены");
        } catch (e) {
            triggerToast("Ошибка сохранения настроек", "error");
        }
    };
    
    // --- Логика Управления Сетками ---

    const handleAddGrid = () => {
        if (!newGridName || !newGridMin || !newGridMax) {
            triggerToast("Заполните все поля", "error");
            return;
        }
        if (parseInt(newGridMin) >= parseInt(newGridMax)) {
             triggerToast("Мин. размер должен быть меньше макс. размера", "error");
             return;
        }
        if (grids.length >= 5) {
             triggerToast("Достигнут лимит (5) размерных сеток", "error");
             return;
        }
        
        const newId = grids.length > 0 ? Math.max(...grids.map(g => g.id)) + 1 : 1;
        
        const newGrid = {
            id: newId,
            name: newGridName,
            min: newGridMin,
            max: newGridMax,
            isDefault: grids.length === 0
        };
        
        const newGrids = [...grids, newGrid];
        const newDefaultId = grids.length === 0 ? newId : settings.defaultSizeGridId;
        
        const newBoxTemplates = { ...boxTemplates, [newId]: {} };
        setBoxTemplates(newBoxTemplates);
        
        handleSaveSettings({ 
            sizeGrids: newGrids, 
            defaultSizeGridId: newDefaultId,
            boxTemplates: newBoxTemplates
        });

        setIsModalOpen(false);
        setNewGridName('');
        setNewGridMin('');
        setNewGridMax('');
        setSelectedGridId(newId);
    };

    const handleDeleteGrid = (idToDelete) => {
        if (grids.length <= 1) {
            triggerToast("Нельзя удалить последнюю размерную сетку", "error");
            return;
        }
        
        const newGrids = grids.filter(g => g.id !== idToDelete);
        let newDefaultId = settings.defaultSizeGridId;
        
        if (idToDelete === newDefaultId) {
            newDefaultId = newGrids[0].id;
        }
        
        const newBoxTemplates = { ...boxTemplates };
        delete newBoxTemplates[idToDelete];
        setBoxTemplates(newBoxTemplates);

        handleSaveSettings({ 
            sizeGrids: newGrids, 
            defaultSizeGridId: newDefaultId,
            boxTemplates: newBoxTemplates
        });
    };

    const handleSetDefault = (id) => {
        if (id === settings.defaultSizeGridId) return;
        const newGrids = grids.map(g => ({ ...g, isDefault: g.id === id }));
        setGrids(newGrids);
        handleSaveSettings({ 
            sizeGrids: newGrids, 
            defaultSizeGridId: id 
        });
    };

    // --- Логика Редактирования Ящиков ---

    const openBoxEditModal = (gridId, boxSize) => {
        const grid = grids.find(g => g.id === gridId);
        if (!grid) return;

        setEditingBoxGridId(gridId);
        setEditingBoxSize(boxSize);
        
        const template = boxTemplates[gridId]?.[boxSize] || {};
        
        const min = parseInt(grid.min);
        const max = parseInt(grid.max);
        let config = {};
        for(let i = min; i <= max; i++) {
            config[i] = template[i] || 0;
        }
        setCurrentBoxConfig(config);
    };

    const handleSaveBoxConfig = () => {
        const totalQty = Object.values(currentBoxConfig).reduce((a, b) => a + b, 0);
        
        if (totalQty === 0) {
            triggerToast("Ящик не может быть пустым", "error");
            return;
        }
        if (totalQty !== editingBoxSize) {
             triggerToast(`Сумма пар (${totalQty}) не совпадает с размером ящика (${editingBoxSize})`, "error");
             return;
        }

        const newTemplates = { ...boxTemplates };
        if (!newTemplates[editingBoxGridId]) newTemplates[editingBoxGridId] = {};
        
        const cleanConfig = Object.fromEntries(
            Object.entries(currentBoxConfig).filter(([_, qty]) => qty > 0)
        );

        newTemplates[editingBoxGridId][editingBoxSize] = cleanConfig;
        
        setBoxTemplates(newTemplates);
        handleSaveSettings({ boxTemplates: newTemplates });
        setEditingBoxGridId(null);
        setEditingBoxSize(null);
    };
    
    // --- РЕНДЕР МОДАЛЬНОГО ОКНА РЕДАКТИРОВАНИЯ ЯЩИКА ---
    if (editingBoxGridId !== null && currentGrid) {
        const editingGrid = grids.find(g => g.id === editingBoxGridId);
        const min = parseInt(editingGrid.min);
        const max = parseInt(editingGrid.max);
        const range = Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
        const totalQty = Object.values(currentBoxConfig).reduce((a, b) => a + b, 0);

        return (
            <div className="animate-fade-in space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Редактирование комплектации ящика</h2>
                <h3 className="text-xl text-blue-600">Сетка: {editingGrid.name} / Ящик: {editingBoxSize} пар</h3>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Размеры ({min}-{max})</label>
                        <div className="flex flex-wrap gap-2">
                            {range.map(size => (
                                <div key={size} className="flex flex-col items-center">
                                    <span className="text-xs text-gray-500 font-medium mb-1">{size}</span>
                                    <input 
                                        type="number" 
                                        inputMode="numeric" 
                                        min="0"
                                        className="w-12 h-12 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-lg font-bold text-gray-700" 
                                        value={currentBoxConfig[size] || ''} 
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setCurrentBoxConfig(prev => ({ ...prev, [size]: parseInt(e.target.value) || 0 }))} 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-t pt-4 mt-4">
                         <div className="font-bold text-lg">
                             Всего пар в ящике: <span className="text-blue-600">{totalQty}</span>
                         </div>
                         <div className="flex gap-2">
                             <Button onClick={() => { setEditingBoxGridId(null); setEditingBoxSize(null); }} variant="secondary">Отмена</Button>
                             <Button onClick={handleSaveBoxConfig} disabled={totalQty === 0 || totalQty !== editingBoxSize} icon={Save} title={totalQty !== editingBoxSize ? `Сумма не равна ${editingBoxSize} парам` : 'Сохранить'}>
                                 Сохранить
                             </Button>
                         </div>
                    </div>
                    {totalQty !== editingBoxSize && <p className="mt-3 text-red-500 text-sm">Сумма пар ({totalQty}) должна совпадать с размером ящика ({editingBoxSize}).</p>}
                </div>
            </div>
        );
    }
    
    // --- ОСНОВНОЙ РЕНДЕР МЕНЕДЖЕРА СЕТОК ---
    return (
        <div className="animate-fade-in space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Размерные сетки и комплектация</h2>
            
            {/* 1. Управление сетками */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex justify-between items-center border-b pb-3 mb-3">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><Ruler size={20}/> Размерные сетки (Макс. 5)</h3>
                    <Button onClick={() => setIsModalOpen(true)} disabled={grids.length >= 5} icon={Plus}>Добавить сетку</Button>
                </div>
                
                <div className="space-y-3">
                    {grids.map(grid => (
                        <div key={grid.id} className={`flex justify-between items-center p-3 rounded-lg border transition-colors ${grid.id === selectedGridId ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleSetDefault(grid.id)} title="Сделать по умолчанию" className={`p-1 rounded transition-colors disabled:opacity-50`} disabled={grid.isDefault}>
                                    {grid.isDefault ? <CheckSquare size={20} className="text-green-600"/> : <Square size={20} className="text-gray-400 hover:text-blue-500"/>}
                                </button>
                                <div onClick={() => setSelectedGridId(grid.id)} className="cursor-pointer">
                                    <div className="font-bold text-gray-800">{grid.name} ({grid.min}-{grid.max})</div>
                                    {grid.isDefault && <span className="text-xs text-green-600 font-medium">По умолчанию</span>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setSelectedGridId(grid.id)} variant={grid.id === selectedGridId ? 'primary' : 'secondary'} size="sm">Выбрать</Button>
                                <button onClick={() => handleDeleteGrid(grid.id)} disabled={grid.isDefault} className="p-2 text-red-400 hover:bg-red-100 rounded-lg disabled:opacity-30" title="Удалить"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* 2. Шаблоны ящиков */}
            {currentGrid && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="border-b pb-3 mb-3">
                        <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><Box size={20}/> Комплектация ящиков для сетки: <span className="text-blue-600">{currentGrid.name}</span></h3>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {availableBoxSizes.map(size => {
                            const template = currentGridTemplates[size];
                            const isSet = template && Object.keys(template).length > 0;
                            const totalQty = isSet ? Object.values(template).reduce((a,b)=>a+b,0) : 0;
                            
                            return (
                                <div key={size} className={`p-4 rounded-xl border-2 ${isSet ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'} flex flex-col justify-between`}>
                                    <div className="font-bold text-lg mb-2">Ящик {size} пар</div>
                                    <div className="text-sm text-gray-600 mb-3 min-h-10">
                                        {isSet ? (
                                            <>
                                                <span className="font-medium">Всего: {totalQty} пар</span>
                                                <div className="text-xs mt-1 flex flex-wrap gap-x-2">
                                                    {Object.entries(template).map(([s, q]) => <span key={s} className="font-mono text-gray-700">{s}({q})</span>)}
                                                </div>
                                            </>
                                        ) : (
                                            'Комплектация не задана'
                                        )}
                                    </div>
                                    <Button onClick={() => openBoxEditModal(selectedGridId, size)} icon={Edit} size="sm" variant={isSet ? 'secondary' : 'primary'}>
                                        {isSet ? 'Редактировать' : 'Задать комплектацию'}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal для добавления сетки */}
            <Modal title="Добавить размерную сетку" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} footer={<Button onClick={handleAddGrid} icon={Plus} disabled={!newGridName || !newGridMin || !newGridMax}>Создать</Button>}>
                <div className="space-y-4">
                    <Input label="Название сетки" value={newGridName} onChange={e => setNewGridName(e.target.value)} autoFocus placeholder="Женская / Детская / Основная"/>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Мин. размер" type="number" value={newGridMin} onChange={e => setNewGridMin(e.target.value)} placeholder="36"/>
                        <Input label="Макс. размер" type="number" value={newGridMax} onChange={e => setNewGridMax(e.target.value)} placeholder="41"/>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// --- Менеджер Валюты ---
const CurrencyManager = ({ settings, setSettings, apiCall, triggerToast, highlightSetting, setHighlightSetting }) => {
    const [rates, setRates] = useState(settings.exchangeRates || { usd: 0, eur: 0, isManual: false });
    const [mainCurrency, setMainCurrency] = useState(settings.mainCurrency || 'USD');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (highlightSetting === 'rates') {
            const timer = setTimeout(() => setHighlightSetting(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [highlightSetting, setHighlightSetting]);

    const handleFetchRates = async () => {
        if (rates.isManual) return;
        setLoading(true);
        try {
            const data = await apiCall('/nbu-rates');
            setRates(prev => ({ ...prev, usd: data.usd, eur: data.eur }));
            triggerToast("Курсы НБУ загружены");
        } catch (e) {
            triggerToast("Ошибка загрузки курсов", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!settings.exchangeRates.isManual && settings.exchangeRates.usd === 0) {
            handleFetchRates();
        }
    }, [settings.exchangeRates]);

    const handleSave = async () => {
        try {
            const updatedSettings = { 
                ...settings,
                exchangeRates: rates,
                mainCurrency: mainCurrency
            };
            const saved = await apiCall('/settings', 'POST', updatedSettings);
            setSettings(saved.settings);
            triggerToast("Настройки валют сохранены");
        } catch (e) {
            triggerToast("Ошибка сохранения", "error");
        }
    };

    return (
        <div id="rates" className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 ${highlightSetting === 'rates' ? 'ring-4 ring-blue-500/50' : ''}`}>
            <div className="flex items-center gap-2 mb-4 text-gray-800 border-b pb-3">
                <DollarSign size={20}/>
                <h3 className="font-bold text-xl">Валюта и курсы</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Основная валюта" value={mainCurrency} onChange={e => setMainCurrency(e.target.value)}>
                    <option value="USD">USD - Доллар США</option>
                    <option value="EUR">EUR - Евро</option>
                    <option value="UAH">UAH - Гривна</option>
                </Select>
                <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="manualRates" checked={rates.isManual} onChange={e => setRates(prev => ({ ...prev, isManual: e.target.checked }))} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                        <label htmlFor="manualRates" className="text-sm font-medium text-gray-700">Ручное управление курсами</label>
                    </div>
                    {!rates.isManual && (
                        <Button onClick={handleFetchRates} disabled={loading} size="sm" className="w-full">
                            {loading ? 'Загрузка...' : 'Загрузить курсы НБУ'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border p-4 rounded-xl">
                <Input label="USD (Курс к UAH)" type="number" value={rates.usd} onChange={e => setRates(prev => ({ ...prev, usd: e.target.value }))} disabled={!rates.isManual}/>
                <Input label="EUR (Курс к UAH)" type="number" value={rates.eur} onChange={e => setRates(prev => ({ ...prev, eur: e.target.value }))} disabled={!rates.isManual}/>
                <div className="flex flex-col justify-end pb-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Кросс-курс EUR</label>
                    <div className="font-bold text-gray-800 text-lg">{(rates.usd && rates.eur) ? (rates.eur / rates.usd).toFixed(3) : 'N/A'}</div>
                    <span className="text-xs text-gray-400">USD за EUR</span>
                </div>
            </div>

            <Button onClick={handleSave} icon={Save} className="w-full">Сохранить настройки валют</Button>
        </div>
    );
};

// --- Менеджер Брендинга ---
const BrandingManager = ({ settings, setSettings, apiCall, triggerToast }) => {
    const [brandName, setBrandName] = useState(settings.brandName || 'SHOE EXPO');
    const [brandPhones, setBrandPhones] = useState(settings.brandPhones || []);
    const [newPhone, setNewPhone] = useState('');
    const [logoFile, setLogoFile] = useState(null);

    const handleSaveBranding = async () => {
        try {
            let logoFileName = settings.brandLogo;
            if (logoFile) {
                logoFileName = await uploadBrandLogo(logoFile, brandName);
                setLogoFile(null);
            }
            
            const updatedSettings = { 
                ...settings,
                brandName,
                brandPhones,
                brandLogo: logoFileName
            };
            const saved = await apiCall('/settings', 'POST', updatedSettings);
            setSettings(saved.settings);
            triggerToast("Настройки бренда сохранены");
        } catch (e) {
            triggerToast(e.message || "Ошибка сохранения бренда", "error");
        }
    };

    const handleAddPhone = () => {
        const cleanedPhone = newPhone.trim();
        if (cleanedPhone && !brandPhones.includes(cleanedPhone)) {
            setBrandPhones([...brandPhones, cleanedPhone]);
            setNewPhone('');
        }
    };

    const handleRemovePhone = (phoneToRemove) => {
        setBrandPhones(brandPhones.filter(p => p !== phoneToRemove));
    };

    const handleLogoUpload = (e) => {
        if (e.target.files.length) {
            setLogoFile(e.target.files[0]);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 mb-4 text-gray-800 border-b pb-3">
                <Image size={20}/>
                <h3 className="font-bold text-xl">Брендинг (Накладные)</h3>
            </div>
            
            <Input label="Название бренда" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="SHOE EXPO"/>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">Логотип</label>
                <div className="flex items-center gap-4">
                    {(settings.brandLogo || logoFile) ? (
                        <div className="relative w-20 h-10 border rounded-lg flex items-center justify-center p-1 bg-gray-50">
                            <img 
                                src={logoFile ? URL.createObjectURL(logoFile) : `http://localhost:3001/images/${settings.brandLogo}`} 
                                alt="Brand Logo" 
                                className="h-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-10 border rounded-lg flex items-center justify-center bg-gray-100 text-xs text-gray-500">Нет лого</div>
                    )}
                    
                    <label htmlFor="logo-upload" className="cursor-pointer">
                        <input type="file" id="logo-upload" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <Button size="sm" variant="secondary" icon={Upload}>{logoFile ? 'Выбран файл' : 'Загрузить/Сменить'}</Button>
                    </label>
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-gray-700 block">Телефоны (в шапке накладной)</label>
                <div className="flex gap-2">
                    <Input 
                        icon={Phone}
                        value={newPhone} 
                        onChange={e => setNewPhone(e.target.value)} 
                        placeholder="+380 99 123 45 67"
                        className="flex-1"
                    />
                    <Button onClick={handleAddPhone} disabled={!newPhone} icon={Plus}>Добавить</Button>
                </div>
                {brandPhones.map(phone => (
                    <div key={phone} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <span className="font-mono text-sm">{phone}</span>
                        <button onClick={() => handleRemovePhone(phone)} className="text-red-400 hover:text-red-600" title="Удалить"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>

            <Button onClick={handleSaveBranding} icon={Save} className="w-full">Сохранить настройки бренда</Button>
        </div>
    );
};


// --- Основной компонент SettingsPage ---
const SettingsPage = ({ apiCall, triggerToast, settings, setSettings, highlightSetting, setHighlightSetting }) => {
    
    const commonProps = { apiCall, triggerToast, settings, setSettings, highlightSetting, setHighlightSetting };
    
    return (
        <div className="space-y-10">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><Settings size={28}/> Настройки системы</h1>
            
            {/* Раздел 1: Сетки и Ящики */}
            <SizeGridManager 
                {...commonProps}
            />

            {/* Раздел 2: Валюта и Курсы */}
            <CurrencyManager
                 {...commonProps}
            />

            {/* Раздел 3: Брендинг */}
            <BrandingManager
                 {...commonProps}
            />
            
        </div>
    );
};

export default SettingsPage;