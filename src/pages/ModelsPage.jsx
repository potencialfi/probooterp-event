import React, { useState } from 'react';
import { Search, Upload, Download, Plus, Edit, Trash2 } from 'lucide-react';
import { apiCall } from '../api';
import { handleExportExcel, convertPrice } from '../utils';
import { Button, Input, Modal } from '../components/UI';

const ModelsPage = ({ models, setModels, triggerToast, handleFileImport, loadAllData, setImportResult, settings }) => {
  const [newModel, setNewModel] = useState({ sku: '', color: '', price: '' });
  const [errors, setErrors] = useState({});
  const [delId, setDelId] = useState(null);
  const [editM, setEditM] = useState(null);
  const [skuFilter, setSkuFilter] = useState('');

  const mainCurrency = settings?.mainCurrency || 'USD';

  const validate = () => {
    const errs = {};
    if (!newModel.sku.trim()) errs.sku = "Введите артикул";
    if (!newModel.color.trim()) errs.color = "Укажите цвет";
    if (!newModel.price) errs.price = "Укажите цену";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addModel = async () => {
    if (!validate()) return;
    if (models.some(m => m.sku === newModel.sku && m.color === newModel.color)) {
       triggerToast("Такая модель уже существует", 'error');
       return;
    }
    try {
      const saved = await apiCall('/models', 'POST', newModel);
      setModels([...models, saved]);
      setNewModel({ sku: '', color: '', price: '' });
      setErrors({});
      triggerToast("Модель успешно сохранена");
    } catch(e) { triggerToast(e.message, 'error'); }
  };

  const removeModel = async () => {
    try {
      await apiCall(`/models/${delId}`, 'DELETE');
      setModels(models.filter(m => m.id !== delId));
      setDelId(null);
      triggerToast("Модель удалена", 'success');
    } catch(e) { triggerToast("Ошибка удаления", 'error'); }
  };

  const saveEdit = async () => {
    try {
      const updated = await apiCall(`/models/${editM.id}`, 'PUT', { price: Number(editM.price) });
      setModels(models.map(m => m.id === editM.id ? updated : m));
      setEditM(null);
      triggerToast("Цена обновлена");
    } catch(e) { triggerToast("Ошибка сохранения", 'error'); }
  };

  const filtered = models.filter(m => m.sku.toLowerCase().includes(skuFilter.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Модели</h2>
        <div className="flex gap-2">
          <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-xl flex gap-2 hover:bg-gray-50 text-sm transition-all text-gray-700 font-medium shadow-sm active:scale-95 items-center">
            <Upload size={16}/> Импорт
            <input type="file" hidden onChange={(e) => handleFileImport(e, '/models/import', (res) => { loadAllData(); setImportResult(res); })} accept=".xlsx,.xls"/>
          </label>
          <Button onClick={() => handleExportExcel(models, 'models')} variant="secondary" icon={Download}>Экспорт</Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-start relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
        <Input label="Артикул" placeholder="ART-1" value={newModel.sku} onChange={e => {setNewModel({...newModel, sku: e.target.value}); setErrors({...errors, sku: ''})}} error={errors.sku} />
        <Input label="Цвет" placeholder="Чорний" value={newModel.color} onChange={e => {setNewModel({...newModel, color: e.target.value}); setErrors({...errors, color: ''})}} error={errors.color} />
        <Input label="Цена (USD)" placeholder="10" type="number" value={newModel.price} onChange={e => {setNewModel({...newModel, price: e.target.value}); setErrors({...errors, price: ''})}} error={errors.price} />
        <div className="pt-6">
           <Button onClick={addModel} size="md" icon={Plus} className="w-full h-[46px]">Добавить</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20}/>
          <input 
            placeholder="Поиск по артикулу..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            value={skuFilter} 
            onChange={e => setSkuFilter(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-semibold">Артикул</th><th className="p-4 font-semibold">Цвет</th><th className="p-4 text-right font-semibold">Цена</th><th className="p-4 text-center font-semibold">Действия</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(m => {
                // Конвертируем цену
                const displayPrice = convertPrice(m.price, mainCurrency, settings.exchangeRates);
                return (
                <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-4 font-mono font-bold text-gray-700">{m.sku}</td>
                  <td className="p-4 text-gray-600">{m.color}</td>
                  <td className="p-4 text-right font-bold text-green-600">{displayPrice} {mainCurrency}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => setEditM({...m})} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit size={18}/></button>
                    <button onClick={() => setDelId(m.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </td>
                </tr>
              )})}
               {filtered.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-gray-400">Модели не найдены</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      
      {delId && <Modal title="Удаление модели" onClose={() => setDelId(null)} footer={<><Button variant="secondary" onClick={() => setDelId(null)}>Отмена</Button><Button variant="danger" onClick={removeModel}>Удалить</Button></>}><p>Вы действительно хотите удалить эту модель?</p></Modal>}
      {editM && <Modal title={`${editM.sku} — ${editM.color}`} onClose={() => setEditM(null)} footer={<Button onClick={saveEdit}>Сохранить</Button>}><Input label="Новая цена (USD)" type="number" value={editM.price} onChange={e => setEditM({...editM, price: e.target.value})} autoFocus /></Modal>}
    </div>
  );
};

export default ModelsPage;