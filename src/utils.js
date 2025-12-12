export const normalizePhone = (phone) => String(phone).replace(/\D/g, '');

export const formatPhoneNumber = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
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

// Конвертация цены из USD в целевую валюту
export const convertPrice = (priceInUSD, currency, rates) => {
  if (currency === 'USD') return priceInUSD;
  const rate = rates?.[currency.toLowerCase()] || 1;
  return (priceInUSD * rate).toFixed(2);
};

export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', UAH: '₴' };

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