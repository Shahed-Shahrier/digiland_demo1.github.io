import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { ReactNode } from 'react';

export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: UserRole[] }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!allowedRoles.includes(user!.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
