const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || 'http://localhost:5000';

export const API_BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api`;
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_ORIGIN;
