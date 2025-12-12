import React from 'react';
import { X, Printer, Globe } from 'lucide-react';
import { Button } from './UI';
import { IMG_URL } from '../api';
import { convertPrice } from '../utils';

const InvoicePreview = ({ order, settings, onBack }) => {
    // Безопасное получение настроек
    const mainCurrency = settings?.mainCurrency || 'USD';
    const brandName = settings?.brandName || 'SHOE EXPO';
    const brandLogo = settings?.brandLogo;
    const brandPhones = settings?.brandPhones || [];
    const exchangeRates = settings?.exchangeRates || { usd: 1, eur: 1 };

    // Дата
    const dateObj = new Date(order.date || Date.now());
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // --- ИСПРАВЛЕНИЕ НОМЕРА ЗАКАЗА ---
    // 1. Сначала ищем порядковый номер (orderId), который сохраняет сервер
    // 2. Если его нет (это предпросмотр нового заказа), берем id (который мы передаем как orders.length + 1)
    // 3. Если это старый заказ без orderId, берем timestamp (id)
    const displayId = order.orderId ? String(order.orderId) : String(order.id || '');

    const handlePrint = () => window.print();

    // --- РАСЧЕТЫ ---
    const items = order.items || [];
    
    // 1. Грязная сумма (Цена * Кол-во)
    const grossTotalUSD = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    
    // 2. Скидка на пары
    const totalPairDiscountUSD = items.reduce((acc, item) => acc + ((item.discountPerPair || 0) * item.qty), 0);
    
    // 3. Скидка на заказ
    const lumpDiscountUSD = parseFloat(order.lumpDiscount) || 0;
    
    // 4. Общая скидка
    const totalDiscountUSD = totalPairDiscountUSD + lumpDiscountUSD;
    
    // 5. Итого к оплате (Net Total)
    const netTotalUSD = Math.max(0, grossTotalUSD - totalDiscountUSD);

    // 6. Оплата и Остаток
    const payment = order.payment || {};
    const prepaymentOriginal = payment.originalAmount || 0;
    const prepaymentCurrency = payment.originalCurrency || mainCurrency;
    
    let prepaymentInUSD = payment.prepaymentInUSD;
    if (prepaymentInUSD === undefined && prepaymentOriginal > 0) {
        // Fallback для старых заказов
        if (prepaymentCurrency === 'USD') prepaymentInUSD = prepaymentOriginal;
        else prepaymentInUSD = 0; 
    }
    
    const remainingUSD = Math.max(0, netTotalUSD - (prepaymentInUSD || 0));

    const hasDiscount = totalDiscountUSD > 0;
    const hasPrepayment = prepaymentOriginal > 0;
    const showSubtotal = hasDiscount || hasPrepayment;

    // Форматирование размеров
    const formatSizes = (sizes) => {
        if (!sizes) return '';
        if (typeof sizes === 'string') return sizes;
        return Object.entries(sizes)
            .filter(([_, q]) => q > 0)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([s, q]) => `${s}(${q})`)
            .join(', ');
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Панель управления */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">Предпросмотр накладной</h2>
                </div>
                <div className="flex gap-2">
                    <Button onClick={onBack} variant="secondary" icon={X}>Закрыть</Button>
                    <Button onClick={handlePrint} icon={Printer}>Печать</Button>
                </div>
            </div>

            {/* Лист А4 */}
            <div className="flex-1 overflow-auto p-8 custom-scrollbar print:p-0 print:overflow-visible">
                <div className="bg-white max-w-[210mm] min-h-[297mm] mx-auto p-8 shadow-lg print:shadow-none print:m-0 print:w-full print:h-auto print:min-h-0 flex flex-col justify-between" id="invoice">
                    
                    <div>
                        {/* Шапка */}
                        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                            <div>
                                {brandLogo ? (
                                    <img src={`${IMG_URL}/${brandLogo}`} alt={brandName} className="h-10 object-contain mb-3" onError={(e) => e.target.style.display = 'none'} />
                                ) : (
                                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2 uppercase">{brandName}</h1>
                                )}
                                
                                <div className="space-y-0.5 text-sm">
                                    {brandPhones.map((phone, idx) => (
                                        <p key={idx} className="text-gray-600 font-medium">{phone}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-gray-800 mb-1">Заказ №{displayId}</div>
                                <div className="text-sm text-gray-500">{dateStr} {timeStr}</div>
                            </div>
                        </div>

                        {/* Инфо о клиенте */}
                        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                            <div>
                                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-1">Клиент</h3>
                                <div className="font-bold text-base text-gray-900 leading-tight">{order.client?.name || 'Не указан'}</div>
                                <div className="text-gray-600 leading-tight">{order.client?.city}</div>
                                <div className="text-gray-600 font-mono mt-0.5">{order.client?.phone}</div>
                            </div>
                            <div className="text-right">
                                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-1">Детали</h3>
                                <div className="flex justify-end gap-4 border-b border-gray-100 pb-0.5 mb-0.5">
                                    <span className="text-gray-500">Позиций:</span>
                                    <span className="font-bold">{items.length}</span>
                                </div>
                                <div className="flex justify-end gap-4">
                                    <span className="text-gray-500">Всего пар:</span>
                                    <span className="font-bold">{items.reduce((a,b)=>a+b.qty,0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Таблица товаров */}
                        <table className="w-full text-left text-xs mb-6">
                            <thead>
                                <tr className="border-b-2 border-gray-800 text-gray-600 uppercase tracking-wider">
                                    <th className="py-2 font-bold w-[25%]">Модель / Цвет</th>
                                    <th className="py-2 font-bold w-[45%]">Размеры</th>
                                    <th className="py-2 text-center font-bold">Кол-во</th>
                                    <th className="py-2 text-right font-bold">Цена</th>
                                    <th className="py-2 text-right font-bold">Сумма</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2 align-top pr-2">
                                            <div className="font-bold text-gray-900 leading-tight">
                                                {item.sku}<span className="font-normal text-gray-500"> / {item.color}</span>
                                            </div>
                                            {item.discountPerPair > 0 && <div className="text-[10px] text-green-600 mt-0.5">Скидка: -{convertPrice(item.discountPerPair, mainCurrency, exchangeRates)} {mainCurrency}/пара</div>}
                                        </td>
                                        <td className="py-2 align-top text-gray-600 leading-snug pr-2">
                                            {item.sizes ? formatSizes(item.sizes) : item.note}
                                        </td>
                                        <td className="py-2 align-top text-center font-medium">{item.qty}</td>
                                        <td className="py-2 align-top text-right text-gray-600">
                                            {convertPrice(item.price, mainCurrency, exchangeRates)}
                                        </td>
                                        <td className="py-2 align-top text-right font-bold text-gray-900">
                                            {convertPrice(item.price * item.qty, mainCurrency, exchangeRates)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Блок Итогов */}
                        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 text-sm">
                            <div className="w-full max-w-lg flex justify-between items-end">
                                
                                {/* ЛЕВАЯ ЧАСТЬ: Сумма, Скидка, Оплата */}
                                <div className="text-right text-gray-600 space-y-1 flex-1 pr-10">
                                    {showSubtotal && (
                                        <div className="flex justify-end gap-4">
                                            <span className="text-gray-400">Сумма:</span>
                                            <span className="font-medium text-gray-900">{convertPrice(grossTotalUSD, mainCurrency, exchangeRates)} {mainCurrency}</span>
                                        </div>
                                    )}
                                    
                                    {hasDiscount && (
                                        <div className="flex justify-end gap-4 text-green-600">
                                            <span>Скидка:</span>
                                            <span>-{convertPrice(totalDiscountUSD, mainCurrency, exchangeRates)} {mainCurrency}</span>
                                        </div>
                                    )}

                                    {hasPrepayment && (
                                        <div className="flex justify-end gap-4 font-medium text-gray-800 pt-1 mt-1 border-t border-dashed border-gray-200">
                                            <span>Оплачено:</span>
                                            <span>{prepaymentOriginal} {prepaymentCurrency}</span>
                                        </div>
                                    )}
                                </div>

                                {/* ПРАВАЯ ЧАСТЬ: ИТОГ/ОСТАТОК */}
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                                        {hasPrepayment ? 'Остаток' : 'Итого'}
                                    </div>
                                    <div className="text-2xl font-black text-blue-600 leading-none whitespace-nowrap">
                                        {convertPrice(remainingUSD, mainCurrency, exchangeRates)} {mainCurrency}
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Поля для подписей */}
                        {hasPrepayment && (
                            <div className="grid grid-cols-2 gap-16 mt-16 mb-8">
                                <div>
                                    <div className="border-b border-gray-400 mb-1"></div>
                                    <div className="text-center text-[10px] text-gray-400 uppercase tracking-wide">Представитель бренда</div>
                                </div>
                                <div>
                                    <div className="border-b border-gray-400 mb-1"></div>
                                    <div className="text-center text-[10px] text-gray-400 uppercase tracking-wide">Клиент</div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="mt-auto">
                        <div className="text-center text-gray-800 font-medium text-sm mb-4">Спасибо за ваш заказ!</div>
                        
                        <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400">
                            <div className="flex items-center gap-2">
                                <span>Создано в</span>
                                <img src={`${IMG_URL}/proboot-invoice.png`} alt="ProBoot" className="h-4 opacity-70" onError={(e) => e.target.style.display = 'none'} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe size={12}/> <span>proboot.app</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreview;