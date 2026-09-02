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
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <ShoppingBag className="w-6 h-6 text-accent" />
          <span>Server Store & Role Shop</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Create buyable Discord roles and collectible items for members to purchase with server currency.
        </p>
      </div>

      {/* Add New Item Form */}
      <form onSubmit={handleAddItem} className="bg-surface border border-border rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Add New Store Item / Role</h3>
            <p className="text-xs text-muted">Items with assigned roles will auto-grant the role upon Discord purchase.</p>
          </div>
        </div>

        {addError && <div className="text-xs font-semibold text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{addError}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Item Name</label>
            <input
              type="text"
              value={itemName}
              required
              onChange={(e) => setItemName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              placeholder="e.g. VIP Role, Custom Badge"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Price ({currencySymbol})</label>
            <input
              type="number"
              value={itemPrice}
              min={1}
              required
              onChange={(e) => setItemPrice(parseInt(e.target.value) || 1)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              placeholder="5000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Auto-Grant Role (Optional)</label>
            <RoleSelect
              roles={roles}
              value={itemRoleId}
              onChange={setItemRoleId}
              placeholder="Select role to give buyer..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              placeholder="Brief perk details..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isAdding}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs tracking-wide shadow-lg shadow-accent/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Create Item</span>
          </button>
        </div>
      </form>

      {/* Item Catalog List */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-muted" />
          <span>Active Store Catalog ({items.length})</span>
        </h3>

        {items.length === 0 ? (
          <div className="text-center py-12 bg-surface/30 rounded-3xl border border-border">
            <p className="text-sm text-muted">No items in the store yet. Use the form above to add your first role or item!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => {
              const assignedRole = roles.find((r) => r.id === item.inventory_role_id);
              return (
                <div
                  key={item.item_id}
                  className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surfaceHover border border-border flex items-center justify-center text-accent font-bold text-sm">
                      #{item.item_id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{item.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-semibold border border-accent/20">
                          {currencySymbol}{item.price?.toLocaleString()}
                        </span>
                        {assignedRole && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-xs font-semibold border border-violet-500/20">
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
                    className="p-2 rounded-xl text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
