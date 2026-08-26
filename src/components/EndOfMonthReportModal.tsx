import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  CheckCircle2, 
  Share2, 
  Bot, 
  PieChart as PieIcon,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Expense, SavingsRecord, DEFAULT_ALLOCATION } from '../types';
import { GoogleGenAI } from '@google/genai';

interface EndOfMonthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthStr: string; // YYYY-MM
  income: number;
  expenses: Expense[];
  savings?: SavingsRecord[];
  onSaveToSavingsVault?: (amount: number, monthStr: string) => void;
  onSaveToVault?: (amount: number, monthStr: string) => void;
  currency?: string;
  aiInstance: GoogleGenAI;
}

export const EndOfMonthReportModal: React.FC<EndOfMonthReportModalProps> = ({
  isOpen,
  onClose,
  monthStr,
  income = 0,
  expenses = [],
  savings = [],
  onSaveToSavingsVault,
  onSaveToVault,
  currency = '₹',
  aiInstance
}) => {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [coachVerdict, setCoachVerdict] = useState<string>('');
  const [tips, setTips] = useState<string[]>([]);
  const [hasSavedToVault, setHasSavedToVault] = useState(false);

  const safeExpenses = expenses || [];
  const safeSavings = savings || [];

  // Parse Month Name
  const [year, monthNum] = (monthStr || '').split('-').map(Number);
  const monthDate = new Date(year || new Date().getFullYear(), (monthNum || 1) - 1, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Calculate stats for this month
  const monthExpenses = safeExpenses.filter(e => e?.date && e.date.startsWith(monthStr));
  const totalSpent = monthExpenses.reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  const netSavings = Math.max(0, income - totalSpent);
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  monthExpenses.forEach(e => {
    if (e?.category) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount }));

  const topCategory = sortedCategories[0] || { name: 'None', amount: 0 };

  // Check if already saved in vault
  const alreadyInVault = safeSavings.some(s => s?.month === monthStr || (s?.date && s.date.startsWith(monthStr)));

  useEffect(() => {
    if (!isOpen) return;

    // Trigger celebration confetti if user saved money!
    if (netSavings > 0) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    // Generate AI Coach Report
    const fetchAiInsights = async () => {
      setIsGeneratingAi(true);
      try {
        const prompt = `You are a supportive, friendly AI Financial Wellness Coach for students.
        Analyze this student's monthly financial report for ${monthName}:
        - Monthly Base Income/Allowance: ${currency}${income}
        - Total Spent: ${currency}${totalSpent}
        - Net Savings: ${currency}${netSavings} (Savings rate: ${savingsRate}%)
        - Top Spending Category: ${topCategory.name} (${currency}${topCategory.amount})
        - All Categories Breakdown: ${JSON.stringify(categoryTotals)}

        Generate:
        1. A supportive, encouraging 2-sentence summary (e.g. "You spent a bit more on ${topCategory.name} this month, but no worries—you still saved ${currency}${netSavings}!").
        2. Exactly 2 practical, bite-sized actionable tips for next month.

        Return JSON in this format:
        {
          "verdict": "string",
          "tips": ["tip1", "tip2"]
        }`;

        const response = await aiInstance.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        setCoachVerdict(parsed.verdict || `You managed your budget thoughtfully this month, with ${currency}${netSavings} left over!`);
        setTips(parsed.tips || [
          `Set aside a small fixed emergency buffer of ${currency}500 on the 1st of next month.`,
          `Keep an eye on ${topCategory.name} expenses to boost your savings rate.`
        ]);
      } catch (err) {
        console.error('Error generating AI month report:', err);
        setCoachVerdict(`You navigated ${monthName} with ${currency}${netSavings} in remaining savings. Supportive discipline makes all the difference!`);
        setTips([
          `Review your ${topCategory.name} logs to identify high-value vs impulse expenses.`,
          `Aim to increase your savings rate by 5% next month with home-cooked meals or student discounts.`
        ]);
      } finally {
        setIsGeneratingAi(false);
      }
    };

    fetchAiInsights();
  }, [isOpen, monthStr]);

  const handleRecordSavings = () => {
    if (onSaveToSavingsVault) {
      onSaveToSavingsVault(netSavings, monthStr);
    } else if (onSaveToVault) {
      onSaveToVault(netSavings, monthStr);
    }
    setHasSavedToVault(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-[#0d0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-950/30 via-black to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">End-of-Month Financial Report</h3>
              <p className="text-xs text-slate-400">{monthName} Comprehensive Review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Main Hero Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Income</span>
              <p className="text-xl font-bold text-white mt-1">{currency}{income.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Spent</span>
              <p className="text-xl font-bold text-rose-400 mt-1">{currency}{totalSpent.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Net Savings</span>
              <p className="text-xl font-bold text-emerald-300 mt-1">{currency}{netSavings.toLocaleString()}</p>
            </div>
          </div>

          {/* Savings Rate Gauge Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-black border border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">Monthly Savings Efficiency</p>
              <h4 className="text-2xl font-bold text-white">{savingsRate}% Saved</h4>
              <p className="text-xs text-slate-400">
                {savingsRate >= 20 
                  ? 'Outstanding financial discipline! You beat the student benchmark.' 
                  : 'Solid progress! Every rupee tracked builds long-term wealth.'}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <PiggyBank className="w-8 h-8" />
            </div>
          </div>

          {/* AI Coach Review */}
          <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Bot className="w-4 h-4" />
                <span>Coach's Supportive Analysis</span>
              </div>
              {isGeneratingAi && (
                <div className="flex items-center gap-1 text-[10px] text-indigo-400 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Personalizing insights...</span>
                </div>
              )}
            </div>

            <p className="text-sm text-indigo-100 italic leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
              "{coachVerdict || 'Analyzing your monthly logs to generate customized supportive recommendations...'}"
            </p>

            {tips.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Actionable Focus for Next Month:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tips.map((tip, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
                      • {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Spending Categories */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>Highest Spending Areas</span>
            </h4>
            <div className="space-y-2">
              {sortedCategories.slice(0, 3).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                  <span className="font-semibold text-slate-200">{cat.name}</span>
                  <span className="font-bold text-rose-400">{currency}{cat.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close Report
          </button>

          {netSavings > 0 && (
            <button
              onClick={handleRecordSavings}
              disabled={alreadyInVault || hasSavedToVault}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{alreadyInVault || hasSavedToVault ? 'Savings Recorded in Vault' : `Lock ${currency}${netSavings} into Savings Vault`}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
