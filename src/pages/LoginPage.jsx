import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Input, Button } from '../components/UI';
import { apiCall } from '../api';

const LoginPage = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await apiCall('/login', 'POST', { phone, password });
      onLogin(user);
    } catch (err) { setError(err.message || 'Ошибка входа'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 animate-fade-in">
      <div className="ui-card w-full max-w-md border-t-4 border-t-blue-600 shadow-xl">
        <div className="text-center mb-8">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Вход в систему</h1>
          <p className="text-gray-500 text-sm mt-1">Введите данные для доступа к ShoeExpo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium border border-red-100">{error}</div>}
          <Input label="Телефон" value={phone} onChange={e => setPhone(e.target.value)} placeholder="login" autoFocus />
          <Input label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>{loading ? 'Вход...' : 'Войти'}</Button>
        </form>
        
        <div className="text-center mt-6 text-xs text-gray-400">
          ShoeExpo Pro v1.0
        </div>
      </div>
    </div>
  );
};

export default LoginPage;