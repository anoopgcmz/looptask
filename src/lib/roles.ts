export const USER_ROLE_VALUES = ['USER', 'ADMIN', 'PLATFORM'] as const;
export const ORGANIZATION_ROLE_VALUES = ['USER', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];
export type OrganizationRole = (typeof ORGANIZATION_ROLE_VALUES)[number];

export const isPlatformRole = (
  role: string | null | undefined
): role is Extract<UserRole, 'PLATFORM'> => role === 'PLATFORM';

export const isTenantAdminRole = (
  role: string | null | undefined
): role is Extract<UserRole, 'ADMIN'> => role === 'ADMIN';

export const isElevatedAdminRole = (
  role: string | null | undefined
): role is Extract<UserRole, 'ADMIN' | 'PLATFORM'> =>
  role === 'ADMIN' || role === 'PLATFORM';
