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
  const containerRef = usePageEntrance();
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
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#a9adb2]" />
            <span>Server Store Catalog</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Manage purchasable shop items and automatic Discord role grants for members.
          </p>
        </div>
      </div>

      {addError && (
        <div className="p-3 rounded-md bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{addError}</span>
        </div>
      )}

      {/* Add Item Form Bar */}
      <form
        onSubmit={handleAddItem}
        className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Item Name</label>
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
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Price ({currencySymbol})</label>
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
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Description (Optional)</label>
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
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Grant Role (Optional)</label>
          <RolePicker
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

      {/* Store Items Data Table with HawkScrollArea */}
      <div className="space-y-2" data-animate-section>
        <SectionHeader
          title={`Active Catalog Items (${items.length})`}
          description="Members can purchase these items using the !buy <item_id> command in chat."
        />

        <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
          <HawkScrollArea maxHeight="55vh">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                <tr>
                  <th className="py-2.5 px-4">Item ID</th>
                  <th className="py-2.5 px-4">Item Name & Description</th>
                  <th className="py-2.5 px-4">Price</th>
                  <th className="py-2.5 px-4">Granted Discord Role</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1f23]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#7e8389] text-xs">
                      No store items configured yet. Use the form above to add items to the shop.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
                    const grantedRole = roles.find((r) => r.id === item.inventory_role_id);
                    return (
                      <tr key={item.item_id} className="hover:bg-[#121417]/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[#7e8389]">
                          #{item.item_id}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-[#f1f2f3]">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-[#7e8389] truncate max-w-sm">{item.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-[#f1f2f3]">
                          {currencySymbol}{item.price.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4">
                          {grantedRole ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#d5d7da] bg-[#17191c] px-2 py-0.5 rounded border border-[#24272b]">
                              <Shield className="w-3 h-3 text-[#7e8389]" />
                              <span>@{grantedRole.name}</span>
                            </span>
                          ) : (
                            <span className="text-[#373b42] font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.item_id)}
                            className="p-1.5 rounded-md text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors"
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
          </HawkScrollArea>
        </div>
      </div>
    </div>
  );
}
