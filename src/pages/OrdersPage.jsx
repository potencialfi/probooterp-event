import React, { useState, useEffect } from 'react';
import { FileText, Eye, Trash2, Search, Edit, Download } from 'lucide-react';
import { Button, Modal, Pagination } from '../components/UI';
import InvoicePreview from '../components/InvoicePreview';
import { apiCall } from '../api';
import { convertPrice, exportSingleOrderXLSX } from '../utils';

const ITEMS_PER_PAGE = 20;

const OrdersPage = ({ orders, setOrders, clients, settings, triggerToast, onEdit }) => {
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const mainCurrency = settings?.mainCurrency || 'USD';

  useEffect(() => { setCurrentPage(1); }, [search]);
  
  const orderToView = orders.find(o => o.id === viewId);
  
  if (orderToView) {
    const client = clients.find(c => c.id === orderToView.clientId) || { name: 'Удален', city: '', phone: '' };
    const orderForPreview = { ...orderToView, client: { name: client.name, city: client.city, phone: client.phone } };
    return <InvoicePreview order={orderForPreview} settings={settings} onBack={() => setViewId(null)} />;
  }

  const filteredOrders = orders.filter(o => {
      const client = clients.find(c => c.id === o.clientId);
      const searchLower = search.toLowerCase();
      const idMatch = String(o.orderId || o.id).includes(searchLower);
      const nameMatch = (client?.name || '').toLowerCase().includes(searchLower);
      const phoneMatch = (client?.phone || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''));
      return idMatch || nameMatch || phoneMatch;
  });

  const handleDelete = async () => {
      try {
          await apiCall(`/orders/${deleteId}`, 'DELETE');
          setOrders(orders.filter(o => o.id !== deleteId));
          setDeleteId(null);
          triggerToast("Заказ удален", "success");
      } catch (e) { triggerToast("Ошибка удаления", "error"); }
  };

  const handleDownload = (order) => {
      const client = clients.find(c => c.id === order.clientId) || { name: 'Unknown' };
      exportSingleOrderXLSX(order, client, settings);
  };

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-fade-in">
        
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">История заказов</h2>
            <p className="text-sm text-gray-500 mt-1">Всего заказов: {orders.length}</p>
          </div>
          <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3 text-gray-400" size={20} />
              <input className="w-full border border-gray-200 bg-gray-50 p-2.5 pl-12 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400" placeholder="Поиск по №, имени или телефону..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                    <th className="p-4 pl-6 w-20">№</th>
                    <th className="p-4 w-32">Дата</th>
                    <th className="p-4">Клиент</th>
                    <th className="p-4 w-40">Телефон</th>
                    <th className="p-4 text-center w-24">Пар</th>
                    <th className="p-4 text-right w-32">Сумма</th>
                    <th className="p-4 pr-6 text-right w-40">Действия</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
            {paginatedOrders.map(o => {
                const client = clients.find(c => c.id === o.clientId);
                const totalPairs = o.items.reduce((acc, i) => acc + i.qty, 0);
                return (
                <tr key={o.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 pl-6 font-mono text-gray-900 font-bold">{o.orderId || String(o.id).slice(-6)}</td>
                    <td className="p-4 text-gray-500">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="p-4 text-gray-900 font-medium">{client?.name || 'Удален'}</td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{client?.phone || '-'}</td>
                    <td className="p-4 text-center">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">{totalPairs}</span>
                    </td>
                    <td className="p-4 text-right font-bold text-green-600">{convertPrice(o.total, mainCurrency, settings.exchangeRates)} {mainCurrency}</td>
                    <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewId(o.id)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors" title="Открыть"><Eye size={18}/></button>
                            <button onClick={() => handleDownload(o)} className="p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600 rounded-lg transition-colors" title="Excel"><Download size={18}/></button>
                            <button onClick={() => onEdit(o)} className="p-2 text-amber-500 hover:bg-amber-100 rounded-lg transition-colors" title="Редактировать"><Edit size={18}/></button>
                            <button onClick={() => setDeleteId(o.id)} className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors" title="Удалить"><Trash2 size={18}/></button>
                        </div>
                    </td>
                </tr>
            )})}
            {filteredOrders.length === 0 && <tr><td colSpan="7" className="p-12 text-center text-gray-400">Заказов не найдено</td></tr>}
            </tbody>
        </table>
        </div>
      </div>
      
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {deleteId && <Modal title="Удаление заказа" onClose={() => setDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={handleDelete}>Удалить</Button></>}><div className="text-center py-4 text-gray-600">Вы уверены? Заказ будет удален.</div></Modal>}
    </div>
  );
};

export default OrdersPage;