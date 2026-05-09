import { UserRole } from '@/types';

export type DbAppRole =
  | 'applicant'
  | 'citizen'
  | 'reviewer'
  | 'land_officer'
  | 'survey_officer'
  | 'admin'
  | 'super_admin';

export const PUBLIC_REGISTRATION_ROLE: UserRole = 'citizen';
export const PUBLIC_REGISTRATION_DB_ROLE: DbAppRole = 'applicant';

export function normalizeRoleName(role?: string | null) {
  return (role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function dbRoleToFrontendRole(role?: string | null): UserRole {
  const value = normalizeRoleName(role);

  if (value === 'reviewer' || value === 'land_officer') return 'land_officer';
  if (value === 'survey_officer') return 'survey_officer';
  if (value === 'admin' || value === 'super_admin') return 'admin';
  return 'citizen';
}

export function frontendRoleToDbRole(role: UserRole): DbAppRole {
  if (role === 'land_officer') return 'reviewer';
  if (role === 'survey_officer') return 'survey_officer';
  if (role === 'admin') return 'admin';
  return PUBLIC_REGISTRATION_DB_ROLE;
}

export function isPrivilegedFrontendRole(role: UserRole) {
  return role === 'admin' || role === 'land_officer' || role === 'survey_officer';
}
