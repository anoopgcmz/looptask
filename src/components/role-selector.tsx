'use client';

import React, { forwardRef } from 'react';
import type { OrganizationRole } from '@/lib/roles';

export type Role = OrganizationRole;

const RoleSelector = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function RoleSelector(props, ref) {
  return (
    <select ref={ref} {...props}>
      <option value="USER">Member</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
});

export default RoleSelector;

