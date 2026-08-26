import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Utensils, 
  BookOpen, 
  Bus, 
  Home, 
  Gamepad2, 
  ShoppingBag, 
  AlertCircle, 
  Calendar, 
  Check, 
  Sparkles, 
  Trash2,
  Clock,
  Layers,
  Zap
} from 'lucide-react';
import { Expense, DEFAULT_ALLOCATION } from '../types';

interface DailyExpenseLoggerProps {
  expenses?: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onAddBatchExpenses: (expenses: Omit<Expense, 'id'>[]) => void;
  onDeleteExpense: (id: string) => void;
  currency?: string;
  onOpenCoach?: () => void;
}

export const DailyExpenseLogger: React.FC<DailyExpenseLoggerProps> = ({
  expenses = [],
  onAddExpense,
  onAddBatchExpenses,
  onDeleteExpense,
  currency = '₹',
  onOpenCoach
}) => {
  const safeExpenses = expenses || [];
  const [logMode, setLogMode] = useState<'quick-multi' | 'single'>('quick-multi');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Multi-field state for quick daily entry
  const [categoryAmounts, setCategoryAmounts] = useState<Record<string, string>>({
    'Food': '',
    'Education & Study': '',
    'Transport': '',
    'Entertainment': '',
    'Others & Miscellaneous': '',
  });

  // Single transaction state
  const [singleAmount, setSingleAmount] = useState('');
  const [singleCategory, setSingleCategory] = useState('Food');
  const [singleNote, setSingleNote] = useState('');

  // Toast feedback
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Calculate total spent for the selected date
  const expensesForSelectedDate = safeExpenses.filter(e => e?.date === selectedDate);
  const totalSpentOnSelectedDate = expensesForSelectedDate.reduce((acc, curr) => acc + (curr?.amount || 0), 0);

  // Calculate live total being entered in quick-multi mode
  const liveEnteringTotal = (Object.values(categoryAmounts) as string[]).reduce<number>((acc, val) => {
    const num = parseFloat(val);
    return acc + (isNaN(num) || num < 0 ? 0 : num);
  }, 0);

  const handleMultiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItems: Omit<Expense, 'id'>[] = [];
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    (Object.entries(categoryAmounts) as [string, string][]).forEach(([cat, val]) => {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        newItems.push({
          amount: parsed,
          category: cat,
          date: selectedDate,
          time: currentTime,
          note: `Daily log for ${cat}`
        });
      }
    });

    if (newItems.length > 0) {
      onAddBatchExpenses(newItems);
      // Reset inputs
      setCategoryAmounts({
        'Food': '',
        'Education & Study': '',
        'Transport': '',
        'Entertainment': '',
        'Others & Miscellaneous': '',
      });
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(singleAmount);
    if (isNaN(amount) || amount <= 0) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    onAddExpense({
      amount,
      category: singleCategory,
      date: selectedDate,
      time: currentTime,
      note: singleNote.trim() || undefined
    });

    setSingleAmount('');
    setSingleNote('');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Food': return <Utensils className="w-4 h-4 text-rose-400" />;
      case 'Education & Study': return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'Rent / Hostel': return <Home className="w-4 h-4 text-blue-400" />;
      case 'Transport': return <Bus className="w-4 h-4 text-amber-400" />;
      case 'Entertainment': return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      default: return <ShoppingBag className="w-4 h-4 text-pink-400" />;
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Top Banner: Date Selector & Total Spent Badge */}
      <div className="glass-card p-6 border border-white/5 bg-gradient-to-r from-indigo-950/30 via-black to-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Logging Date</span>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  Today
                </span>
              )}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm font-semibold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3.5 px-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Spent on {isToday ? 'Today' : selectedDate}</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {currency}{totalSpentOnSelectedDate.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
          <button
            onClick={() => setLogMode('quick-multi')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              logMode === 'quick-multi' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Category Daily Log</span>
          </button>
          <button
            onClick={() => setLogMode('single')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              logMode === 'single' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Single Expense Log</span>
          </button>
        </div>

        {onOpenCoach && (
          <button
            onClick={onOpenCoach}
            className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Coach for Spending Advice</span>
          </button>
        )}
      </div>

      {/* Mode 1: Quick Multi-Category Form */}
      {logMode === 'quick-multi' ? (
        <form onSubmit={handleMultiSubmit} className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Daily Category Check-in</h3>
              <p className="text-xs text-slate-400">Fill in approximate spending for each category you spent on today</p>
            </div>
            {liveEnteringTotal > 0 && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Adding to Day:</span>
                <p className="text-lg font-bold text-emerald-400">+{currency}{liveEnteringTotal}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'Food', label: 'Food & Dining / Canteen', icon: <Utensils className="w-4 h-4 text-rose-400" />, placeholder: 'e.g. 150' },
              { key: 'Education & Study', label: 'Education, Books & Xerox', icon: <BookOpen className="w-4 h-4 text-emerald-400" />, placeholder: 'e.g. 200' },
              { key: 'Transport', label: 'Transport / Metro / Auto', icon: <Bus className="w-4 h-4 text-amber-400" />, placeholder: 'e.g. 60' },
              { key: 'Entertainment', label: 'Outings & Movies', icon: <Gamepad2 className="w-4 h-4 text-purple-400" />, placeholder: 'e.g. 250' },
              { key: 'Others & Miscellaneous', label: 'Others / Personal Care', icon: <ShoppingBag className="w-4 h-4 text-pink-400" />, placeholder: 'e.g. 100' },
            ].map((item) => (
              <div key={item.key} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                    {item.icon}
                  </div>
                  <label className="text-xs font-semibold text-slate-200">{item.label}</label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={item.placeholder}
                    value={categoryAmounts[item.key] || ''}
                    onChange={(e) => setCategoryAmounts({ ...categoryAmounts, [item.key]: e.target.value })}
                    className="w-full pl-7 pr-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Only non-empty fields will be saved. Cumulative balance updates immediately.</span>
            </div>

            <button
              type="submit"
              disabled={liveEnteringTotal <= 0}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Log Daily Spending ({currency}{liveEnteringTotal})</span>
            </button>
          </div>
        </form>
      ) : (
        /* Mode 2: Single Expense Form */
        <form onSubmit={handleSingleSubmit} className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold text-white">Log Single Transaction</h3>
            <p className="text-xs text-slate-400">Record a specific itemized expenditure</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sm font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="0.00"
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-base font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
              <select
                value={singleCategory}
                onChange={(e) => setSingleCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-semibold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
              >
                {DEFAULT_ALLOCATION.map(cat => (
                  <option key={cat.name} value={cat.name} className="bg-slate-900 text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optional Note</label>
              <input
                type="text"
                placeholder="e.g. Lunch at college canteen"
                value={singleNote}
                onChange={(e) => setSingleNote(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!singleAmount || parseFloat(singleAmount) <= 0}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </form>
      )}

      {/* Success Toast Animation */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Spending logged successfully! Live balance has been recalculated.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions on Selected Date */}
      <div className="glass-card p-6 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Recorded Entries for {isToday ? 'Today' : selectedDate} ({expensesForSelectedDate.length})
          </h4>
          <span className="text-xs font-bold text-slate-400">
            Total: <span className="text-white font-extrabold">{currency}{totalSpentOnSelectedDate}</span>
          </span>
        </div>

        {expensesForSelectedDate.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 space-y-2">
            <p className="text-sm text-slate-400">No expenses recorded for this date yet.</p>
            <p className="text-xs text-slate-500">Log spending above to update your running balance.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expensesForSelectedDate.map((exp) => (
              <div 
                key={exp.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    {getCategoryIcon(exp.category)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{exp.category}</p>
                    <p className="text-[11px] text-slate-400">
                      {exp.note || 'Direct entry'} {exp.time ? `• ${exp.time}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-rose-400">
                    -{currency}{exp.amount}
                  </span>
                  <button
                    onClick={() => onDeleteExpense(exp.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
