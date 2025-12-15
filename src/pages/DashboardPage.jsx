import React, { useState, useMemo } from 'react';
import { ShoppingBag, Footprints, Wallet, CreditCard, Eye, EyeOff, Plus, ArrowRight, Edit } from 'lucide-react';
import { convertPrice } from '../utils';
import { PageHeader, Button } from '../components/UI';

const DashboardPage = ({ orders = [], clients = [], setActiveTab, settings }) => {
  const [showStats, setShowStats] = useState(false);
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

  const displayValue = (value, type = 'number') => {
    if (showStats) {
      if (type === 'money') return `${convertPrice(value, mainCurrency, settings.exchangeRates)} ${mainCurrency}`;
      return Math.round(value).toLocaleString();
    }
    return type === 'money' ? '*****' : '***';
  };

  const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return (
    <div className="page-container">
      <div className="page-header-card">
         <div className="page-header-group"><h1 className="text-h1">Главная</h1><p className="text-subtitle">Сегодня {new Date().toLocaleDateString()}</p></div>
         <div className="page-header-actions">
             <div className="toggle-wrapper">
                <button onClick={() => setShowStats(true)} className={`toggle-btn ${showStats ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}><Eye/> Показать</button>
                <button onClick={() => setShowStats(false)} className={`toggle-btn ${!showStats ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}><EyeOff/> Скрыть</button>
             </div>
             <Button onClick={() => setActiveTab('newOrder')} variant="success" size="md" icon={Plus}>Новый заказ</Button>
         </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
            <div className="stat-header st-neutral"><ShoppingBag/> Всего заказов</div>
            <div className="stat-val-xl">{displayValue(stats.totalOrders)}</div>
            <div className="bg-st-neutral"><ShoppingBag/></div>
        </div>
        <div className="stat-card">
            <div className="stat-header st-indigo"><Footprints/> Продано пар</div>
            <div className="stat-val-xl">{displayValue(stats.totalPairs)}</div>
            <div className="bg-st-indigo"><Footprints/></div>
        </div>
        <div className="stat-card">
            <div className="stat-header st-green"><Wallet/> Общая выручка</div>
            <div className="z-10"><div className="stat-val-lg">{displayValue(stats.totalSumUSD, 'money')}</div><div className="stat-subtext">Ср. чек: {displayValue(stats.avgCheckUSD, 'money')}</div></div>
            <div className="bg-st-green"><Wallet/></div>
        </div>
        <div className="stat-card">
            <div className="stat-header st-blue"><CreditCard/> Предоплата</div>
            <div className="z-10"><div className="stat-val-md">{displayValue(totalPrepaymentInMain, 'money')}</div>{showStats && (<div className="stat-code-group">{stats.prepayments.USD > 0 && <span>${stats.prepayments.USD}</span>}{stats.prepayments.EUR > 0 && <span>€{stats.prepayments.EUR}</span>}{stats.prepayments.UAH > 0 && <span>₴{stats.prepayments.UAH}</span>}</div>)}</div>
            <div className="bg-st-blue"><CreditCard/></div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header"><h3 className="section-title-clean">Последние заказы</h3><button onClick={() => setActiveTab('history')} className="link-action">Все заказы <ArrowRight/></button></div>
        <div className="table-scroll-area">
          <table className="data-table">
            <thead><tr><th className="th-base col-id">ID</th><th className="th-base col-date">Дата</th><th className="th-base">Клиент</th><th className="th-base col-stat">Пар</th><th className="th-base col-money">Сумма</th><th className="th-base col-action"></th></tr></thead>
            <tbody>
              {recentOrders.map(o => {
                const client = clients.find(c => c.id === o.clientId);
                return (
                  <tr key={o.id} className="tr-row">
                    <td className="td-id">#{o.orderId || o.id}</td>
                    <td className="td-date">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="td-title">{client?.name || 'Удален'}</td>
                    <td className="td-center"><span className="badge badge-neutral">{o.items.reduce((a,i)=>a+i.qty,0)}</span></td>
                    <td className="td-money">{showStats ? `${convertPrice(o.total, mainCurrency, settings.exchangeRates)} ${mainCurrency}` : '*****'}</td>
                    <td className="td-actions"><div className="actions-group"><button onClick={() => setActiveTab('history')} className="btn-action-primary"><Edit/></button></div></td>
                  </tr>
                );
              })}
              {recentOrders.length === 0 && <tr><td colSpan="6" className="td-empty">Нет заказов</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;