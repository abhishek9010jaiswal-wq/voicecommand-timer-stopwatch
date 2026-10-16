/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer as TimerIcon,
  Clock,
  Bell,
  Volume2,
  VolumeX,
  GraduationCap,
  Settings2,
  ExternalLink,
  History as HistoryIcon,
  Trash2,
} from 'lucide-react';
import { Stopwatch, LapItem } from './components/Stopwatch';
import { Timer } from './components/Timer';
import { AlarmManager, SmartAlarm } from './components/AlarmManager';
import { VoiceCommandBar } from './components/VoiceCommandBar';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PermissionCheckModal } from './components/PermissionCheckModal';
import { isEmbeddedInIframe } from './utils/audioPermission';
import {
  VoiceTrainingModal,
  TrainedCommandData,
  DEFAULT_TRAINED_COMMANDS,
  CommandType,
} from './components/VoiceTrainingModal';
import { SettingsModal } from './components/SettingsModal';
import { useVoiceController } from './hooks/useVoiceController';
import {
  soundEngine,
  speakText,
  triggerHaptic,
  wakeLockManager,
  showSystemNotification,
} from './utils/audio';
import { translations, LanguageCode } from './utils/translations';

export default function App() {
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'timer' | 'alarms' | 'history'>('stopwatch');

  // Single unified language setting across UI and speech recognition - DEFAULT ENGLISH
  const [appLang, setAppLang] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('voice_clock_lang');
      if (saved === 'en' || saved === 'hi' || saved === 'hinglish') return saved as LanguageCode;
    } catch {}
    return 'en';
  });
  const speechLang = appLang === 'hi' ? 'hi-IN' : 'en-US';

  const handleLanguageChange = (lang: LanguageCode) => {
    setAppLang(lang);
    try {
      localStorage.setItem('voice_clock_lang', lang);
    } catch {}
  };

  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceTrainingOpen, setIsVoiceTrainingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ==========================================
  // Trained Voice Commands State
  // ==========================================
  const [trainedCommands, setTrainedCommands] = useState<Record<CommandType, TrainedCommandData>>(() => {
    try {
      const stored = localStorage.getItem('chronos_trained_voice_commands');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_TRAINED_COMMANDS;
  });

  const handleSaveTrainedCommands = useCallback((updated: Record<CommandType, TrainedCommandData>) => {
    setTrainedCommands(updated);
    try {
      localStorage.setItem('chronos_trained_voice_commands', JSON.stringify(updated));
    } catch {}
  }, []);

  // ==========================================
  // History Tracking
  // ==========================================
  type HistoryEntry = {
    id: string;
    type: 'stopwatch_start' | 'stopwatch_stop' | 'stopwatch_lap' | 'timer_start' | 'alarm_set' | 'alarm_ring';
    label: string;
    timestamp: number;
    durationMs?: number;
    details?: string;
  };
  const HISTORY_KEY = 'chronos_history_v1';
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed as HistoryEntry[];
      }
    } catch {}
    return [];
  });

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...entry,
      timestamp: Date.now(),
    };
    setHistoryEntries((prev) => {
      const next = [newEntry, ...prev];
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistoryEntries([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    triggerHaptic(50);
  }, []);

  const formatDuration = useCallback((ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }, []);

  // ==========================================
  // 1. High-Precision Stopwatch Engine
  // ==========================================
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchElapsedMs, setStopwatchElapsedMs] = useState(0);
  const [laps, setLaps] = useState<LapItem[]>([]);

  const stopwatchStartRef = useRef<number>(0);
  const stopwatchElapsedRef = useRef<number>(0);
  const stopwatchAnimFrameRef = useRef<number | null>(null);
  const lastStopwatchRenderRef = useRef<number>(0);

  const updateStopwatchFrame = useCallback(() => {
    const now = performance.now();
    const currentTotal = stopwatchElapsedRef.current + (now - stopwatchStartRef.current);
    if (now - lastStopwatchRenderRef.current >= 30) {
      lastStopwatchRenderRef.current = now;
      setStopwatchElapsedMs(currentTotal);
    }
    stopwatchAnimFrameRef.current = requestAnimationFrame(updateStopwatchFrame);
  }, []);

  const handleStartStopwatch = useCallback((timestamp = performance.now()) => {
    addToHistory({ type: 'stopwatch_start', label: 'Stopwatch Started' });
    setIsStopwatchRunning(true);
    stopwatchStartRef.current = timestamp;
    if (stopwatchAnimFrameRef.current) {
      cancelAnimationFrame(stopwatchAnimFrameRef.current);
    }
    stopwatchAnimFrameRef.current = requestAnimationFrame(updateStopwatchFrame);
    setActiveTab('stopwatch');
  }, [updateStopwatchFrame, addToHistory]);

  const handleStopStopwatch = useCallback((timestamp = performance.now()) => {
    if (stopwatchAnimFrameRef.current) {
      cancelAnimationFrame(stopwatchAnimFrameRef.current);
      stopwatchAnimFrameRef.current = null;
    }
    const finalElapsed = stopwatchElapsedRef.current + (timestamp - stopwatchStartRef.current);
    stopwatchElapsedRef.current = finalElapsed;
    setStopwatchElapsedMs(finalElapsed);
    setIsStopwatchRunning(false);
    addToHistory({
      type: 'stopwatch_stop',
      label: 'Stopwatch Stopped',
      durationMs: finalElapsed,
    });
  }, [addToHistory]);

  const handleResetStopwatch = useCallback(() => {
    if (stopwatchAnimFrameRef.current) {
      cancelAnimationFrame(stopwatchAnimFrameRef.current);
      stopwatchAnimFrameRef.current = null;
    }
    const totalBefore = stopwatchElapsedRef.current;
    stopwatchElapsedRef.current = 0;
    setStopwatchElapsedMs(0);
    setIsStopwatchRunning(false);
    setLaps([]);
    addToHistory({
      type: 'stopwatch_stop',
      label: 'Stopwatch Reset',
      durationMs: totalBefore,
    });
  }, [addToHistory]);

  const handleLapStopwatch = useCallback(() => {
    const currentTotal = isStopwatchRunning
      ? stopwatchElapsedRef.current + (performance.now() - stopwatchStartRef.current)
      : stopwatchElapsedRef.current;

    const previousTotal = laps.length > 0 ? laps[0].totalElapsedMs : 0;
    const lapDuration = currentTotal - previousTotal;

    const newLap: LapItem = {
      id: Date.now(),
      lapNumber: laps.length + 1,
      lapDurationMs: Math.max(0, lapDuration),
      totalElapsedMs: currentTotal,
      timestamp: new Date().toLocaleTimeString(),
    };

    setLaps((prev) => [newLap, ...prev]);
    addToHistory({
      type: 'stopwatch_lap',
      label: `Lap ${newLap.lapNumber}`,
      durationMs: newLap.lapDurationMs,
      details: formatDuration(newLap.lapDurationMs),
    });
  }, [isStopwatchRunning, laps, addToHistory, formatDuration]);

  const handleToggleStopwatch = useCallback(() => {
    if (isStopwatchRunning) {
      handleStopStopwatch();
    } else {
      handleStartStopwatch();
    }
  }, [isStopwatchRunning, handleStartStopwatch, handleStopStopwatch]);

  // ==========================================
  // 2. Countdown Timer State
  // ==========================================
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(120);
  const [timerInitialLabel, setTimerInitialLabel] = useState('2 Min Timer');
  const [timerAutoTrigger, setTimerAutoTrigger] = useState(0);

  const handleSetTimerFromVoice = useCallback((seconds: number, label: string, autoStart: boolean) => {
    addToHistory({
      type: 'timer_start',
      label: label,
      durationMs: seconds * 1000,
      details: formatDuration(seconds * 1000),
    });
    setTimerInitialSeconds(seconds);
    setTimerInitialLabel(label);
    if (autoStart) {
      setTimerAutoTrigger(Date.now());
    }
    setActiveTab('timer');
  }, [addToHistory, formatDuration]);

  // ==========================================
  // 3. Multi-Repeat Interval Smart Alarm Engine
  // ==========================================
  const ALARMS_V1_KEY = 'chronos_alarms_v1';
  const ALARMS_LEGACY_KEY = 'chronos_alarms';
  function isValidAlarms(v: unknown): v is SmartAlarm[] {
    if (!Array.isArray(v)) return false;
    return v.every(a => a && typeof (a as SmartAlarm).id === 'string' && typeof (a as SmartAlarm).time === 'string' && typeof (a as SmartAlarm).nextRingTimestamp === 'number');
  }
  const [alarms, setAlarms] = useState<SmartAlarm[]>(() => {
    try {
      const v1 = localStorage.getItem(ALARMS_V1_KEY);
      if (v1) { const p = JSON.parse(v1); if (isValidAlarms(p)) return p; }
      const legacy = localStorage.getItem(ALARMS_LEGACY_KEY);
      if (legacy) {
        const p = JSON.parse(legacy);
        if (isValidAlarms(p)) {
          try { localStorage.setItem(ALARMS_V1_KEY, JSON.stringify(p)); localStorage.removeItem(ALARMS_LEGACY_KEY); } catch {}
          return p;
        }
      }
    } catch {}
    return [{ id: 'default-1', time: '14:00', label: 'Afternoon Alarm', repeatCount: 5, intervalMinutes: 2, currentRepeatIndex: 0, nextRingTimestamp: Date.now() + 1000 * 60 * 60 * 2, isEnabled: true, sound: 'digital_beep', createdAt: Date.now() }];
  });

  const [activeRingingAlarm, setActiveRingingAlarm] = useState<SmartAlarm | null>(null);

  useEffect(() => {
    try { localStorage.setItem(ALARMS_V1_KEY, JSON.stringify(alarms)); } catch {}
  }, [alarms]);

  const handleAddAlarm = useCallback((newAlarmData: Omit<SmartAlarm, 'id' | 'createdAt' | 'currentRepeatIndex'>) => {
    const newAlarm: SmartAlarm = {
      ...newAlarmData,
      id: `alarm-${Date.now()}`,
      createdAt: Date.now(),
      currentRepeatIndex: 0,
      sound: newAlarmData.sound || 'digital_beep',
    };
    setAlarms((prev) => [newAlarm, ...prev]);
    addToHistory({
      type: 'alarm_set',
      label: `Alarm: ${newAlarm.time} - ${newAlarm.label || 'Alarm'}`,
    });
    setActiveTab('alarms');
  }, [addToHistory]);

  const handleSetAlarmFromVoice = useCallback(
     (time: string, label: string, repeatCount: number, intervalMinutes: number) => {
      const [h, m] = time.split(':').map((n) => parseInt(n, 10));
      const target = new Date();
      target.setHours(h, m, 0, 0);
            if (target.getTime() <= Date.now()) {
              target.setDate(target.getDate() + 1);
            }
            handleAddAlarm({
              time,
              label: label || 'वॉइस अलार्म',
        repeatCount: Math.max(1, repeatCount),
        intervalMinutes: Math.max(1, intervalMinutes),
        nextRingTimestamp: target.getTime(),
        sound: 'digital_beep',
        isEnabled: true,
      });
    },
    [handleAddAlarm]
  );

  const handleToggleAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextState = !a.isEnabled;
          if (nextState) {
            const [h, m] = a.time.split(':').map((n) => parseInt(n, 10));
            const target = new Date();
            target.setHours(h, m, 0, 0);
            if (target.getTime() <= Date.now()) {
              target.setDate(target.getDate() + 1);
            }
            return {
              ...a,
              isEnabled: true,
              currentRepeatIndex: 0,
              nextRingTimestamp: target.getTime(),
            };
          }
          return { ...a, isEnabled: false };
        }
        return a;
      })
    );
  }, []);

  const handleDeleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    if (activeRingingAlarm && activeRingingAlarm.id === id) {
      soundEngine.stopAlarmSound();
      setActiveRingingAlarm(null);
      document.title = 'Voice Assistant Clock';
    }
  }, [activeRingingAlarm]);

  const handleUpdateAlarm = useCallback((updated: SmartAlarm) => {
    setAlarms((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  // Dismiss currently ringing alarm burst
  const handleDismissRing = useCallback((alarm: SmartAlarm) => {
    soundEngine.stopAlarmSound();
    soundEngine.disableBackgroundKeepAlive();
    setActiveRingingAlarm(null);
    document.title = 'Voice Assistant Clock';

    const nextIndex = alarm.currentRepeatIndex + 1;
    if (nextIndex < alarm.repeatCount) {
      const nextTimestamp = Date.now() + alarm.intervalMinutes * 60 * 1000;
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === alarm.id
            ? {
                ...a,
                currentRepeatIndex: nextIndex,
                nextRingTimestamp: nextTimestamp,
              }
            : a
        )
      );
      speakText(`अलार्म बंद किया गया। अगली बार ${alarm.intervalMinutes} मिनट में बजेगा।`, speechLang);
    } else {
      const [h, m] = alarm.time.split(':').map((n) => parseInt(n, 10));
      const target = new Date();
      target.setDate(target.getDate() + 1);
      target.setHours(h, m, 0, 0);

      setAlarms((prev) =>
        prev.map((a) =>
          a.id === alarm.id
            ? {
                ...a,
                currentRepeatIndex: 0,
                nextRingTimestamp: target.getTime(),
              }
            : a
        )
      );
      speakText('सभी रिपीट समाप्त हो चुके हैं। All repeats finished!', speechLang);
    }
  }, [speechLang]);

  // Stop all repeats entirely for this alarm
  const handleStopAllRepeats = useCallback((alarm: SmartAlarm) => {
    soundEngine.stopAlarmSound();
    soundEngine.disableBackgroundKeepAlive();
    setActiveRingingAlarm(null);
    document.title = 'Voice Assistant Clock';

    const [h, m] = alarm.time.split(':').map((n) => parseInt(n, 10));
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(h, m, 0, 0);

    setAlarms((prev) =>
      prev.map((a) =>
        a.id === alarm.id
          ? {
              ...a,
              currentRepeatIndex: 0,
              nextRingTimestamp: target.getTime(),
            }
          : a
      )
    );
    speakText('अलार्म के सभी रिपीट बंद कर दिए गए हैं।', speechLang);
  }, [speechLang]);

  const activeRingingAlarmRef = useRef<SmartAlarm | null>(null);
  useEffect(() => { activeRingingAlarmRef.current = activeRingingAlarm; }, [activeRingingAlarm]);

  useEffect(() => {
    const checkAlarms = () => {
      const now = Date.now();
      alarms.forEach((alarm) => {
        if (alarm.isEnabled && !activeRingingAlarmRef.current) {
          if (now >= alarm.nextRingTimestamp) {
            setActiveRingingAlarm(alarm);
            document.title = `🔔 [ALARM RINGING] ${alarm.time}`;
            soundEngine.startAlarmSound(alarm.sound || 'digital_beep');
            soundEngine.enableBackgroundKeepAlive();
            triggerHaptic([300, 150, 300, 150, 600]);
            addToHistory({
              type: 'alarm_ring',
              label: `Alarm Rang: ${alarm.time} - ${alarm.label || 'Alarm'}`,
              details: `${alarm.currentRepeatIndex + 1}/${alarm.repeatCount}`,
            });
            showSystemNotification(`🔔 अलार्म बज रहा है! (${alarm.time})`, `${alarm.label} — रिंग ${alarm.currentRepeatIndex + 1}/${alarm.repeatCount}`);
            speakText(`अलार्म बज रहा है! यह ${alarm.repeatCount} में से ${alarm.currentRepeatIndex + 1} बार है।`, speechLang);
          }
        }
      });
    };
    const interval = setInterval(checkAlarms, 500);
    const onVisible = () => { if (document.visibilityState === 'visible') checkAlarms(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [alarms, speechLang, addToHistory]);

  // ==========================================
  // 4. Voice Controller Hook with Trained Phrases
  // ==========================================
  const {
    isListening,
    micSupported,
    micPermissionDenied,
    micErrorType,
    setMicPermissionDenied,
    interimTranscript,
    finalTranscript,
    lastAction,
    audioLevel,
    noiseSensitivity,
    setNoiseSensitivity,
    statusMessage,
    isProcessingNlp,
    startListening,
    stopListening,
    simulateCommand,
  } = useVoiceController({
    onStartStopwatch: handleStartStopwatch,
    onStopStopwatch: handleStopStopwatch,
    onResetStopwatch: handleResetStopwatch,
    onLapStopwatch: handleLapStopwatch,
    onSetTimer: handleSetTimerFromVoice,
    onSetAlarm: handleSetAlarmFromVoice,
    language: speechLang,
    trainedCommands,
  });

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [iframeBlockedWarning, setIframeBlockedWarning] = useState(false);

  const handleOpenVoiceTraining = () => {
    if (isListening) {
      stopListening();
    }
    setIsVoiceTrainingOpen(true);
  };

  const handleToggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      return;
    }

    setMicPermissionDenied(false);

    let stream: MediaStream | null = null;
    let isExplicitlyBlocked = false;

    // PRIMARY TRIGGER: Explicitly invoke getUserMedia directly within this user gesture click event.
    // This triggers the browser's native permission modal/dialog ("Allow site to use microphone?").
    if (typeof navigator !== 'undefined') {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          // Compatibility for older Android / iOS browsers
          const legacyGetUserMedia =
            (navigator as any).webkitGetUserMedia ||
            (navigator as any).mozGetUserMedia ||
            (navigator as any).getUserMedia;
          if (legacyGetUserMedia) {
            stream = await new Promise<MediaStream>((resolve, reject) => {
              legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
            });
          }
        }
      } catch (err: any) {
        console.warn('getUserMedia prompt was blocked, denied, or unavailable:', err);
        const errName = err?.name || '';
        const errMsg = String(err?.message || err || '').toLowerCase();

        // Check if error is due to preview iframe context
        if (errMsg.includes('current context') || (isEmbeddedInIframe() && errName === 'NotAllowedError')) {
          setIframeBlockedWarning(true);
        } else if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errMsg.includes('permission') ||
          errMsg.includes('not allowed') ||
          errMsg.includes('denied')
        ) {
          isExplicitlyBlocked = true;
        }
      }
    }

    if (stream) {
      soundEngine.playStartChime();
      startListening(stream, false);
    } else {
      // Even if getUserMedia failed in this context, still attempt SpeechRecognition!
      startListening(null, isExplicitlyBlocked);
    }
  }, [isListening, stopListening, startListening, setMicPermissionDenied]);

  const handleRetryPermission = async () => {
    setMicPermissionDenied(false);
    setIsPermissionModalOpen(false);
    await handleToggleListening();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  // Screen Wake Lock automatically keeps screen awake without confusing extra eye icon
  useEffect(() => {
    wakeLockManager.request();
    return () => wakeLockManager.release();
  }, []);

  const t = translations[appLang];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 pb-28">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-3 py-2.5 sm:px-4 sm:py-3 w-full">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <TimerIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
            <div className="truncate">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                Voice Assistant Clock
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleOpenVoiceTraining}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/25 border border-cyan-500/35 text-cyan-300 text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
              title={appLang === 'en' ? 'Voice Command Training' : 'वॉइस कमांड ट्रेनिंग (Train Voice Commands)'}
            >
              <GraduationCap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-xs">{appLang === 'en' ? 'Training' : 'कमांड ट्रेनिंग'}</span>
            </button>

            <PWAInstallButton lang={appLang} />

            <button type="button" aria-label="Open settings" onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 transition cursor-pointer"
              title={translations[appLang].settingsTitle}>
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? (appLang === 'en' ? 'Unmute audio' : 'ऑडियो चालू करें') : (appLang === 'en' ? 'Mute audio' : 'ऑडियो म्यूट करें')}
              className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer text-xs ${isMuted ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'}`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
            </button>

            <select
              value={appLang}
              onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
              className="bg-slate-900 border border-cyan-500/40 rounded-xl px-2 py-1.5 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm"
              title="Change Language / भाषा बदलें"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
        </div>
      </header>

      {/* If iframe context blocks native microphone prompt, show direct 1-click Open in Full Tab banner */}
      {iframeBlockedWarning && (
        <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/80 to-slate-900 border-b border-amber-500/40 px-3 py-2.5 sm:px-4 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold">⚠️</span>
            <span className="leading-snug">
              {appLang === 'en'
                ? 'Preview frame restricts microphone. Open in a full browser tab for native prompt:'
                : 'प्रीव्यू iframe में माइक्रोफ़ोन सीधे ब्लॉक है। असली ब्राउज़र परमिशन पॉपअप पाने के लिए फुल टैब खोलें:'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/20 flex-shrink-0"
          >
            <span>{appLang === 'en' ? 'Open in Full Tab' : 'फुल टैब में खोलें'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container with smooth vertical scroll flow */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center min-w-0">
        {/* Navigation Tabs (Stopwatch / Timer / Alarms / History) */}
        <div className="w-full max-w-md grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 mb-6 shadow-inner">
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stopwatch'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{t.stopwatchTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'timer'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TimerIcon className="w-4 h-4" aria-hidden="true" />
            <span>{t.timerTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('alarms')}
            className={`relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'alarms'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            <span>{t.alarmsTab}</span>
            {alarms.some((a) => a.isEnabled) && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute top-2 right-2" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HistoryIcon className="w-4 h-4" aria-hidden="true" />
            <span>{t.historyTab}</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="w-full">
          {activeTab === 'stopwatch' && (
            <Stopwatch
              isRunning={isStopwatchRunning}
              elapsedMs={stopwatchElapsedMs}
              onToggle={handleToggleStopwatch}
              onReset={handleResetStopwatch}
              onLap={handleLapStopwatch}
              laps={laps}
              lang={appLang}
            />
          )}

          {activeTab === 'timer' && (
            <Timer
              initialSeconds={timerInitialSeconds}
              initialLabel={timerInitialLabel}
              autoStartTrigger={timerAutoTrigger}
              lang={appLang}
            />
          )}

          {activeTab === 'alarms' && (
            <AlarmManager
              alarms={alarms}
              onAddAlarm={handleAddAlarm}
              onToggleAlarm={handleToggleAlarm}
              onDeleteAlarm={handleDeleteAlarm}
              onUpdateAlarm={handleUpdateAlarm}
              activeRingingAlarm={activeRingingAlarm}
              onDismissRing={handleDismissRing}
              onStopAllRepeats={handleStopAllRepeats}
              lang={appLang}
            />
          )}

          {activeTab === 'history' && (
            <div className="w-full max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">{t.historyTab}</h2>
                {historyEntries.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer"
                    title={appLang === 'en' ? 'Clear all history' : 'सभी इतिहास साफ़ करें'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{appLang === 'en' ? 'Clear' : 'साफ़ करें'}</span>
                  </button>
                )}
              </div>

              {historyEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{appLang === 'en' ? 'No history yet' : 'अभी तक कोई इतिहास नहीं'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-xl border text-xs transition ${
                        entry.type === 'stopwatch_start' || entry.type === 'alarm_ring'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : entry.type === 'stopwatch_stop' || entry.type === 'alarm_set'
                          ? 'bg-slate-800/50 border-slate-700 text-slate-300'
                          : entry.type === 'stopwatch_lap'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{entry.label}</span>
                        <span className="text-slate-500 text-[10px] whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleTimeString(appLang === 'hi' ? 'en-GB' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      {entry.details && (
                        <span className="text-[10px] opacity-70 block mt-0.5">
                          {entry.details}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Offline Indicator */}
      <OfflineIndicator lang={appLang} />

      <VoiceTrainingModal
        isOpen={isVoiceTrainingOpen}
        onClose={() => setIsVoiceTrainingOpen(false)}
        trainedCommands={trainedCommands}
        onSaveTrainedCommands={handleSaveTrainedCommands}
        speechLang={speechLang}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lang={appLang}
        onLanguageChange={handleLanguageChange}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Actionable Microphone Browser Permission Helper Modal */}
      <PermissionCheckModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onRetry={handleRetryPermission}
        lang={appLang}
      />

      {/* Sticky Bottom Voice Assistant Controller Bar */}
      <VoiceCommandBar
        isListening={isListening}
        micSupported={micSupported}
        micPermissionDenied={micPermissionDenied}
        onOpenPermissionGuide={() => setIsPermissionModalOpen(true)}
        onToggleListening={handleToggleListening}
        audioLevel={audioLevel}
        interimTranscript={interimTranscript}
        finalTranscript={finalTranscript}
        lastAction={lastAction}
        statusMessage={statusMessage}
        noiseSensitivity={noiseSensitivity}
        onSetNoiseSensitivity={setNoiseSensitivity}
        onSimulateCommand={simulateCommand}
        lang={appLang}
      />
    </div>
  );
}
