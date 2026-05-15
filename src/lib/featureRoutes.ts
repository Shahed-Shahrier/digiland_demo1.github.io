import { UserRole } from '@/types';

export type FeatureKey = 'land-search' | 'digital-applications' | 'officer-verification' | 'status-tracking';

export function isFeatureKey(value: string | null): value is FeatureKey {
  return value === 'land-search' ||
    value === 'digital-applications' ||
    value === 'officer-verification' ||
    value === 'status-tracking';
}

export function getFeaturePath(feature: FeatureKey, role: UserRole) {
  const paths: Record<FeatureKey, Record<UserRole, string>> = {
    'land-search': {
      citizen: '/citizen/land-search',
      land_officer: '/officer/applications',
      survey_officer: '/survey/verifications',
      admin: '/admin/land-records',
    },
    'digital-applications': {
      citizen: '/citizen/new-application',
      land_officer: '/officer/applications',
      survey_officer: '/survey/verifications',
      admin: '/admin',
    },
    'officer-verification': {
      citizen: '/citizen/applications',
      land_officer: '/officer/applications',
      survey_officer: '/survey/verifications',
      admin: '/admin',
    },
    'status-tracking': {
      citizen: '/citizen/applications',
      land_officer: '/officer/applications',
      survey_officer: '/survey/verifications',
      admin: '/admin/analytics',
    },
  };

  return paths[feature][role];
}
