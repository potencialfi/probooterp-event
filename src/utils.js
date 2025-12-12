export const normalizePhone = (phone) => String(phone).replace(/\D/g, '');

export const formatPhoneNumber = (value) => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  let clean = digits;
  
  if (digits.length === 10 && digits.startsWith('0')) {
    clean = '38' + digits;
  }
  
  if (clean.length === 12 && clean.startsWith('380')) {
    return `+${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 10)} ${clean.slice(10, 12)}`;
  }
  return value; 
};

export const getNoun = (number, one, two, five) => {
  let n = Math.abs(number);
  n %= 100;
  if (n >= 5 && n <= 20) return five;
  n %= 10;
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return two;
  return five;
};

// Конвертация цены из USD (база) в целевую валюту
export const convertPrice = (priceInUSD, currency, rates) => {
  if (!currency || currency === 'USD') return Number(priceInUSD).toFixed(2);
  const rate = rates?.[currency.toLowerCase()] || 1;
  return (priceInUSD * rate).toFixed(2);
};

// Конвертация в USD (база) из другой валюты
export const convertToUSD = (amount, currency, rates) => {
  if (!amount) return 0;
  if (!currency || currency === 'USD') return Number(amount);
  const rate = rates?.[currency.toLowerCase()] || 1;
  return Number(amount) / rate;
};

export const CURRENCY_CODES = { USD: 'USD', EUR: 'EUR', UAH: 'UAH' };

// --- Excel Helpers ---
export async function ensureXLSX() {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Failed to load XLSX library"));
    document.head.appendChild(script);
  });
}

export async function handleExportExcel(data, filename) {
  try {
    const XLSX = await ensureXLSX();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (e) { console.error(e); }
}

export async function exportSingleOrderXLSX(order, client) {
    try {
        const XLSX = await ensureXLSX();
        
        const rows = [
            ["НАКЛАДНАЯ", `Заказ №${order.orderId || order.id}`],
            ["Дата", new Date(order.date).toLocaleDateString()],
            [],
            ["КЛИЕНТ"],
            ["Имя", client.name],
            ["Город", client.city],
            ["Телефон", client.phone],
            [],
            ["ТОВАРЫ"],
            ["Артикул", "Цвет", "Размеры", "Кол-во", "Цена (USD)", "Сумма (USD)"],
        ];

        order.items.forEach(item => {
            const sizesStr = item.sizes ? 
                Object.entries(item.sizes).filter(([_, q]) => q > 0).map(([s, q]) => `${s}(${q})`).join(', ') : item.note;

            rows.push([
                item.sku, 
                item.color, 
                sizesStr, 
                item.qty, 
                item.price, 
                item.total
            ]);
        });

        rows.push([]);
        rows.push(["ИТОГО", "", "", order.items.reduce((a,b)=>a+b.qty,0), "", order.total]);
        
        if (order.payment && order.payment.originalAmount) {
             rows.push(["ОПЛАЧЕНО", "", "", "", "", `${order.payment.originalAmount} ${order.payment.originalCurrency}`]);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch:20}, {wch:15}, {wch:40}, {wch:10}, {wch:12}, {wch:15}];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Order");
        XLSX.writeFile(wb, `Order_${order.orderId || order.id}.xlsx`);

    } catch (e) { console.error("Excel export error:", e); }
}