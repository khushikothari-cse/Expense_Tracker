/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2,
  Mic,
  MicOff,
  MessageSquare,
  IndianRupee,
  RefreshCw,
  LayoutDashboard,
  History,
  PiggyBank,
  Target,
  TrendingUp,
  Home as HomeIcon,
  Sparkles,
  ArrowRight,
  Wallet,
  User,
  Bot,
  Send,
  Plus,
  AlertCircle,
  BookOpen,
  Bus,
  Gamepad2,
  ShoppingBag,
  Utensils,
  BarChart3,
  PieChart as PieChartIcon,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { GoogleGenAI, Modality } from "@google/genai";
import { cn } from './lib/utils';
import { 
  DEFAULT_ALLOCATION, 
  BudgetCategory, 
  Expense, 
  SavingsRecord
} from './types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const iconMap: Record<string, React.ReactNode> = {
  Utensils: <Utensils className="w-4 h-4" />,
  Home: <HomeIcon className="w-4 h-4" />,
  Bus: <Bus className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  Gamepad2: <Gamepad2 className="w-4 h-4" />,
  ShoppingBag: <ShoppingBag className="w-4 h-4" />,
  PiggyBank: <PiggyBank className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />,
};

type View = 'splash' | 'landing' | 'setup' | 'dashboard' | 'savings-prompt';
type DashboardTab = 'home' | 'budget' | 'expenses' | 'savings';

