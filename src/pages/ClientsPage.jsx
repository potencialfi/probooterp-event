import React, { useState } from 'react';
import { Upload, Download, Search, Edit, Trash2, Plus } from 'lucide-react';
import { apiCall } from '../api';
import { formatPhoneNumber, handleExportExcel } from '../utils';
import { Button, Input, Modal } from '../components/UI';

const ClientsPage = ({ clients, setClients, triggerToast, handleFileImport, loadAllData, setImportResult }) => {
  const [newClient, setNewClient] = useState({ name: '', city: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [search, setSearch] = useState('');

  const handlePhoneBlur = (field, obj, setObj) => {
    const formatted = formatPhoneNumber(obj[field]);
    setObj({ ...obj, [field]: formatted });
  };

  const addClient = async () => {
    const errs = {};
    if (!newClient.name.trim()) errs.name = "Введите имя клиента";
    if (!newClient.phone.trim()) errs.phone = "Введите номер";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      const saved = await apiCall('/clients', 'POST', newClient);
      setClients([...clients, saved]);
      setNewClient({ name: '', city: '', phone: '' });
      setErrors({});
      triggerToast("Клиент успешно добавлен");
    } catch(e) {
        if (e.field) { setErrors({ [e.field]: e.message }); } else { triggerToast(e.message, 'error'); }
    }
  };

  const saveEdit = async () => {
    const errs = {};
    if (!editClient.name.trim()) errs.name = "Введите имя клиента";
    if (!editClient.phone.trim()) errs.phone = "Введите номер";
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    try {
      const updated = await apiCall(`/clients/${editClient.id}`, 'PUT', editClient);
      setClients(clients.map(c => c.id === editClient.id ? updated : c));
      setEditClient(null);
      setEditErrors({});
      triggerToast("Данные клиента обновлены");
    } catch(e) { 
        if (e.field) { setEditErrors({ [e.field]: e.message }); } else { triggerToast(e.message, 'error'); }
    }
  };

  const removeClient = async () => {
    try {
      await apiCall(`/clients/${deleteId}`, 'DELETE');
      setClients(clients.filter(c => c.id !== deleteId));
      setDeleteId(null);
      triggerToast("Клиент удален", 'success'); 
    } catch(e) { triggerToast("Ошибка удаления", 'error'); }
  };

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800 tracking-tight">Клиенты</h2><div className="flex gap-2"><label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-xl flex gap-2 hover:bg-gray-50 text-sm transition-all text-gray-700 font-medium shadow-sm active:scale-95 items-center"><Upload size={16}/> Импорт<input type="file" hidden onChange={(e) => handleFileImport(e, '/clients/import', (res) => { loadAllData(); setImportResult(res); })} accept=".xlsx,.xls"/></label><Button onClick={() => handleExportExcel(clients, 'clients')} variant="secondary" icon={Download}>Экспорт</Button></div></div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-start relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div><Input label="Имя" value={newClient.name} onChange={e => {setNewClient({...newClient, name: e.target.value}); setErrors({...errors, name: ''})}} error={errors.name} placeholder="Шевченко Андрій"/><Input label="Город" value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} placeholder="Яготин"/><Input label="Телефон" value={newClient.phone} onChange={e => {setNewClient({...newClient, phone: e.target.value}); setErrors({...errors, phone: ''})}} onBlur={() => handlePhoneBlur('phone', newClient, setNewClient)} error={errors.phone} placeholder="+380 59 083 12 79"/><div className="pt-6"><Button onClick={addClient} size="md" icon={Plus} className="w-full h-[46px]">Добавить</Button></div></div>
      <div className="space-y-4"><div className="relative"><Search className="absolute left-4 top-3.5 text-gray-400" size={20}/><input placeholder="Поиск по имени или телефону..." className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4 font-semibold">Имя</th><th className="p-4 font-semibold">Город</th><th className="p-4 font-semibold">Телефон</th><th className="p-4 text-center font-semibold">Действия</th></tr></thead><tbody className="divide-y divide-gray-50">{filteredClients.map(c => (<tr key={c.id} className="hover:bg-gray-50/80 transition-colors group"><td className="p-4 font-medium text-gray-800">{c.name}</td><td className="p-4 text-gray-600">{c.city || '-'}</td><td className="p-4 text-gray-600 font-mono text-sm">{c.phone}</td><td className="p-4 flex justify-center gap-2"><button onClick={() => {setEditClient(c); setEditErrors({})}} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => setDeleteId(c.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div></div></div>
      {deleteId && <Modal title="Удаление клиента" onClose={() => setDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={removeClient}>Удалить</Button></>}><p className="text-gray-600">Вы действительно хотите удалить этого клиента?</p></Modal>}
      {editClient && (<Modal title="Редактирование" onClose={() => setEditClient(null)} footer={<Button onClick={saveEdit}>Сохранить</Button>}><div className="space-y-4"><Input label="Имя" value={editClient.name} onChange={e => {setEditClient({...editClient, name: e.target.value}); setEditErrors({...editErrors, name: ''})}} error={editErrors.name}/><Input label="Город" value={editClient.city} onChange={e => setEditClient({...editClient, city: e.target.value})}/><Input label="Телефон" value={editClient.phone} onChange={e => {setEditClient({...editClient, phone: e.target.value}); setEditErrors({...editErrors, phone: ''})}} onBlur={() => handlePhoneBlur('phone', editClient, setEditClient)} error={editErrors.phone}/></div></Modal>)}
    </div>
  );
};

export default ClientsPage;