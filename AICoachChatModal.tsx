import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bot, 
  User, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  RotateCcw,
  AlertCircle,
  Play,
  Pause,
  Gauge
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Expense, SupportedLanguage, SUPPORTED_LANGUAGES } from '../types';
import { speakInstantIndianVoice, stopAllSpeech } from '../lib/audioVoice';
import { sanitizePromptInput, sanitizeText } from '../lib/security';

interface AICoachChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  income?: number;
  expenses?: Expense[];
  currency?: string;
  aiInstance: GoogleGenAI;
}

export const AICoachChatModal: React.FC<AICoachChatModalProps> = ({
  isOpen,
  onClose,
  income = 0,
  expenses = [],
  currency = '₹',
  aiInstance
}) => {
  const safeExpenses = expenses || [];
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('auto');
  const [lockedLanguage, setLockedLanguage] = useState<SupportedLanguage | null>(null);

  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string; time?: string; langTag?: string }[]>([
    {
      role: 'bot',
      text: `Hello! I'm your AI Financial Wellness Coach. I'm here to help you manage your student pocket money (${currency}${income.toLocaleString()}), master your spending, or suggest practical hacks to build your savings vault.\n\nYou can chat or speak to me in English, Hinglish ("Mera food budget kaise cut karun?"), Hindi (हिन्दी), or any regional Indian language!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      langTag: 'en-IN'
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.96);
  const [activeSpeechText, setActiveSpeechText] = useState<string | null>(null);
  const [micStatusMessage, setMicStatusMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalSpent = safeExpenses.reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  const remaining = Math.max(0, income - totalSpent);
  const daysInCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemainingInMonth = Math.max(1, daysInCurrentMonth - currentDay + 1);
  const safeDailyBudget = Math.max(0, Math.floor(remaining / daysRemainingInMonth));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up audio & recognition on close or unmount
  useEffect(() => {
    return () => {
      stopAllSpeech();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Keyboard navigation & Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopAllSpeech();
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (err) {}
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const triggerVoiceSpeech = useCallback((text: string, langCode: string) => {
    stopAllSpeech();
    setActiveSpeechText(text);
    setIsSpeaking(true);

    speakInstantIndianVoice(text, {
      lang: langCode,
      rate: speechRate,
      pitch: 1.0,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        setActiveSpeechText(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveSpeechText(null);
      }
    });
  }, [speechRate]);

  const handleStopSpeech = () => {
    stopAllSpeech();
    setIsSpeaking(false);
    setActiveSpeechText(null);
  };

  /**
   * Robust Microphone & Speech-to-Text Handler
   */
  const toggleSpeechRecognition = async () => {
    // If currently listening, stop immediately
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          recognitionRef.current.abort();
        }
      }
      setIsListening(false);
      setMicStatusMessage(null);
      return;
    }

    // Stop ongoing TTS audio first so mic doesn't capture speaker output
    handleStopSpeech();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStatusMessage("Voice speech-to-text is not supported in this browser. Please type your message.");
      setTimeout(() => setMicStatusMessage(null), 5000);
      return;
    }

    // Request runtime microphone permission to ensure hardware access is active
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release media tracks so SpeechRecognition has sole audio focus
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (permErr) {
      console.warn("Microphone access permission issue:", permErr);
      setMicStatusMessage("Microphone permission was denied. Please allow microphone access in browser settings.");
      setTimeout(() => setMicStatusMessage(null), 5000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === (lockedLanguage || selectedLanguage));
      recognition.lang = activeLangObj ? activeLangObj.speechCode : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setMicStatusMessage("Listening... Speak now in English, Hinglish, or Hindi");
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const combined = (finalTranscript || interimTranscript).trim();
        if (combined) {
          setInput(combined);
        }

        if (finalTranscript.trim()) {
          setMicStatusMessage("Voice captured!");
          setTimeout(() => setMicStatusMessage(null), 2000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicStatusMessage("Microphone blocked. Please grant browser microphone permission.");
        } else if (event.error === 'no-speech') {
          setMicStatusMessage("No speech detected. Tap the mic and speak clearly.");
        } else if (event.error !== 'aborted') {
          setMicStatusMessage(`Voice error: ${event.error}. You can type anytime!`);
        }
        setTimeout(() => setMicStatusMessage(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      setMicStatusMessage("Could not activate microphone. Please type your message.");
      setTimeout(() => setMicStatusMessage(null), 4000);
    }
  };

  // Inspect explicit language switch triggers in user text
  const detectExplicitLanguageOverride = (text: string): SupportedLanguage | null => {
    const lower = text.toLowerCase();
    if (lower.includes('talk to me in hindi') || lower.includes('speak in hindi') || lower.includes('hindi mein bolo') || lower.includes('hindi me')) {
      return 'hi-IN';
    }
    if (lower.includes('talk in hinglish') || lower.includes('speak in hinglish') || lower.includes('hinglish me')) {
      return 'hinglish';
    }
    if (lower.includes('talk in english') || lower.includes('speak in english')) {
      return 'en-IN';
    }
    if (lower.includes('talk in tamil') || lower.includes('speak in tamil') || lower.includes('tamil')) {
      return 'ta-IN';
    }
    if (lower.includes('talk in telugu') || lower.includes('speak in telugu') || lower.includes('telugu')) {
      return 'te-IN';
    }
    if (lower.includes('talk in bengali') || lower.includes('speak in bengali') || lower.includes('bengali') || lower.includes('bangla')) {
      return 'bn-IN';
    }
    if (lower.includes('talk in marathi') || lower.includes('speak in marathi') || lower.includes('marathi')) {
      return 'mr-IN';
    }
    if (lower.includes('talk in gujarati') || lower.includes('speak in gujarati') || lower.includes('gujarati')) {
      return 'gu-IN';
    }
    if (lower.includes('talk in kannada') || lower.includes('speak in kannada') || lower.includes('kannada')) {
      return 'kn-IN';
    }
    if (lower.includes('talk in punjabi') || lower.includes('speak in punjabi') || lower.includes('punjabi')) {
      return 'pa-IN';
    }
    return null;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawQuery = (textToSend || input).trim();
    if (!rawQuery || isLoading) return;

    // Sanitize input
    const sanitizedQuery = sanitizePromptInput(rawQuery);
    if (!sanitizedQuery) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    }

    // Check language override
    const explicitOverride = detectExplicitLanguageOverride(sanitizedQuery);
    let activeLang = lockedLanguage || selectedLanguage;
    if (explicitOverride) {
      setLockedLanguage(explicitOverride);
      setSelectedLanguage(explicitOverride);
      activeLang = explicitOverride;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: sanitizedQuery, time }]);
    setInput('');
    setIsLoading(true);

    try {
      const activeLanguageConfig = SUPPORTED_LANGUAGES.find(l => l.code === activeLang);
      const languageInstruction = activeLang === 'auto'
        ? `Language Rule: Automatically detect the student's message language (English, Hinglish, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Punjabi). You MUST respond in that EXACT same language and script naturally.`
        : `Language Rule: The student explicitly selected ${activeLanguageConfig?.name || activeLang}. You MUST strictly respond in ${activeLanguageConfig?.name || activeLang} (${activeLanguageConfig?.nativeName || ''}).`;

      const prompt = `You are a world-class AI Financial Wellness Coach specially designed for college students in India.
Your mission is to provide empathetic, highly structured, practical, and crisp money management advice.

Student Financial Snapshot:
- Monthly Pocket Money / Allowance: ${currency}${income.toLocaleString()}
- Total Spent So Far: ${currency}${totalSpent.toLocaleString()}
- Live Remaining Balance: ${currency}${remaining.toLocaleString()}
- Safe Daily Spending Limit for Remaining ${daysRemainingInMonth} Days: ${currency}${safeDailyBudget}/day
- Total Expense Logs: ${safeExpenses.length}

Student Question: "${sanitizedQuery}"

${languageInstruction}

Coaching Principles & Response Guidelines:
1. Tone: Empathetic, energetic, motivating, non-judgmental. Treat the student like a smart peer and mentor.
2. Structure: Keep responses crisp and structured (under 3-4 short paragraphs or bullet points). Highlight key numbers with bold text.
3. Practicality: Give real campus-friendly solutions (e.g., student meal passes, shared autos/metro smart cards, splitting group bills immediately, 50/30/20 student envelope model, setting aside ₹500 emergency buffer).
4. Language Details:
   - For Hinglish queries: Use natural conversational Hinglish in Latin alphabet (e.g., "Arre waah! Aapka daily safe budget abhi ₹${safeDailyBudget} hai. Canteen me thoda chai-snack limit karke easily ₹1,000 save kar sakte ho!").
   - For Hindi queries: Use pure, warm Hindi in Devanagari script.
   - For regional languages: Use authentic native script with clear student budgeting advice.
5. Never provide robotic boilerplate or long generic lectures. Give 1-2 instant action steps the student can do today.`;

      const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const reply = sanitizeText(response.text) || "You're doing a fantastic job tracking your expenses. What financial milestone shall we conquer next?";
      const speechCode = activeLanguageConfig?.speechCode || 'en-IN';

      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: reply, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        langTag: speechCode
      }]);

      triggerVoiceSpeech(reply, speechCode);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `You're on the right track! With ${currency}${remaining.toLocaleString()} remaining, sticking to under ${currency}${safeDailyBudget}/day will keep your budget fully protected this month.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        langTag: 'en-IN'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedPrompts = [
    `How to save ${currency}2,000 this month?`,
    "Mera weekly food budget kitna hona chahiye?",
    "3 smart student money hacks",
    "50/30/20 rule samjhao",
    "Tamil / Hindi mein baat karo"
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-coach-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-2xl bg-[#0d0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh] sm:h-[86vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-black to-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 relative flex-shrink-0">
              <Bot className="w-5 h-5" />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0d0d12] absolute -top-0.5 -right-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ai-coach-title" className="text-sm sm:text-base font-bold text-white">AI Financial Wellness Coach</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Natural Indian accent TTS • Auto language match</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector Dropdown */}
            <div className="relative flex items-center">
              <select
                value={lockedLanguage || selectedLanguage}
                onChange={(e) => {
                  const val = e.target.value as SupportedLanguage;
                  setSelectedLanguage(val);
                  setLockedLanguage(val === 'auto' ? null : val);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                title="Select Coach Response Language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#0d0d12] text-white">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Speech Speed Switcher */}
            <button
              type="button"
              onClick={() => {
                const nextRate = speechRate === 0.96 ? 1.15 : speechRate === 1.15 ? 0.85 : 0.96;
                setSpeechRate(nextRate);
              }}
              className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-indigo-300 flex items-center gap-1"
              title="Toggle Voice Speech Speed"
            >
              <Gauge className="w-3 h-3" />
              <span>{speechRate}x</span>
            </button>

            {isSpeaking && (
              <button
                type="button"
                onClick={handleStopSpeech}
                className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
                title="Stop Audio Voice"
              >
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline">Mute</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                stopAllSpeech();
                if (recognitionRef.current) {
                  try { recognitionRef.current.abort(); } catch (e) {}
                }
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Financial Context Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs text-slate-400 overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <span>Income: <strong className="text-white">{currency}{income.toLocaleString()}</strong></span>
            <span>Spent: <strong className="text-rose-400">{currency}{totalSpent.toLocaleString()}</strong></span>
            <span>Balance: <strong className="text-emerald-400">{currency}{remaining.toLocaleString()}</strong></span>
            <span>Safe Daily: <strong className="text-cyan-400">{currency}{safeDailyBudget}/day</strong></span>
          </div>
          {lockedLanguage && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold whitespace-nowrap flex-shrink-0">
              Locked: {SUPPORTED_LANGUAGES.find(l => l.code === lockedLanguage)?.name}
            </span>
          )}
        </div>

        {/* Status Toast / Mic Feedback */}
        <AnimatePresence>
          {micStatusMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-indigo-950/80 border-b border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>{micStatusMessage}</span>
              </div>
              <button 
                onClick={() => setMicStatusMessage(null)}
                className="text-indigo-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                  {msg.role === 'bot' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerVoiceSpeech(msg.text, msg.langTag || 'en-IN')}
                        className={`hover:text-indigo-300 flex items-center gap-1 transition-colors ${
                          activeSpeechText === msg.text && isSpeaking ? 'text-indigo-300 font-bold' : 'text-slate-400'
                        }`}
                        title="Play in Indian accent voice"
                      >
                        {activeSpeechText === msg.text && isSpeaking ? (
                          <>
                            <Pause className="w-3 h-3 text-indigo-400" />
                            <span>Speaking...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Listen (TTS)</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : <div />}
                  {msg.time && <span>{msg.time}</span>}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-400 ml-1">AI Coach is analyzing student budget...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-3 sm:px-6 py-2 border-t border-white/5 bg-black/30 flex gap-2 overflow-x-auto no-scrollbar">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs whitespace-nowrap border border-white/5 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Active Listening Indicator */}
        {isListening && (
          <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-4 bg-rose-400 rounded-full animate-pulse" />
                <span className="w-1.5 h-6 bg-rose-400 rounded-full animate-pulse [animation-delay:0.15s]" />
                <span className="w-1.5 h-3 bg-rose-400 rounded-full animate-pulse [animation-delay:0.3s]" />
                <span className="w-1.5 h-5 bg-rose-400 rounded-full animate-pulse [animation-delay:0.45s]" />
              </div>
              <span className="text-xs font-semibold text-rose-300">
                Listening... (Tap mic or speak in English, Hinglish, Hindi)
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-white/5 bg-black/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything in English, Hinglish, or Hindi..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs md:text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-500"
            />

            {/* Responsive Microphone Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              disabled={isLoading}
              className={`p-3 rounded-2xl border transition-all relative ${
                isListening 
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30' 
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border-white/10'
              }`}
              title={isListening ? 'Stop Listening' : 'Speak to AI Coach (STT)'}
              aria-label={isListening ? 'Stop voice listening' : 'Start voice listening'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 relative z-10" />
                  <span className="absolute inset-0 rounded-2xl bg-rose-400 animate-ping opacity-30" />
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/20 transition-all"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {isSpeaking && (
            <div className="flex items-center justify-center gap-2 mt-2 text-[11px] text-indigo-400 font-medium">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Coach speaking in natural Indian accent ({speechRate}x)...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
