'use client';

import React, { useState, useEffect } from 'react';
import { Dish, DishInput } from '@/types/dish';
import { dishService } from '@/lib/services/dishService';
import { PlusCircle, Tag, Calculator, PackageSearch, Save, X, Trash2, Upload } from 'lucide-react';
import { validateAndCompressImage } from '@/lib/utils/imageCompression';
import { useRole } from '@/lib/context/RoleContext';

interface ProviderDashboardProps {
  initialDishes: Dish[];
}

export function ProviderDashboard({ initialDishes }: ProviderDashboardProps) {
  const [dishes, setDishes] = useState<Dish[]>(initialDishes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  const loadDishes = async () => {
    const loaded = await dishService.getDishes();
    setDishes(loaded);
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const handleOpenNew = () => {
    setEditingDish(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dish: Dish) => {
    setEditingDish(dish);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-800 text-white flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Panel Socio</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de Catálogo</p>
        </div>
        <nav className="px-4 py-2 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition bg-orange-600 text-white">
            <Tag size={20} />
            Mis Platos
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Catálogo Activo</h2>
            <button onClick={handleOpenNew} className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 transition">
              <PlusCircle size={20} />
              <span className="hidden sm:inline">Nuevo Plato</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dishes.map((dish) => (
              <div key={dish.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
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
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 line-clamp-1">{dish.name}</h3>
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{dish.description}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Costo Base</p>
                      <p className="font-bold text-slate-700">${dish.baseCost.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(dish)} className="text-orange-600 hover:text-orange-700 transition p-2 font-medium">Editar</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <DishModal 
          dish={editingDish} 
          onClose={() => setIsModalOpen(false)} 
          onSaved={() => { setIsModalOpen(false); loadDishes(); }}
        />
      )}
    </div>
  );
}

function DishModal({ dish, onClose, onSaved }: { dish: Dish | null, onClose: () => void, onSaved: () => void }) {
  const isEditing = !!dish;
  const [name, setName] = useState(dish?.name || '');
  const [description, setDescription] = useState(dish?.description || '');
  const [category, setCategory] = useState(dish?.category || 'minutas');
  const [available, setAvailable] = useState(dish ? dish.available : true);
  
  // Cost Calculator State
  const [ingredients, setIngredients] = useState<{name: string, cost: number}[]>([]);
  const [baseCost, setBaseCost] = useState(dish?.baseCost || 0);
  const [newIngName, setNewIngName] = useState('');
  const [newIngCost, setNewIngCost] = useState('');

  // Image Upload State
  const [imageUrl, setImageUrl] = useState(dish?.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync total cost when ingredients change (if using ingredients)
  useEffect(() => {
    if (ingredients.length > 0) {
      const total = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
      setBaseCost(total);
    }
  }, [ingredients]);

  const handleAddIngredient = () => {
    if (newIngName.trim() && Number(newIngCost) > 0) {
      setIngredients([...ingredients, { name: newIngName, cost: Number(newIngCost) }]);
      setNewIngName('');
      setNewIngCost('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    const newIng = [...ingredients];
    newIng.splice(index, 1);
    setIngredients(newIng);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await validateAndCompressImage(file);
      setImageUrl(res.dataUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || baseCost <= 0) {
      alert('Nombre y costo base son obligatorios.');
      return;
    }
    
    setIsSaving(true);
    try {
      const input: DishInput = {
        name,
        description,
        category,
        baseCost,
        available,
        imageUrl,
        providerId: dish?.providerId || 'demo-provider-1', // Fallback for MVP demo
      };
      
      if (isEditing && dish) {
        await dishService.updateDish(dish.id, input);
      } else {
        await dishService.saveDish(input);
      }
      onSaved();
    } catch (error: any) {
      alert('Error guardando plato: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditing ? 'Editar Plato' : 'Crear Nuevo Plato'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-8">
          {/* Left Column: Basic Info & Image */}
          <div className="flex-1 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Foto del Plato (Max 1MB)</label>
              <div className="flex items-center gap-4">
                {imageUrl && <img src={imageUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />}
                <label className="flex-1 cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition rounded-lg h-20 text-slate-500 text-sm">
                  <span className="flex items-center gap-2"><Upload size={16} /> {isUploading ? 'Procesando...' : 'Elegir o soltar imagen'}</span>
                  <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileChange} disabled={isUploading} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Ej. Milanesa Napolitana" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none h-24" placeholder="Ingredientes, preparación, etc." />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white">
                  <option value="minutas">Minutas</option>
                  <option value="pastas">Pastas</option>
                  <option value="pizzas_empanadas">Pizzas & Empanadas</option>
                  <option value="postres">Postres</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="promociones">Promociones</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <select value={available ? 'true' : 'false'} onChange={e => setAvailable(e.target.value === 'true')} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white">
                  <option value="true">Activo / Disponible</option>
                  <option value="false">Agotado / Pausado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Integrated Cost Calculator */}
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-2 text-blue-700 mb-4">
              <Calculator size={20} />
              <h3 className="font-bold">Calculadora de Costos</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">Añade tus ingredientes para calcular el costo real de producción, o ingresa el costo base manualmente.</p>
            
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Ingrediente (ej. Queso)" value={newIngName} onChange={e => setNewIngName(e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" onKeyDown={e => e.key === 'Enter' && handleAddIngredient()} />
              <input type="number" placeholder="$ Costo" value={newIngCost} onChange={e => setNewIngCost(e.target.value)} className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm" onKeyDown={e => e.key === 'Enter' && handleAddIngredient()} />
              <button onClick={handleAddIngredient} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2 border border-slate-200 rounded-lg text-sm">
                  <span className="font-medium text-slate-700">{ing.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">${ing.cost}</span>
                    <button onClick={() => handleRemoveIngredient(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {ingredients.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                  Sin ingredientes agregados.
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-1">Costo Base Final</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input 
                  type="number" 
                  value={baseCost} 
                  onChange={e => {
                    setBaseCost(Number(e.target.value));
                    if(ingredients.length > 0) setIngredients([]); // Clear ingredients if manual override
                  }} 
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving || isUploading} className="px-6 py-2 font-medium bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition flex items-center gap-2 disabled:opacity-50">
            {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Plato</>}
          </button>
        </div>
      </div>
    </div>
  );
}
