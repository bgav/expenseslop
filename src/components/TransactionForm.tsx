import React, { useState, useEffect, useRef } from 'react';
import { Account, Transaction, Category } from '../types';
import { ArrowRightLeft, HelpCircle, Check, Sparkles, Tag } from 'lucide-react';

interface TransactionFormProps {
  accounts: Account[];
  selectedAccountId: string | null;
  onAddTransaction: (tx: Omit<Transaction, 'id'>, targetAccountId?: string) => void;
  transactions: Transaction[];
  categories: Category[];
  onManageCategories: () => void;
}

export default function TransactionForm({
  accounts,
  selectedAccountId,
  onAddTransaction,
  transactions,
  categories,
  onManageCategories
}: TransactionFormProps) {
  // Primary Form States
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(() => {
    // Default to today in YYYY-MM-DD local format
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  const [payee, setPayee] = useState('');
  const [category, setCategory] = useState('');
  const [memo, setMemo] = useState('');
  const [outflow, setOutflow] = useState<string>('');
  const [inflow, setInflow] = useState<string>('');
  const [reconciled, setReconciled] = useState(false);

  // Transfer integration
  const [isTransfer, setIsTransfer] = useState(false);
  const [transferAccountId, setTransferAccountId] = useState('');

  // Suggestions state
  const [payeeSuggestions, setPayeeSuggestions] = useState<string[]>([]);
  const [showPayeeSuggestions, setShowPayeeSuggestions] = useState(false);
  const [activePayeeIndex, setActivePayeeIndex] = useState(-1);

  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(-1);

  // Refs for focusing & clicking out
  const payeeInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const payeeSuggestionsRef = useRef<HTMLDivElement>(null);
  const categorySuggestionsRef = useRef<HTMLDivElement>(null);

  // Sync account selection with the filtering
  useEffect(() => {
    if (selectedAccountId) {
      setAccountId(selectedAccountId);
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [selectedAccountId, accounts]);

  // Handle transfer flow triggers
  useEffect(() => {
    if (category.toLowerCase() === 'transfer') {
      setIsTransfer(true);
    }
  }, [category]);

  // Extract suggestions from existing transactions
  useEffect(() => {
    const uniquePayees = Array.from(new Set(transactions.map(t => t.payee).filter(Boolean)));
    setPayeeSuggestions(uniquePayees);

    const uniqueCategories = Array.from(new Set([
      ...categories.map(c => c.name),
      ...transactions.map(t => t.category).filter(Boolean)
    ]));
    setCategorySuggestions(uniqueCategories);
  }, [transactions, categories]);

  // Click outside to close autocompletes
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (payeeSuggestionsRef.current && !payeeSuggestionsRef.current.contains(event.target as Node)) {
        setShowPayeeSuggestions(false);
      }
      if (categorySuggestionsRef.current && !categorySuggestionsRef.current.contains(event.target as Node)) {
        setShowCategorySuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global hotkey to focus payee input (Alt + N)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key === 'n') || (e.altKey && e.key === 'N')) {
        e.preventDefault();
        payeeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handlePayeeChange = (value: string) => {
    setPayee(value);
    setActivePayeeIndex(-1);
    setShowPayeeSuggestions(true);
    
    // Auto-fill category if this payee has an existing category map! (Smart entry helper)
    const matchingTx = [...transactions]
      .reverse()
      .find(t => t.payee.toLowerCase() === value.trim().toLowerCase());
    if (matchingTx && matchingTx.category) {
      setCategory(matchingTx.category);
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setActiveCategoryIndex(-1);
    setShowCategorySuggestions(true);
  };

  const selectPayee = (val: string) => {
    setPayee(val);
    setShowPayeeSuggestions(false);
    // Find matching category to autofill
    const matchingTx = [...transactions]
      .reverse()
      .find(t => t.payee.toLowerCase() === val.toLowerCase());
    if (matchingTx && matchingTx.category) {
      setCategory(matchingTx.category);
    }
    categoryInputRef.current?.focus();
  };

  const selectCategory = (val: string) => {
    setCategory(val);
    setShowCategorySuggestions(false);
  };

  const handlePayeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filtered = payeeSuggestions.filter(p => p.toLowerCase().includes(payee.toLowerCase()));
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showPayeeSuggestions) {
        setShowPayeeSuggestions(true);
        return;
      }
      setActivePayeeIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivePayeeIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && showPayeeSuggestions && activePayeeIndex >= 0) {
      e.preventDefault();
      selectPayee(filtered[activePayeeIndex]);
    } else if (e.key === 'Escape') {
      setShowPayeeSuggestions(false);
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filtered = categorySuggestions.filter(c => c.toLowerCase().includes(category.toLowerCase()));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showCategorySuggestions) {
        setShowCategorySuggestions(true);
        return;
      }
      setActiveCategoryIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveCategoryIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && showCategorySuggestions && activeCategoryIndex >= 0) {
      e.preventDefault();
      selectCategory(filtered[activeCategoryIndex]);
    } else if (e.key === 'Escape') {
      setShowCategorySuggestions(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!accountId) {
      alert('Please select or create an account first.');
      return;
    }

    const outflowVal = parseFloat(outflow) || 0;
    const inflowVal = parseFloat(inflow) || 0;

    if (outflowVal === 0 && inflowVal === 0) {
      alert('Please enter either an outflow or inflow amount.');
      return;
    }

    if (isTransfer && !transferAccountId) {
      alert('Please select a target account for the transfer.');
      return;
    }

    if (isTransfer && transferAccountId === accountId) {
      alert('Source and target transfer accounts cannot be the same!');
      return;
    }

    onAddTransaction({
      accountId,
      date,
      payee: payee.trim() || (isTransfer ? 'Transfer' : 'Unspecified Payee'),
      category: category.trim() || (isTransfer ? 'Transfer' : 'Other'),
      memo: memo.trim(),
      outflow: outflowVal,
      inflow: inflowVal,
      reconciled,
      transferAccountId: isTransfer ? transferAccountId : undefined
    }, isTransfer ? transferAccountId : undefined);

    // Dynamic keyboard-user feedback and clear
    setPayee('');
    setCategory('');
    setMemo('');
    setOutflow('');
    setInflow('');
    setReconciled(false);
    setIsTransfer(false);
    setTransferAccountId('');
    
    // Focus back on payee for instantaneous loop entry experience
    payeeInputRef.current?.focus();
  };

  const handleFlowInput = (type: 'outflow' | 'inflow', val: string) => {
    // Sanitary numeric-only check
    const sanitized = val.replace(/[^0-9.]/g, '');
    if (type === 'outflow') {
      setOutflow(sanitized);
      if (sanitized !== '') setInflow('');
    } else {
      setInflow(sanitized);
      if (sanitized !== '') setOutflow('');
    }
  };

  const finalPayeeSuggestions = payeeSuggestions.filter(p => 
    p.toLowerCase().includes(payee.toLowerCase())
  ).slice(0, 5);

  const finalCategorySuggestions = categorySuggestions.filter(c => 
    c.toLowerCase().includes(category.toLowerCase())
  ).slice(0, 15);

  const otherAccounts = accounts.filter(a => a.id !== accountId);

  return (
    <div className="bg-white rounded border border-[#e4e2d9] shadow-lg sticky top-4 z-40 p-5 text-slate-800" id="sticky-input-card">
      <div className="flex justify-between items-center mb-3.5">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Sparkles size={13} className="text-sky-600 animate-pulse" />
          Rapid Manual Input Panel
        </h4>
        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-3">
          <span><kbd className="bg-slate-100 border border-slate-200 text-slate-700 px-1 py-0.5 rounded-sm">Alt + N</kbd> to focus entry</span>
          <span><kbd className="bg-slate-100 border border-slate-200 text-slate-700 px-1 py-0.5 rounded-sm">Enter</kbd> to save</span>
        </div>
      </div>

      <form 
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-12 gap-3"
      >
        {/* Account Selection */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-mono font-medium text-slate-500 block">Account</label>
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full text-xs font-sans bg-white border border-[#d2d0c5] text-slate-855 rounded-sm p-2.5 outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 cursor-pointer shadow-sm"
            tabIndex={1}
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-mono font-medium text-slate-500 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full text-xs font-mono bg-white border border-[#d2d0c5] text-slate-800 rounded-sm p-2.5 outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 shadow-sm"
            required
            tabIndex={2}
          />
        </div>

        {/* Payee Auto-suggest */}
        <div className="md:col-span-2 relative space-y-1" ref={payeeSuggestionsRef}>
          <label className="text-[10px] font-mono font-medium text-slate-500 block">Payee / Entity</label>
          <input
            type="text"
            ref={payeeInputRef}
            value={payee}
            onChange={e => handlePayeeChange(e.target.value)}
            onKeyDown={handlePayeeKeyDown}
            onFocus={() => setShowPayeeSuggestions(true)}
            placeholder="Recipient / Vendor"
            className="w-full text-xs bg-white border border-[#d2d0c5] text-slate-808 placeholder-slate-400 rounded-sm p-2.5 outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 shadow-sm"
            tabIndex={3}
            autoComplete="off"
          />
          {showPayeeSuggestions && payee && finalPayeeSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-250 rounded-sm shadow-2xl z-50 text-xs overflow-hidden py-1 max-h-52 text-slate-800">
              {finalPayeeSuggestions.map((p, idx) => (
                <button
                   key={p}
                  type="button"
                  onClick={() => selectPayee(p)}
                  className={`w-full text-left px-3 py-2 cursor-pointer transition ${
                    idx === activePayeeIndex ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Auto-suggest */}
        <div className="md:col-span-2 relative space-y-1" ref={categorySuggestionsRef}>
          <div className="flex justify-between items-center h-4">
            <label className="text-[10px] font-mono font-medium text-slate-500 block">Category</label>
            <button
              type="button"
              onClick={onManageCategories}
              className="text-[9px] font-mono text-sky-600 hover:text-sky-700 flex items-center gap-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500/20 px-1 py-0.5 rounded-sm"
              title="Manage custom category list"
            >
              <Tag size={8} />
              Config
            </button>
          </div>
          <input
            type="text"
            ref={categoryInputRef}
            value={category}
            onChange={e => handleCategoryChange(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
            onFocus={() => setShowCategorySuggestions(true)}
            placeholder="e.g. Shopping"
            className="w-full text-xs bg-white border border-[#d2d0c5] text-slate-808 placeholder-slate-400 rounded-sm p-2.5 outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 shadow-sm"
            tabIndex={4}
            autoComplete="off"
          />
          {showCategorySuggestions && finalCategorySuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-250 rounded-sm shadow-2xl z-50 text-xs overflow-hidden py-1 max-h-52 text-slate-800">
              {finalCategorySuggestions.map((c, idx) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => selectCategory(c)}
                  className={`w-full text-left px-3 py-2 cursor-pointer transition ${
                    idx === activeCategoryIndex ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Memo Input */}
        <div className="md:col-span-1 space-y-1">
          <label className="text-[10px] font-mono font-medium text-slate-500 block">Memo (Optional)</label>
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="Tags..."
            className="w-full text-xs bg-white border border-[#d2d0c5] text-slate-808 placeholder-slate-400 rounded-sm p-2.5 outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 shadow-sm"
            tabIndex={5}
          />
        </div>

        {/* Outflow Amount Input */}
        <div className="md:col-span-1 space-y-1">
          <label className="text-[10px] font-mono font-medium text-rose-600 block">Outflow (-)</label>
          <div className="relative">
            <input
              type="text"
              value={outflow}
              onChange={e => handleFlowInput('outflow', e.target.value)}
              placeholder="0.00"
              className="w-full text-xs font-mono bg-[#fff5f5] border border-rose-200 text-rose-700 placeholder-rose-300/60 rounded-sm p-2.5 outline-none focus:ring-2 focus:ring-rose-200/50 focus:border-rose-400 shadow-sm"
              tabIndex={6}
            />
          </div>
        </div>

        {/* Inflow Amount Input */}
        <div className="md:col-span-1 space-y-1">
          <label className="text-[10px] font-mono font-medium text-emerald-600 block">Inflow (+)</label>
          <div className="relative">
            <input
              type="text"
              value={inflow}
              onChange={e => handleFlowInput('inflow', e.target.value)}
              placeholder="0.00"
              className="w-full text-xs font-mono bg-[#f4fdf7] border border-emerald-200 text-emerald-755 placeholder-emerald-300/60 rounded-sm p-2.5 outline-none focus:ring-2 focus:ring-emerald-200/50 focus:border-emerald-400 shadow-sm"
              tabIndex={7}
            />
          </div>
        </div>

        {/* Save button with mouse click or Enter fallback */}
        <div className="md:col-span-1 flex items-end">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-sans font-semibold py-3.5 rounded-sm transition duration-150 flex items-center justify-center gap-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-md"
            tabIndex={9}
          >
            <Check size={14} />
            Commit
          </button>
        </div>
      </form>

      {/* Auxiliary settings (Is Transfer / Reconciled Flag) */}
      <div className="flex flex-wrap gap-4 mt-3.5 pt-3.5 border-t border-slate-200 text-xs">
        <label className="flex items-center gap-2 text-slate-650 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reconciled}
            onChange={e => setReconciled(e.target.checked)}
            className="rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500/20 bg-white"
            tabIndex={8}
          />
          <span className="font-mono text-[11px] text-slate-500">Mark Reconciled immediately</span>
        </label>

        <label className="flex items-center gap-2 text-slate-650 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isTransfer}
            onChange={e => {
              setIsTransfer(e.target.checked);
              if (e.target.checked) setCategory('Transfer');
            }}
            className="rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500/20 bg-white"
          />
          <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
            <ArrowRightLeft size={12} className="text-slate-500" />
            Double-Entry Wallet Transfer
          </span>
        </label>

        {isTransfer && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="text-slate-500 text-[11px]">→ Transfer to:</span>
            <select
              value={transferAccountId}
              onChange={e => {
                setTransferAccountId(e.target.value);
                const targetName = accounts.find(a => a.id === e.target.value)?.name || '';
                if (targetName) {
                  setPayee(`Transfer to ${targetName}`);
                }
              }}
              required
              className="text-[11px] bg-white border border-slate-300 text-slate-800 rounded-sm px-2 py-1 outline-none focus:border-sky-500 cursor-pointer shadow-sm"
            >
              <option value="">-- Select Target Account --</option>
              {otherAccounts.map(oa => (
                <option key={oa.id} value={oa.id}>{oa.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
