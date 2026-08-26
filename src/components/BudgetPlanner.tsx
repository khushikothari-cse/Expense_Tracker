import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  PieChart as PieIcon, 
  TrendingUp, 
  RotateCcw, 
  Check, 
  Utensils, 
  BookOpen, 
  Bus, 
  Home, 
  Gamepad2, 
  ShoppingBag, 
  AlertCircle,
  Sliders,
  Target,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import { BudgetCategory, Expense, DEFAULT_ALLOCATION } from '../types';

interface BudgetPlannerProps {
  income?: number;
  budget?: BudgetCategory[];
  expenses?: Expense[];
  onUpdateBudget: (newBudget: BudgetCategory[]) => void;
  currency?: string;
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  income = 0,
  budget = [],
  expenses = [],
  onUpdateBudget,
  currency = '₹'
}) => {
  const safeBudget = budget || [];
  const safeExpenses = expenses || [];
  const [localBudget, setLocalBudget] = useState<BudgetCategory[]>(safeBudget);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync if prop changes and local is empty
  React.useEffect(() => {
    if (safeBudget.length > 0) {
      setLocalBudget(safeBudget);
    }
  }, [safeBudget]);

  const totalPlanned = (localBudget || []).reduce((acc, curr) => acc + (curr?.amount || 0), 0);

  // Calculate actual spending per category
  const actualSpentPerCategory: Record<string, number> = {};
  safeExpenses.forEach(exp => {
    if (exp?.category) {
      actualSpentPerCategory[exp.category] = (actualSpentPerCategory[exp.category] || 0) + (exp.amount || 0);
    }
  });

  const handleAmountChange = (index: number, val: number) => {
    const updated = [...localBudget];
    const newAmount = Math.max(0, val);
    const newPercentage = income > 0 ? Math.round((newAmount / income) * 100) : 0;
    updated[index] = {
      ...updated[index],
      amount: newAmount,
      percentage: newPercentage
    };
    setLocalBudget(updated);
  };

  const handleResetToStandard = () => {
    const standard = DEFAULT_ALLOCATION.map(item => ({
      ...item,
      amount: Math.round((income * item.percentage) / 100)
    }));
    setLocalBudget(standard);
    onUpdateBudget(standard);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveBudget = () => {
    onUpdateBudget(localBudget);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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

  return (
    <div className="space-y-8">
      {/* Overview Top Card */}
      <div className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-400" />
              <span>Recommended Monthly Budget Allocation</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Balanced for student pocket money of <strong className="text-white">{currency}{income.toLocaleString()}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToStandard}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 50/30/20 Standard</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Pie Chart */}
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={localBudget}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="amount"
                >
                  {localBudget.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d0d12', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  formatter={(value: number) => [`${currency}${value}`, 'Allocated']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation Legend */}
          <div className="space-y-2.5">
            {localBudget.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-semibold text-slate-200">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium">{cat.percentage}%</span>
                  <span className="text-xs font-bold text-white min-w-[65px] text-right">{currency}{cat.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget vs Actual Spending Comparison */}
      <div className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <span>Budget vs. Actual Spent to Date</span>
          </h3>
          <p className="text-xs text-slate-400">
            Monitor which categories have budget buffer remaining
          </p>
        </div>

        <div className="space-y-4">
          {localBudget.map((cat) => {
            const spent = actualSpentPerCategory[cat.name] || 0;
            const percentSpent = cat.amount > 0 ? Math.round((spent / cat.amount) * 100) : 0;
            const isExceeded = spent > cat.amount;

            return (
              <div key={cat.name} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(cat.name)}
                    <span className="text-xs font-bold text-slate-200">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">{currency}{spent}</span>
                    <span className="text-xs text-slate-400"> / {currency}{cat.amount}</span>
                    <span className={`text-[11px] font-bold ml-2 ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ({percentSpent}%)
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(percentSpent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customize Inputs Form */}
      <div className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>Modify Category Allocations</span>
            </h3>
            <p className="text-xs text-slate-400">Customize target spending limits to fit your personal college lifestyle</p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20">
            Live Editable
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {localBudget.map((cat, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{cat.name}</span>
                <span className="text-[11px] text-slate-400">{cat.percentage}%</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  value={cat.amount}
                  onChange={(e) => handleAmountChange(idx, parseInt(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Total Planned Budget</span>
            <p className="text-2xl font-bold text-white">{currency}{totalPlanned.toLocaleString()}</p>
            {totalPlanned > income && (
              <p className="text-xs text-rose-400 mt-0.5">
                Note: Total planned exceeds base income by {currency}{totalPlanned - income}.
              </p>
            )}
          </div>

          <button
            onClick={handleSaveBudget}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{savedSuccess ? 'Plan Saved!' : 'Save Budget Plan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
