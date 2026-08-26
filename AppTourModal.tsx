import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause, 
  CheckCircle2, 
  IndianRupee, 
  Bell, 
  PlusCircle, 
  TrendingDown, 
  Bot, 
  Calendar, 
  PieChart as PieIcon, 
  Award,
  Wallet,
  Utensils,
  BookOpen,
  ShoppingBag,
  Bus
} from 'lucide-react';

interface AppTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  onStartApp?: () => void;
}

export const AppTourModal: React.FC<AppTourModalProps> = ({
  isOpen,
  onClose,
  currency = '₹',
  onStartApp
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = [
    {
      title: "1. Set Your Base Pocket Money",
      subtitle: "Start with your monthly income or allowance",
      icon: <Wallet className="w-6 h-6 text-indigo-400" />,
      color: "from-indigo-500/20 to-blue-500/10",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Tell the coach how much pocket money or income you receive at the start of each month (e.g. <span className="text-emerald-400 font-bold">{currency}10,000</span>).
          </p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Example Input</span>
              <span className="text-emerald-400 font-semibold">1st of Every Month</span>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-indigo-500/30 flex items-center justify-between">
              <span className="text-sm text-slate-300">Monthly Pocket Money</span>
              <span className="text-lg font-bold text-white">{currency}10,000</span>
            </div>
            <p className="text-xs text-slate-400 italic">
              *First-time users start clean with {currency}0 spent—no confusing dummy data!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "2. Set Daily Notification Check-In",
      subtitle: "Pick a gentle reminder window between 7 PM - 10 PM",
      icon: <Bell className="w-6 h-6 text-amber-400" />,
      color: "from-amber-500/20 to-orange-500/10",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Select your preferred time slot for a quick 30-second daily spending check-in before you sleep.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { time: "7:00 PM - 8:00 PM", active: false },
              { time: "8:00 PM - 9:00 PM", active: true, tag: "Recommended" },
              { time: "9:00 PM - 10:00 PM", active: false },
              { time: "10:00 PM - 11:00 PM", active: false },
            ].map((slot, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col justify-between ${
                  slot.active 
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10' 
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <span>{slot.time}</span>
                {slot.tag && <span className="text-[10px] text-indigo-400 font-bold mt-1">{slot.tag}</span>}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "3. Log Daily Category Spending",
      subtitle: "Categorize your daily food, study, & other spendings",
      icon: <PlusCircle className="w-6 h-6 text-pink-400" />,
      color: "from-pink-500/20 to-rose-500/10",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Quickly enter approximate spendings for today across key student categories:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs">
              <span className="flex items-center gap-2 text-slate-200">
                <Utensils className="w-3.5 h-3.5 text-rose-400" /> Food & Canteen
              </span>
              <span className="font-bold text-white">{currency}150</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs">
              <span className="flex items-center gap-2 text-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Study & Printouts
              </span>
              <span className="font-bold text-white">{currency}200</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs">
              <span className="flex items-center gap-2 text-slate-200">
                <ShoppingBag className="w-3.5 h-3.5 text-pink-400" /> Others / Misc
              </span>
              <span className="font-bold text-white">{currency}50</span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-between text-xs font-bold text-indigo-200">
              <span>Total Spent Today:</span>
              <span className="text-emerald-400 text-sm">{currency}400</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "4. Real-time Continuous Subtraction",
      subtitle: "Current Balance = Income - Cumulative Daily Spendings",
      icon: <TrendingDown className="w-6 h-6 text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-500/10",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Expenses accumulate continuously day over day (Day 1 + Day 2 + Day 3...) to give you a true real-time picture of remaining cash:
          </p>
          <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Initial Base Income</span>
              <span className="font-semibold text-white">{currency}10,000</span>
            </div>
            <div className="flex justify-between text-xs text-rose-400">
              <span>- Cumulative Spent (Day 1 to 10)</span>
              <span className="font-semibold">-{currency}3,200</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-300">Live Remaining Balance</span>
              <span className="text-xl font-bold text-emerald-400">{currency}6,800</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "5. Real-Time AI Coach Insights",
      subtitle: "Instant feedback & supportive guidance in English/Hindi",
      icon: <Bot className="w-6 h-6 text-indigo-400" />,
      color: "from-indigo-500/20 to-purple-500/10",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Your personal AI Wellness Coach gives friendly voice and chat feedback to keep your finances stress-free:
          </p>
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coach Voice & Text Feedback:</span>
            </div>
            <p className="text-xs text-indigo-100 leading-relaxed italic bg-black/30 p-3 rounded-xl border border-white/5">
              "Great work logging today! You're on track to save {currency}1,800 this month. Tip: Preparing coffee at your hostel saves roughly {currency}60 daily!"
            </p>
          </div>
        </div>
      )
    },
    {
      title: "6. Monthly Calendar & Savings Report",
      subtitle: "End-of-month review with actionable coaching",
      icon: <Calendar className="w-6 h-6 text-amber-400" />,
      color: "from-amber-500/20 to-emerald-500/10",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            At month-end (or anytime in the Calendar tab), review your total savings, highest expense areas, and positive coaching reviews:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-[11px] text-slate-400 uppercase font-bold">Total Saved</p>
              <p className="text-lg font-bold text-emerald-400">{currency}2,450</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-[11px] text-slate-400 uppercase font-bold">Top Category</p>
              <p className="text-lg font-bold text-rose-400">Food (42%)</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <Award className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-200">
              "You spent a bit more on dining out, but no worries—you still saved 24% of your allowance!"
            </p>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    if (!isPlaying || !isOpen) return;
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying, isOpen, steps.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-xl bg-[#0d0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">App Tour & How It Works</h3>
              <p className="text-xs text-slate-400">Interactive preview of the financial coaching workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-6 pt-4 flex gap-1.5">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentStep(idx);
                setIsPlaying(false);
              }}
              className="flex-1 h-1.5 rounded-full transition-all duration-300 overflow-hidden bg-white/10"
            >
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  idx === currentStep 
                    ? 'bg-gradient-to-r from-indigo-500 to-emerald-400 w-full' 
                    : idx < currentStep ? 'bg-indigo-400/60 w-full' : 'w-0'
                }`} 
              />
            </button>
          ))}
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className={`p-5 rounded-2xl bg-gradient-to-br ${steps[currentStep].color} border border-white/10`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-black/40 rounded-xl border border-white/10">
                {steps[currentStep].icon}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Step {currentStep + 1} of {steps.length}</span>
                <h4 className="text-lg font-bold text-white">{steps[currentStep].title}</h4>
              </div>
            </div>
            <p className="text-xs text-slate-400 ml-12 mb-4">{steps[currentStep].subtitle}</p>
            
            {steps[currentStep].content}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title={isPlaying ? "Pause auto-tour" : "Play auto-tour"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-indigo-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isPlaying ? 'Auto-playing' : 'Paused'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentStep(prev => (prev > 0 ? prev - 1 : steps.length - 1));
                setIsPlaying(false);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => {
                  setCurrentStep(prev => prev + 1);
                  setIsPlaying(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onStartApp) onStartApp();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Get Started Now</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
