'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dish, DishInput, Ingredient } from '@/types/dish';
import { dishService } from '@/lib/services/dishService';
import { PlusCircle, Tag, BookOpen, Save, X, Trash2, Upload, AlertTriangle, Edit2 } from 'lucide-react';
import { validateAndCompressImage } from '@/lib/utils/imageCompression';

interface ProviderDashboardProps {
  initialDishes: Dish[];
}

export function ProviderDashboard({ initialDishes }: ProviderDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<'dishes' | 'recipes'>('dishes');
  const [dishes, setDishes] = useState<Dish[]>(initialDishes);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  const loadData = async () => {
    const loadedDishes = await dishService.getDishes();
    const loadedIngs = await dishService.getIngredients();
    setDishes(loadedDishes);
    setIngredients(loadedIngs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDishModal = (dish?: Dish) => {
    setEditingDish(dish || null);
    setIsDishModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-800 text-white flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Panel Socio</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de Catálogo</p>
        </div>
        <nav className="px-4 py-2 space-y-2">
          <button 
            onClick={() => setActiveMenu('dishes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeMenu === 'dishes' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            <Tag size={20} />
            Mis Platos
          </button>
          <button 
            onClick={() => setActiveMenu('recipes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeMenu === 'recipes' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            <BookOpen size={20} />
            Recetario
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {activeMenu === 'dishes' && (
          <DishesView 
            dishes={dishes} 
            onNew={() => handleOpenDishModal()} 
            onEdit={handleOpenDishModal} 
          />
        )}
        {activeMenu === 'recipes' && (
          <RecipeBookView 
            dishes={dishes}
            ingredients={ingredients}
            onEditDish={handleOpenDishModal}
            onDataChanged={loadData}
          />
        )}
      </main>

      {isDishModalOpen && (
        <DishModal 
          dish={editingDish} 
          globalIngredients={ingredients}
          onClose={() => setIsDishModalOpen(false)} 
          onSaved={() => { setIsDishModalOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}

// --- Views ---

function DishesView({ dishes, onNew, onEdit }: { dishes: Dish[], onNew: () => void, onEdit: (d: Dish) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Vitrina de Platos</h2>
        <button onClick={onNew} className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 transition">
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
                  <p className="text-xs text-slate-400">Precio Venta</p>
                  <p className="font-bold text-slate-700">${dish.baseCost.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(dish)} className="text-orange-600 hover:text-orange-700 transition p-2 font-medium">Editar</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipeBookView({ dishes, ingredients, onEditDish, onDataChanged }: { dishes: Dish[], ingredients: Ingredient[], onEditDish: (d: Dish) => void, onDataChanged: () => void }) {
  const [tab, setTab] = useState<'ingredients'|'dishes'>('ingredients');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Recetario y Costos</h2>
          <p className="text-slate-500 text-sm">Gestiona tus ingredientes base y costea tus platos</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button onClick={() => setTab('ingredients')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'ingredients' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600'}`}>Ingredientes</button>
          <button onClick={() => setTab('dishes')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === 'dishes' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600'}`}>Platos</button>
        </div>
      </div>

      {tab === 'ingredients' && <IngredientsManager ingredients={ingredients} onDataChanged={onDataChanged} />}
      {tab === 'dishes' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-4 font-medium">Plato</th>
                <th className="p-4 font-medium text-right">Costo Prod.</th>
                <th className="p-4 font-medium text-right">Margen (%)</th>
                <th className="p-4 font-medium text-right">Precio Venta</th>
                <th className="p-4 font-medium text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {dishes.map(d => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="p-4 font-medium text-slate-800">{d.name}</td>
                  <td className="p-4 text-right text-slate-600">${d.productionCost.toLocaleString()}</td>
                  <td className="p-4 text-right text-slate-600">{d.profitMargin.toFixed(1)}%</td>
                  <td className="p-4 text-right font-semibold text-slate-800">${d.baseCost.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => onEditDish(d)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition inline-flex items-center justify-center">
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {dishes.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay platos configurados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IngredientsManager({ ingredients, onDataChanged }: { ingredients: Ingredient[], onDataChanged: () => void }) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');

  const handleAdd = async () => {
    if (name.trim() && Number(cost) > 0) {
      await dishService.saveIngredient({ name, cost: Number(cost), providerId: 'demo-provider-1' });
      setName('');
      setCost('');
      onDataChanged();
    }
  };

  const handleEdit = async (ing: Ingredient) => {
    const newCostStr = prompt(`Nuevo costo para ${ing.name}:`, ing.cost.toString());
    if (newCostStr === null) return;
    const newCost = Number(newCostStr);
    if (isNaN(newCost) || newCost < 0) return;

    const confirmUpdate = window.confirm(`¿Modificar el costo de los ingredientes de todos los platos que usan ${ing.name}? (Se recalcularán los precios de venta en base al nuevo costo)`);
    await dishService.updateIngredient(ing.id, { cost: newCost }, confirmUpdate);
    onDataChanged();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex gap-4 mb-6">
        <input type="text" placeholder="Nombre del ingrediente (Ej. Queso)" value={name} onChange={e => setName(e.target.value)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg" />
        <input type="number" placeholder="$ Costo" value={cost} onChange={e => setCost(e.target.value)} className="w-32 px-4 py-2 border border-slate-300 rounded-lg" />
        <button onClick={handleAdd} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Agregar</button>
      </div>

      <div className="space-y-2">
        {ingredients.map(ing => (
          <div key={ing.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-medium text-slate-800">{ing.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-slate-600">${ing.cost}</span>
              <button onClick={() => handleEdit(ing)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
            </div>
          </div>
        ))}
        {ingredients.length === 0 && <p className="text-slate-400 text-center py-4">No hay ingredientes cargados.</p>}
      </div>
    </div>
  );
}

// --- Modals ---

function DishModal({ dish, globalIngredients, onClose, onSaved, onDataChanged }: { dish: Dish | null, globalIngredients: Ingredient[], onClose: () => void, onSaved: () => void, onDataChanged: () => void }) {
  const isEditing = !!dish;
  const [name, setName] = useState(dish?.name || '');
  const [description, setDescription] = useState(dish?.description || '');
  const [category, setCategory] = useState(dish?.category || 'minutas');
  const [available, setAvailable] = useState(dish ? dish.available : true);
  
  // Cost Calculator State
  const [selectedIngId, setSelectedIngId] = useState('');
  const [newIngName, setNewIngName] = useState('');
  const [newIngCost, setNewIngCost] = useState('');
  const [selectedIngQty, setSelectedIngQty] = useState('1');
  const [dishIngredients, setDishIngredients] = useState<{ing: Ingredient, qty: number}[]>(() => {
    if (!dish || !dish.ingredients) return [];
    return dish.ingredients.map(di => {
      const gIng = globalIngredients.find(g => g.id === di.ingredientId);
      return gIng ? { ing: gIng, qty: di.quantity } : null;
    }).filter(Boolean) as {ing: Ingredient, qty: number}[];
  });

  const [profitMargin, setProfitMargin] = useState<number>(dish?.profitMargin || 0);
  const [sellingPrice, setSellingPrice] = useState<number>(dish?.baseCost || 0);
  
  // Image Upload State
  const [imageUrl, setImageUrl] = useState(dish?.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const productionCost = useMemo(() => {
    return dishIngredients.reduce((sum, item) => sum + (item.ing.cost * item.qty), 0);
  }, [dishIngredients]);

  const handleMarginChange = (val: string) => {
    const margin = Number(val);
    setProfitMargin(margin);
    const newPrice = productionCost * (1 + margin / 100);
    setSellingPrice(Math.round(newPrice));
  };

  const handlePriceChange = (val: string) => {
    const price = Number(val);
    setSellingPrice(price);
    if (productionCost > 0) {
      const margin = ((price / productionCost) - 1) * 100;
      setProfitMargin(Number(margin.toFixed(2)));
    } else {
      setProfitMargin(0);
    }
  };

  useEffect(() => {
    const newPrice = productionCost * (1 + profitMargin / 100);
    setSellingPrice(Math.round(newPrice));
  }, [productionCost, profitMargin]);

  const handleAddIngredient = async () => {
    const qty = Number(selectedIngQty);
    if (qty <= 0) return;

    if (selectedIngId === 'NEW') {
      if (newIngName.trim() && Number(newIngCost) > 0) {
        setIsSaving(true);
        try {
          const newIng = await dishService.saveIngredient({ 
            name: newIngName.trim(), 
            cost: Number(newIngCost), 
            providerId: 'demo-provider-1' 
          });
          setDishIngredients([...dishIngredients, { ing: newIng, qty }]);
          setSelectedIngId('');
          setNewIngName('');
          setNewIngCost('');
          setSelectedIngQty('1');
          onDataChanged(); // Refresh global ingredients in parent
        } catch (e) {
          alert('Error al guardar ingrediente');
        } finally {
          setIsSaving(false);
        }
      }
    } else {
      const ing = globalIngredients.find(i => i.id === selectedIngId);
      if (ing) {
        const existingIdx = dishIngredients.findIndex(di => di.ing.id === ing.id);
        if (existingIdx >= 0) {
          const copy = [...dishIngredients];
          copy[existingIdx].qty += qty;
          setDishIngredients(copy);
        } else {
          setDishIngredients([...dishIngredients, { ing, qty }]);
        }
        setSelectedIngId('');
        setSelectedIngQty('1');
      }
    }
  };

  const handleRemoveIngredient = (index: number) => {
    const copy = [...dishIngredients];
    copy.splice(index, 1);
    setDishIngredients(copy);
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
    if (!name.trim() || sellingPrice <= 0) {
      alert('Nombre y precio de venta son obligatorios y mayores a cero.');
      return;
    }
    
    setIsSaving(true);
    try {
      const input: DishInput = {
        name,
        description,
        category,
        productionCost,
        profitMargin,
        baseCost: sellingPrice,
        ingredients: dishIngredients.map(di => ({ ingredientId: di.ing.id, quantity: di.qty })),
        available,
        imageUrl,
        providerId: dish?.providerId || 'demo-provider-1',
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
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditing ? 'Editar Plato' : 'Crear Nuevo Plato'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-8">
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

          {/* Right Column: Recipe Cost Calculator */}
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" />
              Receta y Costeo
            </h3>
            
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              {selectedIngId === 'NEW' ? (
                <input type="text" placeholder="Nombre (Ej. Queso)" value={newIngName} onChange={e => setNewIngName(e.target.value)} className="flex-1 min-w-[120px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
              ) : (
                <select value={selectedIngId} onChange={e => setSelectedIngId(e.target.value)} className="flex-1 min-w-[120px] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="">Seleccionar...</option>
                  <option value="NEW" className="font-semibold text-blue-600">+ Nuevo ingrediente</option>
                  {globalIngredients.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
              
              <div className="relative w-24">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input 
                  type="number" 
                  placeholder="Costo" 
                  value={selectedIngId === 'NEW' ? newIngCost : (globalIngredients.find(g => g.id === selectedIngId)?.cost || '')} 
                  onChange={e => selectedIngId === 'NEW' && setNewIngCost(e.target.value)}
                  disabled={selectedIngId !== 'NEW' && selectedIngId !== ''}
                  className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500" 
                />
              </div>

              <input type="number" min="1" placeholder="Cant." value={selectedIngQty} onChange={e => setSelectedIngQty(e.target.value)} className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white" />
              <button onClick={handleAddIngredient} disabled={isSaving} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50">+</button>
              
              {selectedIngId === 'NEW' && (
                <button onClick={() => setSelectedIngId('')} className="bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-300">X</button>
              )}
            </div>

            {/* Scrollable area for ingredients (max 5 items before scroll) */}
            <div className="flex-1 overflow-y-auto max-h-[220px] pr-2 space-y-2 mb-4">
              {dishIngredients.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2 border border-slate-200 rounded-lg text-sm">
                  <span className="font-medium text-slate-700">{item.ing.name} <span className="text-slate-400">x{item.qty}</span></span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">${(item.ing.cost * item.qty).toLocaleString()}</span>
                    <button onClick={() => handleRemoveIngredient(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {dishIngredients.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                  Agrega ingredientes de tu recetario para costear el plato.
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Costo de Producción</span>
                <span className="font-medium text-slate-800">${productionCost.toLocaleString()}</span>
              </div>
              
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Margen de Ganancia (%)</label>
                  <div className="relative">
                    <input type="number" value={profitMargin} onChange={e => handleMarginChange(e.target.value)} className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Precio de Venta ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input type="number" value={sellingPrice} onChange={e => handlePriceChange(e.target.value)} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-700" />
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <p>Al editar el margen o el precio, el otro se ajustará automáticamente. Este "Precio de Venta" es lo que facturarás tú. Platito le sumará su propio margen para el cliente final.</p>
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
