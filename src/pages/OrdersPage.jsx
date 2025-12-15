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
         <div className="search-wrapper"><Search className="search-icon" /><input className="search-input" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </PageHeader>

      <div className="table-card">
        <div className="table-scroll-area">
        <table className="data-table">
            <thead><tr><th className="th-base col-id">№</th><th className="th-base col-date">Дата</th><th className="th-base">Клиент</th><th className="th-base col-phone">Телефон</th><th className="th-base col-stat">Пар</th><th className="th-base col-money">Сумма</th><th className="th-base col-action"></th></tr></thead>
            <tbody>
            {paginatedOrders.map(o => {
                const client = clients.find(c => c.id === o.clientId);
                return (
                <tr key={o.id} className="tr-row">
                    <td className="td-id">#{o.orderId || o.id}</td>
                    <td className="td-date">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="td-title">{client?.name || 'Удален'}</td>
                    <td className="td-mono">{client?.phone || '-'}</td>
                    <td className="td-center"><span className="badge badge-neutral">{o.items.reduce((a,i)=>a+i.qty,0)}</span></td>
                    <td className="td-money">{convertPrice(o.total, mainCurrency, settings.exchangeRates)} {mainCurrency}</td>
                    <td className="td-actions">
                        <div className="actions-group">
                            <button onClick={() => setViewId(o.id)} className="btn-action-secondary"><Eye/></button>
                            <button onClick={() => handleDownload(o)} className="btn-action-secondary"><Download/></button>
                            <button onClick={() => onEdit(o)} className="btn-action-primary"><Edit/></button>
                            <button onClick={() => setDeleteId(o.id)} className="btn-action-danger"><Trash2/></button>
                        </div>
                    </td>
                </tr>
            )})}
            {filteredOrders.length === 0 && <tr><td colSpan="7" className="td-empty">Нет заказов</td></tr>}
            </tbody>
        </table>
        </div>
      </div>
      
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      {deleteId && <Modal title="Удаление" onClose={() => setDeleteId(null)} footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Отмена</Button><Button variant="danger" onClick={handleDelete}>Удалить</Button></>}><div className="text-center py-6 text-gray-600">Вы уверены? Заказ будет удален безвозвратно.</div></Modal>}
    </div>
  );
};
export default OrdersPage;