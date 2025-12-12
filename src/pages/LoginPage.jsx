import React, { useState } from 'react';
import { apiCall } from '../api';
import { Button, Input } from '../components/UI';

const LoginPage = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiCall('/login', 'POST', { login, password });
      if (res.success) {
        onLogin(res.user);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message || 'Ошибка подключения');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8 text-center text-gray-800">Вход</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Логин" value={login} onChange={e => setLogin(e.target.value)} />
          <Input label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-red-500 text-sm text-center font-medium">{error}</div>}
          <Button className="w-full" onClick={handleSubmit}>Войти</Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;