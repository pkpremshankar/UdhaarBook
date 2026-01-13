
export enum TransactionType {
  GIVEN = 'GIVEN', // Credit (Customer owes)
  RECEIVED = 'RECEIVED' // Payment (Customer pays)
}

export type ReminderFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE';

export interface ReminderConfig {
  frequency: ReminderFrequency;
  time: string; // HH:mm format
  enabled: boolean;
}

export interface EditHistory {
  timestamp: number;
  previousValue: number;
  reason: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  timestamp: number;
  isEdited: boolean;
  history: EditHistory[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  avatar?: string; // Base64 image data
  balance: number;
  loanAmount?: number; // Initial loan provided
  interestRate?: number; // Monthly interest percentage
  lastUpdated: number;
  transactions: Transaction[];
  reminderConfig?: ReminderConfig;
}

export interface SummaryStats {
  totalGiven: number;
  totalReceived: number;
  netBalance: number;
}
