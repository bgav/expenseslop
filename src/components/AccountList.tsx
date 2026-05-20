import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { Plus, Wallet, CreditCard, Landmark, PiggyBank, CheckCircle2, AlertCircle, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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

  // Group collapsed state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('collapsed_account_groups');
    return stored ? JSON.parse(stored) : {}; // Default to keeping all groups expanded
  });

  const toggleGroup = (groupName: string) => {
    const next = { ...collapsedGroups, [groupName]: !collapsedGroups[groupName] };
    setCollapsedGroups(next);
    localStorage.setItem('collapsed_account_groups', JSON.stringify(next));
  };
  
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
    <div className="space-y-4" id="account-sidebar-container">
      {/* Standalone All Accounts button above Accounts label */}
      <button
        onClick={() => onSelectAccount(null)}
        className={`w-full text-left p-3.5 rounded border transition-all duration-200 flex items-center justify-between group cursor-pointer ${
          selectedAccountId === null
            ? 'bg-[#2a2f58] border-white/25 shadow-sm text-white font-semibold'
            : 'bg-transparent border-transparent text-slate-300 hover:bg-white/5'
        }`}
        id="account-btn-all"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-sm ${selectedAccountId === null ? 'bg-[#3b82f6] text-white' : 'bg-[#202544] text-slate-400'}`}>
            <Landmark size={15} />
          </div>
          <div>
            <span className="font-sans font-semibold text-xs block text-white">All Accounts</span>
            <span className={`text-[10px] font-mono ${selectedAccountId === null ? 'text-slate-350' : 'text-slate-400'}`}>
              All assets & liabilities
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-semibold block text-white">{formatCurrency(totalNetWorth)}</span>
        </div>
      </button>

      {/* Account List Header and container */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 border-t border-white/10 pt-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Accounts</h3>
          <button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded text-xs font-mono flex items-center gap-1 transition duration-150 focus:outline-none cursor-pointer"
            title="Add Account (Alt+A)"
            id="add-account-btn"
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>

        {/* Form to Create/Edit Account */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="bg-[#202544] border border-white/10 rounded p-4 space-y-3 animate-fadeIn text-white">
            <div className="flex justify-between items-center pb-1 border-b border-white/10">
              <span className="text-xs font-bold text-white">
                {editingAccount ? 'Edit Account' : 'New Account'}
              </span>
              <button 
                type="button" 
                onClick={resetForm} 
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400">Account Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Chase Checkings"
                className="w-full text-xs bg-[#131735]/60 rounded-sm border border-white/15 p-2 text-white placeholder-white/30 truncate focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">Account Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as AccountType)}
                  className="w-full text-xs bg-[#131735]/60 rounded-sm border border-white/15 p-2 text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value} className="bg-[#1a1e3a] text-white">{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">Starting Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={initialBalance}
                  onChange={e => setInitialBalance(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-[#131735]/60 rounded-sm border border-white/15 p-2 text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 block">Account Color Theme</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition focus:outline-none cursor-pointer"
                    style={{ 
                      backgroundColor: c, 
                      borderColor: color === c ? '#3b82f6' : 'transparent' 
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-650 text-white text-xs font-semibold py-2 rounded-sm transition duration-200 shadow-sm mt-2 cursor-pointer"
            >
              {editingAccount ? 'Save Changes' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="space-y-3.5">
          {[
            { name: 'CASH', label: 'CASH', types: ['Checking', 'Savings', 'Cash'] },
            { name: 'CREDIT', label: 'CREDIT', types: ['Credit Card'] },
            { name: 'TRACKING', label: 'TRACKING', types: ['Investment', 'Other'] }
          ].map(group => {
            const groupAccounts = accounts.filter(acc => group.types.includes(acc.type));
            if (groupAccounts.length === 0) return null;

            const isCollapsed = collapsedGroups[group.name];
            const groupSum = groupAccounts.reduce((sum, acc) => {
              const balances = calculatedBalances[acc.id] || { current: acc.initialBalance, reconciled: acc.initialBalance };
              return sum + balances.current;
            }, 0);

            return (
              <div key={group.name} className="space-y-1">
                {/* Group Heading Header Row */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-white/5 rounded text-left transition select-none cursor-pointer text-slate-350 hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    {isCollapsed ? (
                      <ChevronRight size={13} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown size={13} className="text-slate-400 shrink-0" />
                    )}
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-350">
                      {group.label}
                    </span>
                  </div>
                  <div>
                    {groupSum < 0 ? (
                      <span className="bg-rose-500/20 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-bold font-mono text-[10px]">
                        {formatCurrency(groupSum)}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-100 text-[10.5px]">
                        {formatCurrency(groupSum)}
                      </span>
                    )}
                  </div>
                </button>

                {/* Sub-list of group's accounts nested and indented */}
                {!isCollapsed && (
                  <div className="space-y-1 pl-3 border-l border-white/10 ml-2 animate-fadeIn">
                    {groupAccounts.map(acc => {
                      const balances = calculatedBalances[acc.id] || { current: acc.initialBalance, reconciled: acc.initialBalance };
                      const isSelected = selectedAccountId === acc.id;

                      return (
                        <div 
                          key={acc.id}
                          className={`relative group rounded border transition-all duration-200 ${
                            isSelected 
                              ? 'bg-[#2a2f58] border-white/15 shadow-sm text-white font-semibold' 
                              : 'bg-transparent border-transparent text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div
                            onClick={() => onSelectAccount(acc.id)}
                            className="w-full text-left p-2.5 flex items-center justify-between cursor-pointer"
                            id={`account-btn-${acc.id}`}
                          >
                            <div className="flex items-center pr-8 truncate">
                              <span className={`font-sans text-[12px] truncate ${isSelected ? 'text-white font-bold' : 'text-slate-200'}`}>
                                {acc.name}
                              </span>
                            </div>
                            <div className="text-right shrink-0 font-mono">
                              {balances.current < 0 ? (
                                <span className="bg-rose-950/45 border border-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded font-bold font-mono text-[10.5px]">
                                  {formatCurrency(balances.current)}
                                </span>
                              ) : (
                                <span className={`text-[12px] font-semibold block ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                  {formatCurrency(balances.current)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hover Operations widget */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-[#202544] pl-1 py-1 px-1.5 rounded border border-white/10 transition duration-150 shadow-sm">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(acc); }}
                              className="p-1 hover:bg-white/10 rounded-sm text-slate-400 hover:text-white cursor-pointer"
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
                                className="p-1 hover:bg-rose-500/20 rounded-sm text-slate-400 hover:text-rose-400 cursor-pointer"
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
