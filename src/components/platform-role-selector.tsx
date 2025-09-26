'use client';

import React, { forwardRef } from 'react';
import type { UserRole } from '@/lib/roles';

interface PlatformRoleSelectorProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  includePlatform?: boolean;
}

const PlatformRoleSelector = forwardRef<
  HTMLSelectElement,
  PlatformRoleSelectorProps
>(function PlatformRoleSelector(props, ref) {
  const { includePlatform = true, ...rest } = props;
  return (
    <select ref={ref} {...rest}>
      <option value="USER">Member</option>
      <option value="ADMIN">Tenant Admin</option>
      {includePlatform ? <option value="PLATFORM">Platform Admin</option> : null}
    </select>
  );
});

export default PlatformRoleSelector;
export type PlatformRole = UserRole;
