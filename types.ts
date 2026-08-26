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
  date: string; // YYYY-MM-DD
  note?: string;
  time?: string;
}

export interface SavingsRecord {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  note?: string;
}

export interface NotificationPreference {
  enabled: boolean;
  window: string; // e.g. "8:00 PM - 9:00 PM"
  customStartTime?: string;
  customEndTime?: string;
}

export interface MonthReport {
  month: string; // YYYY-MM
  monthName: string;
  income: number;
  totalSpent: number;
  netSavings: number;
  savingsRate: number;
  topCategory: string;
  topCategorySpent: number;
  daysActive: number;
  coachInsight: string;
  actionableTips: string[];
}

export type SupportedLanguage = 
  | 'auto'
  | 'en-IN'   // Indian English
  | 'hinglish' // Hinglish
  | 'hi-IN'   // Hindi (हिन्दी)
  | 'ta-IN'   // Tamil (தமிழ்)
  | 'te-IN'   // Telugu (తెలుగు)
  | 'bn-IN'   // Bengali (বাংলা)
  | 'mr-IN'   // Marathi (मराठी)
  | 'gu-IN'   // Gujarati (ગુજરાતી)
  | 'kn-IN'   // Kannada (ಕನ್ನಡ)
  | 'pa-IN';  // Punjabi (ਪੰਜਾਬੀ)

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  speechCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Auto-Detect', nativeName: 'Auto (English/Hindi/Regional)', speechCode: 'en-IN' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', speechCode: 'en-IN' },
  { code: 'hinglish', name: 'Hinglish', nativeName: 'Hinglish (Hindi + English)', speechCode: 'hi-IN' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN' },
];

export interface MissedDayInfo {
  date: string; // YYYY-MM-DD
  dayLabel: string;
  isYesterday: boolean;
}

export interface DiagnosticsTestResult {
  id: string;
  category: 'Math Engine' | 'Security Audit' | 'Edge Cases' | 'Performance' | 'Navigation';
  name: string;
  status: 'passed' | 'failed' | 'running' | 'idle';
  details: string;
  durationMs?: number;
}

export const DEFAULT_ALLOCATION = [
  { name: 'Food', percentage: 30, color: '#F87171', icon: 'Utensils' },
  { name: 'Education & Study', percentage: 20, color: '#34D399', icon: 'BookOpen' },
  { name: 'Rent / Hostel', percentage: 20, color: '#60A5FA', icon: 'Home' },
  { name: 'Transport', percentage: 10, color: '#FBBF24', icon: 'Bus' },
  { name: 'Entertainment', percentage: 10, color: '#A78BFA', icon: 'Gamepad2' },
  { name: 'Others & Miscellaneous', percentage: 10, color: '#F472B6', icon: 'ShoppingBag' },
];

export const NOTIFICATION_PRESETS = [
  { label: '7:00 PM - 8:00 PM', value: '7:00 PM - 8:00 PM', desc: 'Evening wrap-up right after college/dinner' },
  { label: '8:00 PM - 9:00 PM', value: '8:00 PM - 9:00 PM', desc: 'Prime check-in window for most students (Recommended)' },
  { label: '9:00 PM - 10:00 PM', value: '9:00 PM - 10:00 PM', desc: 'Night reflection before winding down' },
  { label: '10:00 PM - 11:00 PM', value: '10:00 PM - 11:00 PM', desc: 'Late night study break check-in' },
];
