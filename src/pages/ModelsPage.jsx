import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Download, Upload } from 'lucide-react';
import { Button, Input, Modal, Select, Pagination, PageHeader } from '../components/UI';
import { apiCall } from '../api';
import { convertPrice, handleExportExcel, convertToUSD } from '../utils';

const initialModel = { sku: '', color: '', price: '', gridId: '' };
const ITEMS_PER_PAGE = 20;

const ModelsPage = ({ models, setModels, triggerToast, handleFileImport, loadAllData, settings }) => {
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
    if (!newModel.sku || !newModel.color || !newModel.price) { triggerToast("Заполните поля", 'error'); return; }
    const gridIdToSave = newModel.gridId ? parseInt(newModel.gridId) : defaultGridId;
    if (!gridIdToSave) { triggerToast("Нет сетки", 'error'); return; }
    const priceUSD = convertToUSD(parseFloat(newModel.price) || 0, mainCurrency, settings.exchangeRates);
    try {
        const created = await apiCall('/models', 'POST', { ...newModel, price: priceUSD, gridId: gridIdToSave });
        setModels([created, ...models]); triggerToast("Добавлено"); setNewModel({ ...initialModel, gridId: gridIdToSave }); 
    } catch(e) { triggerToast(e.message, 'error'); }
  };
  const handleSaveEdit = async () => {
      const priceUSD = convertToUSD(parseFloat(editingModel.price) || 0, mainCurrency, settings.exchangeRates);
      try {
          const updated = await apiCall(`/models/${editingModel.id}`, 'PUT', { ...editingModel, price: priceUSD, gridId: parseInt(editingModel.gridId) });
          setModels(models.map(m => m.id === updated.id ? updated : m)); triggerToast("Сохранено"); setIsEditModalOpen(false);
      } catch(e) { triggerToast(e.message, 'error'); }
  };
  const handleDeleteModel = async () => {
      try { await apiCall(`/models/${confirmDeleteId}`, 'DELETE'); setModels(models.filter(m => m.id !== confirmDeleteId)); setConfirmDeleteId(null); triggerToast("Удалено"); } catch (e) { triggerToast("Ошибка", 'error'); }
  };
  const handleExport = () => { handleExportExcel(filteredModels.map(m => ({ Артикул: m.sku, Цвет: m.color, Цена: m.price, Сетка: getGridLabel(m.gridId) })), 'models'); };
  
  const filteredModels = useMemo(() => { const s = search.toLowerCase(); return models.filter(m => m.sku.toLowerCase().includes(s) || m.color.toLowerCase().includes(s)); }, [models, search]);
  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE);
  const paginatedModels = filteredModels.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const openEditModal = (m) => { setEditingModel({...m, price: m.price ? convertPrice(m.price, mainCurrency, settings.exchangeRates) : '', gridId: m.gridId || defaultGridId}); setIsEditModalOpen(true); };
  const getGridLabel = (id) => { const g = sizeGrids.find(x => x.id === id); return g ? `${g.name} (${g.min}-${g.max})` : '-'; };

  return (
    <div className="page-container">
      <PageHeader title="Модели обуви" subtitle={`Всего позиций: ${models.length}`}>
          <Button onClick={handleExport} variant="secondary" icon={Download}>Экспорт</Button>
          <label className="cursor-pointer"><input type="file" accept=".xlsx" onChange={(e) => handleFileImport(e, '/models/import', loadAllData)} className="hidden" /><Button variant="secondary" icon={Upload} as="span">Импорт</Button></label>
      </PageHeader>

      <div className="ui-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3"><Input label="Артикул" value={newModel.sku} onChange={e => setNewModel({...newModel, sku: e.target.value})} placeholder="Арт..." /></div>
              <div className="md:col-span-3"><Input label="Цвет" value={newModel.color} onChange={e => setNewModel({...newModel, color: e.target.value})} placeholder="Цвет..." /></div>
              <div className="md:col-span-2"><Input label={`Цена (${mainCurrency})`} type="number" value={newModel.price} onChange={e => setNewModel({...newModel, price: e.target.value})} placeholder="0.00" /></div>
              <div className="md:col-span-2"><Select label="Сетка" value={newModel.gridId || defaultGridId} onChange={e => setNewModel({...newModel, gridId: parseInt(e.target.value)})}>{sizeGrids.map(g => (<option key={g.id} value={g.id}>{g.name} ({g.min}-{g.max})</option>))}</Select></div>
              {/* ТОЛЬКО ПЛЮСИК, ЗЕЛЕНАЯ */}
              <div className="md:col-span-2"><Button onClick={handleAddModel} icon={Plus} variant="success" className="w-full"></Button></div>
          </div>
          <div className="relative"><Search className="absolute left-3 top-3 text-gray-400" size={18} /><input className="ui-input pl-10" placeholder="Поиск по артикулу..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="ui-table-wrapper flex-1">
        <div className="overflow-auto custom-scrollbar flex-1">
            <table className="ui-table">
                <thead><tr><th className="ui-th pl-8">Артикул</th><th className="ui-th">Цвет</th><th className="ui-th">Цена ({mainCurrency})</th><th className="ui-th">Сетка</th><th className="ui-th text-right pr-8">Действия</th></tr></thead>
                <tbody>
                {paginatedModels.map(m => (
                    <tr key={m.id} className="ui-tr">
                        <td className="ui-td pl-8 font-bold text-gray-900">{m.sku}</td>
                        <td className="ui-td text-gray-600">{m.color}</td>
                        <td className="ui-td font-bold text-green-600 font-mono">{convertPrice(m.price, mainCurrency, settings.exchangeRates)}</td>
                        <td className="ui-td"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{getGridLabel(m.gridId)}</span></td>
                        <td className="ui-td text-right pr-8">
                            <div className="ui-actions">
                                <Button onClick={() => openEditModal(m)} variant="primary" icon={Edit} className="w-9 h-9 px-0"/>
                                <Button onClick={() => setConfirmDeleteId(m.id)} variant="danger" icon={Trash2} className="w-9 h-9 px-0"/>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
      </div>
      
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      
      <Modal title="Редактировать модель" isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} footer={<Button onClick={handleSaveEdit} variant="success">Сохранить</Button>}>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><Input label="Артикул" value={editingModel.sku} onChange={e => setEditingModel({...editingModel, sku: e.target.value})}/><Input label="Цвет" value={editingModel.color} onChange={e => setEditingModel({...editingModel, color: e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-4"><Input label="Цена" type="number" value={editingModel.price} onChange={e => setEditingModel({...editingModel, price: e.target.value})}/><Select label="Сетка" value={editingModel.gridId || ''} onChange={e => setEditingModel({...editingModel, gridId: parseInt(e.target.value)})}>{sizeGrids.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</Select></div>
        </div>
      </Modal>
      {confirmDeleteId && <Modal title="Удаление" onClose={() => setConfirmDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={handleDeleteModel}>Удалить</Button></>}><p className="text-center text-gray-600">Вы уверены?</p></Modal>}
    </div>
  );
};
export default ModelsPage;