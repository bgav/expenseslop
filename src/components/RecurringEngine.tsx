import React, { useState } from 'react';
import { RecurringRule, Account, RecurringFrequency } from '../types';
import { 
  CalendarClock, Plus, ToggleLeft, ToggleRight, Trash2, Check, Play, Sparkles, X, Info 
} from 'lucide-react';

interface RecurringEngineProps {
  rules: RecurringRule[];
  accounts: Account[];
  onAddRule: (rule: Omit<RecurringRule, 'id' | 'createdAt'>) => void;
  onToggleRuleStatus: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onForceTrigger: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Every Day',
  weekly: 'Every Week',
  biweekly: 'Every 2 Weeks',
  monthly: 'Every Month',
  yearly: 'Every Year'
};

export default function RecurringEngine({
  rules,
  accounts,
  onAddRule,
  onToggleRuleStatus,
  onDeleteRule,
  onForceTrigger,
  isOpen,
  onClose
}: RecurringEngineProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form Fields
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [payee, setPayee] = useState('');
  const [category, setCategory] = useState('Subscriptions');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'outflow' | 'inflow'>('outflow');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Please specify a positive numeric amount.');
      return;
    }

    onAddRule({
      accountId,
      payee: payee.trim() || 'Recurring Vendor',
      category: category.trim(),
      memo: memo.trim(),
      amount: numAmount,
      type,
      frequency,
      startDate,
      isActive: true
    });

    // Reset Form
    setPayee('');
    setMemo('');
    setAmount('');
    setIsFormOpen(false);
  };

  const currencyFormatter = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#e4e2d9] overflow-hidden animate-fadeIn my-12">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-xl shadow-sm">
              <CalendarClock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-sans font-semibold text-slate-800">Recurring Rule Engine</h3>
              <p className="text-[10px] font-mono text-slate-500">Auto-injects standing entries on load</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick info bar */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5 flex gap-2.5 text-xs text-sky-850 font-sans">
            <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
            <p>
              On app startup, the local keyboard database is matched against your defined rules.
              Any missing iterations since the start date or previous generation are processed and posted instantly.
            </p>
          </div>

          <div className="flex justify-between items-center">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Active Schedules ({rules.length})
            </h4>
            <div className="flex gap-2">
              <button
                onClick={onForceTrigger}
                className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-sky-200 transition cursor-pointer"
                title="Force-run generation pass on current rules"
              >
                <Play size={12} className="fill-current" />
                Run Engine Check
              </button>
              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                Create Standing Rule
              </button>
            </div>
          </div>

          {/* Form to add Standing/Recurring Transaction */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-slideDown">
              <div className="text-xs font-semibold text-slate-750 flex items-center gap-1">
                <Sparkles size={13} className="text-yellow-600" />
                Define Standing Rule Template
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                
                {/* Account Choice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Target Account</label>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sender/Vendor */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Payee</label>
                  <input
                    type="text"
                    value={payee}
                    onChange={e => setPayee(e.target.value)}
                    required
                    placeholder="Subscription or salary..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>
                </div>

                {/* Expense or Income direction */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Flow Direction</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as 'outflow' | 'inflow')}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="outflow">Outflow (Expense)</option>
                    <option value="inflow">Inflow (Income)</option>
                  </select>
                </div>

                {/* Frequency */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Frequency Interval</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly (2 Weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Subscriptions, Salary, etc."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Memo Description */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Memo Detail (Optional)</label>
                  <input
                    type="text"
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    placeholder=" Standing automated charge description..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 bg-white border border-slate-250 text-slate-600 hover:text-slate-800 rounded-lg text-xs cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-650 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  Authorize Schedule
                </button>
              </div>
            </form>
          )}

          {/* List of configuration Rules */}
          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
            {rules.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                No standing/recurring transaction rules defined. Add one above to get started!
              </div>
            ) : (
              rules.map(r => {
                const associatedAcc = accounts.find(a => a.id === r.accountId);

                return (
                  <div 
                    key={r.id} 
                    className={`p-4 border rounded-xl transition duration-150 relative group flex select-none flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                      r.isActive ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-100/50 border-slate-200 opacity-60 text-slate-500'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{r.payee}</span>
                        <span className="text-[9px] font-mono bg-slate-200 border border-slate-300 text-slate-700 rounded-md px-1.5 py-0.5">
                          {FREQUENCY_LABELS[r.frequency]}
                        </span>
                        {/* Account indicator */}
                        {associatedAcc && (
                          <span 
                            className="text-[9px] font-mono font-medium text-white px-1.5 py-0.5 rounded-md border border-white/5"
                            style={{ backgroundColor: associatedAcc.color }}
                          >
                            {associatedAcc.name}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 font-sans flex flex-wrap gap-x-4 gap-y-1">
                        <span>Category: <strong className="font-semibold text-slate-700">{r.category}</strong></span>
                        {r.memo && <span>Memo: <span className="italic text-slate-500">"{r.memo}"</span></span>}
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 space-y-0.5">
                        <div>Start Date: {r.startDate}</div>
                        {r.lastGeneratedDate && (
                          <div>Last runtime post: <span className="text-emerald-600 font-semibold">{r.lastGeneratedDate}</span></div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className={`text-xs font-mono font-bold block ${
                          r.type === 'outflow' ? 'text-rose-600' : 'text-emerald-700'
                        }`}>
                          {r.type === 'outflow' ? '-' : '+'}{currencyFormatter(r.amount)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 block">standing amount</span>
                      </div>

                      {/* Rule Operations */}
                      <div className="flex items-center gap-1 border-l pl-3 border-slate-200">
                        <button
                          onClick={() => onToggleRuleStatus(r.id)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-550 transition focus:outline-none cursor-pointer"
                          title={r.isActive ? "Pause schedule" : "Activate schedule"}
                        >
                          {r.isActive ? (
                             <ToggleRight size={22} className="text-emerald-600" />
                          ) : (
                            <ToggleLeft size={22} className="text-slate-400" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm('Delete this standing rule? Existing transaction iterations will remain.')) {
                              onDeleteRule(r.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete rule configuration"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/50 flex justify-end text-xs text-slate-450 font-mono">
          <span>Close window using the exit button or tap escape.</span>
        </div>

      </div>
    </div>
  );
}
