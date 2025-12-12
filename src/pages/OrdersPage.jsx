import React, { useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { Button } from '../components/UI';

const OrdersPage = ({ orders, clients }) => {
  const [viewId, setViewId] = useState(null);
  const order = orders.find(o => o.id === viewId);
  
  if (order) {
    const client = clients.find(c => c.id === order.clientId) || { name: 'Удален', city: '' };
    return (
      <div className="bg-white p-8 max-w-4xl mx-auto shadow-lg animate-fade-in" id="invoice">
        <div className="flex justify-between mb-8 print:hidden">
            <Button onClick={() => setViewId(null)} variant="secondary" icon={X}>Назад</Button>
            <Button onClick={() => window.print()} icon={Printer}>Печать</Button>
        </div>
        <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">INVOICE #{order.id.toString().slice(-6)}</h1>
                <p className="text-gray-500">{new Date(order.date).toLocaleString()}</p>
            </div>
            <div className="text-right">
                <div className="text-2xl font-bold">SHOE EXPO</div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div>
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-1">Клиент</h3>
                <p className="font-bold text-lg text-gray-800">{client.name}</p>
                <p className="text-gray-600">{client.city}</p>
                <p className="text-gray-600 font-mono mt-1">{client.phone}</p>
            </div>
            <div className="text-right">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-1">Поставщик</h3>
                <p className="font-bold text-lg text-gray-800">SHOE EXPO</p>
            </div>
        </div>
        <table className="w-full text-left mb-8">
          <thead>
              <tr className="border-b-2 border-gray-800">
                  <th className="pb-2 font-bold">Модель</th>
                  <th className="pb-2 font-bold">Размеры</th>
                  <th className="pb-2 text-center font-bold">Кол-во</th>
                  <th className="pb-2 text-right font-bold">Цена</th>
                  <th className="pb-2 text-right font-bold">Сумма</th>
              </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
              {order.items.map((i, x) => (
                  <tr key={x}>
                      <td className="py-3"><span className="font-bold">{i.sku}</span><br/><span className="text-sm text-gray-500">{i.color}</span></td>
                      <td className="py-3 text-sm text-gray-600">{i.note}</td>
                      <td className="py-3 text-center font-medium">{i.qty}</td>
                      <td className="py-3 text-right text-gray-600">{i.price} USD</td>
                      <td className="py-3 text-right font-bold">{i.total} USD</td>
                  </tr>
              ))}
          </tbody>
          <tfoot>
              <tr className="border-t-2 border-gray-800">
                  <td colSpan="4" className="pt-4 text-right font-bold text-xl">ИТОГО:</td>
                  <td className="pt-4 text-right font-bold text-xl">{order.total} USD</td>
              </tr>
              {order.payment && (
                  <tr>
                      <td colSpan="4" className="pt-2 text-right text-sm text-gray-500 uppercase tracking-wide">Предоплата:</td>
                      {/* Показываем оригинальную валюту предоплаты */}
                      <td className="pt-2 text-right font-bold text-green-600">
                          {order.payment.originalAmount} {order.payment.originalCurrency}
                      </td>
                  </tr>
              )}
          </tfoot>
        </table>
        <div className="text-center text-gray-400 text-sm mt-12 print:hidden">Спасибо за заказ!</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800 tracking-tight">История заказов</h2></div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider"><tr><th className="p-4">#</th><th className="p-4">Дата</th><th className="p-4">Клиент</th><th className="p-4 text-right">Сумма (USD)</th><th className="p-4"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
            {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-gray-500 text-sm">#{o.id.toString().slice(-6)}</td>
                    <td className="p-4 text-gray-800">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="p-4 text-gray-700 font-medium">{clients.find(c=>c.id===o.clientId)?.name || 'Удален'}</td>
                    <td className="p-4 text-right font-bold text-green-600">{o.total} USD</td>
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