export const API_URL = 'http://localhost:3001/api';

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const contentType = res.headers.get("content-type");
    if (!contentType || contentType.indexOf("application/json") === -1) {
       throw new Error("Сервер не отвечает корректно.");
    }
    const data = await res.json();
    
    if (!res.ok) {
       const error = new Error(data.message || 'Ошибка сервера');
       error.field = data.field; 
       throw error;
    }
    return data;
  } catch (err) {
    throw err;
  }
};