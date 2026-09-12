'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Edit2,
  Package,
  X,
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { RolePicker } from '@/components/ui/RolePicker';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';

interface StoreItemData {
  itemId: number;
  name: string;
  price: number;
  description: string;
  iconUrl: string;
  inventoryRoleId: string | null;
  inventoryEnabled: boolean;
  usable: boolean;
  sellable: boolean;
  stock: number;
  roleRequired: string | null;
  roleGiven: string | null;
  roleRemoved: string | null;
  replyMessage: string;
}

export default function StoreCatalogPage() {
  const { guildId } = useParams() as { guildId: string };
  const { roles, config } = useGuildData();
  const toast = useToast();

  const currencySymbol = config?.economy?.currency_symbol || '$';

  const [items, setItems] = useState<StoreItemData[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'info' | 'inventory' | 'roles'>('info');

  // Form State
  const [itemId, setItemId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [rawPrice, setRawPrice] = useState('1000');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [usable, setUsable] = useState(true);
  const [sellable, setSellable] = useState(true);
  const [stock, setStock] = useState<number>(-1);
  const [roleRequired, setRoleRequired] = useState<string | null>(null);
  const [roleGiven, setRoleGiven] = useState<string | null>(null);
  const [roleRemoved, setRoleRemoved] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<StoreItemData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Items
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/store/items`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  }, [guildId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreateModal = () => {
    setModalMode('create');
    setItemId(null);
    setName('');
    setRawPrice('1000');
    setDescription('');
    setIconUrl('');
    setInventoryEnabled(true);
    setUsable(true);
    setSellable(true);
    setStock(-1);
    setRoleRequired(null);
    setRoleGiven(null);
    setRoleRemoved(null);
    setReplyMessage('');
    setModalTab('info');
    setIsModalOpen(true);
  };

  const openEditModal = (item: StoreItemData) => {
    setModalMode('edit');
    setItemId(item.itemId);
    setName(item.name);
    setRawPrice(String(item.price));
    setDescription(item.description || '');
    setIconUrl(item.iconUrl || '');
    setInventoryEnabled(item.inventoryEnabled);
    setUsable(item.usable);
    setSellable(item.sellable);
    setStock(item.stock);
    setRoleRequired(item.roleRequired);
    setRoleGiven(item.roleGiven || item.inventoryRoleId);
    setRoleRemoved(item.roleRemoved);
    setReplyMessage(item.replyMessage || '');
    setModalTab('info');
    setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!name.trim()) {
      toast.error('Item name is required');
      return;
    }

    setModalLoading(true);

    const payload = {
      itemId,
      name: name.trim(),
      price: rawPrice.trim(),
      description: description.trim() || null,
      iconUrl: iconUrl.trim() || null,
      inventoryRoleId: roleGiven || null,
      inventoryEnabled,
      usable,
      sellable,
      stock,
      roleRequired,
      roleGiven,
      roleRemoved,
      replyMessage: replyMessage.trim() || null,
    };

    try {
      const res = await fetch(`/api/guilds/${guildId}/store/items`, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          modalMode === 'create'
            ? `Item "${name}" created successfully!`
            : `Item "${name}" updated successfully!`
        );
        setIsModalOpen(false);
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save item');
      }
    } catch {
      toast.error('Network error saving item');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/store/items?itemId=${deleteTarget.itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`Deleted item "${deleteTarget.name}"`);
        setDeleteTarget(null);
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete item');
      }
    } catch {
      toast.error('Network error deleting item');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<StoreItemData>[] = [
    {
      key: 'name',
      header: 'Item',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#14161b] border border-[#20242c] flex items-center justify-center shrink-0 overflow-hidden">
            {row.iconUrl ? (
              <img src={row.iconUrl} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-4 h-4 text-[#717882]" />
            )}
          </div>
          <div>
            <div className="font-semibold text-xs text-[#ededed] flex items-center gap-1.5">
              <span>{row.name}</span>
              <span className="font-mono text-[10px] text-[#717882]">#{row.itemId}</span>
            </div>
            {row.description && (
              <p className="text-[11px] text-[#717882] truncate max-w-xs">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-xs text-emerald-400">
          {currencySymbol}{row.price.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#16181d] border border-[#262a33] text-[#c1c7cd]">
          {row.stock === -1 ? 'Unlimited' : `${row.stock} left`}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'Properties',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-[10px]">
          {row.usable && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Usable
            </span>
          )}
          {row.sellable && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Sellable
            </span>
          )}
          {row.roleRequired && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Requires Role
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg bg-[#16181d] hover:bg-[#20232b] text-[#c1c7cd] hover:text-white border border-[#262a33] transition-colors"
            title="Edit item"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5] flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            Store Catalog & Items
          </h1>
          <p className="mt-1 text-xs text-[#8c949e]">
            Design store goods, stock levels, role granting triggers, and requirements rules.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create New Item
        </button>
      </div>

      {/* Catalog Table */}
      <DataTable
        columns={columns}
        data={items}
        pageSize={15}
        searchPlaceholder="Search items by name or ID..."
        searchFilter={(row, q) => row.name.toLowerCase().includes(q) || String(row.itemId).includes(q)}
        emptyMessage="No items in the store yet. Click 'Create New Item' to begin."
        rowKey={(r) => r.itemId}
      />

      {/* UnbelievaBoat-style Modal for Item Creation / Editing */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl bg-[#0c0d10] border border-[#20232b] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1a1d24] flex items-center justify-between bg-[#101216]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-[#f0f2f5]">
                  {modalMode === 'create' ? 'Create Store Item' : `Edit Item #${itemId}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#717882] hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#1a1d24] px-4 gap-4 text-xs font-medium bg-[#0e1013]">
              <button
                onClick={() => setModalTab('info')}
                className={`py-2.5 border-b-2 transition-colors ${
                  modalTab === 'info'
                    ? 'border-indigo-500 text-white font-semibold'
                    : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
                }`}
              >
                Item Information
              </button>
              <button
                onClick={() => setModalTab('inventory')}
                className={`py-2.5 border-b-2 transition-colors ${
                  modalTab === 'inventory'
                    ? 'border-indigo-500 text-white font-semibold'
                    : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
                }`}
              >
                Stock & Behavior
              </button>
              <button
                onClick={() => setModalTab('roles')}
                className={`py-2.5 border-b-2 transition-colors ${
                  modalTab === 'roles'
                    ? 'border-indigo-500 text-white font-semibold'
                    : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
                }`}
              >
                Role Triggers & Reply
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {modalTab === 'info' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">Item Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. VIP Pass, Legendary Sword"
                      className="w-full mt-1 px-3 py-2 text-xs bg-[#14161b] border border-[#20242c] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">
                      Price ({currencySymbol}) * (Supports scientific notation e.g. 1e6)
                    </label>
                    <input
                      type="text"
                      value={rawPrice}
                      onChange={(e) => setRawPrice(e.target.value)}
                      placeholder="1000 or 1e6"
                      className="w-full mt-1 px-3 py-2 text-xs bg-[#14161b] border border-[#20242c] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explain what this item grants or represents..."
                      className="w-full mt-1 px-3 py-2 text-xs bg-[#14161b] border border-[#20242c] rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">Icon Image URL</label>
                    <input
                      type="url"
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      placeholder="https://example.com/icon.png"
                      className="w-full mt-1 px-3 py-2 text-xs bg-[#14161b] border border-[#20242c] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#121418] border border-[#20242c] rounded-lg">
                    <div>
                      <div className="text-xs font-semibold text-[#f0f2f5]">Can Be Placed in Inventory</div>
                      <p className="text-[11px] text-[#717882]">Users hold this item in their inventory upon purchase.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={inventoryEnabled}
                      onChange={(e) => setInventoryEnabled(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#16181d] border-[#262a33] text-indigo-500 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#121418] border border-[#20242c] rounded-lg">
                    <div>
                      <div className="text-xs font-semibold text-[#f0f2f5]">Usable</div>
                      <p className="text-[11px] text-[#717882]">Users can trigger !use-item to consume effects.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={usable}
                      onChange={(e) => setUsable(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#16181d] border-[#262a33] text-indigo-500 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#121418] border border-[#20242c] rounded-lg">
                    <div>
                      <div className="text-xs font-semibold text-[#f0f2f5]">Sellable</div>
                      <p className="text-[11px] text-[#717882]">Users can sell this back for 50% refund or trade to others.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={sellable}
                      onChange={(e) => setSellable(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#16181d] border-[#262a33] text-indigo-500 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">
                      Stock Available (-1 = Unlimited)
                    </label>
                    <input
                      type="number"
                      min={-1}
                      value={stock}
                      onChange={(e) => setStock(parseInt(e.target.value, 10))}
                      className="w-full mt-1 px-3 py-2 text-xs bg-[#14161b] border border-[#20242c] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'roles' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">Role Required to Buy</label>
                    <div className="mt-1">
                      <RolePicker
                        value={roleRequired}
                        onChange={setRoleRequired}
                        roles={roles}
                        placeholder="None (anyone can buy)"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">Role Given on Purchase / Use</label>
                    <div className="mt-1">
                      <RolePicker
                        value={roleGiven}
                        onChange={setRoleGiven}
                        roles={roles}
                        placeholder="None"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">Role Removed on Purchase / Use</label>
                    <div className="mt-1">
                      <RolePicker
                        value={roleRemoved}
                        onChange={setRoleRemoved}
                        roles={roles}
                        placeholder="None"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c1c7cd]">Custom Reply Message</label>
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Message sent in chat when item is consumed..."
                      className="w-full mt-1 px-3 py-2 text-xs bg-[#14161b] border border-[#20242c] rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1a1d24] flex items-center justify-end gap-2.5 bg-[#101216]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#c1c7cd] hover:text-white bg-[#16181d] hover:bg-[#20242c] border border-[#262a33] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={modalLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                {modalLoading ? 'Saving...' : modalMode === 'create' ? 'Create Item' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        title="Delete Store Item"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This removes the item from the store catalog.`}
        confirmLabel="Delete Item"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
