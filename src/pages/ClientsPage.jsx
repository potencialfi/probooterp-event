import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import { Button, Input, Modal, Pagination } from '../components/UI';
import { apiCall } from '../api';
import { handleExportExcel } from '../utils';

const ITEMS_PER_PAGE = 20;

const ClientsPage = ({ clients, setClients, triggerToast, handleFileImport, loadAllData, setImportResult }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState({ name: '', phone: '', city: '' });
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  // Состояние пагинации
  const [currentPage, setCurrentPage] = useState(1);

  // Сброс страницы при поиске
  useEffect(() => {
      setCurrentPage(1);
  }, [search]);

  const handleSaveClient = async () => {
    if (!currentClient.name || !currentClient.phone) {
      triggerToast("Заполните имя и телефон", 'error');
      return;
    }
    try {
      if (currentClient.id) {
        const updated = await apiCall(`/clients/${currentClient.id}`, 'PUT', currentClient);
        setClients(clients.map(c => c.id === updated.id ? updated : c));
        triggerToast("Клиент обновлен");
      } else {
        const newClient = await apiCall('/clients', 'POST', currentClient);
        setClients([...clients, newClient]);
        triggerToast("Клиент добавлен");
      }
      setIsModalOpen(false);
      setCurrentClient({ name: '', phone: '', city: '' });
    } catch(e) {
      triggerToast(e.message || "Ошибка сохранения", 'error');
    }
  };

  const handleDeleteClient = async () => {
      try {
          await apiCall(`/clients/${confirmDeleteId}`, 'DELETE');
          setClients(clients.filter(c => c.id !== confirmDeleteId));
          setConfirmDeleteId(null);
          triggerToast("Клиент удален");
      } catch (e) { triggerToast("Ошибка удаления", 'error'); }
  };

  const handleExport = () => {
      const data = filteredClients.map(c => ({
          Имя: c.name, Телефон: c.phone, Город: c.city
      }));
      handleExportExcel(data, 'clients_export');
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search) || 
      c.city.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  // Пагинация
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openModal = (client = { name: '', phone: '', city: '' }) => {
      setCurrentClient(client);
      setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in pb-10">
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur pt-2 pb-4 -mx-6 px-6 md:-mx-10 md:px-10 border-b border-gray-200/50 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Клиенты ({clients.length})</h2>
            <div className="flex gap-2">
                <Button onClick={handleExport} variant="secondary" icon={Download}>Экспорт</Button>
                <label htmlFor="import-clients"><input type="file" id="import-clients" accept=".xlsx" onChange={(e) => handleFileImport(e, '/clients/import', loadAllData)} className="hidden" /><Button variant="secondary" icon={Upload}>Импорт</Button></label>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <Input label="Имя" value={currentClient.name} onChange={e => setCurrentClient({...currentClient, name: e.target.value})} placeholder="Имя"/>
              <Input label="Город" value={currentClient.city} onChange={e => setCurrentClient({...currentClient, city: e.target.value})} placeholder="Город"/>
              <Input label="Телефон" value={currentClient.phone} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})} placeholder="+380..."/>
              <Button onClick={handleSaveClient} icon={Plus}>Добавить</Button>
          </div>

          <div className="relative w-full">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input className="w-full border border-gray-300 p-3 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400 shadow-sm" placeholder="Поиск по имени или телефону..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr><th className="p-4">Имя</th><th className="p-4">Город</th><th className="p-4">Телефон</th><th className="p-4 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {paginatedClients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{c.name}</td>
                    <td className="p-4 text-gray-600">{c.city}</td>
                    <td className="p-4 font-mono text-gray-600">{c.phone}</td>
                    <td className="p-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => openModal(c)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => setConfirmDeleteId(c.id)} className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18}/></button></div></td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Edit Modal (Only for editing existing clients from list) */}
      <Modal title="Редактировать клиента" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} footer={<Button onClick={handleSaveClient} icon={Plus}>Сохранить</Button>}>
        <div className="space-y-4">
            <Input label="Имя" value={currentClient.name} onChange={e => setCurrentClient({...currentClient, name: e.target.value})}/>
            <Input label="Город" value={currentClient.city} onChange={e => setCurrentClient({...currentClient, city: e.target.value})}/>
            <Input label="Телефон" value={currentClient.phone} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})}/>
        </div>
      </Modal>

      {confirmDeleteId && <Modal title="Удаление" onClose={() => setConfirmDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={handleDeleteClient}>Удалить</Button></>}><p className="text-center text-gray-600">Удалить клиента?</p></Modal>}
    </div>
  );
};

export default ClientsPage;