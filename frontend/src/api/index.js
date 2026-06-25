import axios from 'axios';

/* Web (same-origin) leaves VITE_API_URL empty → relative "/api".
   Mobile (Capacitor) builds with VITE_API_URL set to the hosted backend,
   e.g. VITE_API_URL=https://kricardz.onrender.com → "https://kricardz.onrender.com/api". */
export const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(err);
  }
);

export default api;
