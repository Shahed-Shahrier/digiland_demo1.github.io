import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { ReactNode } from 'react';

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: UserRole[] }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user!.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
