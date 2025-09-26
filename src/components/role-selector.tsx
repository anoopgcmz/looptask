'use client';

import React, { forwardRef } from 'react';

export type Role = 'ADMIN' | 'USER';

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

