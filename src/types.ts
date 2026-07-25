export interface BudgetCategory {
  name: string;
  percentage: number;
  amount: number;
  color: string;
  icon: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface SavingsRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export const DEFAULT_ALLOCATION = [
  { name: 'Food', percentage: 25, color: '#F87171', icon: 'Utensils' },
  { name: 'Rent / Hostel', percentage: 30, color: '#60A5FA', icon: 'Home' },
  { name: 'Transport', percentage: 10, color: '#FBBF24', icon: 'Bus' },
  { name: 'Education', percentage: 10, color: '#34D399', icon: 'BookOpen' },
  { name: 'Entertainment', percentage: 10, color: '#A78BFA', icon: 'Gamepad2' },
  { name: 'Shopping', percentage: 5, color: '#F472B6', icon: 'ShoppingBag' },
  { name: 'Savings', percentage: 5, color: '#818CF8', icon: 'PiggyBank' },
  { name: 'Emergency Fund', percentage: 5, color: '#FB923C', icon: 'AlertCircle' },
];
