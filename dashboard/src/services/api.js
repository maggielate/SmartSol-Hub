import axios from 'axios';

const api = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export const auth = {
  login: (phone, password) => api.post('/auth/login', { phone, password }),
  register: (data) => api.post('/auth/register', data),
};

export const units = {
  list: () => api.get('/units'),
  get: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
};

export const telemetry = {
  history: (unitId, hours = 24) => api.get(`/telemetry/${unitId}?hours=${hours}`),
  daily: (unitId) => api.get(`/telemetry/${unitId}/daily`),
};

export const payments = {
  initiate: (data) => api.post('/payments/initiate', data),
  history: () => api.get('/payments/history'),
};

export const gps = {
  map: () => api.get('/gps/map'),
  history: (unitId) => api.get(`/gps/${unitId}/history`),
};

export const alerts = {
  list: () => api.get('/alerts'),
  resolve: (id) => api.patch(`/alerts/${id}/resolve`),
};

export const predictions = {
  get: (unitId) => api.get(`/predictions/${unitId}`),
  trigger: (unitId) => api.post(`/predictions/${unitId}/predict`),
};

export default api;
