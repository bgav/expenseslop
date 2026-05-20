import React, { useState } from 'react';
import { Category } from '../types';
import { Tag, Plus, Trash2, Edit, X, Check, Palette, Sparkles } from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updated: Category) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', 
  '#ec4899', '#94a3b8'
];

export default function CategoryManager({
  categories,
  isOpen,
  onClose,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryManagerProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Category name is required.');
      return;
    }

    const nameExists = categories.some(
      c => c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (nameExists) {
      alert('A category with this name already exists.');
      return;
    }

    onAddCategory({
      name: name.trim(),
      color: selectedColor
    });

    setName('');
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsFormOpen(false);
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingColor(cat.color);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) {
      alert('Category name is required.');
      return;
    }

    const otherExists = categories.some(
      c => c.id !== id && c.name.toLowerCase() === editingName.trim().toLowerCase()
    );
    if (otherExists) {
      alert('Another category with this name already exists.');
      return;
    }

    onUpdateCategory(id, {
      id,
      name: editingName.trim(),
      color: editingColor
    });

    setEditingId(null);
    setEditingName('');
    setEditingColor('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#e4e2d9] overflow-hidden animate-fadeIn my-12">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-xl shadow-sm">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-sm font-sans font-semibold text-slate-800">Category Management</h3>
              <p className="text-[10px] font-mono text-slate-500">Organize and customize transaction segments</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Active Segments ({categories.length})
            </h4>
            {!isFormOpen && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                Create New Category
              </button>
            )}
          </div>

          {/* Create Form */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-slideDown">
              <div className="text-xs font-semibold text-slate-750 flex items-center gap-1">
                <Sparkles size={13} className="text-yellow-600" />
                Define Custom Category
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Category Label</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    maxLength={32}
                    placeholder="e.g. Travel, Gym, Coffee..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block flex items-center gap-1">
                    <Palette size={12} /> Colors Preset
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`h-5 w-5 rounded-full transition-all duration-155 relative ${
                          selectedColor === color ? 'scale-125 ring-2 ring-slate-400 ring-offset-2 ring-offset-white' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 bg-white border border-slate-250 text-slate-600 hover:text-slate-800 rounded-lg text-xs cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-650 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  Add Category
                </button>
              </div>
            </form>
          )}

          {/* List/Grid of categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
            {categories.map(c => {
              const isEditing = editingId === c.id;

              return (
                <div 
                  key={c.id} 
                  className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl flex items-center justify-between gap-3 group"
                >
                  {isEditing ? (
                    <div className="flex-1 space-y-2 col-span-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 focus:outline-none focus:border-sky-500"
                      />
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingColor(color)}
                            className={`h-4 w-4 rounded-full transition-all duration-150 ${
                              editingColor === color ? 'scale-125 ring-2 ring-slate-400' : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-2 py-1 bg-white border border-slate-250 text-slate-600 hover:text-slate-800 rounded text-[10px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(c.id)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-semibold flex items-center gap-0.5"
                        >
                          <Check size={10} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-xs font-sans text-slate-800 truncate font-semibold">
                          {c.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150">
                        <button
                          onClick={() => startEditing(c)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title={`Edit ${c.name}`}
                        >
                          <Edit size={11} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete category "${c.name}"? Transactions using this category will be reset to "Other".`)) {
                              onDeleteCategory(c.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title={`Delete ${c.name}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/50 flex justify-end text-xs text-slate-450 font-mono">
          <span>Close window using the exit button or tap escape.</span>
        </div>

      </div>
    </div>
  );
}
