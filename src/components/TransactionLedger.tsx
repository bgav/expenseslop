import React, { useState, useMemo } from 'react';
import { Transaction, Account } from '../types';
import { 
  Search, ArrowUpDown, CheckCircle, Circle, Trash2, Edit, AlertCircle, 
  ArrowRightLeft, Filter, Calendar, X, RefreshCw, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface TransactionLedgerProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedAccountId: string | null;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
}

type SortField = 'date' | 'payee' | 'category' | 'memo' | 'outflow' | 'inflow' | 'reconciled';
type SortOrder = 'asc' | 'desc';

export default function TransactionLedger({
  transactions,
  accounts,
  selectedAccountId,
  onUpdateTransaction,
  onDeleteTransaction
}: TransactionLedgerProps) {
  // Query/filter states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reconciledFilter, setReconciledFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination states
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setReconciledFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const accountMap = useMemo(() => {
    return new Map(accounts.map(a => [a.id, a]));
  }, [accounts]);

  // Unique categories list for filtering dropdown
  const categoriesList = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));
  }, [transactions]);

  // Filter & Sort Transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by specific Account
    if (selectedAccountId !== null) {
      result = result.filter(t => t.accountId === selectedAccountId);
    }

    // Filter by query-search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        const vendor = t.payee?.toLowerCase() || '';
        const cat = t.category?.toLowerCase() || '';
        const note = t.memo?.toLowerCase() || '';
        const targetAccName = t.transferAccountId ? (accountMap.get(t.transferAccountId)?.name || '').toLowerCase() : '';
        return vendor.includes(q) || cat.includes(q) || note.includes(q) || targetAccName.includes(q);
      });
    }

    // Filter by category
    if (categoryFilter) {
      result = result.filter(t => t.category === categoryFilter);
    }

    // Filter by reconciled status
    if (reconciledFilter === 'reconciled') {
      result = result.filter(t => t.reconciled);
    } else if (reconciledFilter === 'unreconciled') {
      result = result.filter(t => !t.reconciled);
    }

    // Filter by date range
    if (dateFrom) {
      result = result.filter(t => t.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(t => t.date <= dateTo);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Format custom fields
      if (sortField === 'outflow' || sortField === 'inflow') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      
      if (aVal === undefined || aVal === null) return sortOrder === 'asc' ? -1 : 1;
      if (bVal === undefined || bVal === null) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' 
          ? (aVal > bVal ? 1 : -1) 
          : (bVal > aVal ? 1 : -1);
      }
    });

    return result;
  }, [transactions, selectedAccountId, search, categoryFilter, reconciledFilter, dateFrom, dateTo, sortField, sortOrder, accountMap]);

  // Handle pagination calculations
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return processedTransactions.slice(start, start + itemsPerPage);
  }, [processedTransactions, page]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const toggleReconciliation = (tx: Transaction) => {
    onUpdateTransaction({
      ...tx,
      reconciled: !tx.reconciled
    });
  };

  // Inline editing triggers
  const startInlineEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const saveInlineEdit = () => {
    if (editingId && editForm) {
      onUpdateTransaction(editForm as Transaction);
      setEditingId(null);
      setEditForm({});
    }
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const currencyFormatter = (amount: number) => {
    if (amount === 0) return '—';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-white rounded border border-[#e4e2d9] shadow-lg overflow-hidden text-slate-850" id="ledger-card">
      
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Instant as-you-type search payee, memo, account..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white rounded-sm border border-[#d2d0c5] text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 shadow-sm"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-800"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Reconciled Filter Toggles */}
            <div className="bg-slate-100 border border-slate-200 rounded-sm p-0.5 flex">
              <button
                onClick={() => setReconciledFilter('all')}
                className={`px-3 py-1.5 text-[10px] font-mono font-medium rounded-sm transition-all duration-150 ${
                  reconciledFilter === 'all' ? 'bg-sky-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Statuses
              </button>
              <button
                onClick={() => setReconciledFilter('reconciled')}
                className={`px-3 py-1.5 text-[10px] font-mono font-medium rounded-sm transition-all duration-150 flex items-center gap-1 ${
                  reconciledFilter === 'reconciled' ? 'bg-sky-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle size={10} className={reconciledFilter === 'reconciled' ? "text-white" : "text-emerald-600"} />
                Cleared
              </button>
              <button
                onClick={() => setReconciledFilter('unreconciled')}
                className={`px-3 py-1.5 text-[10px] font-mono font-medium rounded-sm transition-all duration-150 flex items-center gap-1 ${
                  reconciledFilter === 'unreconciled' ? 'bg-sky-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertCircle size={10} className={reconciledFilter === 'unreconciled' ? "text-white" : "text-amber-600"} />
                Uncleared
              </button>
            </div>

            {/* Reset helper */}
            {(search || categoryFilter || reconciledFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-red-500 bg-white border border-slate-200 px-3 py-1.5 rounded-sm hover:border-red-200 transition cursor-pointer shadow-sm"
              >
                <RefreshCw size={11} />
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters (Date & Category dropdowns) */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-slate-500" />
            <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">Advanced:</span>
          </div>          {/* Category drop */}
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs bg-white border border-[#d2d0c5] rounded-sm px-2.5 py-1.5 outline-none focus:border-sky-500 text-slate-700 cursor-pointer shadow-sm"
          >
            <option value="">All Categories ({categoriesList.length})</option>
            {categoriesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Date range filters */}
          <div className="flex items-center gap-1.5 text-slate-450">
            <Calendar size={12} className="text-slate-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From"
              className="text-xs bg-white border border-[#d2d0c5] rounded-sm px-2.5 py-1 text-slate-700 outline-none shadow-sm"
            />
            <span className="text-[10px] text-slate-550 font-mono">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              placeholder="To"
              className="text-xs bg-white border border-[#d2d0c5] rounded-sm px-2.5 py-1 text-slate-700 outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-500 uppercase tracking-wider select-none">
              <th className="py-3.5 px-4 w-12 text-center">Status</th>
              <th className="py-3.5 px-3 w-28 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('date')}>
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              {selectedAccountId === null && (
                <th className="py-3.5 px-3 w-32">Account</th>
              )}
              <th className="py-3.5 px-4 w-44 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('payee')}>
                <div className="flex items-center gap-1">
                  Payee / Entity
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-3 w-32 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('category')}>
                <div className="flex items-center gap-1">
                  Category
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('memo')}>
                <div className="flex items-center gap-1">
                  Memo
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-3 w-28 text-right cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('outflow')}>
                <div className="flex items-center gap-1 justify-end">
                  Outflow (-)
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-3 w-28 text-right cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('inflow')}>
                <div className="flex items-center gap-1 justify-end">
                  Inflow (+)
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                  <div className="max-w-xs mx-auto space-y-3">
                    <p className="text-slate-500 font-mono text-xs">No matching transactions.</p>
                    <button
                      onClick={resetFilters}
                      className="text-[10px] font-mono bg-white border border-slate-250 text-slate-700 px-3 py-1.5 rounded-sm hover:bg-slate-50 transition cursor-pointer shadow-sm"
                    >
                      Reset active queries
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const isEditing = editingId === tx.id;
                const sourceAcc = accountMap.get(tx.accountId);
                const isRecurring = tx.isRecurringInstance;

                return (
                  <tr 
                    key={tx.id} 
                    className={`hover:bg-slate-50/70 transition duration-150 ${
                      tx.reconciled ? 'bg-emerald-50/25' : ''
                    } ${isEditing ? 'bg-sky-50/45' : ''}`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleReconciliation(tx)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-600 transition duration-150 focus:outline-none cursor-pointer"
                        title={tx.reconciled ? "Clear Cleared/Reconciled status" : "Mark as Cleared/Reconciled"}
                      >
                        {tx.reconciled ? (
                          <CheckCircle size={15} className="text-emerald-600" />
                        ) : (
                          <Circle size={15} className="text-slate-400 hover:border-slate-600" />
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-slate-600">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.date || ''}
                          onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                          className="text-xs font-mono border border-slate-300 rounded-sm p-1.5 w-full bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      ) : (
                        tx.date
                      )}
                    </td>
                    {selectedAccountId === null && (
                      <td className="py-3.5 px-3">
                        <span 
                          className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium text-white truncate max-w-[120px] block border border-white/5"
                          style={{ backgroundColor: sourceAcc?.color || '#cbd5e1' }}
                        >
                          {sourceAcc?.name || 'Unknown'}
                        </span>
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.payee || ''}
                          onChange={e => setEditForm({ ...editForm, payee: e.target.value })}
                          className="text-xs border border-slate-300 rounded-sm p-1.5 w-full bg-white text-slate-808 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {tx.payee}
                            {isRecurring && (
                              <span className="text-[9px] bg-sky-50 border border-sky-100 text-sky-700 rounded-sm px-1.5 font-mono">
                                Recurring
                              </span>
                            )}
                          </div>
                          {tx.transferAccountId && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                              <ArrowRightLeft size={10} className="text-slate-400" />
                              <span>Transfer partner:</span>
                              <span 
                                className="font-semibold underline decoration-2 cursor-pointer hover:text-slate-700"
                                style={{ decorationColor: accountMap.get(tx.transferAccountId)?.color }}
                              >
                                {accountMap.get(tx.transferAccountId)?.name || 'Deleted Account'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.category || ''}
                          onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                          className="text-xs border border-slate-300 rounded-lg p-1.5 w-full bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      ) : (
                        <span className="bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-2 py-0.5 text-[10px] font-mono">
                          {tx.category}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-slate-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.memo || ''}
                          onChange={e => setEditForm({ ...editForm, memo: e.target.value })}
                          className="text-xs border border-slate-300 rounded-lg p-1.5 w-full bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 animate-fadeIn"
                        />
                      ) : (
                        tx.memo || <span className="text-slate-400 italic font-mono text-[10px]">None</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-rose-600">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.outflow || ''}
                          onChange={e => setEditForm({ ...editForm, outflow: parseFloat(e.target.value) || 0, inflow: 0 })}
                          className="text-xs font-mono text-right border border-rose-300 rounded-lg p-1.5 w-20 bg-white text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
                          placeholder="0.00"
                        />
                      ) : (
                        currencyFormatter(tx.outflow)
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-emerald-700">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.inflow || ''}
                          onChange={e => setEditForm({ ...editForm, inflow: parseFloat(e.target.value) || 0, outflow: 0 })}
                          className="text-xs font-mono text-right border border-emerald-300 rounded-lg p-1.5 w-20 bg-white text-emerald-750 focus:outline-none focus:ring-2 focus:ring-emerald-250"
                          placeholder="0.00"
                        />
                      ) : (
                        currencyFormatter(tx.inflow)
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveInlineEdit}
                              className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-sm text-[10px] font-sans font-semibold hover:scale-105 transition duration-155 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-202 text-slate-600 rounded-sm text-[10px] font-sans font-medium transition cursor-pointer"
                            >
                              Esc
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startInlineEdit(tx)}
                              className="p-1 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-slate-800 transition duration-150 cursor-pointer"
                              title="Edit transaction info"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this transaction?')) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="p-1 hover:bg-rose-50 rounded-sm text-slate-400 hover:text-rose-600 transition duration-150 cursor-pointer"
                              title="Delete transaction record"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-slate-50/50 border-t border-slate-202 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Showing {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, processedTransactions.length)} of {processedTransactions.length} items
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1 px-2.5 bg-white border border-slate-250 rounded-sm text-slate-600 hover:text-slate-900 hover:border-slate-350 disabled:opacity-30 disabled:hover:text-slate-650 transition text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <div className="text-slate-500 px-2 flex items-center text-xs font-mono">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="p-1 px-2.5 bg-white border border-slate-250 rounded-sm text-slate-600 hover:text-slate-900 hover:border-slate-350 disabled:opacity-30 disabled:hover:text-slate-650 transition text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
