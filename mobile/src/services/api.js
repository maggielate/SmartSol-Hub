import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.smartsolhub.co.zw/api'; // production
// const API_URL = 'http://10.0.2.2:3000/api'; // Android emulator

const api = axios.create({ baseURL: API_URL, timeout: 10000 });

api.interceptors.request.use(async cfg => {
  const token = await AsyncStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const authAPI = {
  login: (phone, password) => api.post('/auth/login', { phone, password }),
  register: (data) => api.post('/auth/register', data),
};

export const unitsAPI = {
  list: () => api.get('/units'),
  get: (id) => api.get(`/units/${id}`),
};

export const telemetryAPI = {
  history: (unitId, hours = 24) => api.get(`/telemetry/${unitId}?hours=${hours}`),
  daily: (unitId) => api.get(`/telemetry/${unitId}/daily`),
};

export const paymentsAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  history: () => api.get('/payments/history'),
};

export const alertsAPI = {
  list: () => api.get('/alerts'),
};

export const predictionsAPI = {
  get: (unitId) => api.get(`/predictions/${unitId}`),
};

export default api;
