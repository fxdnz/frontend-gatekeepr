// This file exports a config object and API utility functions that can be imported anywhere

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiConfig = {
  baseURL: API_BASE_URL,
};

// API Endpoints - Auth
export const AUTH_ENDPOINTS = {
  VERIFY: `${API_BASE_URL}/auth/jwt/verify/`,
  REFRESH: `${API_BASE_URL}/auth/jwt/refresh/`,
  CREATE: `${API_BASE_URL}/auth/jwt/create/`,
  ME: `${API_BASE_URL}/api/accounts/users/me/`,
  USERS: `${API_BASE_URL}/api/accounts/users/`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/users/reset_password/`,
  RESET_PASSWORD_CONFIRM: `${API_BASE_URL}/auth/users/reset_password_confirm/`,
};

// API Endpoints - Core
export const API_ENDPOINTS = {
  ACCESS_LOGS: `${API_BASE_URL}/api/access-control/access-logs/`,
  VISITORS: `${API_BASE_URL}/api/access-control/visitors/`,
  PARKING: `${API_BASE_URL}/api/access-control/parking/`,
  RESIDENTS: `${API_BASE_URL}/api/access-control/residents/`,
  RFID: `${API_BASE_URL}/api/access-control/rfid/`,
};

// Utility function to get headers with authentication
export const getAuthHeaders = (token) => {
  return {
    "Content-Type": "application/json",
    Authorization: `JWT ${token}`,
  };
};

// Utility function to get headers without authentication
export const getHeaders = () => {
  return {
    "Content-Type": "application/json",
  };
};
