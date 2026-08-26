import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Bell, 
  Clock, 
  Check, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { NotificationPreference, NOTIFICATION_PRESETS } from '../types';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preference?: NotificationPreference;
  onSavePreference: (pref: NotificationPreference) => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  preference = { enabled: true, window: '8:00 PM - 9:00 PM' },
  onSavePreference
}) => {
  const safePref = preference || { enabled: true, window: '8:00 PM - 9:00 PM' };
  const [selectedWindow, setSelectedWindow] = useState<string>(safePref.window || '8:00 PM - 9:00 PM');
  const [isEnabled, setIsEnabled] = useState<boolean>(safePref.enabled ?? true);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Sync state if props change
  useEffect(() => {
    const p = preference || { enabled: true, window: '8:00 PM - 9:00 PM' };
    setSelectedWindow(p.window || '8:00 PM - 9:00 PM');
    setIsEnabled(p.enabled ?? true);
  }, [preference]);

  // Hardware Back / Escape key handling for robust navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePreference({
      enabled: isEnabled,
      window: selectedWindow,
    });
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 800);
  };

  const handleRequestPermissionAndTest = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission === 'granted') {
          new Notification('FinCoach Check-in Reminder', {
            body: `Gentle reminder! Take 30 seconds to log today's food, transit & study expenses.`,
            icon: '/icon.png',
          });
        }
      } catch (err) {
        console.warn('Native notification not allowed in iframe sandbox, displaying simulated toast', err);
      }
    }
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-settings-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-lg bg-[#0d0d12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header with clear BACK Navigation */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-950/30 via-black to-indigo-950/20">
          <div className="flex items-center gap-3">
            {/* Prominent Back Navigation Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Return to previous screen"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div>
              <h3 id="notification-settings-title" className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Daily Spending Check-in</span>
              </h3>
              <p className="text-xs text-slate-400">Configure your daily reminder slot</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Toggle Active */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-white">Daily Reminder Push</p>
              <p className="text-xs text-slate-400">Receive a gentle 30-second prompt if spendings are unrecorded</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
                isEnabled ? 'bg-indigo-600' : 'bg-white/10'
              }`}
              aria-pressed={isEnabled}
            >
              <div 
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Time Window Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select Preferred Notification Window (7 PM - 11 PM)</span>
            </label>

            <div className="space-y-2">
              {NOTIFICATION_PRESETS.map((preset) => {
                const isChosen = selectedWindow === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedWindow(preset.value)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between ${
                      isChosen 
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10' 
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isChosen ? 'text-white' : 'text-slate-200'}`}>
                          {preset.label}
                        </span>
                        {preset.value.includes('8:00 PM') && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{preset.desc}</p>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                      isChosen ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-white/20'
                    }`}>
                      {isChosen && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Notification Trigger */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Notification Preview & Test</span>
                </span>
                <p className="text-[11px] text-slate-400">Preview the exact alert delivered to your device</p>
              </div>
              <button
                type="button"
                onClick={handleRequestPermissionAndTest}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Test Alert</span>
              </button>
            </div>

            {testNotificationSent && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-200"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Test check-in notification triggered successfully!</span>
              </motion.div>
            )}

            {/* Simulated Banner Display */}
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">FinCoach Check-in • {selectedWindow.split(' - ')[0]}</p>
                <p className="text-[11px] text-slate-400 truncate">"Hey! Take 30 seconds to log today's food & study expenses."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Back & Save */}
        <div className="p-5 border-t border-white/5 bg-black/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel / Back</span>
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
          >
            {isSavedToast ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
