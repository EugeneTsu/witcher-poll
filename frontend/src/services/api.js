// frontend/src/services/api.js
// Сервис для взаимодействия с бэкендом через HTTP-запросы

import axios from 'axios';

// Базовый URL API
const API_BASE = 'http://127.0.0.1:8000/api';

// Аутентификация: вход и получение токена
export const login = async (username, password) => {
  const response = await axios.post(`${API_BASE}/login/`, { username, password });
  return response.data.token;
};

// Получение списка опросов с авторизацией по токену
export const getPolls = async (token) => {
  // Устанавливаем заголовок авторизации для всех последующих запросов
  axios.defaults.headers.common['Authorization'] = `Token ${token}`;
  const response = await axios.get(`${API_BASE}/polls/`);
  return response.data;
};