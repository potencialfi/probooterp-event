import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertTriangle, X } from 'lucide-react';

export const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', icon: Icon, disabled }) => {
  const baseStyle = "flex items-center gap-2 rounded-xl transition-all duration-200 font-medium justify-center active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-2 py-1 text-xs", md: "px-4 py-2.5 text-sm", compact: "px-3 py-2 text-sm", lg: "px-6 py-3 text-lg" };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
};

export const Input = ({ label, error, icon: Icon, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full text-left relative">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
    <div className="relative">
      {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon size={18} /></div>}
      <input 
        className={`border rounded-xl ${Icon ? 'pl-10' : 'px-4'} pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all placeholder:text-gray-300 ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`} 
        {...props} 
      />
    </div>
    {error && <span className="text-xs text-red-500 font-bold flex items-center gap-1 animate-fade-in"><AlertTriangle size={12}/> {error}</span>}
  </div>
);

export const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const isSuccess = type === 'success';
  return createPortal(
    <div className={`fixed top-6 left-1/2 md:left-[calc(50%+9rem)] transform -translate-x-1/2 z-[110] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-slide-down transition-all duration-300 border ${isSuccess ? 'bg-white border-green-100 text-gray-800' : 'bg-white border-red-100 text-gray-800'}`}>
      <div className={`rounded-full p-2 ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {isSuccess ? <Check size={20} strokeWidth={3} /> : <AlertTriangle size={20} />}
      </div>
      <div>
        <h4 className={`font-bold text-sm leading-tight ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>{isSuccess ? 'Успешно' : 'Ошибка'}</h4>
        <p className="text-sm text-gray-600 leading-tight">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"><X size={18}/></button>
    </div>, document.body
  );
};

export const Modal = ({ title, children, onClose, footer }) => {
  return createPortal(
    <div className="fixed inset-0 md:left-72 bg-gray-900/20 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all scale-100 border border-gray-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="font-bold text-xl text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>, document.body
  );
};

export const ImportResultModal = ({ result, onClose }) => {
  if (!result) return null;
  return (
    <Modal title="Результаты импорта" onClose={onClose} footer={<Button onClick={onClose} variant="primary">Отлично</Button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
            <div className="text-3xl font-bold text-green-600 mb-1">{result.added}</div>
            <div className="text-xs text-green-600/80 uppercase font-bold tracking-wider">Добавлено</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
            <div className="text-3xl font-bold text-blue-600 mb-1">{result.updated}</div>
            <div className="text-xs text-blue-600/80 uppercase font-bold tracking-wider">Обновлено</div>
          </div>
        </div>
        {result.errors.length > 0 ? (
          <div className="mt-4">
            <div className="text-sm font-bold text-red-600 mb-2">Ошибки ({result.errors.length}):</div>
            <div className="bg-red-50 border border-red-100 rounded-lg max-h-40 overflow-y-auto p-3 text-sm text-red-700 space-y-1 custom-scrollbar">
              {result.errors.map((err, idx) => <div key={idx} className="border-b border-red-100 last:border-0 pb-1">{err}</div>)}
            </div>
          </div>
        ) : <div className="text-center text-gray-400 text-sm mt-2 flex items-center justify-center gap-2"><Check size={16}/> Ошибок нет</div>}
      </div>
    </Modal>
  );
};