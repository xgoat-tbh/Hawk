'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGuildData } from '@/context/GuildContext';
import { ShoppingBag, Plus, Trash2, Loader2, Shield, AlertCircle } from 'lucide-react';

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

      {addError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{addError}</span>
        </div>
      )}

      {/* Add Item Form Bar */}
      <form
        onSubmit={handleAddItem}
        className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Item Name</label>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="VIP Role, Custom Color"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="glass-input font-sans text-xs"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Price ({currencySymbol})</label>
          <input
            type="number"
            required
            min={1}
            value={itemPrice}
            onChange={(e) => setItemPrice(parseInt(e.target.value, 10) || 1)}
            className="glass-input font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Description (Optional)</label>
          <input
            type="text"
            maxLength={255}
            placeholder="Access to VIP perks"
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
            className="glass-input font-sans text-xs"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Grant Role (Optional)</label>
          <RoleSelect
            roles={roles}
            value={itemRoleId}
            onChange={setItemRoleId}
            placeholder="Select role..."
          />
        </div>

        <div className="sm:col-span-1">
          <button
            type="submit"
            disabled={isAdding}
            className="btn-primary w-full py-2 flex items-center justify-center gap-1 text-xs shrink-0"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </form>

      {/* Store Items Data Table (with Independent Internal Scroll) */}
      <div className="space-y-2">
        <SectionHeader
          title={`Active Catalog Items (${items.length})`}
          description="Members can purchase these items using the !buy <item_id> command in chat."
        />

        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
          <div className="max-h-[55vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4">Item ID</th>
                  <th className="py-3 px-4">Item Name & Description</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Granted Discord Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/30 text-xs">
                      No store items configured yet. Use the form above to add items to the shop.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
                    const grantedRole = roles.find((r) => r.id === item.inventory_role_id);
                    return (
                      <tr key={item.item_id} className="hover:bg-white/[0.015] transition-colors">
                        <td className="py-3 px-4 font-mono text-white/50">
                          #{item.item_id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-white/40 truncate max-w-sm">{item.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          {currencySymbol}{item.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {grantedRole ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-white/80 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                              <Shield className="w-3 h-3 text-white/40" />
                              <span>@{grantedRole.name}</span>
                            </span>
                          ) : (
                            <span className="text-white/20 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.item_id)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors"
                            title="Delete item"
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
          </div>
        </div>
      </div>
    </div>
  );
}
