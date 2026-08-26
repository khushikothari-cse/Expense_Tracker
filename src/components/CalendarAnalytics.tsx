import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Sparkles, 
  PieChart as PieIcon, 
  BarChart3, 
  PiggyBank, 
  FileText,
  AlertCircle,
  Utensils,
  BookOpen,
  Bus,
  Home,
  Gamepad2,
  ShoppingBag,
  Trash2,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { Expense, SavingsRecord, DEFAULT_ALLOCATION } from '../types';

interface CalendarAnalyticsProps {
  expenses?: Expense[];
  savings?: SavingsRecord[];
  income?: number;
  currency?: string;
  onOpenReportModal: (monthStr: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const CalendarAnalytics: React.FC<CalendarAnalyticsProps> = ({
  expenses = [],
  savings = [],
  income = 0,
  currency = '₹',
  onOpenReportModal,
  onDeleteExpense
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const safeExpenses = expenses || [];
  const safeSavings = savings || [];

  // Month string in YYYY-MM
  const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter expenses for this specific month
  const monthExpenses = useMemo(() => {
    return safeExpenses.filter(e => e?.date && e.date.startsWith(monthStr));
  }, [safeExpenses, monthStr]);

  // Total spent in this month
  const totalMonthSpent = useMemo(() => {
    return monthExpenses.reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  }, [monthExpenses]);

  // Net remaining / savings for this month
  const netRemaining = Math.max(0, income - totalMonthSpent);

  // Recorded savings for this month in ledger
  const monthSavedRecord = useMemo(() => {
    return safeSavings.find(s => s?.month === monthStr || (s?.date && s.date.startsWith(monthStr)));
  }, [safeSavings, monthStr]);

  // Calendar Math
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun

  // Map expenses by day of month (1..31)
  const dailySpendingMap = useMemo(() => {
    const map: Record<number, { total: number; count: number; items: Expense[] }> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      map[day] = { total: 0, count: 0, items: [] };
    }
    monthExpenses.forEach(exp => {
      const dayNum = parseInt(exp.date.split('-')[2], 10);
      if (map[dayNum]) {
        map[dayNum].total += exp.amount;
        map[dayNum].count += 1;
        map[dayNum].items.push(exp);
      }
    });
    return map;
  }, [monthExpenses, daysInMonth]);

  // Cumulative Chart Data (Day 1..daysInMonth)
  const cumulativeChartData = useMemo(() => {
    let runningTotal = 0;
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      runningTotal += (dailySpendingMap[d]?.total || 0);
      data.push({
        day: `Day ${d}`,
        dayNum: d,
        daily: dailySpendingMap[d]?.total || 0,
        cumulative: runningTotal,
        balance: Math.max(0, income - runningTotal)
      });
    }
    return data;
  }, [dailySpendingMap, daysInMonth, income]);

  // Category Breakdown Data for this month
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(exp => {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    });

    return Object.entries(map).map(([name, amount]) => {
      const def = DEFAULT_ALLOCATION.find(c => c.name === name);
      return {
        name,
        amount,
        color: def?.color || '#818CF8'
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  // Top spending category
  const topCategory = categoryData[0] || null;

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
    setSelectedDay(null);
  };

  const selectedDayExpenses = selectedDay ? dailySpendingMap[selectedDay]?.items || [] : [];
  const selectedDayTotal = selectedDay ? dailySpendingMap[selectedDay]?.total || 0 : 0;

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Food': return <Utensils className="w-3.5 h-3.5 text-rose-400" />;
      case 'Education & Study': return <BookOpen className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Rent / Hostel': return <Home className="w-3.5 h-3.5 text-blue-400" />;
      case 'Transport': return <Bus className="w-3.5 h-3.5 text-amber-400" />;
      case 'Entertainment': return <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />;
      default: return <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner: Month Selector & End-of-Month Summary Trigger */}
      <div className="glass-card p-6 border border-white/5 bg-gradient-to-r from-purple-950/20 via-black to-indigo-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{monthName}</h2>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Historical calendar tracking and monthly spend analytics</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenReportModal(monthStr)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Month-End AI Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Base Income</p>
          <p className="text-2xl font-bold text-white">{currency}{income.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">Allocated budget</p>
        </div>

        <div className="glass-card p-5 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Spent</p>
          <p className="text-2xl font-bold text-rose-400">{currency}{totalMonthSpent.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">{monthExpenses.length} transactions logged</p>
        </div>

        <div className="glass-card p-5 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Balance / Saved</p>
          <p className="text-2xl font-bold text-emerald-400">{currency}{netRemaining.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-400/80">
            {income > 0 ? `${Math.round((netRemaining / income) * 100)}% left` : '0%'}
          </p>
        </div>

        <div className="glass-card p-5 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Top Spend Category</p>
          <p className="text-xl font-bold text-amber-300 truncate">
            {topCategory ? topCategory.name : 'None'}
          </p>
          <p className="text-[11px] text-slate-500">
            {topCategory ? `${currency}${topCategory.amount} spent` : 'No expenses'}
          </p>
        </div>
      </div>

      {/* Interactive Calendar Grid */}
      <div className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-400" />
              <span>Interactive Spending Calendar</span>
            </h3>
            <p className="text-xs text-slate-400">Click any date to inspect transactions and daily breakdown</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Spent under {currency}300</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Spent {currency}300+</span>
            </span>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-white/5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells before month starts */}
          {[...Array(firstDayOfWeek)].map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[70px] rounded-2xl bg-white/[0.01] border border-transparent opacity-20" />
          ))}

          {/* Actual days */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dayData = dailySpendingMap[dayNum];
            const isSelected = selectedDay === dayNum;
            const hasSpending = dayData && dayData.total > 0;
            const isHighSpending = dayData && dayData.total >= 300;

            const isTodayDate = 
              selectedYear === currentDate.getFullYear() && 
              selectedMonth === currentDate.getMonth() && 
              dayNum === currentDate.getDate();

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => setSelectedDay(isSelected ? null : dayNum)}
                className={`min-h-[72px] md:min-h-[84px] p-2 rounded-2xl text-left transition-all relative flex flex-col justify-between border ${
                  isSelected
                    ? 'bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20'
                    : hasSpending
                    ? isHighSpending
                      ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/60'
                      : 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isTodayDate ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center' : 'text-slate-300'}`}>
                    {dayNum}
                  </span>
                  {hasSpending && (
                    <span className={`w-2 h-2 rounded-full ${isHighSpending ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  )}
                </div>

                {hasSpending ? (
                  <div className="mt-1">
                    <p className="text-[11px] font-bold text-white truncate">
                      {currency}{dayData.total}
                    </p>
                    <p className="text-[9px] text-slate-400 hidden sm:block">
                      {dayData.count} {dayData.count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-600 font-medium">{currency}0</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspector */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6 border border-indigo-500/30 bg-indigo-950/20 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  Transactions for {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Day Total: </span>
                <span className="text-base font-bold text-rose-400">-{currency}{selectedDayTotal}</span>
              </div>
            </div>

            {selectedDayExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No items logged on this date.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDayExpenses.map((exp) => (
                  <div 
                    key={exp.id}
                    className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5">
                        {getCategoryIcon(exp.category)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{exp.category}</p>
                        <p className="text-[10px] text-slate-400">{exp.note || 'Logged expense'} {exp.time ? `• ${exp.time}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{currency}{exp.amount}</span>
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cumulative Trend & Category Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cumulative Subtraction Curve */}
        <div className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-indigo-400" />
              <span>Cumulative Spending Curve</span>
            </h3>
            <p className="text-xs text-slate-400">
              Continuous accumulation across Day 1 to Day {daysInMonth}
            </p>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeChartData}>
                <defs>
                  <linearGradient id="cumSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dayNum" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d0d12', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  formatter={(val: number, name: string) => [
                    `${currency}${val}`,
                    name === 'cumulative' ? 'Cumulative Spent' : 'Remaining Balance'
                  ]}
                  labelFormatter={(lbl) => `Day ${lbl} of ${monthName}`}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#cumSpendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Category Breakdown */}
        <div className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              <span>Category Distribution ({monthName})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Where your pocket money went this month
            </p>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
              <p className="text-sm text-slate-400">No expenses logged for {monthName}.</p>
              <p className="text-xs text-slate-500 mt-1">Log expenses in the Tracker to view spending distributions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="amount"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0d12', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      formatter={(val: number) => [`${currency}${val}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-300 font-medium truncate max-w-[110px]">{cat.name}</span>
                    </div>
                    <span className="font-bold text-white">{currency}{cat.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
