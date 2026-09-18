'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'customer' | 'provider' | 'superadmin';

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('customer');

  useEffect(() => {
    const saved = localStorage.getItem('platito_role');
    if (saved && ['customer', 'provider', 'superadmin'].includes(saved)) {
      setRoleState(saved as UserRole);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('platito_role', newRole);
  };

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within RoleProvider');
  return context;
}
