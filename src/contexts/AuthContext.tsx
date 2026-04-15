import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { getUsers, addUser, addAuditLog, generateId } from '@/services/storageService';
import { initializeSeedData } from '@/data/seedData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, password: string, role: UserRole, phone?: string, nid?: string, address?: string) => { success: boolean; error?: string };
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    initializeSeedData();
    const stored = localStorage.getItem('digiland_current_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (email: string, password: string) => {
    const users = getUsers();
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return { success: false, error: 'Invalid email or password' };
    setUser(found);
    localStorage.setItem('digiland_current_user', JSON.stringify(found));
    addAuditLog({ id: generateId('log'), timestamp: new Date().toISOString(), actorName: found.name, actorRole: found.role, actionType: 'Login', details: `${found.name} logged in` });
    return { success: true };
  };

  const register = (name: string, email: string, password: string, role: UserRole, phone?: string, nid?: string, address?: string) => {
    const users = getUsers();
    if (users.find(u => u.email === email)) return { success: false, error: 'Email already registered' };
    const newUser: User = { id: generateId('user'), name, email, password, role, phone, nid, address, createdAt: new Date().toISOString() };
    addUser(newUser);
    setUser(newUser);
    localStorage.setItem('digiland_current_user', JSON.stringify(newUser));
    addAuditLog({ id: generateId('log'), timestamp: new Date().toISOString(), actorName: name, actorRole: role, actionType: 'Registration', details: `New ${role} registered: ${name}` });
    return { success: true };
  };

  const logout = () => {
    if (user) {
      addAuditLog({ id: generateId('log'), timestamp: new Date().toISOString(), actorName: user.name, actorRole: user.role, actionType: 'Logout', details: `${user.name} logged out` });
    }
    setUser(null);
    localStorage.removeItem('digiland_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
