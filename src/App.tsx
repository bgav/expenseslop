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
  Download, Upload, CalendarClock, Trash2, Landmark, HelpCircle, Sparkles, CheckSquare, RefreshCw, Layers, Tag,
  Star, CreditCard, Lock
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

  // Helpmates for YNAB-style Account Summary Header Dashboard
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getRelativeDateString = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not reconciled yet';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recDate = new Date(dateStr);
    recDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - recDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Reconciled today';
    if (diffDays === 1) return 'Reconciled yesterday';
    if (diffDays < 0) return `Reconciled on ${dateStr}`;
    return `Reconciled ${diffDays} days ago`;
  };

  const clearedSum = useMemo(() => {
    if (selectedAccountId !== null) {
      const active = accounts.find(a => a.id === selectedAccountId);
      if (!active) return 0;
      let sum = active.initialBalance;
      transactions.forEach(tx => {
        if (tx.accountId === selectedAccountId && (tx.cleared || tx.reconciled)) {
          sum += (tx.inflow - tx.outflow);
        }
      });
      return sum;
    } else {
      let sum = accounts.reduce((total, acc) => total + acc.initialBalance, 0);
      transactions.forEach(tx => {
        if (tx.cleared || tx.reconciled) {
          sum += (tx.inflow - tx.outflow);
        }
      });
      return sum;
    }
  }, [transactions, accounts, selectedAccountId]);

  const unclearedSum = useMemo(() => {
    if (selectedAccountId !== null) {
      let sum = 0;
      transactions.forEach(tx => {
        if (tx.accountId === selectedAccountId && !tx.cleared && !tx.reconciled) {
          sum += (tx.inflow - tx.outflow);
        }
      });
      return sum;
    } else {
      let sum = 0;
      transactions.forEach(tx => {
        if (!tx.cleared && !tx.reconciled) {
          sum += (tx.inflow - tx.outflow);
        }
      });
      return sum;
    }
  }, [transactions, selectedAccountId]);

  const workingSum = useMemo(() => {
    return clearedSum + unclearedSum;
  }, [clearedSum, unclearedSum]);

  const getMostRecentReconciliationDateStr = () => {
    const reconciledAccs = accounts.filter(a => a.reconciliationDate);
    if (reconciledAccs.length === 0) return 'Not reconciled yet';
    const sorted = [...reconciledAccs].sort((a, b) => {
      return new Date(b.reconciliationDate!).getTime() - new Date(a.reconciliationDate!).getTime();
    });
    const latestDate = sorted[0].reconciliationDate;
    return getRelativeDateString(latestDate);
  };

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

  // Operations: BULK RECONCILE TRANSACTIONS
  const handleReconcileTransactions = async (txIds: string[], reconciliationDate: string) => {
    // 1. Update selected transactions: cleared = true, reconciled = true
    const updated = transactions.map(tx => {
      if (txIds.includes(tx.id)) {
        return {
          ...tx,
          cleared: true,
          reconciled: true
        };
      }
      return tx;
    });

    // 2. We also need to find the unique account IDs of these transactions and store reconciliationDate on those accounts!
    const updatedTxObjs = transactions.filter(tx => txIds.includes(tx.id));
    const targetAccountIds = Array.from(new Set(updatedTxObjs.map(tx => tx.accountId)));

    const updatedAccounts = accounts.map(acc => {
      if (targetAccountIds.includes(acc.id)) {
        return {
          ...acc,
          reconciliationDate: reconciliationDate
        };
      }
      return acc;
    });

    setTransactions(updated);
    setAccounts(updatedAccounts);

    await saveTransactions(updated);
    await saveAccounts(updatedAccounts);

    showStatusNotification(`Reconciled ${txIds.length} transactions and logged date on accounts.`);
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

      {/* Primary Workspace Layout Pane Split */}
      <div className="flex flex-col md:flex-row flex-1" id="main-panes-split-container">
        
        {/* Left Side: Accounts & shortcut guide pane */}
        <aside className="w-full md:w-80 flex-shrink-0 bg-[#161a36] text-slate-100 p-5 md:p-6 space-y-6 border-r border-[#202544] flex flex-col justify-start" id="accounts-sidebar-pane">
          
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

        </aside>

        {/* Right Side: Account search list, sticky transaction generator inputs */}
        <section className="flex-1 bg-[#f4f3ed] p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto" id="main-ledger-section">
          
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
              <div className="space-y-4">
                {/* YNAB-style Account Summary Header Dashboard */}
                <div className="bg-white rounded border border-[#e4e2d9] p-5 shadow-sm space-y-4 relative animate-fadeIn" id="account-ledger-header-panel">
                  {/* Account Name & Metas Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-slate-800">
                          {selectedAccountId !== null ? activeAccount?.name : "All Accounts"}
                        </h2>
                        <button 
                          className="text-amber-400 hover:text-amber-500 transition cursor-pointer" 
                          aria-label="Favorite account indicator"
                        >
                          <Star size={18} className="fill-current text-amber-400 stroke-amber-500" />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11.5px] font-mono select-none">
                        <div className="flex items-center gap-1 justify-start">
                          {selectedAccountId !== null ? (
                            <>
                              <CreditCard size={13} className="text-slate-400" />
                              <span className="capitalize">{activeAccount?.type}</span>
                            </>
                          ) : (
                            <>
                              <Landmark size={13} className="text-slate-400" />
                              <span>Combined Cashflow Ledger</span>
                            </>
                          )}
                        </div>
                        
                        <span className="text-slate-300">•</span>

                        <div className="flex items-center gap-1 text-emerald-600">
                          <Lock size={12} className="text-emerald-550 shrink-0" />
                          <span className="font-semibold">
                            {selectedAccountId !== null 
                              ? getRelativeDateString(activeAccount?.reconciliationDate) 
                              : getMostRecentReconciliationDateStr()
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 select-none">
                      <span className="text-[10px] font-mono uppercase bg-slate-100 border border-slate-200 text-slate-500 px-2 py-1 rounded-sm">
                        {selectedAccountId !== null 
                          ? `${transactions.filter(t => t.accountId === selectedAccountId).length} items recorded` 
                          : `${transactions.length} items logged`
                        }
                      </span>
                    </div>
                  </div>

                  <div className="border-b border-slate-150"></div>

                  {/* Math Formula Group: Cleared Balance + Uncleared Balance = Working Balance */}
                  <div className="flex flex-wrap items-center gap-y-4 gap-x-8 sm:gap-x-12 pt-1 select-none text-slate-800">
                    
                    {/* Cleared Balance */}
                    <div className="space-y-1">
                      <div className={`text-xl md:text-2xl font-mono font-bold tracking-tight ${clearedSum < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                        {formatAmount(clearedSum)}
                      </div>
                      <div className="text-[10.5px] font-mono text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5 mt-1 select-none">
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-700 text-[8px] font-sans font-extrabold text-white flex items-center justify-center leading-none select-none">C</span>
                        Cleared Balance
                      </div>
                    </div>

                    {/* Plus */}
                    <div className="text-slate-400 text-lg font-bold font-mono select-none px-1">
                      +
                    </div>

                    {/* Uncleared Balance */}
                    <div className="space-y-1">
                      <div className={`text-xl md:text-2xl font-mono font-bold tracking-tight ${unclearedSum < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                        {formatAmount(unclearedSum)}
                      </div>
                      <div className="text-[10.5px] font-mono text-slate-500 font-bold uppercase tracking-wide flex items-center gap-1.5 mt-1 select-none">
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-400 text-[8px] font-sans font-extrabold text-slate-500 flex items-center justify-center leading-none select-none">C</span>
                        Uncleared Balance
                      </div>
                    </div>

                    {/* Equals */}
                    <div className="text-slate-400 text-lg font-bold font-mono select-none px-1">
                      =
                    </div>

                    {/* Working Balance */}
                    <div className="space-y-1">
                      <div className={`text-xl md:text-2xl font-mono font-bold tracking-tight ${workingSum < 0 ? 'text-red-650' : 'text-slate-900'}`}>
                        {formatAmount(workingSum)}
                      </div>
                      <div className="text-[10.5px] font-sans text-slate-650 font-bold uppercase tracking-wide flex items-center gap-1.5 mt-1 select-none">
                        Working Balance
                      </div>
                    </div>

                  </div>
                </div>

                <TransactionLedger 
                  transactions={transactions}
                  accounts={accounts}
                  selectedAccountId={selectedAccountId}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onReconcileTransactions={handleReconcileTransactions}
                />
              </div>
            </>
          )}

        </section>

      </div>

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
