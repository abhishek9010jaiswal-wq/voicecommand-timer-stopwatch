import { useState, useEffect, useRef, useCallback } from 'react';
import { soundEngine, speakText, triggerHaptic } from '../utils/audio';
import { TrainedCommandData, CommandType } from '../components/VoiceTrainingModal';

export interface VoiceActionResult {
  action: 'START' | 'STOP' | 'RESET' | 'LAP' | 'SET_TIMER' | 'SET_ALARM' | 'UNKNOWN';
  rawText: string;
  source: 'instant_keyword' | 'local_parser' | 'gemini_nlp';
  details?: unknown;
  timestamp: number;
}

interface VoiceControllerProps {
  onStartStopwatch: (timestamp: number) => void;
  onStopStopwatch: (timestamp: number) => void;
  onResetStopwatch: () => void;
  onLapStopwatch: () => void;
  onSetTimer: (seconds: number, label: string, autoStart: boolean) => void;
  onSetAlarm: (time: string, label: string, repeatCount: number, intervalMinutes: number) => void;
  language?: string;
  trainedCommands?: Record<CommandType, TrainedCommandData>;
}

export function useVoiceController({
  onStartStopwatch,
  onStopStopwatch,
  onResetStopwatch,
  onLapStopwatch,
  onSetTimer,
  onSetAlarm,
  language = 'en-US',
  trainedCommands,
}: VoiceControllerProps) {
  const isEng = language.startsWith('en');
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [micErrorType, setMicErrorType] = useState<'denied' | 'not_supported' | 'device_busy' | 'iframe_blocked' | 'unknown' | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [lastAction, setLastAction] = useState<VoiceActionResult | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [noiseSensitivity, setNoiseSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [statusMessage, setStatusMessage] = useState(isEng ? 'Voice ready — tap mic to listen' : 'वॉइस तैयार है — माइक दबाएं');
  const [isProcessingNlp, setIsProcessingNlp] = useState(false);

  const recognitionRef = useRef<unknown>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const shouldListenRef = useRef(false);
  const lastTriggerTimeRef = useRef<number>(0);
  const lastKeywordRef = useRef<string>('');
  const pendingCapturedAtRef = useRef<number | null>(null);

  const RESET_ASCII_REGEX = /\b(?:reset|clear|shunya|zero)\b/i;
  const RESET_HINDI_WORDS = ['रीसेट', 'शून्य', 'साफ', 'खत्म', 'नया'];
  const LAP_ASCII_REGEX = /\b(?:lap|split|round|daur)\b/i;
  const LAP_HINDI_WORDS = ['लैप', 'राउंड'];
  const START_REGEX = /\b(?:start|begin|go\b|run\b|shuru|shurua|aarambh|prarambh|suru|surua|manade|mulai|thodangu|commencer|début|начать|startit)\b/i;
  const START_HINDI_WORDS = ['शुरू', 'स्टार्ट', 'चालू', 'चलाएं', 'आरंभ', 'प्रारंभ', 'शुरूकरो', 'चलाओ', 'सुरू', 'प्रारम्भ', 'आरम्भ'];
  const START_OTHER_WORDS = ['தொடங்கு', 'ప్రారంభం', 'ಪ್ರಾರಂಭ', 'ആരംഭിക്കுக', 'શરૂઁ', 'شروع', 'เริ่ม', '開始', 'commencer'];
  const STOP_REGEX = /\b(?:stop|pause|halt|ruko|thehro|rukja|theharo|bandkaro|finish|done|ended|ok\b)\b/i;
  const STOP_HINDI_WORDS = ['रोक', 'रुक जाओ', 'स्टॉप', 'थाम', 'बंद करो', 'थेहरो', 'रोको', 'विराम', 'धक्का', 'रुकना', 'समाप्त', 'स्टॉपवॉच'];
  const STOP_OTHER_WORDS = ['நிறுத்து', 'ఆపు', 'ನಿಲ್ಲಿಸು', 'നിർത്തുക', 'ક્યૂટ', 'توقف', 'หยุด', '停止', 'arrêter', 'parar'];

  const matchesTrained = useCallback((cmd: CommandType, lower: string): boolean => {
    if (!trainedCommands || !trainedCommands[cmd]) return false;
    const list = trainedCommands[cmd].phrases;
    return list.some((phrase) => {
      const p = phrase.toLowerCase().trim();
      return p.length > 0 && (lower.includes(p) || p.includes(lower));
    });
  }, [trainedCommands]);

  const isLapMatch = useCallback((lower: string): boolean => {
    if (LAP_ASCII_REGEX.test(lower)) return true;
    if (LAP_HINDI_WORDS.some(w => lower.includes(w))) return true;
    if (matchesTrained('RESET', lower) && false) return false;
    const lapTrained = trainedCommands?.['TIMER'] ? false : false;
    void lapTrained;
    return false;
  }, [matchesTrained, trainedCommands]);

  const isResetMatch = useCallback((lower: string): boolean => {
    if (RESET_ASCII_REGEX.test(lower)) return true;
    if (RESET_HINDI_WORDS.some(w => lower.includes(w))) return true;
    if (matchesTrained('RESET', lower)) return true;
    return false;
  }, [matchesTrained]);

  const isStartMatch = useCallback((lower: string): boolean => {
    if (START_REGEX.test(lower)) return true;
    if (START_HINDI_WORDS.some(w => lower.includes(w))) return true;
    if (START_OTHER_WORDS.some(w => lower.includes(w))) return true;
    if (matchesTrained('START', lower)) return true;
    return false;
  }, [matchesTrained]);

  const isStopMatch = useCallback((lower: string): boolean => {
    if (STOP_REGEX.test(lower)) return true;
    if (STOP_HINDI_WORDS.some(w => lower.includes(w))) return true;
    if (STOP_OTHER_WORDS.some(w => lower.includes(w))) return true;
    if (matchesTrained('STOP', lower)) return true;
    return false;
  }, [matchesTrained]);

  const checkLocalInstantKeywords = useCallback(
    (text: string): boolean => {
      const now = performance.now();
      if (now - lastTriggerTimeRef.current < 450) return false;
      const lower = text.toLowerCase().trim();

      if (isLapMatch(lower)) {
        lastTriggerTimeRef.current = now;
        lastKeywordRef.current = 'LAP';
        setLastAction({ action: 'LAP', rawText: text, source: 'instant_keyword', timestamp: Date.now() });
        setStatusMessage(isEng ? '⚡ Lap Recorded!' : '⚡ लैप रिकॉर्ड हुआ (Lap Recorded)');
        soundEngine.playLapChime();
        triggerHaptic(40);
        onLapStopwatch();
        return true;
      }

      if (isResetMatch(lower)) {
        lastTriggerTimeRef.current = now;
        lastKeywordRef.current = 'RESET';
        setLastAction({ action: 'RESET', rawText: text, source: 'instant_keyword', timestamp: Date.now() });
        setStatusMessage(isEng ? '⚡ Stopwatch Reset!' : '⚡ रीसेट किया गया (Reset)');
        triggerHaptic(80);
        onResetStopwatch();
        return true;
      }

      if (isStartMatch(lower)) {
        lastTriggerTimeRef.current = now;
        lastKeywordRef.current = 'START';
        setLastAction({ action: 'START', rawText: text, source: 'instant_keyword', timestamp: Date.now() });
        setStatusMessage(isEng ? '⚡ Stopwatch Started!' : '⚡ स्टॉपवॉच शुरू (Started)');
        soundEngine.playStartChime();
        triggerHaptic(70);
        onStartStopwatch(Date.now());
        return true;
      }

      if (isStopMatch(lower)) {
        lastTriggerTimeRef.current = now;
        lastKeywordRef.current = 'STOP';
        setLastAction({ action: 'STOP', rawText: text, source: 'instant_keyword', timestamp: Date.now() });
        setStatusMessage(isEng ? '⚡ Stopwatch Stopped!' : '⚡ स्टॉपवॉच रोका (Stopped)');
        soundEngine.playStopChime();
        triggerHaptic(70);
        onStopStopwatch(Date.now());
        return true;
      }

      if (matchesTrained('TIMER', lower)) {
        lastTriggerTimeRef.current = now;
        lastKeywordRef.current = 'TIMER';
        onSetTimer(120, '2 Min Timer', true);
        soundEngine.playStartChime();
        triggerHaptic(70);
        setStatusMessage(isEng ? '⏱️ 2 Min Timer Started' : '⏱️ 2 मिनट का टाइमर शुरू किया गया');
        return true;
      }

      return false;
    },
    [onLapStopwatch, onResetStopwatch, onStartStopwatch, onStopStopwatch, onSetTimer, isEng, isLapMatch, isResetMatch, isStartMatch, isStopMatch, matchesTrained]
  );

  const tryLocalCommandParser = useCallback(
    (text: string): boolean => {
      const lower = text.toLowerCase();

      if (isStartMatch(lower)) {
        setLastAction({ action: 'START', rawText: text, source: 'local_parser', timestamp: Date.now() });
        setStatusMessage(isEng ? '⚡ Stopwatch Started!' : '⚡ स्टॉपवॉच शुरू (Started)');
        soundEngine.playStartChime();
        triggerHaptic(70);
        onStartStopwatch(Date.now());
        return true;
      }

      if (isStopMatch(lower)) {
        setLastAction({ action: 'STOP', rawText: text, source: 'local_parser', timestamp: Date.now() });
        setStatusMessage(isEng ? '⚡ Stopwatch Stopped!' : '⚡ स्टॉपवॉच रोका (Stopped)');
        soundEngine.playStopChime();
        triggerHaptic(70);
        onStopStopwatch(Date.now());
        return true;
      }

      if (lower.includes('timer') || lower.includes('टाइमर')) {
        let totalSeconds = 0;
        const minMatch = lower.match(/(\d+)\s*(?:min|minute|minutes|मिनट)/);
        const secMatch = lower.match(/(\d+)\s*(?:sec|second|seconds|सेकंड)/);
        const hrMatch = lower.match(/(\d+)\s*(?:hr|hour|hours|घंटे)/);
        if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;
        if (secMatch) totalSeconds += parseInt(secMatch[1], 10);
        if (hrMatch) totalSeconds += parseInt(hrMatch[1], 10) * 3600;
        if (totalSeconds > 0) {
          const label = `${Math.round(totalSeconds / 60)} Min Timer`;
          onSetTimer(totalSeconds, label, true);
          soundEngine.playStartChime();
          triggerHaptic(70);
          setLastAction({ action: 'SET_TIMER', rawText: text, source: 'local_parser', details: { totalSeconds, label }, timestamp: Date.now() });
          setStatusMessage(isEng ? `⏱️ ${label} started` : `⏱️ ${label} शुरू किया गया`);
          return true;
        }
      }

      if (lower.includes('alarm') || lower.includes('अलार्म') || lower.includes('बजे')) {
        let hour: number | null = null;
        let minute = 0;
        const alarmMatch = lower.match(/(?:alarm|अलार्म|बजे).*?(\d{1,2})(?::(\d{2}))?/);
        const plainMatch = !alarmMatch ? lower.match(/(\d{1,2}):(\d{2})/) : null;
        const m = alarmMatch || plainMatch;
        if (m) {
          const h = parseInt(m[1], 10);
          if (h >= 0 && h < 24) hour = h;
          if (m[2] !== undefined) {
            const mm = parseInt(m[2], 10);
            if (mm >= 0 && mm < 60) minute = mm;
          }
        } else {
          return false;
        }
        if (hour === null) return false;
        if (lower.includes('pm') && hour < 12) hour += 12;
        if (lower.includes('am') && hour === 12) hour = 0;
        if (hour < 0 || hour >= 24) return false;
        const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const repeatMatch = lower.match(/(\d+)\s*(?:bar|बार|times|repeats|repeat)/);
        const repeatCount = repeatMatch ? Math.max(1, parseInt(repeatMatch[1], 10)) : 1;
        const intervalMatch = lower.match(/(?:gap|interval|har|हर|every)\s*(\d+)\s*(?:min|minute|minutes|मिनट)/);
        const intervalMinutes = intervalMatch ? Math.max(1, parseInt(intervalMatch[1], 10)) : 2;
        onSetAlarm(formattedTime, isEng ? 'Voice Alarm' : 'वॉइस अलार्म', repeatCount, intervalMinutes);
        soundEngine.playStartChime();
        triggerHaptic([60, 40, 60]);
        setLastAction({ action: 'SET_ALARM', rawText: text, source: 'local_parser', details: { formattedTime, repeatCount, intervalMinutes }, timestamp: Date.now() });
        setStatusMessage(isEng ? `🔔 Alarm set for ${formattedTime} (${repeatCount} repeats, every ${intervalMinutes}m)!` : `🔔 ${formattedTime} का अलार्म (${repeatCount} बार, हर ${intervalMinutes} मिनट में) सेट!`);
        return true;
      }

      return false;
    },
    [onStartStopwatch, onStopStopwatch, onSetTimer, onSetAlarm, isEng, isStartMatch, isStopMatch]
  );

  const sendToGeminiNlp = useCallback(
    async (text: string, capturedAt: number) => {
      setIsProcessingNlp(true);
      setStatusMessage('🤖 विश्लेषण जारी है (Analyzing command...)');
      try {
        const byok = typeof localStorage !== 'undefined' ? (localStorage.getItem('chronos_byok_keys') || '') : '';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (byok.trim()) headers['X-Gemini-Keys'] = byok;
        const res = await fetch('/api/parse-voice-command', {
          method: 'POST',
          headers,
          body: JSON.stringify({ transcript: text, capturedAt, currentLocalTime: new Date().toLocaleTimeString('en-US', { hour12: false }) }),
        });
        if (!res.ok) throw new Error('Failed to parse command');
        const data = await res.json() as { action?: string; feedbackMessage?: string; capturedAt?: number; timer?: { durationSeconds?: number; label?: string; autoStart?: boolean }; alarm?: { time?: string; label?: string; repeatCount?: number; intervalMinutes?: number } };
        const echoAt = typeof data.capturedAt === 'number' && isFinite(data.capturedAt) ? data.capturedAt : capturedAt;

        if (data.action === 'START_STOPWATCH') {
          onStartStopwatch(echoAt);
          soundEngine.playStartChime();
          setStatusMessage(data.feedbackMessage || 'Stopwatch started');
        } else if (data.action === 'STOP_STOPWATCH') {
          onStopStopwatch(echoAt);
          soundEngine.playStopChime();
          setStatusMessage(data.feedbackMessage || 'Stopwatch stopped');
        } else if (data.action === 'UNKNOWN') {
          setStatusMessage(data.feedbackMessage || 'आदेश समझ नहीं आया');
        } else {
          setStatusMessage(data.feedbackMessage || 'आदेश समझ नहीं आया');
        }

        setLastAction({ action: (data.action as VoiceActionResult['action']) || 'UNKNOWN', rawText: text, source: 'gemini_nlp', details: data, timestamp: Date.now() });
      } catch (err) {
        console.warn('NLP error:', err);
        setStatusMessage('ऑफलाइन पार्सर का उपयोग किया गया');
        tryLocalCommandParser(text);
      } finally {
        setIsProcessingNlp(false);
      }
    },
    [onStartStopwatch, onStopStopwatch, language, tryLocalCommandParser]
  );

  const setupAudioMeter = async (stream: MediaStream) => {
    try {
      if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
      if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
      if (micStreamRef.current && micStreamRef.current !== stream) { micStreamRef.current.getTracks().forEach((t) => t.stop()); }
      micStreamRef.current = stream;
      const AudioCtx = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') { await ctx.resume().catch(() => {}); }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastMeterUpdate = 0;
      const checkVolume = (now: number) => {
        if (!analyserRef.current) return;
        if (now - lastMeterUpdate > 100) {
          lastMeterUpdate = now;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const avg = sum / bufferLength;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(normalized);
        }
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      animFrameRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('Could not initialize audio visualizer:', e);
    }
  };

  const cleanupAudioMeter = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    setAudioLevel(0);
  };

  const startListening = useCallback(
    async (existingStream?: MediaStream | null, isExplicitlyDenied?: boolean): Promise<boolean> => {
      shouldListenRef.current = true;
      setMicPermissionDenied(false);
      setMicErrorType(null);

      if (isExplicitlyDenied) {
        setMicPermissionDenied(true);
        setMicErrorType('denied');
        setStatusMessage(isEng ? 'Microphone blocked. Tap mic to retry.' : 'माइक्रोफ़ोन अनुमति बंद है। चालू करने के लिए माइक दबाएं।');
        setIsListening(false);
        shouldListenRef.current = false;
        cleanupAudioMeter();
        return false;
      }

      let activeStream = existingStream || micStreamRef.current;

      if (!activeStream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e: unknown) {
          const err = e as { name?: string };
          console.warn('getUserMedia prompt rejected or unsupported:', e);
          const errName = err?.name || '';
          if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
            setMicPermissionDenied(true);
            setMicErrorType('denied');
            setStatusMessage(isEng ? 'Microphone blocked. Tap mic to retry.' : 'माइक्रोफ़ोन अनुमति बंद है। चालू करने के लिए माइक दबाएं।');
            setIsListening(false);
            shouldListenRef.current = false;
            return false;
          }
        }
      }

      if (activeStream) {
        setMicSupported(true);
        setMicPermissionDenied(false);
        setMicErrorType(null);
        await setupAudioMeter(activeStream);
      }

      const SpeechRecognition = (window as unknown as { SpeechRecognition: unknown; webkitSpeechRecognition: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setMicSupported(false);
        setStatusMessage(isEng ? '🎙️ Microphone audio active (Live waveform meter ready)' : '🎙️ माइक ऑडियो सक्रिय (लाइव वॉइस मीटर चालू)');
        setIsListening(true);
        return true;
      }

      try {
        if (recognitionRef.current) {
          try { (recognitionRef.current as { abort: () => void }).abort(); } catch {}
          recognitionRef.current = null;
        }

        const RecCtor = SpeechRecognition as unknown as new () => {
          continuous: boolean; interimResults: boolean; maxAlternatives: number; lang: string;
          onstart: (() => void) | null; onsoundstart: (() => void) | null; onsoundend: (() => void) | null;
          onresult: ((event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
          onerror: ((event: { error: string }) => void) | null;
          onend: (() => void) | null;
          start: () => void; abort: () => void;
        };
        const recognition = new RecCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = language;

        pendingCapturedAtRef.current = null;

        recognition.onstart = () => {
          setIsListening(true);
          setMicPermissionDenied(false);
          setAudioLevel(35);
          setStatusMessage(isEng ? '🎙️ Listening — speak "Start", "Stop", "Timer", "Alarm"...' : '🎙️ माइक्रोफ़ोन सक्रिय — बोलो "स्टार्ट", "स्टॉप", "अलार्म"...');
        };

        recognition.onsoundstart = () => {
          setAudioLevel(70);
          if (pendingCapturedAtRef.current === null) pendingCapturedAtRef.current = performance.now();
        };

        recognition.onsoundend = () => { setAudioLevel(20); };

        recognition.onresult = (event) => {
          let currentInterim = '';
          let currentFinal = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            const transcript = item[0].transcript;
            if (!item.isFinal) {
              if (transcript && transcript.trim() && pendingCapturedAtRef.current === null) {
                pendingCapturedAtRef.current = performance.now();
              }
              currentInterim += transcript;
            } else {
              currentFinal += transcript;
            }
            if (item.isFinal) {
              void checkLocalInstantKeywords;
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
            if (!checkLocalInstantKeywords(currentInterim)) {
              // keep listening, no action
            } else {
              pendingCapturedAtRef.current = null;
            }
          }

          if (currentFinal) {
            setFinalTranscript(currentFinal);
            setInterimTranscript('');
            const capturedAt = pendingCapturedAtRef.current ?? performance.now();
            pendingCapturedAtRef.current = null;
            const wasInstant = checkLocalInstantKeywords(currentFinal);
            if (!wasInstant) {
              const wasLocalHandled = tryLocalCommandParser(currentFinal);
              if (!wasLocalHandled) {
                void sendToGeminiNlp(currentFinal, capturedAt);
              }
            }
          }
        };

        recognition.onerror = (event) => {
          if (event.error === 'no-speech') return;
          if (event.error === 'audio-capture' || event.error === 'network') {
            console.warn('SpeechRecognition transient issue:', event.error);
            return;
          }
          if (event.error === 'not-allowed') {
            console.warn('SpeechRecognition not-allowed:', event);
            if (micStreamRef.current && micStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live')) {
              setIsListening(true);
              setStatusMessage(isEng ? '🎙️ Microphone audio active (Live waveform meter ready)' : '🎙️ माइक ऑडियो सक्रिय (लाइव वॉइस मीटर चालू)');
            } else {
              setIsListening(false);
              shouldListenRef.current = false;
              setStatusMessage(isEng ? 'Mic muted — tap mic to allow & start' : 'माइक बंद है — अनुमति देने व चालू करने के लिए टैप करें');
            }
          }
        };

        recognition.onend = () => {
          if (shouldListenRef.current) {
            setTimeout(() => {
              if (shouldListenRef.current) {
                try { recognition.start(); } catch {}
              }
            }, 150);
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (startErr: unknown) {
          const se = startErr as { name?: string };
          if (se.name !== 'InvalidStateError') console.warn('Recognition start exception:', startErr);
        }

        setIsListening(true);
        return true;
      } catch (err: unknown) {
        console.warn('Error starting speech recognition:', err);
        if (micStreamRef.current) {
          setIsListening(true);
          setStatusMessage(isEng ? '🎙️ Microphone active (Meter running)' : '🎙️ माइक्रोफ़ोन सक्रिय (वॉइस मीटर चालू)');
          return true;
        }
        setIsListening(false);
        return false;
      }
    },
    [language, isEng, checkLocalInstantKeywords, tryLocalCommandParser, sendToGeminiNlp]
  );

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    pendingCapturedAtRef.current = null;
    setStatusMessage(isEng ? 'Microphone muted' : 'माइक्रोफ़ोन बंद है');
    if (recognitionRef.current) {
      try { (recognitionRef.current as { abort: () => void }).abort(); } catch {}
      recognitionRef.current = null;
    }
    cleanupAudioMeter();
  }, [isEng]);

  const simulateCommand = useCallback(
    (commandText: string) => {
      setFinalTranscript(commandText);
      const capturedAt = performance.now();
      const wasInstant = checkLocalInstantKeywords(commandText);
      if (!wasInstant) {
        const wasLocal = tryLocalCommandParser(commandText);
        if (!wasLocal) {
          void sendToGeminiNlp(commandText, capturedAt);
        }
      }
    },
    [checkLocalInstantKeywords, tryLocalCommandParser, sendToGeminiNlp]
  );

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) { try { (recognitionRef.current as { abort: () => void }).abort(); } catch {} }
      cleanupAudioMeter();
    };
  }, []);

  return {
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
  };
}
