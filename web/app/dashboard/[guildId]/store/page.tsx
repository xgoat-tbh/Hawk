'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { useGuildData } from '@/context/GuildContext';
import { ShoppingBag, Plus, Trash2, Tag, Loader2, Shield, AlertCircle } from 'lucide-react';

export default function StoreSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { roles, config, refreshData } = useGuildData();

  const items = config?.storeItems || [];
  const currencySymbol = config?.economy?.currency_symbol || '$';

  // New Item Form
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState(5000);
  const [itemDesc, setItemDesc] = useState('');
  const [itemRoleId, setItemRoleId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
      await refreshData();
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
      await refreshData();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-white/80" />
            <span>Server Store Catalog</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Manage purchasable shop items and automatic Discord role grants for members.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add Item Form (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Create Store Item</h3>
              <p className="text-[11px] text-white/40">Add items or role purchases to the server shop.</p>
            </div>
          </div>

          {addError && (
            <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <form onSubmit={handleAddItem} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Item Name</label>
              <input
                type="text"
                required
                maxLength={100}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. VIP Role, Custom Color"
                className="glass-input font-sans text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Price ({currencySymbol})</label>
              <input
                type="number"
                required
                min={1}
                value={itemPrice}
                onChange={(e) => setItemPrice(parseInt(e.target.value, 10) || 1)}
                className="glass-input font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Description (Optional)</label>
              <input
                type="text"
                maxLength={255}
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="e.g. Unlocks access to exclusive channels"
                className="glass-input font-sans text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Granted Discord Role (Optional)</label>
              <RoleSelect
                roles={roles}
                value={itemRoleId}
                onChange={setItemRoleId}
                placeholder="Select role to grant on buy..."
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add to Shop</span>
            </button>
          </form>
        </div>

        {/* Right: Existing Items List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active Catalog Items ({items.length})
            </span>
          </div>

          {items.length === 0 ? (
            <div className="glass-card p-10 text-center text-xs text-white/30">
              No store items configured yet. Use the form on the left to add your first item.
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item: any) => {
                const grantedRole = roles.find((r) => r.id === item.inventory_role_id);
                return (
                  <div
                    key={item.item_id}
                    className="glass-card p-4 flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-white/50 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">{item.name}</span>
                        <span className="font-mono text-xs text-white/80 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
                          {currencySymbol}{item.price.toLocaleString()}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-white/40 truncate">{item.description}</p>
                      )}

                      {grantedRole && (
                        <div className="flex items-center gap-1.5 text-[10px] text-white/60 pt-0.5">
                          <Shield className="w-3 h-3 text-white/40" />
                          <span>Grants @{grantedRole.name}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.item_id)}
                      className="btn-outline-danger p-2 shrink-0"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
