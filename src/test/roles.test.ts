import { describe, expect, it } from 'vitest';
import {
  dbRoleToFrontendRole,
  frontendRoleToDbRole,
  PUBLIC_REGISTRATION_DB_ROLE,
  PUBLIC_REGISTRATION_ROLE,
} from '@/lib/roles';

describe('Digi-Land role mapping', () => {
  it('maps database applicant to frontend citizen', () => {
    expect(dbRoleToFrontendRole('applicant')).toBe('citizen');
  });

  it('maps database reviewer to frontend land officer', () => {
    expect(dbRoleToFrontendRole('reviewer')).toBe('land_officer');
  });

  it('maps database super admin to frontend admin', () => {
    expect(dbRoleToFrontendRole('super_admin')).toBe('admin');
  });

  it('writes public registration as applicant only', () => {
    expect(PUBLIC_REGISTRATION_ROLE).toBe('citizen');
    expect(PUBLIC_REGISTRATION_DB_ROLE).toBe('applicant');
    expect(frontendRoleToDbRole(PUBLIC_REGISTRATION_ROLE)).toBe('applicant');
  });
});
