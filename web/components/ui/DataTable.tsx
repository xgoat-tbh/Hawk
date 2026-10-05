'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table';
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
  useEffect(() => { setCurrentPage(page => Math.min(page, totalPages)); }, [totalPages]);
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
    <div className="bg-white dark:bg-surface-1 border border-black/[0.08] dark:border-border rounded-xl overflow-hidden shadow-xs">
      {/* Table toolbar */}
      {searchFilter && (
        <div className="p-4 border-b border-black/[0.08] dark:border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder} aria-label={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-surface-2 border border-black/[0.08] dark:border-border rounded-lg text-text-primary dark:text-text-primary placeholder-slate-400 dark:placeholder-[#555b64] focus:outline-none focus:border-info transition-colors"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-text-muted">
            Total: <span className="text-text-primary dark:text-text-primary font-medium">{filteredData.length}</span>
          </div>
        </div>
      )}

      <div className="sm:hidden divide-y divide-border">{paginatedData.length ? paginatedData.map(row => <article key={rowKey(row)} className="p-4 space-y-3">{columns.map((col, index) => index === 0 ? <h3 className="font-semibold text-sm" key={col.key}>{col.render ? col.render(row) : String((row as any)[col.key] ?? '')}</h3> : <div className="flex justify-between gap-3 text-xs" key={col.key}><span className="text-text-muted">{col.header}</span><span className="text-right">{col.render ? col.render(row) : String((row as any)[col.key] ?? '')}</span></div>)}</article>) : <p className="p-4 text-sm text-text-muted">{emptyMessage}</p>}</div>
      {/* Table View */}
      <div className="hawk-scroll overflow-x-auto hidden sm:block">
        <Table className="w-full text-left text-xs text-text-secondary dark:text-text-secondary">
          <TableHeader className="bg-[#f4f5f7] dark:bg-surface-2 border-b border-black/[0.08] dark:border-border text-slate-600 dark:text-text-muted uppercase tracking-wider font-semibold">
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  scope="col"
                  aria-sort={sortKey === col.key ? sortDir === 'asc' ? 'ascending' : 'descending' : col.sortable ? 'none' : undefined}
                  className={`px-4 py-3 select-none ${col.width || ''} ${
                    col.sortable ? 'cursor-pointer hover:text-text-primary dark:hover:text-text-primary' : ''
                  } ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  <button type="button" disabled={!col.sortable} onClick={() => handleSort(col.key, col.sortable)} className="inline-flex items-center gap-1.5 text-left disabled:cursor-default">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-info-text dark:text-info-text font-bold">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-black/[0.06] dark:divide-[#16181e]">
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-slate-400 dark:text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 opacity-40" />
                    <p className="text-xs">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={rowKey(row)} className="hover:bg-slate-50 dark:hover:bg-surface-2/60 transition-colors">
                  {columns.map((col) => (
                    <TableCell
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
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-black/[0.08] dark:border-border flex items-center justify-between text-xs text-slate-500 dark:text-text-muted bg-[#fafbfc] dark:bg-surface-1">
          <div>
            Page <span className="text-text-primary dark:text-text-primary font-medium">{currentPage}</span> of{' '}
            <span className="text-text-primary dark:text-text-primary font-medium">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Previous page" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md bg-white dark:bg-[#14161b] hover:bg-slate-100 dark:hover:bg-[#1c1f26] border border-black/[0.08] dark:border-border text-text-primary dark:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              aria-label="Next page" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md bg-white dark:bg-[#14161b] hover:bg-slate-100 dark:hover:bg-[#1c1f26] border border-black/[0.08] dark:border-border text-text-primary dark:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