export default function App() {
  const [view, setView] = useState<View>('splash');
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Persistent States
  const [income, setIncome] = useState<string>(() => localStorage.getItem('income') || '10000');
  const [incomeDate, setIncomeDate] = useState<number>(() => parseInt(localStorage.getItem('incomeDate') || '1'));
  const [budget, setBudget] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem('budget');
    return saved ? JSON.parse(saved) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [savings, setSavings] = useState<SavingsRecord[]>(() => {
    const saved = localStorage.getItem('savings');
    return saved ? JSON.parse(saved) : [];
  });
  const [lastIncomeMonth, setLastIncomeMonth] = useState<string | null>(() => localStorage.getItem('lastIncomeMonth'));
  const [lastSavingsMonth, setLastSavingsMonth] = useState<string | null>(() => localStorage.getItem('lastSavingsMonth'));
  
  // Form States
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Food');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  const [savAmount, setSavAmount] = useState('');
  const [savNote, setSavNote] = useState('');
  const [lastMonthSavings, setLastMonthSavings] = useState('');

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: "Hi! I'm your AI Financial Wellness Coach. How can I help you manage your student budget today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasWelcomedRef = useRef(false);
  const isWelcomingRef = useRef(false);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('income', income); }, [income]);
  useEffect(() => { localStorage.setItem('incomeDate', incomeDate.toString()); }, [incomeDate]);
  useEffect(() => { localStorage.setItem('budget', JSON.stringify(budget)); }, [budget]);
  useEffect(() => { localStorage.setItem('expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('savings', JSON.stringify(savings)); }, [savings]);
  useEffect(() => { if (lastIncomeMonth) localStorage.setItem('lastIncomeMonth', lastIncomeMonth); }, [lastIncomeMonth]);
  useEffect(() => { if (lastSavingsMonth) localStorage.setItem('lastSavingsMonth', lastSavingsMonth); }, [lastSavingsMonth]);

  // Month Change Logic
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    if (view === 'dashboard') {
      // Check for income prompt
      if (lastIncomeMonth !== currentMonth) {
        setView('setup');
      }
      
      // Check for savings prompt (at the end of the month or start of next)
      // We'll prompt if the current month is different from lastSavingsMonth
      // and we are at least 1 day into the new month.
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().slice(0, 7);
      
      if (lastSavingsMonth !== lastMonthStr && lastSavingsMonth !== currentMonth) {
        setView('savings-prompt');
      }
    }
  }, [view, lastIncomeMonth, lastSavingsMonth]);

  const handleSaveLastMonthSavings = () => {
    const amount = parseFloat(lastMonthSavings);
    if (isNaN(amount) || amount < 0) return;
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);
    
    const newRecord: SavingsRecord = {
      id: Date.now().toString(),
      amount,
      date: lastMonth.toISOString().split('T')[0],
      note: `Monthly Savings (${lastMonth.toLocaleString('default', { month: 'long' })})`
    };
    
    setSavings(prev => [...prev, newRecord]);
    setLastSavingsMonth(lastMonthStr);
    setView('dashboard');
  };

  const [aiSummary, setAiSummary] = useState<string>("");

  useEffect(() => {
    if (view === 'dashboard' && !aiSummary) {
       const generateSummary = async () => {
         try {
           const prompt = `Provide a one-sentence encouraging financial summary for a student with ₹${income} income and ${expenses.length} expenses logged.`;
           const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
           setAiSummary(response.text || "You're doing great! Keep tracking your expenses.");
         } catch (e) {
           setAiSummary("Ready to help you master your finances today!");
         }
       };
       generateSummary();
    }
  }, [view, income, expenses.length]);
  
  const handleGenerateBudget = () => {
    const amount = parseFloat(income);
    if (isNaN(amount) || amount <= 0) return;
    generateInitialBudget(amount);
    setLastIncomeMonth(new Date().toISOString().slice(0, 7));
    setView('dashboard');
  };

  const speakText = async (text: string) => {
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.error("Error closing audio context:", e);
      }
    }
    
    setIsSpeaking(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = audioContext;
        
        // Ensure context is resumed (might be suspended by browser)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768;
        }

        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => {
          setIsSpeaking(false);
          if (audioContextRef.current === audioContext) {
            audioContext.close();
            audioContextRef.current = null;
          }
        };
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      handleSendMessage(transcript);
    };

    recognition.start();
  };

  const handleSendMessage = async (text?: string) => {
    const message = text || chatInput;
    if (!message.trim()) return;

    const newUserMessage = { role: 'user' as const, text: message };
    setChatMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const prompt = `You are a friendly AI Financial Wellness Coach for students. 
      The user says: "${message}"
      Respond in a helpful, encouraging way. 
      Support English, Hindi, and Hinglish. 
      Keep it concise and student-focused.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const botResponse = response.text || "I'm sorry, I couldn't process that.";
      setChatMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
      
      speakText(botResponse);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (view === 'dashboard' && expenses.length === 0) {
      const mockExpenses: Expense[] = [
        { id: '1', amount: 200, category: 'Food', date: '2026-03-20' },
        { id: '2', amount: 50, category: 'Transport', date: '2026-03-19' },
        { id: '3', amount: 500, category: 'Entertainment', date: '2026-03-18' },
        { id: '4', amount: 150, category: 'Food', date: '2026-03-17' },
        { id: '5', amount: 100, category: 'Shopping', date: '2026-03-16' },
      ];
      setExpenses(mockExpenses);
    }
  }, [view]);

  const generateInitialBudget = (amount: number) => {
    const initialBudget = DEFAULT_ALLOCATION.map(cat => ({
      ...cat,
      amount: Math.round((amount * cat.percentage) / 100)
    }));
    setBudget(initialBudget);
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount,
      category: expCategory,
      date: expDate,
    };

    setExpenses(prev => [newExpense, ...prev]);
    setExpAmount('');
  };

  const handleAddSavings = () => {
    const amount = parseFloat(savAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newRecord: SavingsRecord = {
      id: Date.now().toString(),
      amount,
      date: new Date().toISOString().split('T')[0],
      note: savNote
    };
    setSavings(prev => [...prev, newRecord]);
    setSavAmount('');
    setSavNote('');
  };

  const getWeeklyData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayTotal = expenses
        .filter(e => e.date === date)
        .reduce((sum, e) => sum + e.amount, 0);
      return { date: date.split('-').slice(1).join('/'), amount: dayTotal };
    });
  };

  const getCategoryAnalysis = () => {
    const categories = Array.from(new Set(expenses.map(e => e.category)));
    return categories.map(cat => {
      const total = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      const budgetLimit = budget.find(b => b.name === cat)?.amount || 0;
      return { name: cat, spent: total, budget: budgetLimit };
    });
  };

  const triggerWelcome = async () => {
    if (hasWelcomedRef.current || isWelcomingRef.current) return;
    isWelcomingRef.current = true;
    
    const welcomeSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    welcomeSound.volume = 0.4;
    
    try {
      await welcomeSound.play();
      hasWelcomedRef.current = true;
      isWelcomingRef.current = false;
      setTimeout(() => {
        speakText("Welcome to your AI Financial Wellness Coach.");
      }, 1200);
    } catch (e) {
      console.log("Audio play blocked by browser:", e);
      isWelcomingRef.current = false;
      // Fallback: try to speak directly, though it might also be blocked
      speakText("Welcome to your AI Financial Wellness Coach.");
    }
  };

  useEffect(() => {
    if (view === 'splash') {
      triggerWelcome();

      const timer = setTimeout(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        if (lastIncomeMonth === currentMonth) {
          setView('dashboard');
        } else {
          setView('landing');
        }
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [view, lastIncomeMonth]);

  const handleUpdateBudget = (index: number, newAmount: number) => {
    const updatedBudget = [...budget];
    updatedBudget[index].amount = newAmount;
    
    const total = updatedBudget.reduce((acc, curr) => acc + curr.amount, 0);
    updatedBudget.forEach(cat => {
      cat.percentage = total > 0 ? parseFloat(((cat.amount / total) * 100).toFixed(1)) : 0;
    });
    
    setBudget(updatedBudget);
  };


  return (
    <div className="min-h-screen font-sans selection:bg-indigo-100 selection:text-indigo-900 bg-[#050505]">
      <AnimatePresence mode="wait">
        {view === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            onClick={triggerWelcome}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative"
            >
              <div className="w-32 h-32 bg-indigo-600 rounded-[32px] flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.3)] mb-8">
                <Wallet className="w-16 h-16 text-white" />
              </div>
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-indigo-500 rounded-[32px] blur-2xl -z-10"
              />
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-display font-bold text-white tracking-tight"
            >
              FinCoach AI
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ delay: 1, duration: 1.5 }}
              className="h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 mt-4 rounded-full"
            />
          </motion.div>
        )}

        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Animated Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                  x: [0, 100, 0],
                  y: [0, 50, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px]" 
              />
              <motion.div 
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, -90, 0],
                  x: [0, -100, 0],
                  y: [0, -50, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/20 rounded-full blur-[120px]" 
              />
            </div>

            <main className="max-w-6xl mx-auto px-6 text-center relative z-10">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-400 font-medium text-sm mb-8 backdrop-blur-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Next-Gen Financial Intelligence</span>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-6xl md:text-8xl font-display font-bold tracking-tight text-white mb-6"
              >
                AI Financial <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500">
                  Wellness Coach
                </span>
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
              >
                Take control of your money and build smart financial habits. 
                Track spending, set goals, and get AI-driven insights tailored for students.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-6"
              >
                <button
                  onClick={() => setView('setup')}
                  className="group relative px-10 py-5 bg-white text-black rounded-2xl font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button
                  className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
                >
                  Explore Features
                </button>
              </motion.div>

              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="mt-24 relative"
              >
                <div className="glass rounded-[40px] p-4 max-w-5xl mx-auto overflow-hidden shadow-2xl relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                  <img 
                    src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=2000" 
                    alt="Financial Dashboard" 
                    className="rounded-[32px] w-full h-auto object-cover opacity-60"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-12 left-12 right-12 z-20 flex justify-between items-end">
                    <div className="text-left">
                      <p className="text-indigo-400 font-bold text-sm uppercase tracking-widest mb-2">Real-time Analysis</p>
                      <h3 className="text-3xl font-bold text-white">Smart Spending Insights</h3>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <PieChartIcon className="w-6 h-6 text-indigo-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </main>
          </motion.div>
        )}

        {view === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen flex items-center justify-center p-6"
          >
            <div className="w-full max-w-2xl">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-display font-bold text-white mb-2">Personalize Your Journey</h2>
                <p className="text-slate-400">Let's set up your financial foundation in 30 seconds.</p>
              </div>

              <div className="glass-card p-8 rounded-[32px] border border-white/10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Monthly Income (₹)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-medium">₹</span>
                      </div>
                      <input
                        type="number"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        placeholder="10000"
                        className="block w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white text-xl font-medium transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Income Date (Day)</label>
                    <select
                      value={incomeDate}
                      onChange={(e) => setIncomeDate(parseInt(e.target.value))}
                      className="block w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white text-xl font-medium transition-all appearance-none"
                    >
                      {[...Array(31)].map((_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-slate-900">Day {i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleGenerateBudget}
                    disabled={!income || parseFloat(income) <= 0}
                    className="w-full py-5 bg-white text-black rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                  >
                    Create My Budget Plan
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'savings-prompt' && (
          <motion.div
            key="savings-prompt"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex items-center justify-center p-6 bg-[#050505]"
          >
            <div className="max-w-md w-full glass-card p-8 border border-indigo-500/20">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
                <PiggyBank className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-center mb-4 text-white">Monthly Savings Check-in</h2>
              <p className="text-slate-400 text-center mb-8 leading-relaxed">
                Great job finishing another month! How much did you manage to save in total for the last month?
              </p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Savings Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">₹</span>
                    </div>
                    <input
                      type="number"
                      value={lastMonthSavings}
                      onChange={(e) => setLastMonthSavings(e.target.value)}
                      placeholder="0"
                      className="block w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white text-xl font-medium transition-all"
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleSaveLastMonthSavings}
                  className="w-full py-5 bg-white text-black rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                >
                  Save & Continue
                </button>
                
                <button
                  onClick={() => {
                    const lastMonth = new Date();
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    setLastSavingsMonth(lastMonth.toISOString().slice(0, 7));
                    setView('dashboard');
                  }}
                  className="w-full py-3 text-slate-400 font-medium hover:text-white transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-[#050505] text-white"
          >
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
              <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight text-white">FinCoach</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 text-indigo-400 rounded-full text-sm font-medium border border-white/5">
                     <IndianRupee className="w-3.5 h-3.5" />
                     <span>Income: ₹{income}</span>
                   </div>
                   <button 
                    onClick={() => setView('setup')}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                   >
                     <RefreshCw className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-2xl mb-8 w-fit overflow-x-auto no-scrollbar backdrop-blur-md">
                {[
                  { id: 'home', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
                  { id: 'budget', label: 'Budget Plan', icon: <LayoutDashboard className="w-4 h-4" /> },
                  { id: 'expenses', label: 'Expense Tracker', icon: <History className="w-4 h-4" /> },
                  { id: 'savings', label: 'Savings', icon: <PiggyBank className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as DashboardTab);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
                      activeTab === tab.id 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="max-w-5xl mx-auto">
                {/* Main Content */}
                <div className="w-full space-y-8">
                  
                  {activeTab === 'home' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Money Left Tracker */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-8 border border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent">
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                              <Wallet className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Money Left Tracker</span>
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-4xl font-bold text-white">₹{(parseFloat(income) || 0) - expenses.reduce((acc, curr) => acc + curr.amount, 0)}</h3>
                            <p className="text-slate-400 text-sm">Remaining from ₹{income} monthly income</p>
                          </div>
                          <div className="mt-6 space-y-2">
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(0, Math.min(100, ((parseFloat(income) || 0) > 0 ? (((parseFloat(income) || 0) - expenses.reduce((acc, curr) => acc + curr.amount, 0)) / (parseFloat(income) || 1)) * 100 : 0)))}%` }}
                                className="h-full bg-indigo-500 rounded-full"
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                              <span>Spent: ₹{expenses.reduce((acc, curr) => acc + curr.amount, 0)}</span>
                              <span>Budget: ₹{income}</span>
                            </div>
                          </div>
                        </div>

                        <div className="glass-card p-8 border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Weekly Spending</span>
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-4xl font-bold text-white">₹{expenses.filter(e => {
                              const d = new Date(e.date);
                              const now = new Date();
                              return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
                            }).reduce((acc, curr) => acc + curr.amount, 0)}</h3>
                            <p className="text-slate-400 text-sm">Total spent in the last 7 days</p>
                          </div>
                          <div className="mt-6 flex items-center gap-2 text-emerald-400 text-sm font-bold">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Keep it up! You're doing great.</span>
                          </div>
                        </div>
                      </div>

                      {/* Coach's Summary */}
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4">
                          <Sparkles className="w-8 h-8 text-indigo-400/20" />
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                            <Bot className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-1">Coach's Daily Insight</h4>
                            <p className="text-indigo-100/80 text-sm leading-relaxed italic">
                              {aiSummary || "Analyzing your financial health..."}
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { id: 'budget', label: 'Budget', icon: <LayoutDashboard className="w-5 h-5" />, color: 'bg-blue-500' },
                          { id: 'expenses', label: 'Track', icon: <Plus className="w-5 h-5" />, color: 'bg-pink-500' },
                          { id: 'savings', label: 'Savings', icon: <PiggyBank className="w-5 h-5" />, color: 'bg-emerald-500' },
                          { id: 'chat', label: 'Advice', icon: <MessageSquare className="w-5 h-5" />, color: 'bg-amber-500' },
                        ].map((action) => (
                          <button
                            key={action.id}
                            onClick={() => action.id === 'chat' ? setShowChatModal(true) : setActiveTab(action.id as DashboardTab)}
                            className="glass-card p-4 border border-white/5 hover:bg-white/5 transition-all flex flex-col items-center gap-3 group"
                          >
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform", action.color)}>
                              {action.icon}
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{action.label}</span>
                          </button>
                        ))}
                      </div>


                    </motion.div>
                  )}

                  {activeTab === 'budget' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Summary Card */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                          <PieChartIcon className="w-5 h-5 text-indigo-400" />
                          Recommended Spending Plan
                        </h3>
                        <p className="text-slate-400 mb-8">
                          Based on your monthly income of <span className="font-bold text-white">₹{income}</span>, 
                          here is your recommended spending plan.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={budget}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={5}
                                  dataKey="amount"
                                >
                                  {budget.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#0A0A0A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                  itemStyle={{ color: '#fff' }}
                                  formatter={(value: number) => [`₹${value}`, 'Amount']}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="space-y-3">
                            {budget.map((cat, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                  <span className="text-sm font-medium text-slate-300">{cat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-white">₹{cat.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Modification Section */}
                      <div className="glass-card p-8 border border-white/5">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h3 className="text-xl font-bold text-white">Modify Your Plan</h3>
                            <p className="text-slate-400 text-sm">Adjust amounts to fit your specific needs</p>
                          </div>
                          <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                            Editable
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {budget.map((cat, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:border-indigo-500/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-white/5 rounded-lg text-indigo-400 border border-white/5">
                                    {iconMap[cat.icon]}
                                  </div>
                                  <span className="font-semibold text-slate-200">{cat.name}</span>
                                </div>
                                <span className="text-xs font-medium text-slate-500">{cat.percentage}%</span>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-slate-500 text-sm">₹</span>
                                </div>
                                <input
                                  type="number"
                                  value={cat.amount}
                                  onChange={(e) => handleUpdateBudget(idx, parseInt(e.target.value) || 0)}
                                  className="block w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-bold text-white transition-all"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-8 flex items-center justify-between p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs text-indigo-100">Total Planned</p>
                              <p className="text-lg font-bold">₹{budget.reduce((acc, curr) => acc + curr.amount, 0)}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                          >
                            Save Budget Plan
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'expenses' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Add Expense Form */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                          <Plus className="w-5 h-5 text-indigo-400" />
                          Log New Expense
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Amount</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-500 text-sm">₹</span>
                              </div>
                              <input
                                type="number"
                                value={expAmount}
                                onChange={(e) => setExpAmount(e.target.value)}
                                placeholder="0.00"
                                className="block w-full pl-7 pr-3 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-white transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Category</label>
                            <select
                              value={expCategory}
                              onChange={(e) => setExpCategory(e.target.value)}
                              className="block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-white appearance-none transition-all"
                            >
                              {DEFAULT_ALLOCATION.map(cat => (
                                <option key={cat.name} value={cat.name} className="bg-[#0A0A0A]">{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date</label>
                            <input
                              type="date"
                              value={expDate}
                              onChange={(e) => setExpDate(e.target.value)}
                              className="block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-white transition-all"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleAddExpense}
                          className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all hover:bg-indigo-700 active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                        >
                          Add Expense
                        </button>
                      </div>

                      {/* Weekly Trend */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                          <BarChart3 className="w-5 h-5 text-indigo-400" />
                          Weekly Spending Trend
                        </h3>
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getWeeklyData()}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                              <Tooltip 
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#0A0A0A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                              />
                              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Category Analysis */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                          <Target className="w-5 h-5 text-indigo-400" />
                          Budget vs Actual
                        </h3>
                        <div className="space-y-6">
                          {getCategoryAnalysis().map((item, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-slate-300">{item.name}</span>
                                <span className="text-xs font-medium text-slate-500">
                                  ₹{item.spent} / ₹{item.budget}
                                </span>
                              </div>
                              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.budget > 0 ? Math.min((item.spent / item.budget) * 100, 100) : (item.spent > 0 ? 100 : 0)}%` }}
                                  className={cn(
                                    "h-full rounded-full",
                                    item.spent > item.budget ? "bg-rose-500" : "bg-indigo-500"
                                  )}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent Transactions */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                          <History className="w-5 h-5 text-indigo-400" />
                          Recent Transactions
                        </h3>
                        <div className="space-y-4">
                          {expenses.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No transactions yet. Start logging!</p>
                          ) : (
                            expenses.slice(0, 5).map((exp) => (
                              <div key={exp.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                                    {iconMap[DEFAULT_ALLOCATION.find(c => c.name === exp.category)?.icon || 'AlertCircle']}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white">{exp.category}</p>
                                    <p className="text-xs text-slate-500">{new Date(exp.date).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <span className="font-bold text-white">₹{exp.amount}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'savings' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Savings Overview */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                          <PiggyBank className="w-5 h-5 text-indigo-400" />
                          Savings Dashboard
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-500/20">
                            <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-2">Total Savings</p>
                            <p className="text-4xl font-bold">₹{savings.reduce((acc, curr) => acc + curr.amount, 0)}</p>
                            <div className="mt-6 flex items-center gap-2 text-indigo-100 text-sm">
                              <TrendingUp className="w-4 h-4" />
                              <span>Growing steadily!</span>
                            </div>
                          </div>
                          <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={savings.length > 0 ? savings : [{ date: 'Initial', amount: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis 
                                  dataKey="date" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#64748b' }}
                                  tickFormatter={(str) => str === 'Initial' ? str : new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#0A0A0A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                  itemStyle={{ color: '#fff' }}
                                  labelFormatter={(label) => label === 'Initial' ? label : new Date(label).toLocaleDateString()}
                                />
                                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Add Savings Form */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                          <Plus className="w-5 h-5 text-indigo-400" />
                          Log New Savings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Amount</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-500 text-sm">₹</span>
                              </div>
                              <input
                                type="number"
                                value={savAmount}
                                onChange={(e) => setSavAmount(e.target.value)}
                                placeholder="0.00"
                                className="block w-full pl-7 pr-3 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-white transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Note (Optional)</label>
                            <input
                              type="text"
                              value={savNote}
                              onChange={(e) => setSavNote(e.target.value)}
                              placeholder="e.g. Monthly pocket money"
                              className="block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-white transition-all"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleAddSavings}
                          className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all hover:bg-indigo-700 active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                        >
                          Add Savings
                        </button>
                      </div>

                      {/* Savings History */}
                      <div className="glass-card p-8 border border-white/5">
                        <h3 className="text-xl font-bold mb-6 text-white">Savings History</h3>
                        <div className="space-y-4">
                          {savings.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No savings records yet. Keep it up!</p>
                          ) : (
                            [...savings].reverse().map((record) => (
                              <div key={record.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                                    <PiggyBank className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-white">{record.note || 'Savings'}</p>
                                    <p className="text-xs text-slate-500">{new Date(record.date).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <span className="font-bold text-emerald-400">+₹{record.amount}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}





                </div>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showChatModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-2xl w-full h-[80vh] flex flex-col border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">AI Financial Wellness Coach</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Online</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChatModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                      msg.role === 'user' ? "bg-white/10" : "bg-indigo-500/10"
                    )}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-slate-400" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10" 
                        : "bg-white/5 text-slate-300 rounded-tl-none border border-white/10"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-3 mr-auto">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/10 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask about saving tips..."
                      className="w-full pl-4 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm text-white transition-all"
                    />
                    <button 
                      onClick={() => handleSendMessage()}
                      disabled={!chatInput.trim() || isChatLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={startListening}
                    disabled={isListening || isChatLoading}
                    className={cn(
                      "p-4 rounded-2xl transition-all shadow-lg flex items-center justify-center border",
                      isListening 
                        ? "bg-rose-500 text-white border-rose-400 animate-pulse" 
                        : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border-white/10"
                    )}
                  >
                    {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                </div>
                {isSpeaking && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                    <Volume2 className="w-3 h-3 animate-bounce" />
                    <span>AI is speaking...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
