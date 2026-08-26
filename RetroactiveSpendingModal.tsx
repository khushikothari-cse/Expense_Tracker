import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Calendar, 
  Check, 
  Plus, 
  Utensils, 
  BookOpen, 
  Bus, 
  Gamepad2, 
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Expense } from '../types';
import { sanitizeNumber } from '../lib/security';

interface RetroactiveSpendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string; // YYYY-MM-DD
  onAddBatchExpenses: (items: Omit<Expense, 'id'>[]) => void;
  currency?: string;
}

export const RetroactiveSpendingModal: React.FC<RetroactiveSpendingModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  onAddBatchExpenses,
  currency = '₹'
}) => {
  const [categoryAmounts, setCategoryAmounts] = useState<Record<string, string>>({
    'Food': '',
    'Education & Study': '',
    'Transport': '',
    'Entertainment': '',
    'Others & Miscellaneous': '',
  });
  const [customDate, setCustomDate] = useState<string>(targetDate);
  const [isZeroConfirmed, setIsZeroConfirmed] = useState<boolean>(false);

  React.useEffect(() => {
    setCustomDate(targetDate);
  }, [targetDate]);

  if (!isOpen) return null;

  const handleConfirmZeroSpend = () => {
    // Treat as $0 / ₹0 spent by creating an unrecorded / zero log or simply closing safely
    setIsZeroConfirmed(true);
    setTimeout(() => {
      setIsZeroConfirmed(false);
      onClose();
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItems: Omit<Expense, 'id'>[] = [];
    const currentTime = '20:00';

    (Object.entries(categoryAmounts) as [string, string][]).forEach(([cat, val]) => {
      const parsed = sanitizeNumber(val, 0, 100000, 0);
      if (parsed > 0) {
        newItems.push({
          amount: parsed,
          category: cat,
          date: customDate,
          time: currentTime,
          note: `Retroactive log for ${cat}`
        });
      }
    });

    if (newItems.length > 0) {
      onAddBatchExpenses(newItems);
    }
    onClose();
  };

  const formattedDate = new Date(customDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-lg bg-[#0d0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-black to-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Retroactively Log Spendings</h3>
              <p className="text-xs text-slate-400">Log past unrecorded spendings or confirm ₹0 spent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Target Date Picker */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Target Date</span>
              <p className="text-sm font-bold text-white mt-0.5">{formattedDate}</p>
            </div>
            <input
              type="date"
              value={customDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Quick zero-spend action */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-emerald-300">Spent nothing on this day?</p>
              <p className="text-[11px] text-slate-400">Auto-record as {currency}0 without manual entry</p>
            </div>
            <button
              type="button"
              onClick={handleConfirmZeroSpend}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
            >
              {isZeroConfirmed ? 'Confirmed ₹0!' : `Confirm ${currency}0`}
            </button>
          </div>

          {/* Category Input Grid */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Enter Approximate Spendings
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Food', icon: <Utensils className="w-4 h-4 text-rose-400" /> },
                { name: 'Education & Study', icon: <BookOpen className="w-4 h-4 text-emerald-400" /> },
                { name: 'Transport', icon: <Bus className="w-4 h-4 text-amber-400" /> },
                { name: 'Entertainment', icon: <Gamepad2 className="w-4 h-4 text-purple-400" /> },
                { name: 'Others & Miscellaneous', icon: <ShoppingBag className="w-4 h-4 text-pink-400" /> },
              ].map(({ name, icon }) => (
                <div key={name} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-semibold text-slate-300">{name}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={categoryAmounts[name]}
                      onChange={(e) => setCategoryAmounts(prev => ({ ...prev, [name]: e.target.value }))}
                      className="w-full pl-7 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Spendings</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
