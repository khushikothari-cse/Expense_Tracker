import React from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Bot, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Zap,
  HelpCircle
} from 'lucide-react';
import { MissedDayInfo } from '../types';

interface MissedDaysNudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  missedDays?: MissedDayInfo[];
  onAutoFillZero: () => void;
  onOpenRetroactiveModal: (date: string) => void;
  currency?: string;
}

export const MissedDaysNudgeModal: React.FC<MissedDaysNudgeModalProps> = ({
  isOpen,
  onClose,
  missedDays = [],
  onAutoFillZero,
  onOpenRetroactiveModal,
  currency = '₹'
}) => {
  const safeDays = missedDays || [];
  if (!isOpen || safeDays.length === 0) return null;

  const dateRangeStr = safeDays.length === 1 
    ? (safeDays[0]?.dayLabel || '') 
    : `${safeDays[0]?.dayLabel || ''} to ${safeDays[safeDays.length - 1]?.dayLabel || ''}`;

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
        className="w-full max-w-lg bg-[#0d0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-950/40 via-black to-purple-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Coach Check-in Nudge</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {missedDays.length} Days Unrecorded
                </span>
              </div>
              <p className="text-xs text-slate-400">Keep your pocket money calculations seamless</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              "Hey there! Looks like we missed logging spendings for <strong className="text-indigo-300">{dateRangeStr}</strong>."
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              No stress at all! Your live calculations (<code className="text-indigo-400 text-[11px]">Balance = Income - Expenses</code>) continue automatically without freezing.
            </p>
          </div>

          {/* Missed Dates Pill List */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Unrecorded Dates ({missedDays.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {missedDays.map((day) => (
                <button
                  key={day.date}
                  onClick={() => {
                    onClose();
                    onOpenRetroactiveModal(day.date);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/20 text-slate-300 hover:text-white text-xs border border-white/10 hover:border-indigo-500/30 transition-all flex items-center gap-1.5"
                  title="Click to log for this date"
                >
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  <span>{day.dayLabel}</span>
                  <span className="text-[10px] text-slate-500">→ Log</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Choice Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onAutoFillZero}
              className="w-full p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-indigo-500/20 transition-all group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-xl bg-white/10">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Auto-fill {currency}0 for Missed Days</p>
                  <p className="text-[11px] text-indigo-200">Maintains continuous calculation without logging</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenRetroactiveModal(missedDays[0].date);
              }}
              className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Log Approximate Spendings Instead</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/40 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Remind me tonight during check-in window
          </button>
        </div>
      </motion.div>
    </div>
  );
};
