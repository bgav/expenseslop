import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { Plus, Wallet, CreditCard, Landmark, PiggyBank, CheckCircle2, AlertCircle, Edit, Trash2 } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  selectedAccountId: string | null; // null represents "All Accounts"
  onSelectAccount: (accountId: string | null) => void;
  calculatedBalances: Record<string, { current: number; reconciled: number; totalIn: number; totalOut: number }>;
  onAddAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
}

const ACCOUNT_TYPES: { value: AccountType; icon: React.ComponentType<any>; label: string }[] = [
  { value: 'Checking', icon: Landmark, label: 'Checking' },
  { value: 'Savings', icon: PiggyBank, label: 'Savings' },
  { value: 'Credit Card', icon: CreditCard, label: 'Credit Card' },
  { value: 'Cash', icon: Wallet, label: 'Cash' },
  { value: 'Investment', icon: Wallet, label: 'Investment' },
  { value: 'Other', icon: Wallet, label: 'Other' },
];

export default function AccountList({
  accounts,
  selectedAccountId,
  onSelectAccount,
  calculatedBalances,
  onAddAccount,
  onEditAccount,
  onDeleteAccount
}: AccountListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Checking');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [color, setColor] = useState('#0284c7');

  const COLORS = [
    '#0284c7', // Sky
    '#0ea5e9', // Light Blue
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#64748b', // Slate
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingAccount) {
      onEditAccount({
        ...editingAccount,
        name: name.trim(),
        type,
        initialBalance,
        color
      });
    } else {
      onAddAccount({
        name: name.trim(),
        type,
        initialBalance,
        color
      });
    }

    resetForm();
  };

  const startEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setInitialBalance(acc.initialBalance);
    setColor(acc.color);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setName('');
    setType('Checking');
    setInitialBalance(0);
    setColor('#0284c7');
    setEditingAccount(null);
    setIsFormOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate overall net worth summary
  const totalNetWorth = Object.values(calculatedBalances).reduce((sum, item) => sum + item.current, 0);
  const totalReconciled = Object.values(calculatedBalances).reduce((sum, item) => sum + item.reconciled, 0);

  return (
    <div className="space-y-6" id="account-sidebar-container">
      {/* Total net worth card */}
      <div className="bg-white rounded-2xl border border-[#e4e2d9] p-5 shadow-sm space-y-3">
        <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider block">Net Assets Balance</span>
        <div className="flex items-baseline justify-between">
          <h2 className="text-3xl font-display font-bold tracking-tight text-slate-805 font-semibold">
            {formatCurrency(totalNetWorth)}
          </h2>
          <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 rounded px-1.5 py-0.5 font-mono">Total Liquid</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Cleared: {formatCurrency(totalReconciled)}
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle size={13} className="text-amber-600" />
            Uncleared: {formatCurrency(totalNetWorth - totalReconciled)}
          </span>
        </div>
      </div>

      {/* Standalone All Accounts button above Accounts label */}
      <button
        onClick={() => onSelectAccount(null)}
        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
          selectedAccountId === null
            ? 'bg-sky-50/50 border-sky-400 shadow-sm ring-1 ring-sky-500/10 text-slate-900 font-semibold'
            : 'bg-white border-[#e4e2d9] text-slate-700 hover:bg-slate-50 shadow-sm'
        }`}
        id="account-btn-all"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${selectedAccountId === null ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
            <Landmark size={15} />
          </div>
          <div>
            <span className="font-sans font-semibold text-xs block">All Accounts</span>
            <span className={`text-[10px] font-mono ${selectedAccountId === null ? 'text-sky-600' : 'text-slate-540'}`}>
              All assets & liabilities
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-semibold block text-slate-800">{formatCurrency(totalNetWorth)}</span>
        </div>
      </button>

      {/* Account List Header and container */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Accounts</h3>
          <button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            title="Add Account (Alt+A)"
            id="add-account-btn"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Form to Create/Edit Account */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center pb-1 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-800">
                {editingAccount ? 'Edit Account' : 'New Account'}
              </span>
              <button 
                type="button" 
                onClick={resetForm} 
                className="text-xs text-slate-500 hover:text-slate-805"
              >
                Cancel
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-500">Account Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Chase Checkings"
                className="w-full text-xs bg-white rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500">Account Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as AccountType)}
                  className="w-full text-xs bg-white rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-500">Starting Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={e => setInitialBalance(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-white rounded-lg border border-slate-300 p-2 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-500 block">Account Color Theme</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition focus:outline-none"
                    style={{ 
                      backgroundColor: c, 
                      borderColor: color === c ? '#475569' : 'transparent' 
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition duration-200 shadow-sm mt-2"
            >
              {editingAccount ? 'Save Changes' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {/* Individual accounts */}
          {accounts.map(acc => {
            const balances = calculatedBalances[acc.id] || { current: acc.initialBalance, reconciled: acc.initialBalance };
            const isSelected = selectedAccountId === acc.id;
            const TypeIcon = ACCOUNT_TYPES.find(t => t.value === acc.type)?.icon || Wallet;

            return (
              <div 
                key={acc.id}
                className={`relative group rounded-xl border transition-all duration-200 ${
                  isSelected 
                    ? 'bg-sky-50/50 border-sky-400 shadow-sm ring-1 ring-sky-500/10 text-slate-900 font-semibold' 
                    : 'bg-white border-[#e4e2d9] text-slate-705 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <div
                  onClick={() => onSelectAccount(acc.id)}
                  className="w-full text-left p-3.5 flex items-center justify-between cursor-pointer"
                  id={`account-btn-${acc.id}`}
                >
                  <div className="flex items-center gap-3 pr-8">
                    <div 
                      className="p-1.5 rounded-lg text-white font-semibold"
                      style={{ backgroundColor: acc.color }}
                    >
                      <TypeIcon size={15} />
                    </div>
                    <div className="truncate max-w-[130px]">
                      <span className="font-sans font-semibold text-xs text-slate-800 block truncate">{acc.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 block">{acc.type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-slate-800 block">
                      {formatCurrency(balances.current)}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 block">
                      Rec: {formatCurrency(balances.reconciled)}
                    </span>
                  </div>
                </div>

                {/* Operations tools */}
                <div className="absolute top-3.5 right-3 opacity-0 group-hover:opacity-100 flex gap-1 bg-white pl-1 py-1 px-1.5 rounded-lg border border-slate-200 transition duration-150 shadow-sm">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(acc); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-800"
                    title="Edit account details"
                  >
                    <Edit size={11} />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete the "${acc.name}" account? This deletes all associated transactions!`)) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                      title="Delete account"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
