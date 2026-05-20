export type AccountType = 'Checking' | 'Savings' | 'Credit Card' | 'Cash' | 'Investment' | 'Other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  createdAt: string;
  reconciliationDate?: string; // Stored date of last reconciliation
}

export interface Transaction {
  id: string;
  accountId: string;          // Primary account
  date: string;               // YYYY-MM-DD
  payee: string;              // Text string (or linked transfer indicator)
  category: string;           // Category string
  memo: string;               // Memo
  outflow: number;            // Expense amount (>= 0)
  inflow: number;             // Income amount (>= 0)
  reconciled: boolean;        // Reconciled flag
  cleared?: boolean;          // Cleared flag for three-state: uncleared, cleared, reconciled
  transferAccountId?: string; // Linked account ID if this is a transfer
  transferTxId?: string;      // Coupled transaction ID
  isRecurringInstance?: boolean; // Flag to trace if it was auto-generated
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  accountId: string;
  payee: string;
  category: string;
  memo: string;
  amount: number;             // Absolute amount (> 0)
  type: 'outflow' | 'inflow';
  frequency: RecurringFrequency;
  startDate: string;          // YYYY-MM-DD
  lastGeneratedDate?: string; // YYYY-MM-DD (the last occurrence date generated)
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
}
