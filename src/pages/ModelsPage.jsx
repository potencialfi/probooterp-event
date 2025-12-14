import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Download, Upload, DollarSign, Box, Ruler } from 'lucide-react';
import { Button, Input, Modal, Select } from '../components/UI';
import { apiCall } from '../api';
import { convertPrice, handleExportExcel, convertToUSD } from '../utils';

const initialModel = { sku: '', color: '', price: '', gridId: null };

const ModelsPage = ({ models, setModels, triggerToast, handleFileImport, loadAllData, setImportResult, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState(initialModel);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  const mainCurrency = settings?.mainCurrency || 'USD';
  const sizeGrids = settings?.sizeGrids || [];
  const defaultGridId = settings?.defaultSizeGridId || (sizeGrids[0]?.id || null);

  // Установка дефолтной сетки при открытии модалки
  const handleOpenModal = (model = initialModel) => {
      // Конвертируем цену в локальную валюту для отображения в инпуте
      const priceForInput = model.price ? convertPrice(model.price, mainCurrency, settings.exchangeRates) : '';
      
      setCurrentModel({
          ...model,
          price: priceForInput,
          // Устанавливаем gridId: из модели, или дефолтный, или null
          gridId: model.gridId || defaultGridId
      });
      setIsModalOpen(true);
  };
  
  const handleSaveModel = async () => {
    if (!currentModel.sku || !currentModel.color || !currentModel.price || !currentModel.gridId) {
      triggerToast("Заполните все поля (включая Сетку)", 'error');
      return;
    }
    
    // Конвертируем цену обратно в USD для сохранения в базу
    const priceUSD = convertToUSD(parseFloat(currentModel.price) || 0, mainCurrency, settings.exchangeRates);
    
    // Модель для отправки на сервер
    const modelData = { 
        ...currentModel, 
        price: priceUSD,
        gridId: parseInt(currentModel.gridId)
    };
    
    try {
      if (currentModel.id) {
        // Редактирование
        const updated = await apiCall(`/models/${currentModel.id}`, 'PUT', modelData);
        setModels(models.map(m => m.id === updated.id ? updated : m));
        triggerToast("Модель обновлена");
      } else {
        // Создание
        const newModel = await apiCall('/models', 'POST', modelData);
        setModels([newModel, ...models]);
        triggerToast("Модель добавлена");
      }
      setIsModalOpen(false);
      setCurrentModel(initialModel);
    } catch(e) {
      triggerToast(e.message || "Ошибка сохранения", 'error');
    }
  };

  const handleDeleteModel = async () => {
      try {
          await apiCall(`/models/${confirmDeleteId}`, 'DELETE');
          setModels(models.filter(m => m.id !== confirmDeleteId));
          setConfirmDeleteId(null);
          triggerToast("Модель удалена");
      } catch (e) {
          triggerToast("Ошибка удаления", 'error');
      }
  };
  
  const filteredModels = useMemo(() => {
    const s = search.toLowerCase();
    return models.filter(m => 
      m.sku.toLowerCase().includes(s) || 
      m.color.toLowerCase().includes(s) ||
      (sizeGrids.find(g => g.id === m.gridId)?.name || '').toLowerCase().includes(s)
    );
  }, [models, search, sizeGrids]);
  
  const handleExport = () => {
      const data = filteredModels.map(m => ({
          Артикул: m.sku,
          Цвет: m.color,
          Цена_USD: m.price, // Экспортируем в USD, чтобы не было путаницы при импорте
          'Сетка ID': m.gridId,
          'Название сетки': sizeGrids.find(g => g.id === m.gridId)?.name || 'Неизвестно'
      }));
      handleExportExcel(data, 'models_export');
  };

  const getGridName = (id) => sizeGrids.find(g => g.id === id)?.name || 'Неизвестно';
  

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Модели обуви ({models.length})</h2>
        <div className="flex gap-2">
            <Button onClick={() => handleExport()} variant="secondary" icon={Download}>Экспорт</Button>
            <label htmlFor="import-models">
                <input type="file" id="import-models" accept=".xlsx" onChange={(e) => handleFileImport(e, '/models/import', loadAllData)} className="hidden" />
                <Button variant="secondary" icon={Upload}>Импорт</Button>
            </label>
            <Button onClick={() => handleOpenModal()} icon={Plus}>Добавить</Button>
        </div>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input 
            className="w-full border border-gray-300 p-3 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 shadow-sm"
            placeholder="Поиск по артикулу, цвету или сетке..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                    <th className="p-4">Артикул</th>
                    <th className="p-4">Цвет</th>
                    <th className="p-4">Цена ({mainCurrency})</th>
                    <th className="p-4 flex items-center gap-1"><Ruler size={14}/> Сетка</th>
                    <th className="p-4 text-right">Действия</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {filteredModels.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{m.sku}</td>
                    <td className="p-4 text-gray-600">{m.color}</td>
                    <td className="p-4 font-mono text-green-600 font-bold">{convertPrice(m.price, mainCurrency, settings.exchangeRates)}</td>
                    <td className="p-4 text-sm text-blue-600 font-medium">{getGridName(m.gridId)}</td>
                    <td className="p-4 text-right">
                         <div className="flex justify-end gap-1">
                            <button onClick={() => handleOpenModal(m)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors" title="Редактировать"><Edit size={18}/></button>
                            <button onClick={() => setConfirmDeleteId(m.id)} className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors" title="Удалить"><Trash2 size={18}/></button>
                         </div>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
      </div>

      {/* Modal Add/Edit Model */}
      <Modal 
        title={currentModel.id ? 'Редактировать модель' : 'Добавить новую модель'} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        footer={<Button onClick={handleSaveModel} icon={Save}>Сохранить</Button>}
      >
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input label="Артикул" value={currentModel.sku} onChange={e => setCurrentModel({...currentModel, sku: e.target.value})} autoFocus/>
                <Input label="Цвет" value={currentModel.color} onChange={e => setCurrentModel({...currentModel, color: e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label={`Цена (${mainCurrency})`} 
                    icon={DollarSign}
                    type="number" 
                    value={currentModel.price} 
                    onChange={e => setCurrentModel({...currentModel, price: e.target.value})}
                />
                
                {/* Выбор размерной сетки */}
                <Select
                    label="Размерная сетка"
                    value={currentModel.gridId || ''}
                    onChange={e => setCurrentModel({...currentModel, gridId: parseInt(e.target.value)})}
                >
                    <option value="" disabled>Выберите сетку</option>
                    {sizeGrids.map(g => (
                        <option key={g.id} value={g.id}>
                            {g.name} ({g.min}-{g.max}) {g.isDefault && '(По умолчанию)'}
                        </option>
                    ))}
                </Select>
            </div>
            {currentModel.gridId && !sizeGrids.find(g => g.id === currentModel.gridId) && (
                <div className="text-red-500 text-sm">Выбранная сетка не найдена. Возможно, она была удалена.</div>
            )}
            {sizeGrids.length === 0 && (
                <div className="text-yellow-600 text-sm">⚠ Нет размерных сеток. Перейдите в Настройки, чтобы добавить их.</div>
            )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <Modal 
          title="Подтвердите удаление" 
          onClose={() => setConfirmDeleteId(null)} 
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Отмена</Button>
              <Button variant="danger" onClick={handleDeleteModel}>Удалить</Button>
            </>
          }
        >
          <p className="text-center text-gray-600">Вы действительно хотите удалить эту модель?</p>
        </Modal>
      )}
    </div>
  );
};

export default ModelsPage;