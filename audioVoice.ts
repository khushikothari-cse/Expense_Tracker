/**
 * High-Performance Voice Synthesis & Audio Engine
 * 
 * Features:
 * 1. Zero-delay Indian-accented Text-to-Speech (en-IN / hi-IN) using optimized Web Speech API
 * 2. Instant welcome greeting without network latency
 * 3. Markdown stripping & speech text sanitization for natural intonation
 * 4. Fallback and enhancement with cloud Gemini TTS
 * 5. Harmonic synthesizer audio chime generator
 */

import { GoogleGenAI, Modality } from '@google/genai';

let speechVoices: SpeechSynthesisVoice[] = [];

// Pre-warm and cache available voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    speechVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Strips markdown, emojis, asterisks, bullet marks, and hashtags so the TTS engine
 * reads clean, natural conversational sentences with proper intonation.
 */
export function cleanTextForSpeech(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/[*_~`#>]/g, '') // remove markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // replace markdown links with text
    .replace(/₹/g, ' rupees ') // pronounce rupees naturally
    .replace(/\$/g, ' dollars ')
    .replace(/\b(\d+)\/(\d+)\/(\d+)\b/g, '$1 $2 $3') // fraction/rule like 50/30/20
    .replace(/\n\s*[-•]\s*/g, '. ') // convert bullet points to sentence pauses
    .replace(/\n+/g, '. ') // convert newlines to pauses
    .replace(/([.!?])\s*([.!?])+/g, '$1') // collapse multiple punctuation
    .replace(/\s{2,}/g, ' ') // collapse multiple spaces
    .trim();
}

/**
 * Finds the optimal Indian accent voice available on the client device.
 * Priority:
 * 1. English (India) - en-IN
 * 2. Hindi (India) - hi-IN
 * 3. Specific known high quality Indian voices (Google, Microsoft, Apple, Rishi, Heera, Veena, Prabhat, Ravi, Neerja, Swara)
 */
export function getIndianAccentVoice(langCode = 'en-IN'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  if (speechVoices.length === 0) {
    speechVoices = window.speechSynthesis.getVoices();
  }

  const normalizedTarget = (langCode || 'en-IN').toLowerCase().replace('_', '-');

  // 1. Direct match for en-IN or selected language code
  const exactMatch = speechVoices.find(v => {
    const vLang = (v?.lang || '').toLowerCase().replace('_', '-');
    return vLang === normalizedTarget;
  });
  if (exactMatch) return exactMatch;

  // 2. Search for Indian English & Hindi indicators in voice name/lang
  const indianKeywords = [
    'en-in', 'hi-in', 'india', 'indian', 'rishi', 'heera', 'veena', 
    'prabhat', 'ravi', 'neerja', 'swara', 'madhur', 'kalliope', 'kore'
  ];
  const indianMatch = speechVoices.find(v => {
    const name = (v?.name || '').toLowerCase();
    const lang = (v?.lang || '').toLowerCase().replace('_', '-');
    return indianKeywords.some(kw => name.includes(kw) || lang.includes(kw));
  });
  if (indianMatch) return indianMatch;

  // 3. Match language prefix (e.g., 'en', 'hi', 'ta', 'te')
  const langPrefix = normalizedTarget.split('-')[0];
  const prefixMatch = speechVoices.find(v => (v?.lang || '').toLowerCase().startsWith(langPrefix));
  if (prefixMatch) return prefixMatch;

  // 4. Fallback to any English natural voice
  const fallback = speechVoices.find(v => (v?.lang || '').startsWith('en') && (v?.name || '').includes('Natural')) ||
                   speechVoices.find(v => (v?.lang || '').startsWith('en')) ||
                   speechVoices[0];

  return fallback || null;
}

export interface VoiceSpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudioContext: AudioContext | null = null;

/**
 * Instant Zero-Delay Voice Player (Indian English en-IN)
 * Bypasses network request delays to speak instantaneously on user tap/launch.
 */
export function speakInstantIndianVoice(text: string, options?: VoiceSpeakOptions): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }

  // Stop any ongoing speech
  stopAllSpeech();

  const cleanedSpeechText = cleanTextForSpeech(text);
  if (!cleanedSpeechText) {
    options?.onEnd?.();
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(cleanedSpeechText);
    const targetLang = options?.lang || 'en-IN';
    const voice = getIndianAccentVoice(targetLang);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = targetLang;
    }

    // Natural Indian cadence: expressive, clear enunciation (0.96 rate, 1.0 pitch)
    utterance.rate = options?.rate ?? 0.96;
    utterance.pitch = options?.pitch ?? 1.0;

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      currentUtterance = null;
      // SpeechSynthesis 'interrupted' or 'canceled' is normal when user stops speech
      if ((e as any)?.error !== 'interrupted' && (e as any)?.error !== 'canceled') {
        console.warn('Speech synthesis event:', (e as any)?.error);
      }
      options?.onError?.(e);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Instant voice playback error:', err);
    options?.onError?.(err);
  }
}

/**
 * Cloud Gemini High-Fidelity TTS synthesis
 */
export async function speakGeminiTTS(
  aiInstance: GoogleGenAI,
  text: string,
  options?: VoiceSpeakOptions
): Promise<void> {
  stopAllSpeech();
  options?.onStart?.();

  const cleanedSpeechText = cleanTextForSpeech(text);

  try {
    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanedSpeechText }] }],
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
    if (!base64Audio) {
      // Fallback to instant client TTS if cloud returns empty
      speakInstantIndianVoice(text, options);
      return;
    }

    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx({ sampleRate: 24000 });
    currentAudioContext = ctx;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      if (currentAudioContext === ctx) {
        ctx.close();
        currentAudioContext = null;
      }
      options?.onEnd?.();
    };
    source.start();
  } catch (err) {
    console.warn('Gemini TTS fallback to Instant WebSpeech en-IN voice', err);
    // Instant seamless fallback
    speakInstantIndianVoice(text, options);
  }
}

/**
 * Universal speech stopper
 */
export function stopAllSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }

  if (currentAudioContext) {
    try {
      currentAudioContext.close();
    } catch (e) {
      // ignore
    }
    currentAudioContext = null;
  }
}

/**
 * Instant Harmonic Chime Synthesizer
 */
export function playStartupChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Major Arpeggio)
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + index * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.08 + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.45);
    });
  } catch (e) {
    // browser audio context restriction before interaction
  }
}
