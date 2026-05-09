import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';
import { addAuditLog, generateId, getUserProfileByAuthId, initializeAppData, refreshAppData } from '@/services/storageService';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (name: string, email: string, password: string, role?: UserRole, phone?: string, nid?: string, address?: string) => Promise<{ success: boolean; error?: string; user?: User; needsEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function profileForSession(session: Session | null) {
  if (!session?.user.id) return null;
  return getUserProfileByAuthId(session.user.id, session.user.email);
}

async function registrationFieldExists(column: 'phone' | 'nid_number', value: string) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id')
    .eq(column, value)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.warn(`Could not pre-check ${column} uniqueness. Backend constraints should still enforce it.`, error);
    return false;
  }

  return Boolean(data);
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
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const profile = await profileForSession(data.session);
        if (profile) await initializeAppData();
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      void profileForSession(nextSession)
        .then(profile => {
          if (mounted) setUser(profile);
        })
        .catch(error => {
          if (mounted) setBootError(error instanceof Error ? error.message : 'Could not load user profile');
        });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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

  const register: AuthContextType['register'] = async (
    name,
    email,
    password,
    _role,
    phone,
    nid,
    _address,
  ) => {
    const normalizedPhone = phone?.trim();
    const normalizedNid = nid?.trim();

    if (!normalizedPhone || normalizedPhone.length < 7) {
      return { success: false, error: 'A valid unique phone number is required.' };
    }

    if (!normalizedNid) {
      return { success: false, error: 'A unique NID number is required.' };
    }

    const [phoneExists, nidExists] = await Promise.all([
      registrationFieldExists('phone', normalizedPhone),
      registrationFieldExists('nid_number', normalizedNid),
    ]);

    if (phoneExists) {
      return { success: false, error: 'This phone number is already registered.' };
    }

    if (nidExists) {
      return { success: false, error: 'This NID number is already registered.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: normalizedPhone,
          nid_number: normalizedNid,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user?.id) {
      return { success: false, error: 'Auth account was not created.' };
    }

    if (!data.session) {
      return {
        success: true,
        error: 'Account created. Please confirm your email, then sign in.',
      };
    }

    try {
      await refreshAppData();

      const profile = await getUserProfileByAuthId(
        data.user.id,
        data.user.email,
      );

      if (!profile) {
        return {
          success: false,
          error: 'Account created, but profile was not found. Please try signing in.',
        };
      }

      setSession(data.session);
      setUser(profile);

      return { success: true, user: profile };
    } catch (profileError) {
      return {
        success: false,
        error:
          profileError instanceof Error
            ? profileError.message
            : 'Account created, but profile could not be loaded.',
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
