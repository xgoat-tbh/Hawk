'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  emptyMessage?: string;
  rowKey: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 10,
  searchPlaceholder = 'Search records...',
  searchFilter,
  emptyMessage = 'No records found.',
  rowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    if (!search.trim() || !searchFilter) return data;
    const q = search.toLowerCase();
    return data.filter((row) => searchFilter(row, q));
  }, [data, search, searchFilter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const res = valA < valB ? -1 : 1;
      return sortDir === 'asc' ? res : -res;
    });
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl overflow-hidden shadow-xs">
      {/* Table toolbar */}
      {searchFilter && (
        <div className="p-4 border-b border-black/[0.08] dark:border-[#1a1d24] flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#555b64]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] placeholder-slate-400 dark:placeholder-[#555b64] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-[#717882]">
            Total: <span className="text-[#101217] dark:text-[#ededed] font-medium">{filteredData.length}</span>
          </div>
        </div>
      )}

      {/* Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#34383e] dark:text-[#c1c7cd]">
          <thead className="bg-[#f4f5f7] dark:bg-[#101216] border-b border-black/[0.08] dark:border-[#1a1d24] text-slate-600 dark:text-[#717882] uppercase tracking-wider font-semibold">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={`px-4 py-3 select-none ${col.width || ''} ${
                    col.sortable ? 'cursor-pointer hover:text-[#101217] dark:hover:text-[#ededed]' : ''
                  } ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  <div className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06] dark:divide-[#16181e]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 dark:text-[#555b64]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 opacity-40" />
                    <p className="text-xs">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50 dark:hover:bg-[#121418]/60 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 whitespace-nowrap ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-black/[0.08] dark:border-[#1a1d24] flex items-center justify-between text-xs text-slate-500 dark:text-[#717882] bg-[#fafbfc] dark:bg-[#0c0d10]">
          <div>
            Page <span className="text-[#101217] dark:text-[#ededed] font-medium">{currentPage}</span> of{' '}
            <span className="text-[#101217] dark:text-[#ededed] font-medium">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md bg-white dark:bg-[#14161b] hover:bg-slate-100 dark:hover:bg-[#1c1f26] border border-black/[0.08] dark:border-[#20242c] text-[#101217] dark:text-[#ededed] disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md bg-white dark:bg-[#14161b] hover:bg-slate-100 dark:hover:bg-[#1c1f26] border border-black/[0.08] dark:border-[#20242c] text-[#101217] dark:text-[#ededed] disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
