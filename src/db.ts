import { get, set } from 'idb-keyval';
import { Account, Transaction, RecurringRule, Category } from './types';

const ACCOUNTS_KEY = 'pe_tracker_accounts';
const TRANSACTIONS_KEY = 'pe_tracker_transactions';
const RECURRING_RULES_KEY = 'pe_tracker_recurring_rules';
const CATEGORIES_KEY = 'pe_tracker_categories';

// Helper for unique ID generation
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Initial default data if none exists
const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'checking-1',
    name: 'Main Checking',
    type: 'Checking',
    initialBalance: 2500,
    color: '#0284c7', // Sky Blue
    createdAt: new Date().toISOString()
  },
  {
    id: 'cash-1',
    name: 'Cash Wallet',
    type: 'Cash',
    initialBalance: 120,
    color: '#16a34a', // Green
    createdAt: new Date().toISOString()
  },
  {
    id: 'savings-1',
    name: 'High-Yield Savings',
    type: 'Savings',
    initialBalance: 10000,
    color: '#9333ea', // Purple
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    accountId: 'checking-1',
    date: '2026-05-18',
    payee: 'Supermarket Corp',
    category: 'Groceries',
    memo: 'Weekly grocery run',
    outflow: 84.50,
    inflow: 0,
    reconciled: true
  },
  {
    id: 'tx-2',
    accountId: 'checking-1',
    date: '2026-05-19',
    payee: 'Employer Inc',
    category: 'Salary',
    memo: 'Bi-monthly paycheck',
    outflow: 0,
    inflow: 1850.00,
    reconciled: true
  },
  {
    id: 'tx-3',
    accountId: 'cash-1',
    date: '2026-05-20',
    payee: 'Corner Coffee',
    category: 'Dining Out',
    memo: 'Espresso & croissant',
    outflow: 5.75,
    inflow: 0,
    reconciled: false
  }
];

