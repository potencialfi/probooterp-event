import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '../components/UI';
import InvoicePreview from '../components/InvoicePreview';
import { convertPrice } from '../utils';

const OrdersPage = ({ orders, clients, settings }) => {
  const [viewId, setViewId] = useState(null);
  const order = orders.find(o => o.id === viewId);
  const mainCurrency = settings?.mainCurrency || 'USD';
  
  if (order) {
    const client = clients.find(c => c.id === order.clientId) || { name: 'Удален', city: '' };
    
    // Формируем объект для превью
    const orderForPreview = {
        ...order,
        client: { name: client.name, city: client.city, phone: client.phone },
    };

    return (
      <InvoicePreview 
          order={orderForPreview}
          settings={settings}
          onBack={() => setViewId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800 tracking-tight">История заказов</h2></div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4">№</th><th className="p-4">Дата</th><th className="p-4">Клиент</th><th className="p-4 text-right">Сумма ({mainCurrency})</th><th className="p-4"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
            {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    {/* Отображаем красивый номер заказа */}
                    <td className="p-4 font-mono text-gray-800 font-bold">№{o.orderId || o.id}</td>
                    <td className="p-4 text-gray-800">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="p-4 text-gray-700 font-medium">{clients.find(c=>c.id===o.clientId)?.name || 'Удален'}</td>
                    <td className="p-4 text-right font-bold text-green-600">
                        {convertPrice(o.total, mainCurrency, settings.exchangeRates)}
                    </td>
                    <td className="p-4 text-center"><Button onClick={() => setViewId(o.id)} size="sm" variant="secondary" icon={FileText}>Открыть</Button></td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;