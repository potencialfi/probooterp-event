import React, { useState, useMemo } from 'react';
import { ShoppingBag, Footprints, Wallet, CreditCard, Eye, EyeOff, Plus, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { convertPrice } from '../utils';
import { PageHeader, Button } from '../components/UI';

const DashboardPage = ({ orders = [], clients = [], setActiveTab, settings }) => {
  const [showStats, setShowStats] = useState(false); // По умолчанию скрыто
  
  const mainCurrency = settings?.mainCurrency || 'USD';

  const stats = useMemo(() => {
    if (!orders) return { totalOrders: 0, totalSumUSD: 0, totalPairs: 0, prepayments: {}, avgCheckUSD: 0 };
    
    const totalOrders = orders.length;
    const totalSumUSD = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalPairs = orders.reduce((acc, o) => acc + (o.items || []).reduce((sum, i) => sum + (i.qty || 0), 0), 0);
    const avgCheckUSD = totalOrders > 0 ? totalSumUSD / totalOrders : 0;
    
    const prepayments = { USD: 0, EUR: 0, UAH: 0 };
    orders.forEach(o => {
        if (o.payment) {
            const curr = o.payment.originalCurrency || 'USD';
            const amt = Number(o.payment.originalAmount) || 0;
            if (prepayments[curr] !== undefined) prepayments[curr] += amt;
            else prepayments[curr] = amt;
        }
    });

    return { totalOrders, totalSumUSD, totalPairs, prepayments, avgCheckUSD };
  }, [orders]);

  const totalPrepaymentInMain = useMemo(() => {
      const totalUSD = orders.reduce((acc, o) => acc + (o.payment?.prepaymentInUSD || 0), 0);
      return convertPrice(totalUSD, mainCurrency, settings.exchangeRates);
  }, [orders, mainCurrency, settings]);

  const displayValue = (value, type = 'number', prefix = '') => {
    if (showStats) {
      if (type === 'money') return `${convertPrice(value, mainCurrency, settings.exchangeRates)} ${mainCurrency}`;
      return Math.round(value).toLocaleString();
    }
    return type === 'money' ? '*****' : '***';
  };

  const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return (
    <div className="page-container">
      {/* HEADER: Заголовок + Тоггл статистики + Кнопка Новый Заказ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200 shrink-0">
         <div>
            <h1 className="page-title">Главная</h1>
            <p className="page-subtitle">{new Date().toLocaleDateString()}</p>
         </div>
         <div className="flex gap-4">
             <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                <button onClick={() => setShowStats(true)} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${showStats ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Eye size={16}/> Показать</button>
                <button onClick={() => setShowStats(false)} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${!showStats ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><EyeOff size={16}/> Скрыть</button>
             </div>
             <Button onClick={() => setActiveTab('newOrder')} variant="success" size="md" icon={Plus}>Новый заказ</Button>
         </div>
      </div>

      {/* КАРТОЧКИ СТАТИСТИКИ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Заказы */}
        <div className="ui-card flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-wide z-10"><ShoppingBag size={16}/> Всего заказов</div>
            <div className="text-4xl font-black text-gray-800 z-10">{displayValue(stats.totalOrders)}</div>
            <div className="absolute -right-4 -bottom-4 text-gray-100"><ShoppingBag size={80}/></div>
        </div>

        {/* 2. Пары */}
        <div className="ui-card flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-wide z-10"><Footprints size={16}/> Продано пар</div>
            <div className="text-4xl font-black text-gray-800 z-10">{displayValue(stats.totalPairs)}</div>
            <div className="absolute -right-4 -bottom-4 text-indigo-50"><Footprints size={80}/></div>
        </div>

        {/* 3. Выручка */}
        <div className="ui-card flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-wide z-10"><Wallet size={16}/> Общая выручка</div>
            <div className="z-10">
                <div className="text-3xl font-black text-gray-800">{displayValue(stats.totalSumUSD, 'money')}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Ср. чек: {displayValue(stats.avgCheckUSD, 'money')}</div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-green-50"><Wallet size={80}/></div>
        </div>

        {/* 4. Предоплата */}
        <div className="ui-card flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wide z-10"><CreditCard size={16}/> Предоплата</div>
            <div className="z-10">
                <div className="text-2xl font-black text-gray-800">{displayValue(totalPrepaymentInMain, 'money')}</div>
                {showStats && (
                    <div className="flex gap-2 mt-1 text-[10px] font-bold text-gray-400">
                        {stats.prepayments.USD > 0 && <span>${stats.prepayments.USD}</span>}
                        {stats.prepayments.EUR > 0 && <span>€{stats.prepayments.EUR}</span>}
                        {stats.prepayments.UAH > 0 && <span>₴{stats.prepayments.UAH}</span>}
                    </div>
                )}
            </div>
            <div className="absolute -right-4 -bottom-4 text-blue-50"><CreditCard size={80}/></div>
        </div>
      </div>

      {/* ТАБЛИЦА ЗАКАЗОВ */}
      <div className="ui-table-wrapper flex-1">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="section-title mb-0 border-0 pb-0">Последние заказы</h3>
          <button onClick={() => setActiveTab('history')} className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">Все заказы <ArrowRight size={16}/></button>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="ui-th pl-6 w-24">ID</th>
                <th className="ui-th w-32">Дата</th>
                <th className="ui-th">Клиент</th>
                <th className="ui-th text-center w-24">Пар</th>
                <th className="ui-th text-right w-36">Сумма</th>
                <th className="ui-th pr-6 text-right w-32">Действия</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => {
                const client = clients.find(c => c.id === o.clientId);
                return (
                  <tr key={o.id} className="ui-tr">
                    <td className="ui-td pl-6 font-mono font-bold text-gray-500">{o.orderId || o.id}</td>
                    <td className="ui-td text-gray-600 text-sm">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="ui-td font-bold text-gray-800">{client?.name || 'Удален'}</td>
                    <td className="ui-td text-center"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{o.items.reduce((a,i)=>a+i.qty,0)}</span></td>
                    <td className="ui-td text-right font-bold text-green-600">
                        {showStats ? `${convertPrice(o.total, mainCurrency, settings.exchangeRates)} ${mainCurrency}` : '*****'}
                    </td>
                    <td className="ui-td pr-6 text-right">
                       <div className="ui-actions">
                         <button onClick={() => setActiveTab('history')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {recentOrders.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-gray-400">Нет заказов</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;