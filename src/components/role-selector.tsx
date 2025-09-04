'use client';

import React, { forwardRef } from 'react';

export type Role = 'ADMIN' | 'USER';

export interface RoleSelectorProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const RoleSelector = forwardRef<HTMLSelectElement, RoleSelectorProps>(function RoleSelector(
  props,
  ref
) {
  return (
    <select ref={ref} {...props}>
      <option value="USER">Member</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
});

export default RoleSelector;

