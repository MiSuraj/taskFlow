import React, { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const [tenant, setTenant] = useState(() => {
    const s = localStorage.getItem('tenant');
    return s ? JSON.parse(s) : null;
  });

  const login = async (tenantSlug, username, password) => {
    const { data } = await api.post('/auth/login', { tenantSlug, username, password });
    const tenantData = data.tenant ?? data.user?.tenant;

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (tenantData) {
      localStorage.setItem('tenantSlug', tenantData.slug);
      localStorage.setItem('tenant', JSON.stringify(tenantData));
      setTenant(tenantData);
    }
    setUser(data.user);
  };

  const registerOrganization = async (payload) => {
    const { data } = await api.post('/tenants/register', payload);
    return data.tenant;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantSlug');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
  };

  const updateTenant = (nextTenant) => {
    localStorage.setItem('tenant', JSON.stringify(nextTenant));
    setTenant(nextTenant);
    setUser(prev => prev ? { ...prev, tenant: nextTenant } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, tenant, login, registerOrganization, updateTenant, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
