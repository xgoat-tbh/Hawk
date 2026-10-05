'use client';
import { apiFetch } from '@/lib/api';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { PageHeader } from '@/components/ui/PageHeader';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Edit2,
  Package,
  X,
  RefreshCw,
  Shield,
  Layers,
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
      const res = await apiFetch(`/api/guilds/${guildId}/store/items`);
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
    setRoleRequired(item.roleRequired || null);
    setRoleGiven(item.roleGiven || null);
    setRoleRemoved(item.roleRemoved || null);
    setReplyMessage(item.replyMessage || '');
    setModalTab('info');
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Item name is required');
      return;
    }

    const price = parseInt(rawPrice, 10);
    if (isNaN(price) || price < 0) {
      toast.error('Valid non-negative price is required');
      return;
    }

    setModalLoading(true);

    const payload = {
      itemId,
      name: name.trim(),
      price,
      description: description.trim(),
      iconUrl: iconUrl.trim(),
      inventoryEnabled,
      usable,
      sellable,
      stock,
      roleRequired,
      roleGiven,
      roleRemoved,
      replyMessage: replyMessage.trim(),
    };

    try {
      const url = `/api/guilds/${guildId}/store/items`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save store item');
      }

      toast.success(
        modalMode === 'create'
          ? `Created item "${payload.name}"`
          : `Updated item "${payload.name}"`
      );
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Error saving store item');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/store/items?itemId=${deleteTarget.itemId}`, {
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
        <div className="flex items-center gap-2.5 font-sans">
          <div className="w-7 h-7 rounded bg-surface-4 border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden">
            {row.iconUrl ? (
              <img src={row.iconUrl} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-3.5 h-3.5 text-text-secondary" />
            )}
          </div>
          <div>
            <div className="text-xs text-text-primary font-medium flex items-center gap-1.5">
              <span>{row.name}</span>
              <span className="text-[10px] text-text-muted">#{row.itemId}</span>
            </div>
            {row.description && (
              <p className="text-[11px] text-text-secondary truncate max-w-xs">{row.description}</p>
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
        <span className="font-sans text-xs font-semibold text-success-text">
          {currencySymbol}{row.price.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      render: (row) => (
        <span className="console-tag console-tag-readv">
          {row.stock === -1 ? 'unlimited' : `${row.stock} left`}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Properties',
      render: (row) => (
        <div className="flex items-center gap-1 font-sans">
          {row.usable && (
            <span className="console-tag text-info-text bg-info/10 border-info/25">
              USABLE
            </span>
          )}
          {row.sellable && (
            <span className="console-tag text-success-text bg-success/10 border-success/25">
              SELLABLE
            </span>
          )}
          {row.roleRequired && (
            <span className="console-tag text-warning-text bg-warning/10 border-warning/25">
              ROLE REQ
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Role Actions',
      render: (row) => {
        const given = roles.find((r) => r.id === row.roleGiven);
        const removed = roles.find((r) => r.id === row.roleRemoved);
        if (!given && !removed) return <span className="font-sans text-[11px] text-text-muted">—</span>;
        return (
          <div className="font-sans text-[11px] space-y-0.5">
            {given && <span className="text-success-text block">+@{given.name}</span>}
            {removed && <span className="text-critical-text block">-@{removed.name}</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 font-sans">
          <button
            onClick={() => openEditModal(row)}
            className="btn-secondary py-1 px-2 text-[11px]"
            title="Edit item"
          >
            <Edit2 className="w-3 h-3 mr-1 text-text-secondary" />
            edit
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="btn-outline-danger py-1 px-2 text-[11px]"
            title="Delete item"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-24">
      <PageHeader guildId={guildId} title="Store catalog" description="Manage items, pricing, stock, and role rewards." actions={<div className="flex items-center gap-2 font-sans">
            <button
              onClick={() => {
                fetchItems();
              }}
              className="btn-secondary"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </button>

            <button
              onClick={openCreateModal}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create item
            </button>
          </div>}/>

      {/* Catalog Table Panel */}
      <div className="surface-container">
        <div className="panel-header">
          <span>store catalog</span>
          <span className="text-text-secondary">{items.length} items cataloged</span>
        </div>
        <DataTable
          columns={columns}
          data={items}
          pageSize={15}
          searchPlaceholder="Search items by name or ID..."
          searchFilter={(row, q) =>
            row.name.toLowerCase().includes(q) || String(row.itemId).includes(q)
          }
          emptyMessage="No items in store catalog. Click 'Create item' to begin."
          rowKey={(r) => r.itemId}
        />
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <AnimatedModal isOpen={isModalOpen} onClose={() => { if (!modalLoading) setIsModalOpen(false); }} title={modalMode === 'create' ? 'Create store item' : `Edit item #${itemId}`} maxWidth="max-w-xl">
            {/* Modal Tab Strip */}
            <div className="flex items-center gap-1 border-b border-white/[0.06] px-4 py-2 text-xs bg-surface-1">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  modalTab === 'info'
                    ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                info
              </button>

              <button
                type="button"
                onClick={() => setModalTab('inventory')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  modalTab === 'inventory'
                    ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                stock & flags
              </button>

              <button
                type="button"
                onClick={() => setModalTab('roles')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  modalTab === 'roles'
                    ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                role triggers
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-4 space-y-4">
              {modalTab === 'info' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Item Name *</label>
                    <input
                      type="text"
                      maxLength={64}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. VIP Pass, Legendary Sword"
                      className="glass-input font-sans"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-text-secondary block mb-1">
                        Price ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={rawPrice}
                        onChange={(e) => setRawPrice(e.target.value)}
                        className="glass-input font-sans text-right"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-text-secondary block mb-1">Stock Quota</label>
                      <input
                        type="number"
                        min={-1}
                        value={stock}
                        onChange={(e) => setStock(parseInt(e.target.value, 10) || -1)}
                        className="glass-input font-sans text-right"
                      />
                      <span className="text-[10px] text-text-muted mt-0.5 block">-1 for unlimited</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief details about what this item grants..."
                      className="glass-input font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Icon URL (optional)</label>
                    <input
                      type="url"
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      placeholder="https://i.imgur.com/..."
                      className="glass-input font-sans"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'inventory' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded bg-surface-1 border border-white/[0.04]">
                    <div>
                      <div className="text-xs text-text-primary font-medium">Inventory Tracking</div>
                      <div className="text-[10px] text-text-secondary">Keep item in user inventory post-purchase</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={inventoryEnabled}
                      onChange={(e) => setInventoryEnabled(e.target.checked)}
                      className="w-4 h-4 rounded bg-surface-1 border border-white/[0.08] text-success-text focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded bg-surface-1 border border-white/[0.04]">
                    <div>
                      <div className="text-xs text-text-primary font-medium">Usable</div>
                      <div className="text-[10px] text-text-secondary">Allow members to trigger item use command</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={usable}
                      onChange={(e) => setUsable(e.target.checked)}
                      className="w-4 h-4 rounded bg-surface-1 border border-white/[0.08] text-success-text focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded bg-surface-1 border border-white/[0.04]">
                    <div>
                      <div className="text-xs text-text-primary font-medium">Sellable</div>
                      <div className="text-[10px] text-text-secondary">Allow members to sell back item to server store</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sellable}
                      onChange={(e) => setSellable(e.target.checked)}
                      className="w-4 h-4 rounded bg-surface-1 border border-white/[0.08] text-success-text focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Use Reply Message</label>
                    <textarea
                      rows={2}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Message sent in chat when item is consumed..."
                      className="glass-input font-sans"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'roles' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Role Required to Purchase</label>
                    <RolePicker
                      roles={roles}
                      value={roleRequired}
                      onChange={setRoleRequired}
                      placeholder="No role required..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Role Given on Purchase</label>
                    <RolePicker
                      roles={roles}
                      value={roleGiven}
                      onChange={setRoleGiven}
                      placeholder="No role given..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Role Removed on Purchase</label>
                    <RolePicker
                      roles={roles}
                      value={roleRemoved}
                      onChange={setRoleRemoved}
                      placeholder="No role removed..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn-primary"
                >
                  {modalLoading ? 'saving...' : modalMode === 'create' ? 'create item' : 'save changes'}
                </button>
              </div>
            </form>
        </AnimatedModal>
      )}

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="// delete store item"
        description={`Are you sure you want to delete "${deleteTarget?.name}" (#${deleteTarget?.itemId})? This will permanently remove it from the catalog.`}
        confirmLabel="delete item"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
