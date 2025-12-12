import React, { useState, useMemo } from 'react';
import { ShoppingBag, Footprints, Wallet, CreditCard, Eye, EyeOff, Plus, ArrowRight } from 'lucide-react';
import { convertPrice } from '../utils';

const DashboardPage = ({ orders = [], setActiveTab, settings }) => {
  const [showStats, setShowStats] = useState(false);
  
  const mainCurrency = settings?.mainCurrency || 'USD';

  const stats = useMemo(() => {
    if (!orders) return { totalOrders: 0, totalSumUSD: 0, totalPairs: 0, prepayments: {} };
    
    const totalOrders = orders.length;
    
    // Суммируем всё в USD (база), чтобы потом конвертировать в Main Currency
    const totalSumUSD = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalPairs = orders.reduce((acc, o) => acc + (o.items || []).reduce((sum, i) => sum + (i.qty || 0), 0), 0);
    
    // Считаем предоплаты раздельно по валютам
    const prepayments = { USD: 0, EUR: 0, UAH: 0 };
    orders.forEach(o => {
        if (o.payment) {
            const curr = o.payment.originalCurrency || 'USD';
            const amt = o.payment.originalAmount || 0;
            if (prepayments[curr] !== undefined) prepayments[curr] += amt;
            else prepayments[curr] = amt;
        }
    });

    return { totalOrders, totalSumUSD, totalPairs, prepayments };
  }, [orders]);

  // Общая сумма предоплат, пересчитанная в основную валюту
  const totalPrepaymentInMain = useMemo(() => {
      let total = 0;
      // Мы можем взять сохраненный эквивалент USD из каждого заказа для точности
      const totalUSD = orders.reduce((acc, o) => acc + (o.payment?.prepaymentInUSD || 0), 0);
      return convertPrice(totalUSD, mainCurrency, settings.exchangeRates);
  }, [orders, mainCurrency, settings]);

  const displayValue = (value, type = 'number') => {
    if (showStats) {
      if (type === 'money') return `${convertPrice(value, mainCurrency, settings.exchangeRates)} ${mainCurrency}`;
      return Math.round(value).toLocaleString();
    }
    if (type === 'money') return '💰💰💰';
    return '🤫';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">Главная</h2>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mx-2">Статистика:</span>
          <button onClick={() => setShowStats(true)} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${showStats ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Eye size={16}/> Отображать</button>
          <button onClick={() => setShowStats(false)} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${!showStats ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><EyeOff size={16}/> Скрыть</button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-3xl font-bold mb-1">Оформление заказа</h3>
          <p className="text-blue-100/90 text-lg font-medium">Создайте новый заказ прямо сейчас</p>
        </div>
        <button 
          onClick={() => setActiveTab('newOrder')} 
          className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
        >
          <Plus size={24} strokeWidth={3}/> Новый заказ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><ShoppingBag size={64} className="text-gray-800"/></div>
            <div className="flex items-center gap-3 mb-3 text-gray-400 uppercase text-xs font-bold tracking-wider relative z-10"><ShoppingBag size={16} /> Всего заказов</div>
            <div className="text-3xl font-black text-gray-800 relative z-10">{displayValue(stats.totalOrders)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><Footprints size={64} className="text-indigo-600"/></div>
            <div className="flex items-center gap-3 mb-3 text-indigo-500 uppercase text-xs font-bold tracking-wider relative z-10"><Footprints size={16} /> Продано пар</div>
            <div className="text-3xl font-black text-gray-800 relative z-10">{displayValue(stats.totalPairs)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 transition-all relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><Wallet size={64} className="text-green-600"/></div>
            <div className="flex items-center gap-3 mb-3 text-green-600 uppercase text-xs font-bold tracking-wider relative z-10"><Wallet size={16} /> Общая сумма</div>
            <div className="text-3xl font-black text-gray-800 relative z-10">{displayValue(stats.totalSumUSD, 'money')}</div>
        </div>
        {/* Карточка предоплаты с детализацией */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><CreditCard size={64} className="text-blue-600"/></div>
            <div className="flex items-center gap-3 mb-3 text-blue-600 uppercase text-xs font-bold tracking-wider relative z-10"><CreditCard size={16} /> Предоплата</div>
            <div className="relative z-10">
                {showStats ? (
                    <>
                        <div className="text-xs text-gray-500 mb-1 space-y-0.5">
                            {Object.entries(stats.prepayments).map(([curr, amt]) => (
                                amt > 0 && <div key={curr} className="flex justify-between w-24 font-medium"><span>{curr}:</span> <span>{amt}</span></div>
                            ))}
                        </div>
                        <div className="text-2xl font-black text-gray-800 border-t pt-1 mt-1">
                            ≈ {totalPrepaymentInMain} {mainCurrency}
                        </div>
                    </>
                ) : <div className="text-3xl font-black text-gray-800">💰💰💰</div>}
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">Последние заказы</h3>
          <button onClick={() => setActiveTab('history')} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">Все заказы <ArrowRight size={14}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr><th className="p-4 pl-6">ID</th><th className="p-4">Дата</th><th className="p-4 text-right">Сумма</th><th className="p-4"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map(o => (
                <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 pl-6 font-mono text-gray-500">#{o.id.toString().slice(-6)}</td>
                  <td className="p-4 text-gray-800 font-medium">{new Date(o.date).toLocaleDateString()}</td>
                  <td className="p-4 text-right font-bold text-green-600">
                      {showStats ? `${convertPrice(o.total, mainCurrency, settings.exchangeRates)} ${mainCurrency}` : '💰'}
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">Завершен</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400">Пока нет заказов</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;