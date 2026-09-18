'use client';

import React, { useState } from 'react';
import { useRole } from '@/lib/context/RoleContext';

export default function AdminDashboard() {
  const { role } = useRole();
  const [markup, setMarkup] = useState(20);

  if (role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
          <p className="text-gray-500">Solo el superadmin puede ver este panel. Usa el botón flotante para cambiar tu rol.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Control General</h1>
          <p className="text-gray-500 mt-1">Gestión de la plataforma Platito</p>
        </header>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuración de Ganancia</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje de Sobreprecio (%)
              </label>
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition">
              Guardar
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            * Este es un panel simulado para el MVP. Al guardar, los precios de la vitrina se inflarán por este porcentaje sobre el costo base de los negocios.
          </p>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Órdenes Activas</h2>
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-500">Aún no hay órdenes activas.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
