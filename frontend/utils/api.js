// utils/api.js
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    // IMPORTANT: keep options first so signal, method, body, etc. are preserved
    ...options,
    headers,
    mode: 'cors',
    cache: 'no-store',        // prevent cross-session caching
    credentials: 'omit',      // typical for token-based APIs; adjust if you need cookies
  });
};