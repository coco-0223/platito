'use client';

import React, { useState } from 'react';
import { Dish } from '@/types/dish';
import { PlusCircle, Tag, Calculator, PackageSearch, Save } from 'lucide-react';

interface ProviderDashboardProps {
  initialDishes: Dish[];
}

export function ProviderDashboard({ initialDishes }: ProviderDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dishes' | 'tools'>('dishes');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-800 text-white flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Panel Socio</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de Catálogo</p>
        </div>
        <nav className="px-4 py-2 space-y-2">
          <button
            onClick={() => setActiveTab('dishes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'dishes' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Tag size={20} />
            Mis Platos
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'tools' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calculator size={20} />
            Herramientas
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {activeTab === 'dishes' ? (
          <DishesManager initialDishes={initialDishes} />
        ) : (
          <CostCalculatorTool />
        )}
      </main>
    </div>
  );
}

function DishesManager({ initialDishes }: { initialDishes: Dish[] }) {
  // Demo state for the UI. Normally we'd call the service.
  const [dishes] = useState<Dish[]>(initialDishes);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Catálogo Activo</h2>
        <button className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 transition">
          <PlusCircle size={20} />
          <span className="hidden sm:inline">Nuevo Plato</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishes.map((dish) => (
          <div key={dish.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="h-40 bg-slate-100 relative">
              {dish.imageUrl ? (
                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">Sin foto</div>
              )}
              {!dish.available && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm font-medium">Pausado</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-lg text-slate-800 line-clamp-1">{dish.name}</h3>
              <p className="text-slate-500 text-sm mt-1 line-clamp-2">{dish.description}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Costo Base</p>
                  <p className="font-bold text-slate-700">${dish.baseCost.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-slate-400 hover:text-orange-600 transition p-2">Editar</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostCalculatorTool() {
  const [ingredients, setIngredients] = useState([
    { id: 1, name: 'Harina 0000', quantity: 1, unit: 'kg', cost: 800 },
    { id: 2, name: 'Queso Mozzarella', quantity: 0.25, unit: 'kg', cost: 1500 }
  ]);

  const totalCost = ingredients.reduce((acc, curr) => acc + curr.cost, 0);

  return (
    <div className="max-w-3xl">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 flex gap-4 items-start">
        <PackageSearch className="text-blue-600 mt-1 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-blue-900">Calculadora de Costos de Ingredientes</h3>
          <p className="text-blue-700 text-sm mt-1">
            Lleva un control exacto de cuánto te cuesta preparar cada plato. Esta herramienta de valor agregado te permite definir precios base competitivos y asegurar tu rentabilidad.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-slate-800">Receta: Pizza Clásica</h3>
          <button className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1">
            + Añadir Ingrediente
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {ingredients.map((ing) => (
            <div key={ing.id} className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg">
              <div className="flex-1">
                <input 
                  type="text" 
                  value={ing.name} 
                  className="bg-transparent font-medium text-slate-800 focus:outline-none w-full"
                  readOnly
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>{ing.quantity}</span>
                <span>{ing.unit}</span>
              </div>
              <div className="font-semibold text-slate-700 w-24 text-right">
                ${ing.cost.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Costo total de producción</p>
            <p className="text-2xl font-bold text-slate-800">${totalCost.toLocaleString()}</p>
          </div>
          <button className="bg-slate-800 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 transition">
            <Save size={18} />
            Guardar como Plato
          </button>
        </div>
      </div>
    </div>
  );
}
