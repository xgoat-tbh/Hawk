'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { ShoppingBag, Plus, Trash2, Tag, Loader2 } from 'lucide-react';

export default function StoreSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // New Item Form
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState(5000);
  const [itemDesc, setItemDesc] = useState('');
  const [itemRoleId, setItemRoleId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      const data = await res.json();
      setItems(data.config?.storeItems || []);
      setRoles(data.roles || []);
      setCurrencySymbol(data.config?.economy?.currency_symbol || '$');
    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || itemPrice <= 0) {
      setAddError('Please provide a valid item name and price.');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'add_store_item',
          data: {
            name: itemName.trim(),
            price: itemPrice,
            description: itemDesc.trim() || null,
            inventory_role_id: itemRoleId || null,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to create store item');

      setItemName('');
      setItemPrice(5000);
      setItemDesc('');
      setItemRoleId(null);
      await loadData();
    } catch (err: any) {
      setAddError(err.message || 'Error creating item.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'delete_store_item',
          data: { item_id: itemId },
        }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface rounded-xl w-48" />
        <div className="h-40 bg-surface rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <ShoppingBag className="w-6 h-6 text-[#5865F2]" />
          <span>Server Store & Role Shop</span>
        </h1>
        <p className="text-xs text-muted mt-1 font-medium">
          Create buyable Discord roles and collectible items for members to purchase with server currency.
        </p>
      </div>

      {/* Add New Item Form */}
      <form onSubmit={handleAddItem} className="box-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/20 border-b-2 border-[#5865F2]/40 flex items-center justify-center text-[#5865F2]">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">Add New Store Item / Role</h3>
            <p className="text-xs text-muted">Items with assigned roles will auto-grant the role upon Discord purchase.</p>
          </div>
        </div>

        {addError && <div className="text-xs font-bold uppercase tracking-wide text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{addError}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Item Name</label>
            <input
              type="text"
              value={itemName}
              required
              onChange={(e) => setItemName(e.target.value)}
              className="box-input font-bold"
              placeholder="e.g. VIP Role, Custom Badge"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Price ({currencySymbol})</label>
            <input
              type="number"
              value={itemPrice}
              min={1}
              required
              onChange={(e) => setItemPrice(parseInt(e.target.value) || 1)}
              className="box-input font-bold"
              placeholder="5000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Auto-Grant Role (Optional)</label>
            <RoleSelect
              roles={roles}
              value={itemRoleId}
              onChange={setItemRoleId}
              placeholder="Select role to give buyer..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              className="box-input"
              placeholder="Brief perk details..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isAdding}
            className="btn-outline-primary text-xs px-6 py-2.5 flex items-center gap-2"
          >
            {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Create Item</span>
          </button>
        </div>
      </form>

      {/* Item Catalog List */}
      <div className="space-y-4">
        <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted" />
          <span>Active Store Catalog ({items.length})</span>
        </h3>

        {items.length === 0 ? (
          <div className="text-center py-12 box-card p-6">
            <p className="text-xs text-muted">No items in the store yet. Use the form above to add your first role or item!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => {
              const assignedRole = roles.find((r) => r.id === item.inventory_role_id);
              return (
                <div
                  key={item.item_id}
                  className="box-card p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#14171f] border border-[#232733] flex items-center justify-center text-[#5865F2] font-black text-xs">
                      #{item.item_id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm tracking-wide">{item.name}</span>
                        <span className="px-2 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] text-[10px] font-extrabold border border-[#5865F2]/30">
                          {currencySymbol}{item.price?.toLocaleString()}
                        </span>
                        {assignedRole && (
                          <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[10px] font-extrabold border border-violet-500/30">
                            Grants @{assignedRole.name}
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-muted mt-0.5">{item.description}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.item_id)}
                    title="Delete item"
                    className="p-2 rounded-lg bg-[#14171f] border border-[#232733] text-muted hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
