'use client';

import React from 'react';
import { useRole } from '@/lib/context/RoleContext';
import { useRouter } from 'next/navigation';

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const router = useRouter();

  const handleRoleChange = (newRole: 'customer' | 'provider' | 'superadmin') => {
    setRole(newRole);
    if (newRole === 'customer') router.push('/');
    if (newRole === 'provider') router.push('/provider');
    if (newRole === 'superadmin') router.push('/admin');
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex gap-2 bg-white p-2 rounded-xl shadow-lg border border-gray-200">
      <button 
        onClick={() => handleRoleChange('customer')}
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${role === 'customer' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
      >
        Cliente
      </button>
      <button 
        onClick={() => handleRoleChange('provider')}
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${role === 'provider' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
      >
        Negocio
      </button>
      <button 
        onClick={() => handleRoleChange('superadmin')}
        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${role === 'superadmin' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
      >
        Admin
      </button>
    </div>
  );
}
