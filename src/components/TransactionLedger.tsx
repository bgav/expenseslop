import React, { useState, useMemo } from 'react';
import { Transaction, Account, Category, RecurringRule, RecurringFrequency } from '../types';
import { 
  Search, ArrowUpDown, CheckCircle, Circle, Trash2, Edit, AlertCircle, 
  ArrowRightLeft, Filter, Calendar, X, RefreshCw, ChevronLeft, ChevronRight,
  Lock, Plus, Tag
} from 'lucide-react';

interface TransactionLedgerProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedAccountId: string | null;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onReconcileTransactions: (txIds: string[], reconciliationDate: string) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>, targetAccountId?: string) => void;
  onAddRule?: (rule: Omit<RecurringRule, 'id' | 'createdAt'>) => void;
  categories: Category[];
  onManageCategories: () => void;
}

type SortField = 'date' | 'payee' | 'category' | 'memo' | 'outflow' | 'inflow' | 'reconciled';
type SortOrder = 'asc' | 'desc';

export default function TransactionLedger({
  transactions,
  accounts,
  selectedAccountId,
  onUpdateTransaction,
  onDeleteTransaction,
  onReconcileTransactions,
  onAddTransaction,
  onAddRule,
  categories,
  onManageCategories
}: TransactionLedgerProps) {
  // Query/filter states
  const [search, setSearch] = useState('');
  
  interface SearchPill {
    id: string;
    type: 'payee' | 'category' | 'memo' | 'account' | 'status' | 'amount' | 'text' | 'date-after' | 'date-before' | 'date';
    value: string;
    label: string;
  }
  const [searchPills, setSearchPills] = useState<SearchPill[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const activeCategoryFilter = useMemo(() => {
    return searchPills.find(p => p.type === 'category')?.value || '';
  }, [searchPills]);

  const activeReconciledFilter = useMemo(() => {
    return (searchPills.find(p => p.type === 'status')?.value as any) || 'all';
  }, [searchPills]);

  const activeDateFrom = useMemo(() => {
    return searchPills.find(p => p.type === 'date-after')?.value || '';
  }, [searchPills]);

  const activeDateTo = useMemo(() => {
    return searchPills.find(p => p.type === 'date-before')?.value || '';
  }, [searchPills]);
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination states
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Inline editing state (for modifying existing rows)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  // Inline insertion states (for creating brand new transactions - YNAB style)
  const [isInserting, setIsInserting] = useState(false);
  const [newAccountId, setNewAccountId] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [newPayee, setNewPayee] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [newOutflow, setNewOutflow] = useState('');
  const [newInflow, setNewInflow] = useState('');
  const [newCleared, setNewCleared] = useState(false);
  const [newIsTransfer, setNewIsTransfer] = useState(false);
  const [newTransferAccountId, setNewTransferAccountId] = useState('');
  const [newFrequency, setNewFrequency] = useState<string>('never');

  // Custom Inline Calendar Popover states to bypass cross-origin iframe showPicker limitations
  const [showDatePickerPopover, setShowDatePickerPopover] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());

  // Autocomplete/Suggestions states
  const [payeeSuggestions, setPayeeSuggestions] = useState<string[]>([]);
  const [showPayeeSuggestions, setShowPayeeSuggestions] = useState(false);
  const [activePayeeIndex, setActivePayeeIndex] = useState(-1);

  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(-1);

  // Focus & Dom element references
  const payeeInputRef = React.useRef<HTMLInputElement>(null);
  const categoryInputRef = React.useRef<HTMLInputElement>(null);
  const payeeSuggestionsRef = React.useRef<HTMLDivElement>(null);
  const categorySuggestionsRef = React.useRef<HTMLDivElement>(null);
  const accountSelectRef = React.useRef<HTMLSelectElement>(null);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const dateSuggestionsRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchSuggestionsRef = React.useRef<HTMLDivElement>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Populate suggestion database based on existing transactions
  React.useEffect(() => {
    const uniquePayees = Array.from(new Set(transactions.map(t => t.payee).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    setPayeeSuggestions(uniquePayees);

    const uniqueCategories = Array.from(new Set([
      ...categories.map(c => c.name),
      ...transactions.map(t => t.category).filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b));
    setCategorySuggestions(uniqueCategories);
  }, [transactions, categories]);

  // Synchronize newAccountId state with the filter/selected account panel
  React.useEffect(() => {
    if (selectedAccountId) {
      setNewAccountId(selectedAccountId);
    } else if (accounts.length > 0) {
      setNewAccountId(accounts[0].id);
    }
  }, [selectedAccountId, accounts]);

  // Dismiss autocompletes if typing is aborted / clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (payeeSuggestionsRef.current && !payeeSuggestionsRef.current.contains(event.target as Node)) {
        setShowPayeeSuggestions(false);
      }
      if (categorySuggestionsRef.current && !categorySuggestionsRef.current.contains(event.target as Node)) {
        setShowCategorySuggestions(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
      if (dateSuggestionsRef.current && !dateSuggestionsRef.current.contains(event.target as Node)) {
        setShowDatePickerPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Key hook for rapid mouse-free workflow: SHIFT + N toggles inline add
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }
      if (e.key === 'N' && e.shiftKey) {
        e.preventDefault();
        startInlineAdd();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedAccountId, accounts]);

  // Trigger setup for inline insertion row
  const startInlineAdd = () => {
    setIsInserting(true);
    if (selectedAccountId) {
      setNewAccountId(selectedAccountId);
    } else if (accounts.length > 0) {
      setNewAccountId(accounts[0].id);
    }
    
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setNewDate(`${year}-${month}-${day}`);
    
    // Reset form states
    setNewPayee('');
    setNewCategory('');
    setNewMemo('');
    setNewOutflow('');
    setNewInflow('');
    setNewCleared(false);
    setNewIsTransfer(false);
    setNewTransferAccountId('');
    setNewFrequency('never');

    // Snappy conditional focus:
    // If selecting 'All Accounts' viewport, focus the Account choose dropdown.
    // If in a Specific Account viewport, focus the Date field and automatically pop open the custom calendar picker!
    setTimeout(() => {
      if (selectedAccountId === null) {
        const selectEl = accountSelectRef.current;
        if (selectEl) {
          const rowEl = selectEl.closest('tr');
          if (rowEl) rowEl.classList.remove('hidden');
          selectEl.focus();
        }
      } else {
        const dateEl = dateInputRef.current;
        if (dateEl) {
          const rowEl = dateEl.closest('tr');
          if (rowEl) rowEl.classList.remove('hidden');
          dateEl.focus();
          setShowDatePickerPopover(true);
          setCalendarYear(year);
          setCalendarMonth(d.getMonth());
        }
      }
    }, 55);
  };

  // Helper for rendering custom date picker calendar grid
  const getCalendarDays = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const daysArr: Array<{ day: number; isCurrentMonth: boolean; dateString: string }> = [];
    
    // Trail days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateString = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArr.push({ day: d, isCurrentMonth: false, dateString });
    }
    
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArr.push({ day: d, isCurrentMonth: true, dateString });
    }
    
    // Next month details
    const remaining = 42 - daysArr.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateString = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArr.push({ day: d, isCurrentMonth: false, dateString });
    }
    
    return daysArr;
  };

  const handleDaySelect = (dateStr: string) => {
    setNewDate(dateStr);
    setShowDatePickerPopover(false);
    // Snappy transition to the payee input field to guide rapid entry!
    setTimeout(() => {
      payeeInputRef.current?.focus();
    }, 10);
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const selectQuickOffset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    handleDaySelect(`${yr}-${mo}-${dy}`);
  };

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePayeeChange = (value: string) => {
    setNewPayee(value);
    setActivePayeeIndex(-1);
    setShowPayeeSuggestions(true);
    
    // Auto-fill category if active payee has historical records
    const matchingTx = [...transactions]
      .reverse()
      .find(t => t.payee.toLowerCase() === value.trim().toLowerCase());
    if (matchingTx && matchingTx.category) {
      setNewCategory(matchingTx.category);
    }
  };

  const handleCategoryChange = (value: string) => {
    setNewCategory(value);
    setActiveCategoryIndex(-1);
    setShowCategorySuggestions(true);
  };

  const selectPayee = (val: string) => {
    setNewPayee(val);
    setShowPayeeSuggestions(false);
    
    const matchingTx = [...transactions]
      .reverse()
      .find(t => t.payee.toLowerCase() === val.toLowerCase());
    if (matchingTx && matchingTx.category) {
      setNewCategory(matchingTx.category);
    }
    categoryInputRef.current?.focus();
  };

  const selectCategory = (val: string) => {
    setNewCategory(val);
    setShowCategorySuggestions(false);
  };

  const handlePayeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filtered = payeeSuggestions.filter(p => p.toLowerCase().includes(newPayee.toLowerCase())).slice(0, 5);
    
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
    } else if (e.key === 'Enter') {
      if (showPayeeSuggestions && activePayeeIndex >= 0) {
        e.preventDefault();
        selectPayee(filtered[activePayeeIndex]);
      } else {
        // Standard Tab/Focus flow to Category
        categoryInputRef.current?.focus();
      }
    } else if (e.key === 'Escape') {
      setShowPayeeSuggestions(false);
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filtered = categorySuggestions.filter(c => c.toLowerCase().includes(newCategory.toLowerCase())).slice(0, 10);

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

  const handleTextFlowInput = (type: 'outflow' | 'inflow', val: string) => {
    const sanitized = val.replace(/[^0-9.]/g, '');
    if (type === 'outflow') {
      setNewOutflow(sanitized);
      if (sanitized !== '') setNewInflow('');
    } else {
      setNewInflow(sanitized);
      if (sanitized !== '') setNewOutflow('');
    }
  };

  const handleCommitInlineAdd = () => {
    if (!newAccountId) {
      alert('Please select or create an account first.');
      return;
    }

    const outflowVal = parseFloat(newOutflow) || 0;
    const inflowVal = parseFloat(newInflow) || 0;

    if (outflowVal === 0 && inflowVal === 0) {
      alert('Please enter either an outflow or inflow amount to register values.');
      return;
    }

    if (newIsTransfer && !newTransferAccountId) {
      alert('Please select a target account for the transfer.');
      return;
    }

    if (newIsTransfer && newTransferAccountId === newAccountId) {
      alert('Source and target transfer accounts cannot be the same!');
      return;
    }

    // Submit base transaction
    onAddTransaction({
      accountId: newAccountId,
      date: newDate,
      payee: newPayee.trim() || (newIsTransfer ? 'Transfer' : ''),
      category: newCategory.trim() || (newIsTransfer ? 'Transfer' : 'Other'),
      memo: newMemo.trim(),
      outflow: outflowVal,
      inflow: inflowVal,
      reconciled: false,
      cleared: newCleared,
      transferAccountId: newIsTransfer ? newTransferAccountId : undefined
    }, newIsTransfer ? newTransferAccountId : undefined);

    // Save corresponding recurrence engine schedule template
    if (onAddRule && newFrequency !== 'never') {
      onAddRule({
        accountId: newAccountId,
        payee: newPayee.trim() || 'Recurring Vendor',
        category: newCategory.trim() || 'Other',
        memo: newMemo.trim() || 'Auto-generated schedule template',
        amount: outflowVal > 0 ? outflowVal : inflowVal,
        type: outflowVal > 0 ? 'outflow' : 'inflow',
        frequency: newFrequency as RecurringFrequency,
        startDate: newDate,
        isActive: true
      });
    }

    setIsInserting(false);
  };

  const handleCancelInlineAdd = () => {
    setIsInserting(false);
  };
  
  // Selection states
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  // Reset selection when account filter changes
  React.useEffect(() => {
    setSelectedTxIds(new Set());
  }, [selectedAccountId]);

  const accountMap = useMemo(() => {
    return new Map(accounts.map(a => [a.id, a]));
  }, [accounts]);

  // Unique categories list for filtering dropdown
  const categoriesList = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Synchronizer functions for pills bidirectional binding
  const handleCategoryFilterChange = (cat: string) => {
    let nextPills = searchPills.filter(p => p.type !== 'category');
    if (cat) {
      nextPills.push({
        id: `category-${cat.replace(/\s+/g, '-').toLowerCase()}`,
        type: 'category',
        value: cat,
        label: `Category: ${cat}`
      });
    }
    setSearchPills(nextPills);
    setPage(1);
  };

  const handleReconciledFilterToggle = (status: 'all' | 'reconciled' | 'cleared' | 'uncleared') => {
    let nextPills = searchPills.filter(p => p.type !== 'status');
    if (status !== 'all') {
      const labels = {
        cleared: 'Status: Cleared',
        uncleared: 'Status: Uncleared',
        reconciled: 'Status: Reconciled'
      };
      nextPills.push({
        id: `status-${status}`,
        type: 'status',
        value: status,
        label: labels[status]
      });
    }
    setSearchPills(nextPills);
    setPage(1);
  };

  const handleDateFromChange = (date: string) => {
    let nextPills = searchPills.filter(p => p.type !== 'date-after');
    if (date) {
      nextPills.push({
        id: 'date-after',
        type: 'date-after',
        value: date,
        label: `From: ${date}`
      });
    }
    setSearchPills(nextPills);
    setPage(1);
  };

  const handleDateToChange = (date: string) => {
    let nextPills = searchPills.filter(p => p.type !== 'date-before');
    if (date) {
      nextPills.push({
        id: 'date-before',
        type: 'date-before',
        value: date,
        label: `To: ${date}`
      });
    }
    setSearchPills(nextPills);
    setPage(1);
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setSearchPills([]);
    setPage(1);
  };

  // Computed Autocomplete Suggestions following YNAB design
  const computedSuggestions = useMemo(() => {
    if (!search.trim()) {
      return [
        { type: 'status', value: 'uncleared', label: 'Status: Uncleared' },
        { type: 'status', value: 'cleared', label: 'Status: Cleared' },
        { type: 'status', value: 'reconciled', label: 'Status: Reconciled' },
        { type: 'date', value: 'this-month', label: 'Date: This Month' },
        { type: 'date', value: 'this-year', label: 'Date: This Year' },
      ];
    }
    const q = search.trim();
    const qLower = q.toLowerCase();
    const suggestionsList: Array<{ type: string; value: string; label: string }> = [];

    // 1. Payee suggestions
    const matchingPayees = payeeSuggestions
      .filter(p => p.toLowerCase().includes(qLower))
      .slice(0, 3);
    matchingPayees.forEach(p => {
      suggestionsList.push({ type: 'payee', value: p, label: `Payee: ${p}` });
    });

    // 2. Category suggestions
    const matchingCategories = categorySuggestions
      .filter(c => c.toLowerCase().includes(qLower))
      .slice(0, 3);
    matchingCategories.forEach(c => {
      suggestionsList.push({ type: 'category', value: c, label: `Category: ${c}` });
    });

    // 3. Account suggestions
    const matchingAccounts = accounts
      .filter(a => a.name.toLowerCase().includes(qLower))
      .slice(0, 2);
    matchingAccounts.forEach(a => {
      suggestionsList.push({ type: 'account', value: a.name, label: `Account: ${a.name}` });
    });

    // 4. Memo suggestion
    suggestionsList.push({ type: 'memo', value: q, label: `Memo contains "${q}"` });

    // 5. Amount suggestion if numeric
    if (!isNaN(Number(q)) || /^\d+(\.\d{0,2})?$/.test(q)) {
      suggestionsList.push({ type: 'amount', value: q, label: `Amount is $${q}` });
    }

    // 6. Generic search in all fields
    suggestionsList.push({ type: 'text', value: q, label: `Search for "${q}" in all fields` });

    return suggestionsList;
  }, [search, payeeSuggestions, categorySuggestions, accounts]);

  const selectSuggestion = (item: { type: string; value: string; label: string }) => {
    const id = `${item.type}-${item.value.replace(/\s+/g, '-').toLowerCase()}`;
    
    // Check if type allows multiples, if not, filter out matches of of the same type first
    const isSingleInstanceType = ['category', 'status', 'date-after', 'date-before'].includes(item.type);
    
    setSearchPills(prev => {
      let filtered = prev;
      if (isSingleInstanceType) {
        filtered = prev.filter(p => p.type !== item.type);
      }
      if (!filtered.find(p => p.id === id)) {
        return [...filtered, {
          id,
          type: item.type as any,
          value: item.value,
          label: item.label
        }];
      }
      return filtered;
    });

    setSearch('');
    setActiveSuggestionIndex(0);
    setPage(1);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  };

  const removePill = (id: string) => {
    setSearchPills(prev => prev.filter(p => p.id !== id));
    setPage(1);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  };

  const clearAllSearchAndPills = () => {
    setSearch('');
    setSearchPills([]);
    setPage(1);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev < computedSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : computedSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (computedSuggestions[activeSuggestionIndex]) {
        selectSuggestion(computedSuggestions[activeSuggestionIndex]);
      } else if (search.trim()) {
        selectSuggestion({ type: 'text', value: search, label: `Search: ${search}` });
      }
    } else if (e.key === 'Escape') {
      setShowSearchSuggestions(false);
      searchInputRef.current?.blur();
    } else if (e.key === 'Backspace' && !search) {
      if (searchPills.length > 0) {
        const lastPill = searchPills[searchPills.length - 1];
        removePill(lastPill.id);
      }
    }
  };

  // Filter & Sort Transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by specific Account
    if (selectedAccountId !== null) {
      result = result.filter(t => t.accountId === selectedAccountId);
    }

    // Filter by query pill filters
    if (searchPills.length > 0) {
      for (const pill of searchPills) {
        if (pill.type === 'payee') {
          result = result.filter(t => t.payee?.toLowerCase().includes(pill.value.toLowerCase()));
        } else if (pill.type === 'category') {
          result = result.filter(t => t.category?.toLowerCase() === pill.value.toLowerCase());
        } else if (pill.type === 'memo') {
          result = result.filter(t => t.memo?.toLowerCase().includes(pill.value.toLowerCase()));
        } else if (pill.type === 'account') {
          result = result.filter(t => {
            const accName = accountMap.get(t.accountId)?.name || '';
            const targetAccName = t.transferAccountId ? (accountMap.get(t.transferAccountId)?.name || '') : '';
            return accName.toLowerCase().includes(pill.value.toLowerCase()) || targetAccName.toLowerCase().includes(pill.value.toLowerCase());
          });
        } else if (pill.type === 'status') {
          if (pill.value === 'reconciled') {
            result = result.filter(t => t.reconciled);
          } else if (pill.value === 'cleared') {
            result = result.filter(t => t.cleared && !t.reconciled);
          } else if (pill.value === 'uncleared') {
            result = result.filter(t => !t.cleared && !t.reconciled);
          }
        } else if (pill.type === 'amount') {
          const num = parseFloat(pill.value);
          if (!isNaN(num)) {
            result = result.filter(t => t.outflow === num || t.inflow === num);
          }
        } else if (pill.type === 'date-after') {
          result = result.filter(t => t.date >= pill.value);
        } else if (pill.type === 'date-before') {
          result = result.filter(t => t.date <= pill.value);
        } else if (pill.type === 'date') {
          if (pill.value === 'this-month') {
            const now = new Date();
            const yearStr = String(now.getFullYear());
            const monthStr = String(now.getMonth() + 1).padStart(2, '0');
            const prefix = `${yearStr}-${monthStr}`;
            result = result.filter(t => t.date.startsWith(prefix));
          } else if (pill.value === 'this-year') {
            const now = new Date();
            const prefix = String(now.getFullYear());
            result = result.filter(t => t.date.startsWith(prefix));
          } else {
            result = result.filter(t => t.date.includes(pill.value));
          }
        } else if (pill.type === 'text') {
          const q = pill.value.toLowerCase();
          result = result.filter(t => {
            const vendor = t.payee?.toLowerCase() || '';
            const cat = t.category?.toLowerCase() || '';
            const note = t.memo?.toLowerCase() || '';
            const targetAccName = t.transferAccountId ? (accountMap.get(t.transferAccountId)?.name || '').toLowerCase() : '';
            return vendor.includes(q) || cat.includes(q) || note.includes(q) || targetAccName.includes(q);
          });
        }
      }
    }

    // Filter by on-going typing search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t => {
        const vendor = t.payee?.toLowerCase() || '';
        const cat = t.category?.toLowerCase() || '';
        const note = t.memo?.toLowerCase() || '';
        const targetAccName = t.transferAccountId ? (accountMap.get(t.transferAccountId)?.name || '').toLowerCase() : '';
        return vendor.includes(q) || cat.includes(q) || note.includes(q) || targetAccName.includes(q);
      });
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
  }, [transactions, selectedAccountId, searchPills, search, sortField, sortOrder, accountMap]);

  // Handle pagination calculations
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return processedTransactions.slice(start, start + itemsPerPage);
  }, [processedTransactions, page]);

  const handleSelectAllToggle = () => {
    const allOnPageSelected = paginatedTransactions.length > 0 && paginatedTransactions.every(tx => selectedTxIds.has(tx.id));
    const nextSet = new Set(selectedTxIds);
    if (allOnPageSelected) {
      paginatedTransactions.forEach(tx => nextSet.delete(tx.id));
    } else {
      paginatedTransactions.forEach(tx => nextSet.add(tx.id));
    }
    setSelectedTxIds(nextSet);
  };

  const toggleSelectTransaction = (txId: string) => {
    const nextSet = new Set(selectedTxIds);
    if (nextSet.has(txId)) {
      nextSet.delete(txId);
    } else {
      nextSet.add(txId);
    }
    setSelectedTxIds(nextSet);
  };

  const handleBulkReconcile = () => {
    if (selectedTxIds.size === 0) return;
    const currentDate = new Date().toISOString().split('T')[0];
    onReconcileTransactions(Array.from(selectedTxIds), currentDate);
    setSelectedTxIds(new Set());
  };

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
    let newCleared = false;
    let newReconciled = false;

    if (tx.reconciled) {
      // Reconciled -> Uncleared for testing
      newCleared = false;
      newReconciled = false;
    } else if (tx.cleared) {
      // Cleared -> Uncleared
      newCleared = false;
      newReconciled = false;
    } else {
      // Uncleared -> Cleared
      newCleared = true;
      newReconciled = false;
    }

    onUpdateTransaction({
      ...tx,
      cleared: newCleared,
      reconciled: newReconciled
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
          
          <button
            onClick={startInlineAdd}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-650 hover:to-teal-650 text-white font-sans font-bold text-xs px-4 py-2.5 rounded shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition duration-150 cursor-pointer select-none"
            title="Open inline creator row (Shift+N)"
          >
            <Plus size={14} className="text-white" />
            <span>Add Transaction</span>
            <kbd className="hidden lg:inline-block text-[9px] font-mono opacity-80 bg-white/15 px-1 py-0.2 rounded font-normal ml-0.5 uppercase">
              Shift + N
            </kbd>
          </button>

          <div className="relative flex-1 flex flex-col" ref={searchContainerRef}>
            <div 
              className="w-full flex flex-wrap items-center gap-1.5 pl-3 pr-9 py-1.5 bg-white rounded border border-[#d2d0c5] focus-within:ring-2 focus-within:ring-sky-500/10 focus-within:border-sky-500 shadow-sm transition min-h-[36px] cursor-text"
              onClick={() => searchInputRef.current?.focus()}
            >
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              
              {/* Active Pills */}
              {searchPills.map(pill => (
                <div 
                  key={pill.id} 
                  className="flex items-center gap-1 bg-sky-50 border border-sky-150 text-sky-850 px-2 py-0.5 rounded text-[11px] font-sans font-medium leading-none max-w-xs truncate"
                >
                  <span>{pill.label}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removePill(pill.id);
                    }}
                    className="text-sky-450 hover:text-sky-850 focus:outline-none rounded-full shrink-0"
                    title={`Remove ${pill.label}`}
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}

              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPills.length === 0 ? "Filter by payee, category, memo, or amount..." : ""}
                className="flex-1 min-w-[120px] text-xs bg-transparent border-none text-slate-800 focus:outline-none placeholder-slate-450 h-5"
              />
              
              {(search || searchPills.length > 0) && (
                <button 
                  onClick={clearAllSearchAndPills}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-800"
                  title="Clear search and all active filters"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSearchSuggestions && (
              <div 
                ref={searchSuggestionsRef}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 py-1.5 max-h-[300px] overflow-y-auto animate-fadeIn divide-y divide-slate-50"
              >
                {!search.trim() && (
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    Quick Filter Suggestions
                  </div>
                )}
                {computedSuggestions.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.value}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(item);
                    }}
                    onMouseEnter={() => setActiveSuggestionIndex(idx)}
                    className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition ${
                      idx === activeSuggestionIndex ? 'bg-sky-50 text-sky-900 font-semibold' : 'text-slate-755'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={12} className={idx === activeSuggestionIndex ? "text-sky-600" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      press Enter to apply
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Reconciled Filter Toggles */}
            <div className="bg-slate-100 border border-slate-200 rounded-sm p-0.5 flex">
              <button
                onClick={() => handleReconciledFilterToggle('all')}
                className={`px-2.5 py-1.5 text-[10px] font-mono font-medium rounded-sm transition-all duration-150 ${
                  activeReconciledFilter === 'all' ? 'bg-sky-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Statuses
              </button>
              <button
                onClick={() => handleReconciledFilterToggle('uncleared')}
                className={`px-2.5 py-1.5 text-[10px] font-mono font-medium rounded-sm transition-all duration-150 flex items-center gap-1.5 ${
                  activeReconciledFilter === 'uncleared' ? 'bg-sky-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-extrabold font-sans leading-none ${
                  activeReconciledFilter === 'uncleared' ? "border-sky-300 text-sky-100" : "border-slate-400 text-slate-500"
                }`}>c</span>
                Uncleared
              </button>
              <button
                onClick={() => handleReconciledFilterToggle('cleared')}
                className={`px-2.5 py-1.5 text-[10px] font-mono font-medium rounded-sm transition-all duration-150 flex items-center gap-1.5 ${
                  activeReconciledFilter === 'cleared' ? 'bg-sky-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-extrabold font-sans leading-none ${
                  activeReconciledFilter === 'cleared' ? "bg-white text-sky-600" : "bg-emerald-600 text-white"
                }`}>c</span>
                Cleared
              </button>
              <button
                onClick={() => handleReconciledFilterToggle('reconciled')}
                className={`px-2.5 py-1.5 text-[10px] font-mono font-medium rounded-sm transition-all duration-150 flex items-center gap-1.5 ${
                  activeReconciledFilter === 'reconciled' ? 'bg-sky-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Lock size={10} className={activeReconciledFilter === 'reconciled' ? "text-white" : "text-emerald-700"} />
                Reconciled
              </button>
            </div>

            {/* Reset helper */}
            {(search || searchPills.length > 0) && (
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
            value={activeCategoryFilter}
            onChange={e => handleCategoryFilterChange(e.target.value)}
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
              value={activeDateFrom}
              onChange={e => handleDateFromChange(e.target.value)}
              placeholder="From"
              className="text-xs bg-white border border-[#d2d0c5] rounded-sm px-2.5 py-1 text-slate-700 outline-none shadow-sm"
            />
            <span className="text-[10px] text-slate-550 font-mono">to</span>
            <input
              type="date"
              value={activeDateTo}
              onChange={e => handleDateToChange(e.target.value)}
              placeholder="To"
              className="text-xs bg-white border border-[#d2d0c5] rounded-sm px-2.5 py-1 text-slate-700 outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Selection & Reconcile Active Bar */}
      {selectedTxIds.size > 0 && (
        <div className="bg-emerald-50 border-b border-emerald-250 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn text-xs text-emerald-800 font-sans" id="reconcile-action-bar">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span>
              <strong>{selectedTxIds.size}</strong> transaction{selectedTxIds.size > 1 ? 's' : ''} selected for reconciliation
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBulkReconcile}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold text-xs px-4 py-2 rounded-sm transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer leading-none"
            >
              <CheckCircle size={14} className="text-white" />
              Reconcile
            </button>
            <button
              onClick={() => setSelectedTxIds(new Set())}
              className="text-slate-500 hover:text-slate-800 font-mono text-[10px] hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-500 uppercase tracking-wider select-none">
              <th className="py-3.5 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={paginatedTransactions.length > 0 && paginatedTransactions.every(tx => selectedTxIds.has(tx.id))}
                  onChange={handleSelectAllToggle}
                  className="rounded border-slate-350 text-sky-600 focus:ring-sky-500 hover:border-slate-450 cursor-pointer h-3.5 w-3.5 transition"
                  title="Select all visible transactions"
                />
              </th>
              {selectedAccountId === null && (
                <th className="py-3.5 px-3 w-32">Account</th>
              )}
              <th className="py-3.5 px-3 w-28 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('date')}>
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 w-44 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('payee')}>
                <div className="flex items-center gap-1">
                  Payee
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-3 w-32 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('category')}>
                <div className="flex items-center gap-1">
                  Category
                  <ArrowUpDown size={11} className="text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-3 w-32 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition" onClick={() => toggleSort('memo')}>
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
              <th className="py-3.5 px-4 w-12 text-center">Status</th>
              <th className="py-3.5 px-4 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
            <tr className={`bg-sky-50/40 border-b border-sky-100/60 hover:bg-sky-50/60 transition duration-150 relative ${isInserting ? "" : "hidden"}`}>
                {/* 1. Dummy checkbox */}
                <td className="py-2.5 px-4 text-center">
                  <div className="w-3.5 h-3.5 mx-auto border border-dashed border-slate-350 rounded-sm"></div>
                </td>

                {/* 3. Account Choice Column (only if selecting "All Accounts" view) */}
                {selectedAccountId === null && (
                  <td className="py-2.5 px-3">
                    <select
                      ref={accountSelectRef}
                      value={newAccountId}
                      onChange={e => setNewAccountId(e.target.value)}
                      className="w-full text-xs font-sans border border-[#cbd5e1] rounded-sm p-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-sm"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </td>
                )}<td className="py-2.5 px-3 relative" ref={dateSuggestionsRef}>
                  <div className="space-y-1">
                    <input
                      ref={dateInputRef}
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      onFocus={() => {
                        setShowDatePickerPopover(true);
                        const parts = newDate.split('-');
                        if (parts.length === 3) {
                          const y = parseInt(parts[0], 10);
                          const m = parseInt(parts[1], 10) - 1;
                          if (!isNaN(y) && !isNaN(m)) {
                            setCalendarYear(y);
                            setCalendarMonth(m);
                          }
                        }
                      }}
                      className="w-full text-[11px] font-mono border border-[#cbd5e1] rounded-sm p-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
                      required
                    />
                    <select
                      value={newFrequency}
                      onChange={e => setNewFrequency(e.target.value)}
                      className="w-full text-[10px] font-mono border border-slate-205 rounded-sm py-0.5 px-1 bg-white text-slate-500 hover:text-slate-800 outline-none focus:border-sky-400 cursor-pointer shadow-sm"
                      title="Choose Repeat Recurrency Schedule"
                    >
                      <option value="never">Never repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 Weeks</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  {/* Custom Calendar Popover matching style and dodging cross-origin iframe security issue */}
                  {showDatePickerPopover && (
                    <div className="absolute z-[110] top-[85%] left-3 mt-1 bg-white border border-slate-200 rounded shadow-2xl p-3 w-64 text-[11.5px] select-none text-slate-800 animate-fadeIn text-left leading-normal font-sans">
                      {/* Top quick helpers */}
                      <div className="grid grid-cols-3 gap-1 mb-2">
                        <button
                          type="button"
                          onClick={() => selectQuickOffset(0)}
                          className="py-1 px-1 text-center bg-slate-50 hover:bg-sky-50 hover:text-sky-850 font-medium rounded border border-slate-200 hover:border-sky-300 transition cursor-pointer text-[10px]"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => selectQuickOffset(-1)}
                          className="py-1 px-1 text-center bg-slate-50 hover:bg-sky-50 hover:text-sky-850 font-medium rounded border border-slate-200 hover:border-sky-300 transition cursor-pointer text-[10px]"
                        >
                          Yesterday
                        </button>
                        <button
                          type="button"
                          onClick={() => selectQuickOffset(1)}
                          className="py-1 px-1 text-center bg-slate-50 hover:bg-sky-50 hover:text-sky-850 font-medium rounded border border-slate-200 hover:border-sky-300 transition cursor-pointer text-[10px]"
                        >
                          Tomorrow
                        </button>
                      </div>

                      {/* Month & Year Selection Header */}
                      <div className="flex items-center justify-between font-bold mb-2 text-slate-700 bg-slate-50 py-1 px-1.5 rounded">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="px-2 py-0.5 hover:bg-slate-200 rounded font-bold cursor-pointer transition text-[12px] leading-none"
                        >
                          &lsaquo;
                        </button>
                        <span className="text-xs">
                          {monthsList[calendarMonth]} {calendarYear}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="px-2 py-0.5 hover:bg-slate-200 rounded font-bold cursor-pointer transition text-[12px] leading-none"
                        >
                          &rsaquo;
                        </button>
                      </div>

                      {/* Day of names */}
                      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-slate-450 mb-1 text-[10px]">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(wd => (
                          <div key={wd}>{wd}</div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {getCalendarDays(calendarYear, calendarMonth).map((dObj, idx) => {
                          const isSelected = newDate === dObj.dateString;
                          const isToday = (() => {
                            const t = new Date();
                            const matches = t.getFullYear() === calendarYear && t.getMonth() === calendarMonth && t.getDate() === dObj.day && dObj.isCurrentMonth;
                            return matches;
                          })();
                          return (
                            <button
                              key={`${dObj.dateString}-${idx}`}
                              type="button"
                              onClick={() => handleDaySelect(dObj.dateString)}
                              className={`py-1 text-center rounded transition font-mono text-[10px] leading-tight flex items-center justify-center ${
                                !dObj.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'
                              } ${
                                isSelected 
                                  ? 'bg-sky-600 text-white font-bold shadow-sm' 
                                  : isToday 
                                    ? 'bg-sky-100 text-sky-900 border border-sky-300 font-bold hover:bg-sky-200' 
                                    : 'hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                              }`}
                              style={{ minHeight: '1.75rem' }}
                            >
                              {dObj.day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </td>

                {/* 4. Payee input with autocompletion */}
                <td className="py-2.5 px-4 relative" ref={payeeSuggestionsRef}>
                  <input
                    type="text"
                    ref={payeeInputRef}
                    value={newPayee}
                    onChange={e => handlePayeeChange(e.target.value)}
                    onKeyDown={handlePayeeKeyDown}
                    placeholder="Payee / Recipient"
                    className="w-full text-xs font-semibold border border-[#cbd5e1] rounded-sm p-1.5 bg-white text-slate-808 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm placeholder-slate-400"
                    autoComplete="off"
                  />
                  {showPayeeSuggestions && newPayee && payeeSuggestions.filter(p => p.toLowerCase().includes(newPayee.toLowerCase())).slice(0, 5).length > 0 && (
                    <div className="absolute left-4 right-4 mt-1 bg-white border border-slate-205 shadow-xl rounded-sm z-[99] text-xs py-1 max-h-48 overflow-y-auto font-sans">
                      {payeeSuggestions.filter(p => p.toLowerCase().includes(newPayee.toLowerCase())).slice(0, 5).map((p, idx) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => selectPayee(p)}
                          className={`w-full text-left px-2.5 py-1.5 cursor-pointer transition ${
                            idx === activePayeeIndex ? 'bg-sky-50 text-sky-850 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Ledger double-entry transfer checklist controls */}
                  <div className="flex items-center gap-1.5 mt-1.5 text-[9px] font-mono text-slate-450 select-none">
                    <input
                      type="checkbox"
                      id="ledger-inline-is-transfer"
                      checked={newIsTransfer}
                      onChange={e => {
                        setNewIsTransfer(e.target.checked);
                        if (e.target.checked) setNewCategory('Transfer');
                      }}
                      className="rounded-sm border-slate-300 text-sky-655 focus:ring-sky-500/20 h-3 w-3 cursor-pointer"
                    />
                    <label htmlFor="ledger-inline-is-transfer" className="cursor-pointer font-bold hover:text-slate-700">
                      Transfer
                    </label>
                    {newIsTransfer && (
                      <select
                        value={newTransferAccountId}
                        onChange={e => {
                          setNewTransferAccountId(e.target.value);
                          const targetName = accounts.find(a => a.id === e.target.value)?.name || '';
                          if (targetName) setNewPayee(`Transfer to ${targetName}`);
                        }}
                        className="bg-white border border-slate-200 text-[9px] p-0.5 ml-1 rounded-sm focus:border-sky-450 text-slate-700 cursor-pointer"
                        required
                      >
                        <option value="">-- Target --</option>
                        {accounts.filter(a => a.id !== newAccountId).map(oa => (
                          <option key={oa.id} value={oa.id}>{oa.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>

                {/* 5. Category input with autocomplete */}
                <td className="py-2.5 px-3 relative" ref={categorySuggestionsRef}>
                  <div className="relative">
                    <input
                      type="text"
                      ref={categoryInputRef}
                      value={newCategory}
                      onChange={e => handleCategoryChange(e.target.value)}
                      onKeyDown={handleCategoryKeyDown}
                      placeholder="Category"
                      className="w-full text-xs border border-[#cbd5e1] rounded-sm p-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                      autoComplete="off"
                      disabled={newIsTransfer}
                    />
                    {showCategorySuggestions && categorySuggestions.filter(c => c.toLowerCase().includes(newCategory.toLowerCase())).slice(0, 10).length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-205 shadow-xl rounded-sm z-[99] text-xs py-1 max-h-48 overflow-y-auto font-sans">
                        {categorySuggestions.filter(c => c.toLowerCase().includes(newCategory.toLowerCase())).slice(0, 10).map((c, idx) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => selectCategory(c)}
                            className={`w-full text-left px-2.5 py-1.5 cursor-pointer transition ${
                              idx === activeCategoryIndex ? 'bg-sky-50 text-sky-850 font-bold' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onManageCategories}
                    className="text-[9px] font-mono text-sky-600 hover:text-sky-700 hover:underline mt-1.5 select-none text-left cursor-pointer"
                    title="Manage custom budgets & categories list templates"
                  >
                    + Manage Categories
                  </button>
                </td>

                {/* 6. Memo / Description */}
                <td className="py-2.5 px-3">
                  <input
                    type="text"
                    value={newMemo}
                    onChange={e => setNewMemo(e.target.value)}
                    placeholder="Notes / Tags..."
                    className="w-full text-[10px] border border-[#cbd5e1] rounded-sm p-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm placeholder-slate-400"
                  />
                </td>

                {/* 7. Outflow (-) */}
                <td className="py-2.5 px-3 text-right">
                  <input
                    type="text"
                    value={newOutflow}
                    onChange={e => handleTextFlowInput('outflow', e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-mono text-right bg-[#fff5f5] border border-rose-200 text-rose-700 rounded-sm p-1.5 focus:outline-none focus:ring-1 focus:ring-rose-300 shadow-sm focus:border-rose-455"
                  />
                </td>

                {/* 8. Inflow (+) */}
                <td className="py-2.5 px-3 text-right">
                  <input
                    type="text"
                    value={newInflow}
                    onChange={e => handleTextFlowInput('inflow', e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-mono text-right bg-[#f4fdf7] border border-emerald-200 text-emerald-755 rounded-sm p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-300 shadow-sm focus:border-emerald-455"
                  />
                </td>

                {/* 9. Status checkmark ("C") */}
                <td className="py-2.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => setNewCleared(!newCleared)}
                    className="flex items-center justify-center mx-auto focus:outline-none cursor-pointer hover:scale-105 transition"
                    title={newCleared ? "Marked as Checked / Cleared (Click to toggle)" : "Uncleared (Click to toggle checked / cleared)"}
                  >
                    {newCleared ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-sans font-extrabold text-white shadow-md leading-none select-none">
                        C
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-350 flex items-center justify-center text-[10px] font-sans font-extrabold text-slate-450 hover:border-slate-600 hover:text-slate-600 transition leading-none select-none">
                        C
                      </div>
                    )}
                  </button>
                </td>

                {/* 10. Actions (Save / Cancel) */}
                <td className="py-2.5 px-4 text-center">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCommitInlineAdd}
                      className="w-full sm:w-auto px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-sm text-[10px] font-bold shadow-sm transition active:scale-95 cursor-pointer leading-none"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelInlineAdd}
                      className="w-full sm:w-auto px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-550 rounded-sm text-[10px] transition cursor-pointer leading-none font-mono"
                    >
                      Esc
                    </button>
                  </div>
                </td>
              </tr>
            {paginatedTransactions.length === 0 ? (
               <tr>
                <td colSpan={11} className="py-12 text-center text-slate-500 font-sans">
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
                      <input
                        type="checkbox"
                        checked={selectedTxIds.has(tx.id)}
                        onChange={() => toggleSelectTransaction(tx.id)}
                        className="rounded border-slate-350 text-sky-600 focus:ring-sky-500 hover:border-slate-450 cursor-pointer h-3.5 w-3.5 transition"
                      />
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
                            {(!tx.payee || tx.payee === 'Unspecified Payee') ? '' : tx.payee}
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
                          className="text-[10px] border border-slate-300 rounded-sm p-1.5 w-full bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 animate-fadeIn"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {tx.memo || ''}
                        </span>
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
                      <button
                        onClick={() => toggleReconciliation(tx)}
                        className="flex items-center justify-center mx-auto focus:outline-none cursor-pointer hover:scale-105 transition"
                        title={
                          tx.reconciled 
                            ? "Reconciled (Click to reset)" 
                            : tx.cleared 
                              ? "Cleared (Click to reconcile)" 
                              : "Uncleared (Click to clear)"
                        }
                      >
                        {tx.reconciled ? (
                          <div className="w-5 h-5 flex items-center justify-center text-emerald-600">
                            <Lock size={14} className="fill-current text-emerald-600" />
                          </div>
                        ) : tx.cleared ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-sans font-extrabold text-white shadow-sm leading-none">
                            C
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-sans font-extrabold text-slate-400 hover:border-slate-600 hover:text-slate-600 transition leading-none">
                            C
                          </div>
                        )}
                      </button>
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
