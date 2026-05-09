import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';
import { addAuditLog, createUserProfile, generateId, getUserProfileByAuthId, initializeAppData, refreshAppData } from '@/services/storageService';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (name: string, email: string, password: string, role: UserRole, phone?: string, nid?: string, address?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function profileForSession(session: Session | null) {
  if (!session?.user.id) return null;
  return getUserProfileByAuthId(session.user.id, session.user.email);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        await initializeAppData();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const profile = await profileForSession(data.session);
        if (!mounted) return;
        setSession(data.session);
        setUser(profile);
      } catch (error) {
        if (!mounted) return;
        setBootError(error instanceof Error ? error.message : 'Could not initialize Supabase');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    boot();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void profileForSession(nextSession)
        .then(setUser)
        .catch(error => setBootError(error instanceof Error ? error.message : 'Could not load user profile'));
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login: AuthContextType['login'] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    try {
      const profile = await profileForSession(data.session);
      if (!profile) return { success: false, error: 'Signed in, but no matching Digi-Land profile exists.' };
      setSession(data.session);
      setUser(profile);
      await refreshAppData();
      void addAuditLog({ id: generateId('log'), timestamp: new Date().toISOString(), actorName: profile.name, actorRole: profile.role, actionType: 'Login', details: `${profile.name} logged in` });
      return { success: true, user: profile };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not load user profile' };
    }
  };

  const register: AuthContextType['register'] = async (name, email, password, role, phone, nid, address) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          requested_role: role,
        },
      },
    });

    if (error) return { success: false, error: error.message };

    try {
      const profile = await createUserProfile({ name, email, authUserId: data.user?.id, role, phone, nid, address });
      setSession(data.session);
      setUser(profile);
      await refreshAppData();
      void addAuditLog({ id: generateId('log'), timestamp: new Date().toISOString(), actorName: name, actorRole: role, actionType: 'Registration', details: `New ${role} registered: ${name}` });
      return { success: true, user: profile };
    } catch (profileError) {
      return {
        success: false,
        error: profileError instanceof Error
          ? `Auth account created, but profile setup failed: ${profileError.message}`
          : 'Auth account created, but profile setup failed',
      };
    }
  };

  const logout = async () => {
    const currentUser = user;
    if (currentUser) {
      void addAuditLog({ id: generateId('log'), timestamp: new Date().toISOString(), actorName: currentUser.name, actorRole: currentUser.role, actionType: 'Logout', details: `${currentUser.name} logged out` });
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading Digi-Land...
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md rounded-md border bg-card p-4 text-sm text-card-foreground">
          <p className="font-medium">Supabase connection failed</p>
          <p className="mt-2 text-muted-foreground">{bootError}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
