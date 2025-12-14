import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Download, Upload, DollarSign } from 'lucide-react';
import { Button, Input, Modal, Select, Pagination } from '../components/UI';
import { apiCall } from '../api';
import { convertPrice, handleExportExcel, convertToUSD } from '../utils';

const initialModel = { sku: '', color: '', price: '', gridId: '' };
const ITEMS_PER_PAGE = 20;

const ModelsPage = ({ models, setModels, triggerToast, handleFileImport, loadAllData, setImportResult, settings }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(initialModel);
  const [newModel, setNewModel] = useState(initialModel);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const mainCurrency = settings?.mainCurrency || 'USD';
  const sizeGrids = settings?.sizeGrids || [];
  const defaultGridId = settings?.defaultSizeGridId || (sizeGrids[0]?.id || '');

  useEffect(() => { setCurrentPage(1); }, [search]);

  const handleAddModel = async () => {
    if (!newModel.sku || !newModel.color || !newModel.price) {
      triggerToast("Заполните артикул, цвет и цену", 'error');
      return;
    }
    const gridIdToSave = newModel.gridId ? parseInt(newModel.gridId) : defaultGridId;
    if (!gridIdToSave) { triggerToast("Не выбрана размерная сетка", 'error'); return; }

    const priceUSD = convertToUSD(parseFloat(newModel.price) || 0, mainCurrency, settings.exchangeRates);
    const modelData = { ...newModel, price: priceUSD, gridId: gridIdToSave };

    try {
        const created = await apiCall('/models', 'POST', modelData);
        setModels([created, ...models]);
        triggerToast("Модель добавлена");
        setNewModel({ ...initialModel, gridId: gridIdToSave }); 
    } catch(e) { triggerToast(e.message || "Ошибка создания", 'error'); }
  };

  const openEditModal = (model) => {
      const priceForInput = model.price ? convertPrice(model.price, mainCurrency, settings.exchangeRates) : '';
      setEditingModel({ ...model, price: priceForInput, gridId: model.gridId || defaultGridId });
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
      if (!editingModel.sku || !editingModel.color || !editingModel.price || !editingModel.gridId) {
        triggerToast("Заполните все поля", 'error');
        return;
      }
      const priceUSD = convertToUSD(parseFloat(editingModel.price) || 0, mainCurrency, settings.exchangeRates);
      const modelData = { ...editingModel, price: priceUSD, gridId: parseInt(editingModel.gridId) };
      try {
          const updated = await apiCall(`/models/${editingModel.id}`, 'PUT', modelData);
          setModels(models.map(m => m.id === updated.id ? updated : m));
          triggerToast("Модель обновлена");
          setIsEditModalOpen(false);
          setEditingModel(initialModel);
      } catch(e) { triggerToast(e.message || "Ошибка сохранения", 'error'); }
  };

  const handleDeleteModel = async () => {
      try {
          await apiCall(`/models/${confirmDeleteId}`, 'DELETE');
          setModels(models.filter(m => m.id !== confirmDeleteId));
          setConfirmDeleteId(null);
          triggerToast("Модель удалена");
      } catch (e) { triggerToast("Ошибка удаления", 'error'); }
  };
  
  const filteredModels = useMemo(() => {
    const s = search.toLowerCase();
    return models.filter(m => 
      m.sku.toLowerCase().includes(s) || 
      m.color.toLowerCase().includes(s) ||
      (sizeGrids.find(g => g.id === m.gridId)?.name || '').toLowerCase().includes(s)
    );
  }, [models, search, sizeGrids]);
  
  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE);
  const paginatedModels = filteredModels.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleExport = () => {
      const data = filteredModels.map(m => ({
          Артикул: m.sku, Цвет: m.color, Цена_USD: m.price,
          'Сетка ID': m.gridId, 'Название сетки': sizeGrids.find(g => g.id === m.gridId)?.name || 'Неизвестно'
      }));
      handleExportExcel(data, 'models_export');
  };

  const getGridLabel = (id) => {
      const grid = sizeGrids.find(g => g.id === id);
      return grid ? `${grid.name} (${grid.min}-${grid.max})` : 'Неизвестно';
  };

  return (
    <div className="animate-fade-in pb-10">
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur pt-2 pb-4 -mx-6 px-6 md:-mx-10 md:px-10 border-b border-gray-200/50 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Модели обуви ({models.length})</h2>
            <div className="flex gap-2">
                <Button onClick={() => handleExport()} variant="secondary" icon={Download}>Экспорт</Button>
                <label htmlFor="import-models"><input type="file" id="import-models" accept=".xlsx" onChange={(e) => handleFileImport(e, '/models/import', loadAllData)} className="hidden" /><Button variant="secondary" icon={Upload}>Импорт</Button></label>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div><Input label="Артикул" value={newModel.sku} onChange={e => setNewModel({...newModel, sku: e.target.value})} placeholder="Арт..." /></div>
              <div><Input label="Цвет" value={newModel.color} onChange={e => setNewModel({...newModel, color: e.target.value})} placeholder="Цвет..." /></div>
              <div><Input label={`Цена (${mainCurrency})`} type="number" value={newModel.price} onChange={e => setNewModel({...newModel, price: e.target.value})} placeholder="0.00" /></div>
              <div>
                  <Select label="Сетка" value={newModel.gridId || defaultGridId} onChange={e => setNewModel({...newModel, gridId: parseInt(e.target.value)})}>
                      {sizeGrids.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.min}-{g.max})</option>))}
                  </Select>
              </div>
              <div><Button onClick={handleAddModel} icon={Plus} className="w-full">Добавить</Button></div>
          </div>
          <div className="px-6 md:px-10 pb-4">
             <div className="relative w-full">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input className="w-full border border-gray-300 p-3 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 shadow-sm" placeholder="Поиск по артикулу..." value={search} onChange={e => setSearch(e.target.value)} />
             </div>
          </div>
      </div>
      <div className="px-6 md:px-10 mt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr><th className="p-4 w-[40%]">Артикул</th><th className="p-4">Цвет</th><th className="p-4">Цена ({mainCurrency})</th><th className="p-4 text-sm">Сетка</th><th className="p-4 text-right">Действия</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {paginatedModels.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-800">{m.sku}</td>
                        <td className="p-4 text-gray-600">{m.color}</td>
                        <td className="p-4 font-mono text-green-600 font-bold">{convertPrice(m.price, mainCurrency, settings.exchangeRates)}</td>
                        <td className="p-4 text-sm text-blue-600 font-medium whitespace-nowrap">{getGridLabel(m.gridId)}</td>
                        <td className="p-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => openEditModal(m)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => setConfirmDeleteId(m.id)} className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18}/></button></div></td>
                    </tr>
                ))}
                {filteredModels.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Нет моделей</td></tr>}
                </tbody>
            </table>
            </div>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
      <Modal title="Редактировать модель" isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} footer={<Button onClick={handleSaveEdit} icon={Plus}>Сохранить</Button>}>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><Input label="Артикул" value={editingModel.sku} onChange={e => setEditingModel({...editingModel, sku: e.target.value})} autoFocus/><Input label="Цвет" value={editingModel.color} onChange={e => setEditingModel({...editingModel, color: e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-4">
                <Input label={`Цена (${mainCurrency})`} type="number" value={editingModel.price} onChange={e => setEditingModel({...editingModel, price: e.target.value})}/>
                <Select label="Сетка" value={editingModel.gridId || ''} onChange={e => setEditingModel({...editingModel, gridId: parseInt(e.target.value)})}>
                    {sizeGrids.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.min}-{g.max})</option>))}
                </Select>
            </div>
        </div>
      </Modal>
      {confirmDeleteId && <Modal title="Удаление" onClose={() => setConfirmDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={handleDeleteModel}>Удалить</Button></>}><p className="text-center text-gray-600">Удалить эту модель?</p></Modal>}
    </div>
  );
};

export default ModelsPage;