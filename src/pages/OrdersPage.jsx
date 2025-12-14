import React, { useState, useEffect } from 'react';
import { FileText, Eye, Trash2, Search, Edit, Download } from 'lucide-react';
import { Button, Modal, Pagination, PageHeader } from '../components/UI';
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
    return <InvoicePreview order={{ ...orderToView, client }} settings={settings} onBack={() => setViewId(null)} />;
  }

  const filteredOrders = orders.filter(o => { const c = clients.find(x => x.id === o.clientId); const s = search.toLowerCase(); return String(o.orderId || o.id).includes(s) || (c?.name || '').toLowerCase().includes(s) || (c?.phone || '').includes(s); });
  const handleDelete = async () => { try { await apiCall(`/orders/${deleteId}`, 'DELETE'); setOrders(orders.filter(o => o.id !== deleteId)); setDeleteId(null); triggerToast("Удалено"); } catch (e) { triggerToast("Ошибка", "error"); } };
  const handleDownload = (o) => exportSingleOrderXLSX(o, clients.find(c => c.id === o.clientId), settings);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="page-container">
      <PageHeader title="История заказов" subtitle={`Всего: ${orders.length}`}>
         <div className="relative w-full md:w-80"><Search className="absolute left-3 top-3.5 text-gray-400" size={20} /><input className="ui-input pl-12" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </PageHeader>

      <div className="ui-table-wrapper flex-1">
        <div className="overflow-auto custom-scrollbar flex-1">
        <table className="ui-table">
            <thead><tr><th className="ui-th pl-8 w-24">№</th><th className="ui-th w-32">Дата</th><th className="ui-th">Клиент</th><th className="ui-th w-40">Телефон</th><th className="ui-th text-center w-24">Пар</th><th className="ui-th text-right w-32">Сумма</th><th className="ui-th pr-8 text-right w-40"></th></tr></thead>
            <tbody>
            {paginatedOrders.map(o => {
                const client = clients.find(c => c.id === o.clientId);
                return (
                <tr key={o.id} className="ui-tr">
                    <td className="ui-td pl-8 font-mono font-bold text-gray-900">{o.orderId || o.id}</td>
                    <td className="ui-td text-gray-500">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="ui-td font-medium">{client?.name || 'Удален'}</td>
                    <td className="ui-td font-mono text-base text-gray-500">{client?.phone || '-'}</td>
                    <td className="ui-td text-center"><span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-xl font-bold text-sm">{o.items.reduce((a,i)=>a+i.qty,0)}</span></td>
                    <td className="ui-td text-right font-bold text-green-600">{convertPrice(o.total, mainCurrency, settings.exchangeRates)} {mainCurrency}</td>
                    <td className="ui-td pr-8 text-right">
                        <div className="ui-actions">
                            <button onClick={() => setViewId(o.id)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl" title="Открыть"><Eye size={24}/></button>
                            <button onClick={() => handleDownload(o)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl" title="Excel"><Download size={24}/></button>
                            {/* РЕДАКТИРОВАНИЕ - СИНИЙ */}
                            <button onClick={() => onEdit(o)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl" title="Редактировать"><Edit size={24}/></button>
                            {/* УДАЛЕНИЕ - КРАСНЫЙ */}
                            <button onClick={() => setDeleteId(o.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Удалить"><Trash2 size={24}/></button>
                        </div>
                    </td>
                </tr>
            )})}
            {filteredOrders.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-gray-400 text-lg">Нет заказов</td></tr>}
            </tbody>
        </table>
        </div>
      </div>
      
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      {deleteId && <Modal title="Удаление" onClose={() => setDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={handleDelete}>Удалить</Button></>}><div className="text-center py-6 text-gray-600 text-lg">Вы уверены? Заказ будет удален безвозвратно.</div></Modal>}
    </div>
  );
};
export default OrdersPage;