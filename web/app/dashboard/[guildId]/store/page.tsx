'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { ShoppingBag, Plus, Trash2, Loader2, Shield, AlertCircle } from 'lucide-react';

export default function StoreSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { roles, config, refreshData, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#949aa2]" />
            <span>Server Store Catalog</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Manage purchasable shop items and automatic Discord role grants for members.
          </p>
        </div>
      </div>

      {addError && (
        <div className="p-3.5 rounded-lg bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{addError}</span>
        </div>
      )}

      {/* Add New Item Surface */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-4 shadow-sm" data-animate-section>
        <SectionHeader
          title="Create New Shop Item"
          description="Define item name, price, and optional automatic role assignment upon purchase."
          icon={<Plus className="w-3.5 h-3.5 text-[#6e747c]" />}
        />

        <form onSubmit={handleAddItem} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#ededed]">Item Name</label>
              <input
                type="text"
                maxLength={64}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="VIP Pass / Custom Color"
                className="glass-input text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#ededed]">Price ({currencySymbol})</label>
              <input
                type="number"
                min={1}
                max={1000000000}
                value={itemPrice}
                onChange={(e) => setItemPrice(Number(e.target.value))}
                className="glass-input font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-[#ededed]">Role Reward (Optional)</label>
              <RolePicker
                roles={roles}
                value={itemRoleId}
                onChange={setItemRoleId}
                placeholder="Select role to grant..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#ededed]">Description (Optional)</label>
            <input
              type="text"
              maxLength={255}
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              placeholder="Grants exclusive access to the VIP lounge and color picker."
              className="glass-input text-xs"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isAdding || !itemName.trim()}
              className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isAdding ? 'Adding Item...' : 'Add Store Item'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Items Table */}
      <div className="space-y-3" data-animate-section>
        <SectionHeader
          title={`Active Store Items (${items.length})`}
          description="Items currently active and purchasable via the !buy command in Discord."
        />

        <div className="border border-[#1f2226] rounded-lg overflow-hidden bg-[#0d0e10] shadow-sm">
          <HawkScrollArea maxHeight="420px">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#17191c] text-[10px] font-mono uppercase tracking-wider text-[#6e747c]">
                <tr>
                  <th className="py-2.5 px-4">Item ID</th>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4">Price</th>
                  <th className="py-2.5 px-4">Reward Role</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17191c]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#6e747c] text-xs">
                      No items currently listed in the store catalog.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
                    const grantedRole = roles.find((r) => r.id === item.inventory_role_id);
                    return (
                      <tr key={item.item_id} className="hover:bg-[#121417]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#6e747c]">#{item.item_id}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#ededed]">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-[#6e747c]">{item.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-success-text">
                          {currencySymbol}
                          {Number(item.price).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {grantedRole ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#121417] border border-[#1f2226] text-[#ededed]">
                              <Shield className="w-3 h-3 text-[#949aa2]" />
                              <span>@{grantedRole.name}</span>
                            </span>
                          ) : (
                            <span className="text-[#6e747c] text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.item_id)}
                            className="p-1 rounded text-[#6e747c] hover:text-critical-text hover:bg-critical-soft transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </HawkScrollArea>
        </div>
      </div>
    </div>
  );
}
