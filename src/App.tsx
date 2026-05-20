import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Account, Transaction, RecurringRule, Category } from './types';
import { 
  fetchAccounts, saveAccounts, 
  fetchTransactions, saveTransactions, 
  fetchRecurringRules, saveRecurringRules,
  fetchCategories, saveCategories,
  DEFAULT_CATEGORIES,
  processRecurringRules, generateId
} from './db';
import AccountList from './components/AccountList';
import TransactionForm from './components/TransactionForm';
import TransactionLedger from './components/TransactionLedger';
import RecurringEngine from './components/RecurringEngine';
import CategoryManager from './components/CategoryManager';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { 
  Download, Upload, CalendarClock, Trash2, Landmark, HelpCircle, Sparkles, CheckSquare, RefreshCw, Layers, Tag 
} from 'lucide-react';

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // File browser ref for import file reading
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and check standing recurrence transactions
  useEffect(() => {
    async function initDb() {
      setIsLoading(true);
      try {
        const loadedAccounts = await fetchAccounts();
        const loadedTransactions = await fetchTransactions();
        const loadedRules = await fetchRecurringRules();
        const loadedCategories = await fetchCategories();

        setAccounts(loadedAccounts);
        setCategories(loadedCategories);

        // Run the recurring transaction automation against current local clock
        const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        const { generatedTransactions, updatedRules } = processRecurringRules(
          loadedRules, 
          loadedTransactions, 
          todayStr
        );

        if (generatedTransactions.length > 0) {
          const combinedTx = [...loadedTransactions, ...generatedTransactions];
          setTransactions(combinedTx);
          setRecurringRules(updatedRules);

          // Save state to disk asynchronously
          await saveTransactions(combinedTx);
          await saveRecurringRules(updatedRules);
          
          // Clean feedback toast
          showStatusNotification(`standing engine: Auto-generated ${generatedTransactions.length} items!`);
        } else {
          setTransactions(loadedTransactions);
          setRecurringRules(loadedRules);
        }
      } catch (err) {
        console.error("Failed to load IndexedDB client matrices:", err);
      } finally {
        setIsLoading(false);
      }
    }
    initDb();
  }, []);

  // Global event listener for Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Create Account (Alt + A)
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const accButton = document.getElementById('add-account-btn');
        accButton?.click();
      }
      // Toggle Recurring Engine Configuration Panel (Alt + R)
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setIsRecurringOpen(prev => !prev);
      }
      // Toggle Category Configuration Panel (Alt + C)
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setIsCategoryManagerOpen(prev => !prev);
      }
      // Export Backup (Alt + E)
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleExportBackup();
      }
      // Import Backup (Alt + I)
      if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [accounts, transactions, recurringRules, categories]);

  // Balance calculations derived instantly from transaction ledger entries
  const calculatedBalances = useMemo(() => {
    const balances: Record<string, { current: number; reconciled: number; totalIn: number; totalOut: number }> = {};
    
    accounts.forEach(acc => {
      balances[acc.id] = {
        current: acc.initialBalance,
        reconciled: acc.initialBalance,
        totalIn: 0,
        totalOut: 0
      };
    });

    transactions.forEach(tx => {
      const state = balances[tx.accountId];
      if (state) {
        state.totalIn += tx.inflow;
        state.totalOut += tx.outflow;
        state.current += (tx.inflow - tx.outflow);
        if (tx.reconciled) {
          state.reconciled += (tx.inflow - tx.outflow);
        }
      }
    });

    return balances;
  }, [accounts, transactions]);

  const activeAccount = useMemo(() => {
    return selectedAccountId ? accounts.find(a => a.id === selectedAccountId) || null : null;
  }, [selectedAccountId, accounts]);

  // Operations: ADD TRANSACTION
  const handleAddTransaction = async (txData: Omit<Transaction, 'id'>, targetAccountId?: string) => {
    const mainId = 'tx-' + generateId();
    
    if (targetAccountId && txData.transferAccountId) {
      // Transfer Mode (Double-entry match generated automatically)
      const companionId = 'tx-' + generateId();
      
      const leg1: Transaction = {
        ...txData,
        id: mainId,
        transferTxId: companionId
      };

      const leg2: Transaction = {
        id: companionId,
        accountId: targetAccountId,
        date: txData.date,
        payee: `Transfer from ${accounts.find(a => a.id === txData.accountId)?.name || 'Account'}`,
        category: 'Transfer',
        memo: txData.memo ? `Linked: ${txData.memo}` : 'Linked wallet transfer',
        outflow: txData.inflow,
        inflow: txData.outflow,
        reconciled: false,
        transferAccountId: txData.accountId,
        transferTxId: mainId
      };

      const revisedList = [leg1, leg2, ...transactions];
      setTransactions(revisedList);
      await saveTransactions(revisedList);
      showStatusNotification("Double-entry transfer logged successfully!");
    } else {
      // Standard Transaction
      const singleTx: Transaction = {
        ...txData,
        id: mainId
      };
      const revisedList = [singleTx, ...transactions];
      setTransactions(revisedList);
      await saveTransactions(revisedList);
      showStatusNotification("Transaction added!");
    }
  };

  // Operations: UPDATE TRANSACTION
  const handleUpdateTransaction = async (revisedTx: Transaction) => {
    const updated = transactions.map(tx => {
      if (tx.id === revisedTx.id) {
        return revisedTx;
      }
      return tx;
    });

    setTransactions(updated);
    await saveTransactions(updated);
  };

  // Operations: DELETE TRANSACTION
  const handleDeleteTransaction = async (txId: string) => {
    const targetTx = transactions.find(t => t.id === txId);
    let filtered = transactions.filter(t => t.id !== txId);

    // If deleting a transfer, cascade and purge matching transfer leg as well
    if (targetTx?.transferTxId) {
      filtered = filtered.filter(t => t.id !== targetTx.transferTxId);
      showStatusNotification("Purged both legs of automatic wallet transfer.");
    } else {
      showStatusNotification("Transaction removed.");
    }

    setTransactions(filtered);
    await saveTransactions(filtered);
  };

  // Operations: ACCOUNTS
  const handleAddAccount = async (accData: Omit<Account, 'id' | 'createdAt'>) => {
    const newAcc: Account = {
      ...accData,
      id: 'acc-' + generateId(),
      createdAt: new Date().toISOString()
    };
    const revised = [...accounts, newAcc];
    setAccounts(revised);
    await saveAccounts(revised);
    setSelectedAccountId(newAcc.id);
    showStatusNotification(`Account "${newAcc.name}" created!`);
  };

  const handleEditAccount = async (updatedAcc: Account) => {
    const revised = accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a);
    setAccounts(revised);
    await saveAccounts(revised);
    showStatusNotification(`Updated details for "${updatedAcc.name}".`);
  };

  const handleDeleteAccount = async (accountId: string) => {
    // Purge corresponding account info
    const remainingAccs = accounts.filter(a => a.id !== accountId);
    setAccounts(remainingAccs);
    await saveAccounts(remainingAccs);

    // Filter out transactions referencing target account to preserve double-entry integrity
    const remainingTxs = transactions.filter(t => t.accountId !== accountId);
    setTransactions(remainingTxs);
    await saveTransactions(remainingTxs);

    if (selectedAccountId === accountId) {
      setSelectedAccountId(null);
    }
    showStatusNotification("Account deleted. All matching transaction histories stripped.");
  };

  // Operations: CATEGORIES
  const handleAddCategory = async (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: 'cat-' + generateId(),
      createdAt: new Date().toISOString()
    };
    const revised = [...categories, newCat];
    setCategories(revised);
    await saveCategories(revised);
    showStatusNotification(`Category "${newCat.name}" created.`);
  };

  const handleUpdateCategory = async (id: string, updatedCat: Category) => {
    const originalCat = categories.find(c => c.id === id);
    const revisedCategories = categories.map(c => c.id === id ? updatedCat : c);
    setCategories(revisedCategories);
    await saveCategories(revisedCategories);

    if (originalCat && originalCat.name !== updatedCat.name) {
      // Cascade rename in transactions
      const updatedTransactions = transactions.map(tx => {
        if (tx.category === originalCat.name) {
          return { ...tx, category: updatedCat.name };
        }
        return tx;
      });
      setTransactions(updatedTransactions);
      await saveTransactions(updatedTransactions);

      // Cascade rename in recurring rules
      const updatedRules = recurringRules.map(r => {
        if (r.category === originalCat.name) {
          return { ...r, category: updatedCat.name };
        }
        return r;
      });
      setRecurringRules(updatedRules);
      await saveRecurringRules(updatedRules);
      
      showStatusNotification(`Renamed "${originalCat.name}" to "${updatedCat.name}" inside matched account transactions.`);
    } else {
      showStatusNotification("Category updated.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const targetCat = categories.find(c => c.id === id);
    const revisedCategories = categories.filter(c => c.id !== id);
    setCategories(revisedCategories);
    await saveCategories(revisedCategories);

    if (targetCat) {
      // Reset matching transactions category to 'Other'
      const updatedTransactions = transactions.map(tx => {
        if (tx.category === targetCat.name) {
          return { ...tx, category: 'Other' };
        }
        return tx;
      });
      setTransactions(updatedTransactions);
      await saveTransactions(updatedTransactions);

      // Reset matching rules to 'Other'
      const updatedRules = recurringRules.map(r => {
        if (r.category === targetCat.name) {
          return { ...r, category: 'Other' };
        }
        return r;
      });
      setRecurringRules(updatedRules);
      await saveRecurringRules(updatedRules);

      showStatusNotification(`Purged category "${targetCat.name}". Matched transactions reset to "Other".`);
    }
  };

  // Operations: RECURRING ENGINE RULES
  const handleAddRule = async (ruleData: Omit<RecurringRule, 'id' | 'createdAt'>) => {
    const newRule: RecurringRule = {
      ...ruleData,
      id: 'rule-' + generateId(),
      createdAt: new Date().toISOString()
    };
    const revised = [...recurringRules, newRule];
    setRecurringRules(revised);
    await saveRecurringRules(revised);
    showStatusNotification("Created recurring standing template!");
  };

  const handleToggleRuleStatus = async (ruleId: string) => {
    const revised = recurringRules.map(r => {
      if (r.id === ruleId) {
        return { ...r, isActive: !r.isActive };
      }
      return r;
    });
    setRecurringRules(revised);
    await saveRecurringRules(revised);
  };

  const handleDeleteRule = async (ruleId: string) => {
    const revised = recurringRules.filter(r => r.id !== ruleId);
    setRecurringRules(revised);
    await saveRecurringRules(revised);
    showStatusNotification("Standing schedule template removed.");
  };

  const handleForceEngineCheck = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const { generatedTransactions, updatedRules } = processRecurringRules(
      recurringRules, 
      transactions, 
      todayStr
    );

    if (generatedTransactions.length > 0) {
      const combinedTx = [...generatedTransactions, ...transactions];
      setTransactions(combinedTx);
      setRecurringRules(updatedRules);
      saveTransactions(combinedTx);
      saveRecurringRules(updatedRules);
      alert(`Recurring task injected ${generatedTransactions.length} pending iterations into your account tables!`);
    } else {
      alert("No pending standing intervals need generation at this time.");
    }
  };

  // Operations: EXPORT JSON DATA BACKUP
  const handleExportBackup = () => {
    const dataBackup = {
      version: "1.0.0",
      accounts,
      transactions,
      recurringRules,
      categories,
      exportedAt: new Date().toISOString()
    };

    const targetString = JSON.stringify(dataBackup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(targetString);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataUri);
    downloadAnchor.setAttribute("download", `ledger_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showStatusNotification("JSON portfolio downloaded directly.");
  };

  // Operations: IMPORT JSON DATA BACKUP
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    const fileToRead = inputFiles[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const payloadStr = event.target?.result as string;
        const parsed = JSON.parse(payloadStr);

        if (!parsed.accounts || !parsed.transactions) {
          alert("Schema validation failure: Missing vital account or transaction matrices inside JSON.");
          return;
        }

        if (confirm("Importing backup will completely overwrite your current browser IndexedDB tables. Proceed?")) {
          setAccounts(parsed.accounts);
          setTransactions(parsed.transactions);
          setRecurringRules(parsed.recurringRules || []);
          setSelectedAccountId(null);

          const importedCategories = parsed.categories || DEFAULT_CATEGORIES;
          setCategories(importedCategories);

          // Write to IndexedDB Storage
          await saveAccounts(parsed.accounts);
          await saveTransactions(parsed.transactions);
          await saveRecurringRules(parsed.recurringRules || []);
          await saveCategories(importedCategories);

          showStatusNotification("Database restored. Overwritten completely!");
        }
      } catch (err) {
        alert("Parser error: File has malformed JSON contents.");
      }
    };
    reader.readAsText(fileToRead);
    // Clear input so file can be picked again
    e.target.value = '';
  };

  // Clean status toast (non-blocking)
  const [notification, setNotification] = useState<string | null>(null);
  const showStatusNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(prev => prev === msg ? null : prev);
    }, 4000);
  };

  // Demo reset
  const handleClearDatabase = async () => {
    if (confirm("Are you sure you want to hard wipe all account data? This cannot be undone!")) {
      await saveAccounts([]);
      await saveTransactions([]);
      await saveRecurringRules([]);
      
      setAccounts([]);
      setTransactions([]);
      setRecurringRules([]);
      setSelectedAccountId(null);

      // Reload window to trigger factory default bootstrap
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f3ed] text-slate-800 font-sans" id="applet-root-container">
      
      {/* Toast Alert Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-mono px-4 py-3 rounded border border-sky-500/30 flex items-center gap-2 shadow-sm">
          <Sparkles size={14} className="text-sky-600 animate-pulse" />
          <span>{notification}</span>
        </div>
      )}

      {/* Persistent Top Navigation Bar */}
      <header className="border-b border-[#e4e2d9] bg-white sticky top-0 z-50 p-4 shadow-sm" id="main-navigation-header">
        <div className="w-full max-w-none px-4 md:px-8 lg:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Title area representation */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-sky-500 to-indigo-600 rounded flex items-center justify-center text-white font-mono font-bold shadow-sm">
              <Landmark size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Personal Expense Tracker
                <span className="text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-100 rounded-sm px-2 py-0.5">
                  Offline-Native DB
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">
                Rapid physical logging matrices with zero cloud delay.
              </p>
            </div>
          </div>

          {/* Quick utility button groups */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* JSON Import/Export */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded p-1">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
                id="import-backup-raw-picker"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-700 text-[11px] font-mono font-semibold px-3 py-2 rounded-sm transition cursor-pointer"
                title="Import backup JSON file (Alt+I)"
              >
                <Upload size={13} />
                Import JSON
              </button>
              
              <div className="h-4 w-[1px] bg-slate-200" />

              <button
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-700 text-[11px] font-mono font-semibold px-3 py-2 rounded-sm transition cursor-pointer"
                title="Export database states instantly (Alt+E)"
              >
                <Download size={13} />
                Export Backup
              </button>
            </div>

            {/* Recurring task button triggers config modal */}
            <button
              onClick={() => setIsRecurringOpen(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold px-3.5 py-2.5 rounded transition cursor-pointer shadow-sm relative animate-fadeIn"
              title="Recurring Transaction Generator Panel (Alt+R)"
            >
              <CalendarClock size={13} className="text-sky-600" />
              <span>Standing Engine</span>
              {recurringRules.filter(r => r.isActive).length > 0 && (
                <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-sky-600 text-white rounded-sm text-[8px] font-mono leading-none shadow-sm pb-1">
                  {recurringRules.filter(r => r.isActive).length}
                </span>
              )}
            </button>

            {/* Category manager button triggers config modal */}
            <button
              onClick={() => setIsCategoryManagerOpen(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold px-3.5 py-2.5 rounded transition cursor-pointer shadow-sm relative animate-fadeIn"
              title="Category Management Customizer Panel (Alt+C)"
            >
              <Tag size={13} className="text-sky-600" />
              <span>Categories</span>
            </button>

            {/* Hard Reset */}
            <button
              onClick={handleClearDatabase}
              className="p-2.5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 border border-transparent hover:border-red-200 rounded transition cursor-pointer"
              title="Wipe database tables"
            >
              <Trash2 size={13} />
            </button>
          </div>

        </div>
      </header>

      {/* Primary Workspace Layout */}
      <main className="w-full max-w-none p-4 md:p-6 lg:p-8 lg:px-12 grid grid-cols-1 lg:grid-cols-5 gap-6" id="dashboard-columns-grid">
        
        {/* Left Side: Accounts, shortcut help maps */}
        <section className="col-span-1 lg:col-span-1 space-y-6">
          
          <AccountList 
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            calculatedBalances={calculatedBalances}
            onAddAccount={handleAddAccount}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleDeleteAccount}
          />

          <KeyboardShortcutsHelp />

        </section>

        {/* Right Side: Account search list, sticky transaction generator inputs */}
        <section className="col-span-1 lg:col-span-4 space-y-6" id="main-ledger-section">
          
          {accounts.length === 0 ? (
            <div className="bg-white border border-[#e4e2d9] rounded p-12 text-center text-slate-600 shadow-sm relative animate-fadeIn">
              <Landmark size={48} className="mx-auto text-slate-400 stroke-1 mb-4" />
              <h3 className="font-display font-semibold text-slate-800 mb-1">No Operational Account Found</h3>
              <p className="text-xs text-slate-550 max-w-sm mx-auto mb-4 font-sans">
                Please create your first account in the sidebar panel to enable recording entries.
              </p>
            </div>
          ) : (
            <>
              {/* Sticky rapid entry creator form */}
              <TransactionForm 
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onAddTransaction={handleAddTransaction}
                transactions={transactions}
                categories={categories}
                onManageCategories={() => setIsCategoryManagerOpen(true)}
              />

              {/* Transactions Panel containing search, filtration & page views */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                      Account Entries
                    </h3>
                    {selectedAccountId !== null && (
                      <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono rounded-sm font-medium">
                        {activeAccount?.name} only
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {transactions.length} items logged
                  </span>
                </div>

                <TransactionLedger 
                  transactions={transactions}
                  accounts={accounts}
                  selectedAccountId={selectedAccountId}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              </div>
            </>
          )}

        </section>

      </main>

      {/* Standing Recurring Rule Config Engine Modal Component overlay */}
      {accounts.length > 0 && (
        <RecurringEngine 
          rules={recurringRules}
          accounts={accounts}
          onAddRule={handleAddRule}
          onToggleRuleStatus={handleToggleRuleStatus}
          onDeleteRule={handleDeleteRule}
          onForceTrigger={handleForceEngineCheck}
          isOpen={isRecurringOpen}
          onClose={() => setIsRecurringOpen(false)}
        />
      )}

      {/* Dynamic Category Customizer Modal Overlay */}
      <CategoryManager
        categories={categories}
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

    </div>
  );
}
