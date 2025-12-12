import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const menu = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
    { id: 'newOrder', label: 'Новый заказ', icon: ShoppingCart },
    { id: 'models', label: 'Модели', icon: Package },
    { id: 'clients', label: 'Клиенты', icon: Users },
    { id: 'history', label: 'История', icon: FileText },
    { id: 'settings', label: 'Настройки', icon: Settings }
  ];

  return (
    <aside className="w-72 bg-slate-900 text-white flex-col hidden md:flex shadow-2xl z-30">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-black flex items-center gap-2">👟 ShoeExpo <span className="text-blue-500">Pro</span></h1>
        <div className="text-xs text-slate-400 mt-2 flex justify-between items-center">
          <span>{user.name}</span>
          <button onClick={onLogout} className="hover:text-white transition-colors">Выход</button>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menu.map(i => (
          <button 
            key={i.id} 
            onClick={() => setActiveTab(i.id)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === i.id ? 'bg-blue-600 text-white translate-x-1' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <i.icon size={20}/>{i.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;