const DEFAULT_RULES: RecurringRule[] = [
  {
    id: 'rule-1',
    accountId: 'checking-1',
    payee: 'Cloud Storage Group',
    category: 'Subscriptions',
    memo: 'Monthly cloud hosting backup storage',
    amount: 12.00,
    type: 'outflow',
    frequency: 'monthly',
    startDate: '2026-05-01',
    lastGeneratedDate: '2026-05-01',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export async function fetchAccounts(): Promise<Account[]> {
  const list = await get<Account[]>(ACCOUNTS_KEY);
  if (!list) {
    await set(ACCOUNTS_KEY, DEFAULT_ACCOUNTS);
    return DEFAULT_ACCOUNTS;
  }
  return list;
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  await set(ACCOUNTS_KEY, accounts);
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const list = await get<Transaction[]>(TRANSACTIONS_KEY);
  if (!list) {
    await set(TRANSACTIONS_KEY, DEFAULT_TRANSACTIONS);
    return DEFAULT_TRANSACTIONS;
  }
  return list;
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await set(TRANSACTIONS_KEY, transactions);
}

export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const list = await get<RecurringRule[]>(RECURRING_RULES_KEY);
  if (!list) {
    await set(RECURRING_RULES_KEY, DEFAULT_RULES);
    return DEFAULT_RULES;
  }
  return list;
}

export async function saveRecurringRules(rules: RecurringRule[]): Promise<void> {
  await set(RECURRING_RULES_KEY, rules);
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-groceries', name: 'Groceries', color: '#f59e0b' },     // Amber
  { id: 'cat-dining', name: 'Dining Out', color: '#f43f5e' },       // Rose
  { id: 'cat-rent', name: 'Rent/Mortgage', color: '#3b82f6' },      // Blue
  { id: 'cat-utilities', name: 'Utilities', color: '#06b6d4' },     // Cyan
  { id: 'cat-subs', name: 'Subscriptions', color: '#8b5cf6' },      // Violet
  { id: 'cat-salary', name: 'Salary', color: '#10b981' },           // Emerald
  { id: 'cat-invest', name: 'Investments', color: '#6366f1' },      // Indigo
  { id: 'cat-transport', name: 'Transport', color: '#14b8a6' },     // Teal
  { id: 'cat-ent', name: 'Entertainment', color: '#ec4899' },       // Pink
  { id: 'cat-shopping', name: 'Shopping', color: '#e11d48' },       // Dark Rose
  { id: 'cat-health', name: 'Health/Medical', color: '#ef4444' },   // Red
  { id: 'cat-taxes', name: 'Taxes', color: '#64748b' },             // Slate
  { id: 'cat-education', name: 'Education', color: '#84cc16' },     // Lime
  { id: 'cat-gifts', name: 'Gifts/Donations', color: '#d946ef' },    // Fuchsia
  { id: 'cat-transfer', name: 'Transfer', color: '#0284c7' },       // Sky
  { id: 'cat-other', name: 'Other', color: '#94a3b8' }              // Gray
];

export async function fetchCategories(): Promise<Category[]> {
  const list = await get<Category[]>(CATEGORIES_KEY);
  if (!list) {
    await set(CATEGORIES_KEY, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return list;
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await set(CATEGORIES_KEY, categories);
}

// Native Date Operations
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function stepDate(date: Date, frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'): Date {
  const next = new Date(date);
  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'biweekly') {
    next.setDate(next.getDate() + 14);
  } else if (frequency === 'monthly') {
    const targetDay = date.getDate();
    next.setMonth(next.getMonth() + 1);
    if (next.getDate() < targetDay) {
      next.setDate(0); // Roll options to last day of target month
    }
  } else if (frequency === 'yearly') {
    const targetMonth = date.getMonth();
    next.setFullYear(next.getFullYear() + 1);
    if (next.getMonth() !== targetMonth) {
      next.setDate(0);
    }
  }
  return next;
}

/**
 * Checks all active recurring rules against the current system date.
 * Automatically injects any missing occurrences up to today.
 */
export function processRecurringRules(
  rules: RecurringRule[],
  transactions: Transaction[],
  todayStr: string
): { generatedTransactions: Transaction[]; updatedRules: RecurringRule[] } {
  const generatedTransactions: Transaction[] = [];
  const updatedRules: RecurringRule[] = rules.map(rule => {
    if (!rule.isActive) return rule;

    const ruleStart = parseDate(rule.startDate);
    const todayDate = parseDate(todayStr);

    if (ruleStart > todayDate) return rule;

    const occurrences: string[] = [];
    const lastGenStr = rule.lastGeneratedDate;
    
    if (!lastGenStr) {
      // First generation
      occurrences.push(rule.startDate);
      let temp = stepDate(ruleStart, rule.frequency);
      while (temp <= todayDate) {
        occurrences.push(formatDate(temp));
        temp = stepDate(temp, rule.frequency);
      }
    } else {
      let temp = stepDate(parseDate(lastGenStr), rule.frequency);
      while (temp <= todayDate) {
        occurrences.push(formatDate(temp));
        temp = stepDate(temp, rule.frequency);
      }
    }

    if (occurrences.length === 0) return rule;

    // Create a transaction for each generated occurrence
    occurrences.forEach(date => {
      generatedTransactions.push({
        id: 'tx-rec-' + generateId(),
        accountId: rule.accountId,
        date,
        payee: rule.payee,
        category: rule.category,
        memo: `${rule.memo} [Auto-Generated]`,
        outflow: rule.type === 'outflow' ? rule.amount : 0,
        inflow: rule.type === 'inflow' ? rule.amount : 0,
        reconciled: false,
        isRecurringInstance: true
      });
    });

    return {
      ...rule,
      lastGeneratedDate: occurrences[occurrences.length - 1]
    };
  });

  return {
    generatedTransactions,
    updatedRules
  };
}
