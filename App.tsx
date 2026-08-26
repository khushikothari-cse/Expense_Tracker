/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2,
  VolumeX,
  Mic,
  MessageSquare,
  IndianRupee,
  RefreshCw,
  LayoutDashboard,
  Calendar as CalendarIcon,
  PiggyBank,
  Target,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Wallet,
  User,
  Bot,
  Plus,
  AlertCircle,
  BookOpen,
  Bus,
  Gamepad2,
  ShoppingBag,
  Utensils,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  Bell,
  Compass,
  FileText,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import { 
  DEFAULT_ALLOCATION, 
  BudgetCategory, 
  Expense, 
  SavingsRecord,
  NotificationPreference,
  NOTIFICATION_PRESETS,
  MissedDayInfo
} from './types';
import { 
  speakInstantIndianVoice, 
  stopAllSpeech, 
  playStartupChime 
} from './lib/audioVoice';
import { 
  sanitizeNumber, 
  sanitizeText, 
  encryptData, 
  decryptData 
} from './lib/security';

// Child components
import { AppTourModal } from './components/AppTourModal';
import { DailyExpenseLogger } from './components/DailyExpenseLogger';
import { CalendarAnalytics } from './components/CalendarAnalytics';
import { EndOfMonthReportModal } from './components/EndOfMonthReportModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { AICoachChatModal } from './components/AICoachChatModal';
import { BudgetPlanner } from './components/BudgetPlanner';
import { RetroactiveSpendingModal } from './components/RetroactiveSpendingModal';
import { MissedDaysNudgeModal } from './components/MissedDaysNudgeModal';
import { PreLaunchDiagnosticsModal } from './components/PreLaunchDiagnosticsModal';

// Initialize Gemini SDK with server-provided API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type View = 'splash' | 'landing' | 'setup' | 'dashboard' | 'returning-savings-prompt';
type DashboardTab = 'home' | 'tracker' | 'calendar' | 'budget' | 'vault';

