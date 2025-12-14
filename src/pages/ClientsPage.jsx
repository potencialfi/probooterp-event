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
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [search]);

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

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openModal = (client = { name: '', phone: '', city: '' }) => {
      setCurrentClient(client);
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Клиенты</h2>
            <p className="text-sm text-gray-500 mt-1">В базе: {clients.length}</p>
          </div>
          <div className="flex gap-3">
              <Button onClick={handleExport} variant="secondary" icon={Download}>Экспорт</Button>
              <label htmlFor="import-clients"><input type="file" id="import-clients" accept=".xlsx" onChange={(e) => handleFileImport(e, '/clients/import', loadAllData)} className="hidden" /><Button variant="secondary" icon={Upload} as="span" className="cursor-pointer">Импорт</Button></label>
          </div>
      </div>

      {/* ADD & SEARCH */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <Input label="Имя" value={currentClient.name} onChange={e => setCurrentClient({...currentClient, name: e.target.value})} placeholder="Имя"/>
              <Input label="Город" value={currentClient.city} onChange={e => setCurrentClient({...currentClient, city: e.target.value})} placeholder="Город"/>
              <Input label="Телефон" value={currentClient.phone} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})} placeholder="+380..."/>
              <Button onClick={handleSaveClient} icon={Plus} className="h-[42px]">Добавить</Button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-3 text-gray-400" size={20} />
            <input className="w-full border border-gray-200 bg-gray-50 p-2.5 pl-12 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400" placeholder="Поиск по имени или телефону..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <tr><th className="p-4 pl-6 w-[30%]">Имя</th><th className="p-4 w-[25%]">Город</th><th className="p-4 w-[30%]">Телефон</th><th className="p-4 pr-6 text-right w-[15%]">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
            {paginatedClients.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 pl-6 font-bold text-gray-800">{c.name}</td>
                    <td className="p-4 text-gray-600">{c.city}</td>
                    <td className="p-4 font-mono text-gray-600">{c.phone}</td>
                    <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(c)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"><Edit size={16}/></button>
                            <button onClick={() => setConfirmDeleteId(c.id)} className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </div>
                    </td>
                </tr>
            ))}
            {filteredClients.length === 0 && <tr><td colSpan="4" className="p-12 text-center text-gray-400">Клиентов не найдено</td></tr>}
            </tbody>
        </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

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