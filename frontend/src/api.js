import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  const tenantSlug = localStorage.getItem('tenantSlug');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug;
  return config;
});

export default api;