export default function App() {
  const [view, setView] = useState<View>('splash');
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [currency, setCurrency] = useState<'₹' | '$'>('₹');

  // Core Persistent State
  const [income, setIncome] = useState<number>(() => {
    const saved = localStorage.getItem('user_income');
    return saved ? sanitizeNumber(saved, 100, 10000000, 10000) : 10000;
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('user_onboarded') === 'true';
  });

  const [notificationPref, setNotificationPref] = useState<NotificationPreference>(() => {
    const saved = localStorage.getItem('user_notifications');
    return saved ? JSON.parse(saved) : { enabled: true, window: '8:00 PM - 9:00 PM' };
  });

  const [budget, setBudget] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem('user_budget');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_ALLOCATION.map(item => ({
      ...item,
      amount: Math.round((10000 * item.percentage) / 100)
    }));
  });

  // Pure clean expense state: Start completely empty with 0 dummy data
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('user_expenses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [savings, setSavings] = useState<SavingsRecord[]>(() => {
    const saved = localStorage.getItem('user_savings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Track active month for returning user check
  const [lastTrackedMonth, setLastTrackedMonth] = useState<string>(() => {
    return localStorage.getItem('last_tracked_month') || new Date().toISOString().slice(0, 7);
  });

  // Setup Form inputs (First-time user onboarding)
  const [setupIncomeInput, setSetupIncomeInput] = useState<string>('10000');
  const [setupNotificationWindow, setSetupNotificationWindow] = useState<string>('8:00 PM - 9:00 PM');

  // Returning user savings prompt input
  const [priorMonthSavingsInput, setPriorMonthSavingsInput] = useState<string>('');

  // Modals state
  const [showTourModal, setShowTourModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);
  const [reportMonthStr, setReportMonthStr] = useState<string>(() => new Date().toISOString().slice(0, 7));

  // Retroactive & Missing Days state
  const [showRetroactiveModal, setShowRetroactiveModal] = useState<boolean>(false);
  const [retroactiveTargetDate, setRetroactiveTargetDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [showMissedDaysNudge, setShowMissedDaysNudge] = useState<boolean>(false);
  const [hasNudgedThisSession, setHasNudgedThisSession] = useState<boolean>(false);

  // Audio / Speech State
  const [isCoachSpeaking, setIsCoachSpeaking] = useState<boolean>(false);
  const [coachInsight, setCoachInsight] = useState<string>(
    "Welcome! Start logging your daily spendings to keep your student allowance on track."
  );
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);

  // Local storage persistence with secure serialization
  useEffect(() => {
    localStorage.setItem('user_income', income.toString());
  }, [income]);

  useEffect(() => {
    localStorage.setItem('user_onboarded', hasCompletedOnboarding ? 'true' : 'false');
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    localStorage.setItem('user_notifications', JSON.stringify(notificationPref));
  }, [notificationPref]);

  useEffect(() => {
    localStorage.setItem('user_budget', JSON.stringify(budget));
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('user_expenses', JSON.stringify(expenses));
    // Also save encrypted backup asynchronously
    encryptData(JSON.stringify(expenses)).then(enc => {
      localStorage.setItem('user_expenses_enc', enc);
    }).catch(() => {});
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('user_savings', JSON.stringify(savings));
  }, [savings]);

  useEffect(() => {
    localStorage.setItem('last_tracked_month', lastTrackedMonth);
  }, [lastTrackedMonth]);

  // Handle month transitions for RETURNING users ONLY
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (hasCompletedOnboarding && lastTrackedMonth && lastTrackedMonth !== currentMonth) {
      if (expenses.length > 0) {
        setView('returning-savings-prompt');
      } else {
        setLastTrackedMonth(currentMonth);
      }
    }
  }, [hasCompletedOnboarding, lastTrackedMonth, expenses.length]);

  // Instant Zero-Delay Audio Start
  const handleStartFromSplash = () => {
    playStartupChime();
    speakInstantIndianVoice("Welcome to your AI Financial Wellness Coach.", {
      lang: 'en-IN',
      rate: 0.98,
      pitch: 1.02
    });

    if (hasCompletedOnboarding) {
      setView('dashboard');
    } else {
      setView('landing');
    }
  };

  // Instant Speech Synthesis for Daily Coach Insights
  const handleSpeakCoachInsight = () => {
    if (isCoachSpeaking) {
      stopAllSpeech();
      setIsCoachSpeaking(false);
    } else {
      setIsCoachSpeaking(true);
      speakInstantIndianVoice(coachInsight, {
        lang: 'en-IN',
        rate: 0.98,
        pitch: 1.02,
        onStart: () => setIsCoachSpeaking(true),
        onEnd: () => setIsCoachSpeaking(false),
        onError: () => setIsCoachSpeaking(false)
      });
    }
  };

  // Fetch coach's dynamic daily insight when dashboard opens or expenses update
  useEffect(() => {
    if (view !== 'dashboard') return;

    const generateInsight = async () => {
      setIsLoadingInsight(true);
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
        const totalSpent = monthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        const remaining = Math.max(0, income - totalSpent);

        const prompt = `You are a supportive, concise Indian AI Financial Wellness Coach for students.
        Status: Monthly allowance: ${currency}${income}, Total spent this month: ${currency}${totalSpent}, Remaining: ${currency}${remaining}.
        Total expense entries logged: ${monthExpenses.length}.
        Give a single, friendly, encouraging sentence of advice or observation for today.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        if (response.text) {
          setCoachInsight(sanitizeText(response.text.trim()));
        }
      } catch (err) {
        setCoachInsight("You're doing great! Consistent daily tracking builds lasting financial confidence.");
      } finally {
        setIsLoadingInsight(false);
      }
    };

    const timer = setTimeout(generateInsight, 600);
    return () => clearTimeout(timer);
  }, [view, expenses.length, income, currency]);

  // Continuous Cumulative Calculations
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(currentMonthStr));
  }, [expenses, currentMonthStr]);

  const totalSpentThisMonth = useMemo(() => {
    return currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [currentMonthExpenses]);

  // Continuous Subtraction: Current Balance = Base Income - Cumulative Expenses
  const currentRemainingBalance = Math.max(0, income - totalSpentThisMonth);
  const percentBalanceLeft = income > 0 ? Math.round((currentRemainingBalance / income) * 100) : 0;

  // Today's spending
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayExpenses = useMemo(() => {
    return expenses.filter(e => e.date === todayStr);
  }, [expenses, todayStr]);
  const totalSpentToday = useMemo(() => {
    return todayExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [todayExpenses]);

  // Yesterday's date
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const isYesterdayRecorded = useMemo(() => {
    return (expenses || []).some(e => e?.date === yesterdayStr);
  }, [expenses, yesterdayStr]);

  // Find missed unrecorded days in current month (from 1st of month to yesterday)
  const missedDaysInMonth: MissedDayInfo[] = useMemo(() => {
    const today = new Date();
    const currentDayNum = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();

    const missed: MissedDayInfo[] = [];
    const safeExpenses = expenses || [];
    // Check previous days of this month (Day 1 up to Day - 1)
    for (let day = 1; day < currentDayNum; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasRecord = safeExpenses.some(e => e?.date === dateStr);
      if (!hasRecord) {
        const isYest = dateStr === yesterdayStr;
        const dObj = new Date(dateStr + 'T00:00:00');
        const dayLabel = dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        missed.push({ date: dateStr, dayLabel, isYesterday: isYest });
      }
    }
    return missed;
  }, [expenses, yesterdayStr]);

  // Check for proactive nudge if 2+ consecutive days missed
  useEffect(() => {
    if (view === 'dashboard' && !hasNudgedThisSession && missedDaysInMonth.length >= 2) {
      const timer = setTimeout(() => {
        setShowMissedDaysNudge(true);
        setHasNudgedThisSession(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [view, hasNudgedThisSession, missedDaysInMonth.length]);

  // Add Single Expense Handler
  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    const sanitizedAmount = sanitizeNumber(newExp.amount, 0, 1000000, 0);
    const sanitizedNote = sanitizeText(newExp.note || '');
    const expenseWithId: Expense = {
      ...newExp,
      amount: sanitizedAmount,
      note: sanitizedNote,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setExpenses(prev => [expenseWithId, ...prev]);
  };

  // Add Batch Expenses Handler
  const handleAddBatchExpenses = (newItems: Omit<Expense, 'id'>[]) => {
    const itemsWithIds: Expense[] = newItems.map((item, i) => ({
      ...item,
      amount: sanitizeNumber(item.amount, 0, 1000000, 0),
      note: sanitizeText(item.note || ''),
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    setExpenses(prev => [...itemsWithIds, ...prev]);
  };

  // Delete Expense Handler
  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Handle Onboarding Completion (Setup view)
  const handleCompleteSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const validIncome = sanitizeNumber(setupIncomeInput, 100, 10000000, 10000);

    setIncome(validIncome);
    setNotificationPref({
      enabled: true,
      window: setupNotificationWindow
    });

    const newBudget = DEFAULT_ALLOCATION.map(item => ({
      ...item,
      amount: Math.round((validIncome * item.percentage) / 100)
    }));
    setBudget(newBudget);

    setHasCompletedOnboarding(true);
    setLastTrackedMonth(currentMonthStr);
    setView('dashboard');
  };

  // Handle Returning User Savings Prompt
  const handleSaveReturningMonthSavings = () => {
    const amount = sanitizeNumber(priorMonthSavingsInput, 0, 1000000, 0);
    if (amount > 0) {
      const newRecord: SavingsRecord = {
        id: `${Date.now()}`,
        amount,
        date: new Date().toISOString().split('T')[0],
        month: lastTrackedMonth,
        note: `Saved from ${lastTrackedMonth}`
      };
      setSavings(prev => [...prev, newRecord]);
    }
    setLastTrackedMonth(currentMonthStr);
    setView('dashboard');
  };

  // Handle Saving to Vault from Month-End Report
  const handleSaveToVault = (amount: number, month: string) => {
    const validAmt = sanitizeNumber(amount, 0, 10000000, 0);
    const newRecord: SavingsRecord = {
      id: `${Date.now()}`,
      amount: validAmt,
      date: new Date().toISOString().split('T')[0],
      month,
      note: `Month-end savings for ${month}`
    };
    setSavings(prev => [...prev, newRecord]);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Universal Navigation Header */}
      {view === 'dashboard' && (
        <header className="sticky top-0 z-40 bg-[#050507]/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>FinCoach</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                    Student AI
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 hidden sm:block">AI Financial Wellness Companion</p>
              </div>
            </div>

            {/* Desktop Tabs */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/5">
              {[
                { id: 'home', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { id: 'tracker', label: 'Daily Tracker', icon: <Plus className="w-4 h-4" /> },
                { id: 'calendar', label: 'Calendar & Reports', icon: <CalendarIcon className="w-4 h-4" /> },
                { id: 'budget', label: 'Budget Plan', icon: <PieChartIcon className="w-4 h-4" /> },
                { id: 'vault', label: 'Savings Vault', icon: <PiggyBank className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Right Action Tools */}
            <div className="flex items-center gap-2">
              {/* Pre-Launch Diagnostics Button */}
              <button
                onClick={() => setShowDiagnosticsModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Enterprise Pre-Launch Protocol Diagnostics"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">Audit Suite</span>
              </button>

              {/* App Tour / How It Works Button */}
              <button
                onClick={() => setShowTourModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="App Walkthrough & How It Works"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">App Tour</span>
              </button>

              {/* Notification Preferences */}
              <button
                onClick={() => setShowNotificationModal(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors relative"
                title="Daily Spending Check-in Notification Settings"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />
              </button>

              {/* AI Coach Assistant Modal Trigger */}
              <button
                onClick={() => setShowChatModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask Coach</span>
              </button>

              {/* Currency Toggle */}
              <button
                onClick={() => setCurrency(prev => prev === '₹' ? '$' : '₹')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/5 min-w-[32px] text-center"
                title="Toggle Currency (₹ / $)"
              >
                {currency}
              </button>
            </div>
          </div>

          {/* Mobile Tab Strip */}
          <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-white/5 bg-black/40 overflow-x-auto no-scrollbar">
            {[
              { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'tracker', label: 'Track', icon: <Plus className="w-4 h-4" /> },
              { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
              { id: 'budget', label: 'Budget', icon: <PieChartIcon className="w-4 h-4" /> },
              { id: 'vault', label: 'Vault', icon: <PiggyBank className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </header>
      )}

      {/* Main View Manager */}
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* VIEW 1: SPLASH SCREEN */}
          {view === 'splash' && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0a0a14] via-[#050507] to-black"
            >
              <div className="max-w-md w-full space-y-8">
                {/* Logo & Icon */}
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-3xl bg-indigo-600 blur-xl opacity-50 animate-pulse" />
                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 border border-white/20 flex items-center justify-center shadow-2xl">
                    <Bot className="w-12 h-12 text-white" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    AI Financial Wellness Coach
                  </h1>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Designed specifically for students to manage pocket money, track daily spendings, and develop lifelong financial discipline.
                  </p>
                </div>

                {/* Instant Audio Chime & Indian Accent Speech Indicator */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Instant en-IN Indian voice coaching & zero-latency startup</span>
                </div>

                <button
                  onClick={handleStartFromSplash}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold text-base shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Enter Application</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* VIEW 2: LANDING PAGE */}
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center space-y-12"
            >
              {/* Hero Banner */}
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Smart Budgeting for College Students</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  Take Full Control of Your Pocket Money
                </h2>
                <p className="text-base text-slate-400 leading-relaxed">
                  Continuous cumulative daily tracking, real-time balance calculations, and supportive AI coaching without stressful spreadsheets.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setView('setup')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>Start First-Time Onboarding</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowTourModal(true)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Explore Interactive Tour</span>
                </button>
              </div>

              {/* 3 Core Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="glass-card p-6 border border-white/5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Cumulative Math Logic</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Live running balance calculated from Day 1 to Day 30 continuously: Current Balance = Base Income - Cumulative Spendings.
                  </p>
                </div>

                <div className="glass-card p-6 border border-white/5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Daily Notification Window</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Set a non-intrusive reminder window between 7 PM - 11 PM to log expenses in just 30 seconds before sleep.
                  </p>
                </div>

                <div className="glass-card p-6 border border-white/5 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Calendar & Month-End Reports</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Historical month calendar with daily expense breakdowns and personalized supportive AI coaching reviews.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 3: FIRST-TIME USER SETUP (ONBOARDING) */}
          {view === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 max-w-xl mx-auto px-4 py-12 flex flex-col justify-center"
            >
              <div className="glass-card p-8 border border-white/10 space-y-8 bg-[#0d0d12]">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/20">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">First-Time Setup</h2>
                  <p className="text-xs text-slate-400">
                    Set your base monthly pocket money and notification preference.
                    <span className="block text-emerald-400 font-semibold mt-1">
                      No prior savings data required on first visit!
                    </span>
                  </p>
                </div>

                <form onSubmit={handleCompleteSetup} className="space-y-6">
                  {/* Base Income Field */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                      <span>Monthly Pocket Money / Allowance</span>
                      <span className="text-indigo-400 lowercase text-[11px] font-medium">starting 1st of month</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base font-bold text-slate-400">
                        {currency}
                      </span>
                      <input
                        type="number"
                        min="100"
                        step="any"
                        required
                        value={setupIncomeInput}
                        onChange={(e) => setSetupIncomeInput(e.target.value)}
                        placeholder="10000"
                        className="w-full pl-9 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-lg font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Daily Notification Window Field */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>Daily Spending Check-in Reminder Window</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {NOTIFICATION_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setSetupNotificationWindow(preset.value)}
                          className={`p-3 rounded-xl border text-left text-xs transition-all ${
                            setupNotificationWindow === preset.value
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <p className="font-bold">{preset.label}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Complete Setup & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* VIEW 4: RETURNING USER SAVINGS PROMPT */}
          {view === 'returning-savings-prompt' && (
            <motion.div
              key="returning-savings-prompt"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 max-w-lg mx-auto px-4 py-12 flex flex-col justify-center"
            >
              <div className="glass-card p-8 border border-white/10 space-y-6 bg-[#0d0d12]">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <PiggyBank className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Welcome to a New Month!</h2>
                  <p className="text-xs text-slate-400">
                    How much did you manage to save from your previous month ({lastTrackedMonth})?
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base font-bold text-slate-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={priorMonthSavingsInput}
                      onChange={(e) => setPriorMonthSavingsInput(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full pl-9 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-lg font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setLastTrackedMonth(currentMonthStr);
                        setView('dashboard');
                      }}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold"
                    >
                      Skip For Now
                    </button>
                    <button
                      onClick={handleSaveReturningMonthSavings}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
                    >
                      Save to Vault
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 5: CORE DASHBOARD */}
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6"
            >
              {/* Unrecorded Spendings Dashboard Notification Banner */}
              {!isYesterdayRecorded && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white">
                        Yesterday's Spendings Unrecorded
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Defaulted to {currency}0 spent to maintain continuous balance calculation.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setRetroactiveTargetDate(yesterdayStr);
                      setShowRetroactiveModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Retroactively Log Yesterday</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TAB 1: HOME OVERVIEW */}
              {activeTab === 'home' && (
                <div className="space-y-8">
                  {/* Cumulative Running Balance Hero Card */}
                  <div className="glass-card p-6 md:p-8 border border-white/10 bg-gradient-to-br from-indigo-950/40 via-black to-purple-950/30 relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live Cumulative Balance
                          </span>
                          <span className="text-xs text-slate-400">
                            Month: {new Date().toLocaleString('default', { month: 'long' })}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                            {currency}{currentRemainingBalance.toLocaleString()}
                          </h2>
                          <span className="text-sm font-semibold text-slate-400">
                            / {currency}{income.toLocaleString()} base
                          </span>
                        </div>

                        <p className="text-xs text-slate-300">
                          Total spent so far: <strong className="text-rose-400">{currency}{totalSpentThisMonth.toLocaleString()}</strong> across {currentMonthExpenses.length} entries.
                        </p>
                      </div>

                      {/* Gauge / Progress */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-400">{percentBalanceLeft}%</p>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Funds Remaining</p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <Wallet className="w-8 h-8" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(percentBalanceLeft, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 3 Metric Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Today's Spend */}
                    <div className="glass-card p-5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Spend</span>
                        <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-white">{currency}{totalSpentToday.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400">{todayExpenses.length} items logged today</p>
                    </div>

                    {/* Quick Daily Check-in Window */}
                    <div className="glass-card p-5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Check-in Slot</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                          <Bell className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white truncate">{notificationPref.window}</p>
                      <button
                        onClick={() => setShowNotificationModal(true)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Adjust reminder slot →
                      </button>
                    </div>

                    {/* Monthly Savings Vault */}
                    <div className="glass-card p-5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Saved Vault</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                          <PiggyBank className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">
                        {currency}{savings.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-400">{savings.length} milestone records</p>
                    </div>
                  </div>

                  {/* Coach's Live Insight Bar with Zero-Delay Indian Speech */}
                  <div className="glass-card p-6 border border-indigo-500/30 bg-indigo-950/20 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-indigo-500/20">
                          <Bot className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">AI Coach Daily Advice</h4>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                              Gemini 3 • en-IN
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-indigo-100/90 italic mt-1 leading-relaxed">
                            {isLoadingInsight ? "Personalizing your financial advice..." : `"${coachInsight}"`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={handleSpeakCoachInsight}
                          className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                            isCoachSpeaking 
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                              : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border-indigo-500/30'
                          }`}
                          title="Instant Speech Synthesis"
                        >
                          {isCoachSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          <span className="hidden sm:inline">{isCoachSpeaking ? 'Mute' : 'Listen'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Navigation Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { tab: 'tracker', title: 'Daily Spending Log', desc: 'Add food, study, transit', icon: <Plus className="w-5 h-5 text-pink-400" /> },
                      { tab: 'calendar', title: 'Calendar & Reports', desc: 'Inspect trends & dates', icon: <CalendarIcon className="w-5 h-5 text-indigo-400" /> },
                      { tab: 'budget', title: 'Budget Allocation', desc: '50/30/20 category rules', icon: <PieChartIcon className="w-5 h-5 text-emerald-400" /> },
                      { tab: 'chat', title: 'Ask Wellness Coach', desc: 'Voice & text guidance', icon: <MessageSquare className="w-5 h-5 text-amber-400" /> },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item.tab === 'chat') {
                            setShowChatModal(true);
                          } else {
                            setActiveTab(item.tab as DashboardTab);
                          }
                        }}
                        className="glass-card p-5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 text-left transition-all space-y-2 group"
                      >
                        <div className="p-2.5 rounded-xl bg-white/5 group-hover:scale-105 transition-transform w-fit">
                          {item.icon}
                        </div>
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Recent Spending Activity */}
                  <div className="glass-card p-6 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                        Recent Spending Logs
                      </h4>
                      <button
                        onClick={() => setActiveTab('tracker')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Open Full Tracker →
                      </button>
                    </div>

                    {expenses.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 space-y-2">
                        <p className="text-sm text-slate-400">No expenses recorded yet.</p>
                        <p className="text-xs text-slate-500">Log your first spending item in the Daily Tracker!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {expenses.slice(0, 5).map((exp) => (
                          <div 
                            key={exp.id}
                            className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-black/40 text-indigo-400">
                                <Plus className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm font-bold text-white">{exp.category}</p>
                                <p className="text-[10px] text-slate-400">{exp.date} {exp.note ? `• ${exp.note}` : ''}</p>
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-rose-400">
                              -{currency}{exp.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DAILY SPENDING TRACKER */}
              {activeTab === 'tracker' && (
                <DailyExpenseLogger
                  expenses={expenses}
                  onAddExpense={handleAddExpense}
                  onAddBatchExpenses={handleAddBatchExpenses}
                  onDeleteExpense={handleDeleteExpense}
                  currency={currency}
                  onOpenCoach={() => setShowChatModal(true)}
                />
              )}

              {/* TAB 3: CALENDAR & MONTHLY ANALYTICS */}
              {activeTab === 'calendar' && (
                <CalendarAnalytics
                  expenses={expenses}
                  savings={savings}
                  income={income}
                  currency={currency}
                  onOpenReportModal={(mStr) => {
                    setReportMonthStr(mStr);
                    setShowReportModal(true);
                  }}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}

              {/* TAB 4: BUDGET ALLOCATION PLANNER */}
              {activeTab === 'budget' && (
                <BudgetPlanner
                  income={income}
                  budget={budget}
                  expenses={expenses}
                  onUpdateBudget={(newPlan) => setBudget(newPlan)}
                  currency={currency}
                />
              )}

              {/* TAB 5: SAVINGS VAULT */}
              {activeTab === 'vault' && (
                <div className="glass-card p-6 md:p-8 border border-white/5 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <PiggyBank className="w-6 h-6 text-emerald-400" />
                        <span>Student Monthly Savings Vault</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Durable milestone savings accumulated across every academic month
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right">
                      <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">Total Vault Saved</span>
                      <p className="text-2xl font-bold text-white">
                        {currency}{savings.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {savings.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-white/5 border border-dashed border-white/10 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                        <PiggyBank className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-white">No Savings Milestones Yet</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        At the end of each month, your remaining unspent pocket money can be transferred directly to your permanent savings vault!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {savings.map((rec) => (
                        <div key={rec.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-400">{rec.month}</span>
                            <span className="text-[10px] text-slate-400">{rec.date}</span>
                          </div>
                          <p className="text-xl font-bold text-white">{currency}{rec.amount.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">{rec.note || 'Monthly savings'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL 1: APP TOUR / WALKTHROUGH */}
      <AppTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        currency={currency}
        onStartApp={() => {
          setShowTourModal(false);
          if (!hasCompletedOnboarding) {
            setView('setup');
          }
        }}
      />

      {/* MODAL 2: NOTIFICATION PREFERENCES (WITH BACK BUTTON) */}
      <NotificationSettingsModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        preference={notificationPref}
        onSavePreference={(newPref) => setNotificationPref(newPref)}
      />

      {/* MODAL 3: MULTILINGUAL AI COACH CHAT WITH INDIAN ACCENT TTS */}
      <AICoachChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        income={income}
        expenses={expenses}
        currency={currency}
        aiInstance={ai}
      />

      {/* MODAL 4: END OF MONTH AI REPORT */}
      <EndOfMonthReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        monthStr={reportMonthStr}
        income={income}
        expenses={expenses}
        savings={savings}
        currency={currency}
        aiInstance={ai}
        onSaveToSavingsVault={handleSaveToVault}
        onSaveToVault={handleSaveToVault}
      />

      {/* MODAL 5: RETROACTIVE SPENDING LOG */}
      <RetroactiveSpendingModal
        isOpen={showRetroactiveModal}
        onClose={() => setShowRetroactiveModal(false)}
        targetDate={retroactiveTargetDate}
        onAddBatchExpenses={handleAddBatchExpenses}
        currency={currency}
      />

      {/* MODAL 6: PROACTIVE AI NUDGE FOR CONSECUTIVE MISSED DAYS */}
      <MissedDaysNudgeModal
        isOpen={showMissedDaysNudge}
        onClose={() => setShowMissedDaysNudge(false)}
        missedDays={missedDaysInMonth}
        onAutoFillZero={() => {
          setShowMissedDaysNudge(false);
        }}
        onOpenRetroactiveModal={(date) => {
          setRetroactiveTargetDate(date);
          setShowRetroactiveModal(true);
        }}
        currency={currency}
      />

      {/* MODAL 7: ENTERPRISE PRE-LAUNCH DIAGNOSTICS */}
      <PreLaunchDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
      />
    </div>
  );
}
