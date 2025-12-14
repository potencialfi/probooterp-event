import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Upload, Download } from 'lucide-react';
import { Button, Input, Modal, Pagination, PageHeader } from '../components/UI';
import { apiCall } from '../api';
import { handleExportExcel } from '../utils';

const ITEMS_PER_PAGE = 20;

const ClientsPage = ({ clients, setClients, triggerToast, handleFileImport, loadAllData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState({ name: '', phone: '', city: '' });
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const handleSave = async () => {
    if (!currentClient.name || !currentClient.phone) { triggerToast("Заполните поля", 'error'); return; }
    try {
      if (currentClient.id) {
        const updated = await apiCall(`/clients/${currentClient.id}`, 'PUT', currentClient);
        setClients(clients.map(c => c.id === updated.id ? updated : c));
      } else {
        const newClient = await apiCall('/clients', 'POST', currentClient);
        setClients([...clients, newClient]);
      }
      triggerToast("Сохранено"); setIsModalOpen(false); setCurrentClient({ name: '', phone: '', city: '' });
    } catch(e) { triggerToast(e.message, 'error'); }
  };
  const handleDelete = async () => { try { await apiCall(`/clients/${confirmDeleteId}`, 'DELETE'); setClients(clients.filter(c => c.id !== confirmDeleteId)); setConfirmDeleteId(null); triggerToast("Удалено"); } catch (e) { triggerToast("Ошибка", 'error'); } };
  const handleExport = () => handleExportExcel(filteredClients.map(c => ({ Имя: c.name, Телефон: c.phone, Город: c.city })), 'clients');
  
  const filteredClients = useMemo(() => clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.city.toLowerCase().includes(search.toLowerCase())), [clients, search]);
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const openModal = (c) => { setCurrentClient(c || { name: '', phone: '', city: '' }); setIsModalOpen(true); };

  return (
    <div className="page-container">
      <PageHeader title="Клиенты" subtitle={`В базе: ${clients.length}`}>
          <Button onClick={handleExport} variant="secondary" icon={Download}>Экспорт</Button>
          <label className="cursor-pointer"><input type="file" accept=".xlsx" onChange={(e) => handleFileImport(e, '/clients/import', loadAllData)} className="hidden" /><Button variant="secondary" icon={Upload} as="span">Импорт</Button></label>
      </PageHeader>

      <div className="ui-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <Input label="Имя" value={currentClient.name} onChange={e => setCurrentClient({...currentClient, name: e.target.value})}/>
              <Input label="Город" value={currentClient.city} onChange={e => setCurrentClient({...currentClient, city: e.target.value})}/>
              <Input label="Телефон" value={currentClient.phone} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})}/>
              {/* BUTTON: PLUS ICON ONLY, GREEN */}
              <Button onClick={handleSave} icon={Plus} variant="success"></Button>
          </div>
          <div className="relative"><Search className="absolute left-3 top-3 text-gray-400" size={18} /><input className="ui-input pl-10" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <div className="ui-table-wrapper flex-1">
        <div className="overflow-auto custom-scrollbar flex-1">
        <table className="ui-table">
            <thead><tr><th className="ui-th pl-6 w-[30%]">Имя</th><th className="ui-th w-[25%]">Город</th><th className="ui-th w-[30%]">Телефон</th><th className="ui-th pr-6 text-right w-[15%]"></th></tr></thead>
            <tbody>
            {paginatedClients.map(c => (
                <tr key={c.id} className="ui-tr">
                    <td className="ui-td pl-6 font-bold text-gray-800">{c.name}</td>
                    <td className="ui-td text-gray-600">{c.city}</td>
                    <td className="ui-td font-mono">{c.phone}</td>
                    <td className="ui-td pr-6 text-right">
                        <div className="ui-actions">
                            <Button onClick={() => openModal(c)} variant="primary" icon={Edit} className="w-9 h-9 px-0"/>
                            <Button onClick={() => setConfirmDeleteId(c.id)} variant="danger" icon={Trash2} className="w-9 h-9 px-0"/>
                        </div>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      <Modal title="Клиент" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} footer={<Button onClick={handleSave} variant="success">Сохранить</Button>}><div className="space-y-4"><Input label="Имя" value={currentClient.name} onChange={e => setCurrentClient({...currentClient, name: e.target.value})}/><Input label="Город" value={currentClient.city} onChange={e => setCurrentClient({...currentClient, city: e.target.value})}/><Input label="Телефон" value={currentClient.phone} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})}/></div></Modal>
      {confirmDeleteId && <Modal title="Удаление" onClose={() => setConfirmDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={handleDelete}>Удалить</Button></>}><p className="text-center text-gray-600">Удалить клиента?</p></Modal>}
    </div>
  );
};
export default ClientsPage;