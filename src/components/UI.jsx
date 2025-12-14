import React from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

export const Button = ({ children, onClick, variant = 'primary', size = 'md', icon: Icon, className = '', disabled = false, ...props }) => {
  const baseStyle = "flex items-center justify-center gap-2 font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
    compact: "px-2 py-1 text-xs"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={size === 'lg' ? 20 : 16} />}
      {children}
    </button>
  );
};

export const Input = ({ label, icon: Icon, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-3 text-gray-400" size={18} />}
      <input 
        className={`w-full border border-gray-200 bg-gray-50/50 rounded-xl ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all`}
        {...props} 
      />
    </div>
  </div>
);

export const Select = ({ label, value, onChange, children, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">{label}</label>}
    <div className="relative">
        <select
            className="w-full border border-gray-200 bg-gray-50/50 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
            value={value}
            onChange={onChange}
            {...props}
        >
            {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
        </div>
    </div>
  </div>
);

export const Modal = ({ title, children, onClose, footer, isOpen = true }) => {
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h3 className="font-bold text-xl text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6">{children}</div>
                {footer && <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
};

// ОБНОВЛЕННЫЙ TOAST: Белый, сверху по центру
export const Toast = ({ message, type = 'success', onClose }) => (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl animate-slide-down bg-white border border-gray-100 min-w-[300px]">
        {type === 'success' ? (
            <div className="bg-green-100 p-1 rounded-full text-green-600"><Check size={18}/></div>
        ) : (
            <div className="bg-red-100 p-1 rounded-full text-red-600"><AlertCircle size={18}/></div>
        )}
        <span className={`font-medium ${type === 'error' ? 'text-red-600' : 'text-gray-800'}`}>
            {message}
        </span>
        <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X size={16}/></button>
    </div>
);

export const ImportResultModal = ({ result, onClose }) => {
    if (!result) return null;
    const { added, updated, errors } = result;
    return (
        <Modal title="Результат импорта" onClose={onClose} footer={<Button onClick={onClose}>Закрыть</Button>}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-xl text-center"><div className="text-2xl font-bold text-green-600">{added}</div><div className="text-xs text-green-700 font-bold uppercase">Добавлено</div></div>
                    <div className="bg-blue-50 p-4 rounded-xl text-center"><div className="text-2xl font-bold text-blue-600">{updated}</div><div className="text-xs text-blue-700 font-bold uppercase">Обновлено</div></div>
                </div>
                {errors && errors.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="font-bold text-red-700 mb-2 text-sm flex items-center gap-2"><X size={16}/> Ошибки ({errors.length})</div>
                        <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                )}
                {errors.length === 0 && <div className="text-center text-gray-500 text-sm">Ошибок нет, все отлично!</div>}
            </div>
        </Modal>
    );
};