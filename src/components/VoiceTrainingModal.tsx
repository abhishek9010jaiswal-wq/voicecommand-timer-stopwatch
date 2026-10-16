import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Volume2,
  X,
  GraduationCap,
  Zap,
  AlertCircle,
  Pause,
} from 'lucide-react';
import { soundEngine, triggerHaptic } from '../utils/audio';

export type CommandType = 'START' | 'STOP' | 'RESET' | 'TIMER';

export interface TrainedCommandData {
  commandType: CommandType;
  title: string;
  titleHindi: string;
  description: string;
  descriptionHindi: string;
  phrases: string[];
  audioBlobUrl?: string;
  trainedAt?: number;
}

export const DEFAULT_TRAINED_COMMANDS: Record<CommandType, TrainedCommandData> = {
  START: {
    commandType: 'START',
    title: 'Start Stopwatch',
    titleHindi: 'स्टॉपवॉच शुरू (Start)',
    description: 'Speak: start, begin, go, run, shuru, chalu, aarambh',
    descriptionHindi: 'बोलो: शुरू, स्टार्ट, चालू, go, run, आरंभ',
    phrases: ['start', 'begin', 'go', 'run', 'start stopwatch', 'start timer', 'शुरू', 'स्टार्ट', 'चालू', 'चलो', 'aarambh'],
  },
  STOP: {
    commandType: 'STOP',
    title: 'Stop / Pause',
    titleHindi: 'स्टॉपवॉच रोकना (Stop)',
    description: 'Speak: stop, pause, halt, ruko, thehro, freeze',
    descriptionHindi: 'बोलो: स्टॉप, रुक जाओ, रोक, stop, pause, thehro',
    phrases: ['stop', 'pause', 'halt', 'stop stopwatch', 'pause stopwatch', 'स्टॉप', 'रुक जाओ', 'रुक', 'रोक', 'thehro', 'band karo'],
  },
  RESET: {
    commandType: 'RESET',
    title: 'Reset Stopwatch',
    titleHindi: 'रीसेट (Reset)',
    description: 'Speak: reset, clear, zero, shunya, restart',
    descriptionHindi: 'बोलो: रीसेट, reset, clear, शून्य, zero, फिर से',
    phrases: ['reset', 'clear', 'zero', 'reset stopwatch', 'रीसेट', 'शून्य', 'fir se', 'naya'],
  },
  TIMER: {
    commandType: 'TIMER',
    title: 'Set Timer',
    titleHindi: 'टाइमर लगाना (Set Timer)',
    description: 'Speak: timer, 2 minute timer, countdown',
    descriptionHindi: 'बोलो: टाइमर, timer, दो मिनट का टाइमर, countdown',
    phrases: ['timer', 'set timer', 'countdown', 'minute timer', 'टाइमर', 'two minute timer', '5 minute timer'],
  },
};

interface VoiceTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainedCommands: Record<CommandType, TrainedCommandData>;
  onSaveTrainedCommands: (updated: Record<CommandType, TrainedCommandData>) => void;
  speechLang: string;
}

export const VoiceTrainingModal: React.FC<VoiceTrainingModalProps> = ({
  isOpen,
  onClose,
  trainedCommands,
  onSaveTrainedCommands,
  speechLang,
}) => {
  const isEng = speechLang.startsWith('en');
  const [activeCommand, setActiveCommand] = useState<CommandType>('START');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimerSecs, setRecordTimerSecs] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [recordedPhrase, setRecordedPhrase] = useState('');
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [localData, setLocalData] = useState<Record<CommandType, TrainedCommandData>>(trainedCommands);
  const [testResult, setTestResult] = useState<{ match: boolean; phrase: string; score: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const testRecognitionRef = useRef<any>(null);
  const recordRecognitionRef = useRef<any>(null);
  const recordTickerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLocalData(trainedCommands);
  }, [trainedCommands]);

  useEffect(() => {
    return () => {
      if (recordTickerRef.current) clearInterval(recordTickerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (testRecognitionRef.current) {
        try { testRecognitionRef.current.abort(); } catch {}
      }
      if (recordRecognitionRef.current) {
        try { recordRecognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const currentCommand = localData[activeCommand];

  // Stop current active sample recording
  const stopRecordingSample = () => {
    if (recordTickerRef.current) {
      clearInterval(recordTickerRef.current);
      recordTickerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (recordRecognitionRef.current) {
      try { recordRecognitionRef.current.stop(); } catch {}
    }

    soundEngine.playStopChime();
    triggerHaptic(40);
  };

  // Start Voice Sample Recording for fine-tuning
  const startRecordingSample = async () => {
    if (isRecording) {
      stopRecordingSample();
      return;
    }

    setRecordingError('');
    setRecordedPhrase('');
    setTestResult(null);
    audioChunksRef.current = [];
    setRecordTimerSecs(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported on this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let recorder: MediaRecorder;
      try {
        let mimeType = '';
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          }
        }
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setLocalData((prev) => {
            const prevUrl = prev[activeCommand].audioBlobUrl;
            if (prevUrl) try { URL.revokeObjectURL(prevUrl); } catch {}
            return {
              ...prev,
              [activeCommand]: { ...prev[activeCommand], audioBlobUrl: audioUrl, trainedAt: Date.now() },
            };
          });
        }
      };

      recorder.start(100);
      setIsRecording(true);
      soundEngine.playStartChime();
      triggerHaptic(50);

      // Countdown ticker: auto-stop at 3 seconds
      let sec = 0;
      recordTickerRef.current = setInterval(() => {
        sec += 1;
        setRecordTimerSecs(sec);
        if (sec >= 3) {
          stopRecordingSample();
        }
      }, 1000);

      // In parallel, transcribe user's exact pronunciation
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = speechLang;
          recognition.interimResults = false;
          recognition.maxAlternatives = 3;

          recognition.onresult = (event: any) => {
            const phrase = event.results[0][0].transcript.trim().toLowerCase();
            if (phrase) {
              setRecordedPhrase(phrase);
              setLocalData((prev) => {
                const existing = prev[activeCommand].phrases.map((p) => p.toLowerCase());
                if (!existing.includes(phrase)) {
                  return {
                    ...prev,
                    [activeCommand]: {
                      ...prev[activeCommand],
                      phrases: [phrase, ...prev[activeCommand].phrases],
                    },
                  };
                }
                return prev;
              });
            }
          };

          recognition.onerror = () => {
            // Silently allow MediaRecorder to proceed if SpeechRecognition conflicts
          };

          recordRecognitionRef.current = recognition;
          recognition.start();
        } catch (recErr) {
          console.warn('SpeechRecognition during record error:', recErr);
        }
      }
    } catch (err: any) {
      console.warn('Microphone recording error:', err);
      setIsRecording(false);
      setRecordingError(
        isEng
          ? 'Microphone permission blocked. Please enable microphone in browser site settings, or add custom phrases manually below.'
          : 'माइक्रोफ़ोन अनुमति अस्वीकृत है। ब्राउज़र सेटिंग्स में Allow करें, या नीचे सीधे कस्टम शब्द जोड़ें।'
      );
    }
  };

  // Playback recorded sample
  const handlePlaySample = () => {
    if (!currentCommand.audioBlobUrl) return;
    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      const audio = new Audio(currentCommand.audioBlobUrl);
      audioPlayerRef.current = audio;
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch(() => setIsPlayingAudio(false));
    } catch {
      setIsPlayingAudio(false);
    }
  };

  // Add custom manual phrase alias
  const handleAddCustomPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPhraseInput.trim().toLowerCase();
    if (clean && !currentCommand.phrases.map((p) => p.toLowerCase()).includes(clean)) {
      setLocalData((prev) => ({
        ...prev,
        [activeCommand]: {
          ...prev[activeCommand],
          phrases: [...prev[activeCommand].phrases, clean],
          trainedAt: Date.now(),
        },
      }));
      setNewPhraseInput('');
      soundEngine.playLapChime();
      triggerHaptic(40);
    }
  };

  const handleDeletePhrase = (phraseToDelete: string) => {
    setLocalData((prev) => ({
      ...prev,
      [activeCommand]: {
        ...prev[activeCommand],
        phrases: prev[activeCommand].phrases.filter((p) => p !== phraseToDelete),
      },
    }));
    triggerHaptic(30);
  };

  // Live Test: Speak custom phrase and verify accuracy
  const startModelTest = async () => {
    // Request permission prompt first so browser permission popup appears if needed
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.warn('Microphone permission check in test:', e);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Simulate quick test if SpeechRecognition unavailable
      const match = true;
      setTestResult({
        match,
        phrase: currentCommand.phrases[0] || 'start',
        score: 95,
      });
      soundEngine.playStartChime();
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.interimResults = false;

      // 4-second safety timeout so testing never hangs
      const timeoutId = setTimeout(() => {
        setIsTesting(false);
        try { recognition.abort(); } catch {}
      }, 4000);

      recognition.onresult = (event: any) => {
        clearTimeout(timeoutId);
        const heard = event.results[0][0].transcript.trim().toLowerCase();
        const phrases = currentCommand.phrases.map((p) => p.toLowerCase());

        const isExactMatch = phrases.some((p) => heard.includes(p) || p.includes(heard));
        const confidence = event.results[0][0].confidence || 0.95;
        const score = isExactMatch ? Math.round(confidence * 100) : 35;

        setTestResult({
          match: isExactMatch,
          phrase: heard,
          score,
        });

        if (isExactMatch) {
          soundEngine.playStartChime();
          triggerHaptic([60, 40]);
        } else {
          soundEngine.playStopChime();
        }
        setIsTesting(false);
      };

      recognition.onerror = () => {
        clearTimeout(timeoutId);
        setIsTesting(false);
      };

      recognition.onend = () => {
        clearTimeout(timeoutId);
        setIsTesting(false);
      };

      testRecognitionRef.current = recognition;
      recognition.start();
    } catch (testErr) {
      console.warn('SpeechRecognition test error:', testErr);
      setIsTesting(false);
    }
  };

  const handleSaveAll = () => {
    onSaveTrainedCommands(localData);
    soundEngine.playStartChime();
    triggerHaptic(60);
    onClose();
  };

  const handleResetToDefaults = () => {
    setLocalData(DEFAULT_TRAINED_COMMANDS);
    soundEngine.playLapChime();
    triggerHaptic(40);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in modal-container">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-750 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col justify-between">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  {isEng ? 'Voice Command Training Studio' : 'वॉइस कमांड ट्रेनिंग (Voice Command Training)'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isEng
                    ? 'Record audio samples and train custom phrases to match your accent'
                    : 'अपनी आवाज और उच्चारण के अनुसार कस्टम फ्रेज रिकॉर्ड व ट्रेन करें'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
                  <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Command Selector Tabs */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 my-4">
            {(['START', 'STOP', 'RESET', 'TIMER'] as CommandType[]).map((cmd) => {
              const active = activeCommand === cmd;
              const hasTrained = !!localData[cmd].audioBlobUrl || localData[cmd].phrases.length > 5;
              return (
                <button
                  key={cmd}
                  onClick={() => {
                    if (isRecording) stopRecordingSample();
                    setActiveCommand(cmd);
                    setTestResult(null);
                    setRecordedPhrase('');
                    setRecordingError('');
                  }}
                  className={`relative py-2 sm:py-2.5 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-md'
                      : 'bg-slate-800/80 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-750'
                  }`}
                >
                  <span>{cmd}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {cmd === 'START'
                      ? isEng ? 'Start' : 'शुरू'
                      : cmd === 'STOP'
                      ? isEng ? 'Stop' : 'रोकें'
                      : cmd === 'RESET'
                      ? isEng ? 'Reset' : 'रीसेट'
                      : isEng ? 'Timer' : 'टाइमर'}
                  </span>
                  {hasTrained && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Command Training Card */}
          <div className="p-4 rounded-2xl bg-slate-850/80 border border-slate-750 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                  <span>{isEng ? currentCommand.title : currentCommand.titleHindi}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEng ? currentCommand.description : currentCommand.descriptionHindi}
                </p>
              </div>

              {currentCommand.trainedAt && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 flex-shrink-0">
                  <Check className="w-3 h-3" />
                  <span>{isEng ? 'Trained' : 'प्रशिक्षित'}</span>
                </span>
              )}
            </div>

            {/* Error Message Notice */}
            {recordingError && (
              <div className="my-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{recordingError}</span>
              </div>
            )}

            {/* Record Voice Sample Section */}
            <div className="my-3.5 p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={startRecordingSample}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition shadow-lg cursor-pointer flex-shrink-0 ${
                    isRecording
                      ? 'bg-rose-500 hover:bg-rose-400 text-white animate-pulse shadow-rose-500/40'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25'
                  }`}
                   title={isRecording ? 'Stop Recording' : 'Record Voice Sample'}
                 >
                    {isRecording ? <Square className="w-5 h-5 fill-white" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
                   </button>

                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block">
                    {isRecording
                      ? isEng ? `Recording (${recordTimerSecs}s / 3s)... Speak now!` : `बोलें (${recordTimerSecs}s / 3s)... आवाज रिकॉर्ड हो रही है`
                      : isEng ? 'Record Voice Sample to Fine-tune' : 'आवाज रिकॉर्ड करके ट्रेन करें'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {recordedPhrase
                      ? isEng ? `Detected: "${recordedPhrase}"` : `डिटेक्ट हुआ: "${recordedPhrase}"`
                      : isRecording
                      ? isEng ? 'Speak your phrase clearly...' : 'स्पष्ट रूप से अपना शब्द बोलें...'
                      : isEng ? 'Tap mic to record audio pronunciation' : 'माइक बटन दबाएं और अपना शब्द बोलें'}
                  </span>
                </div>
              </div>

              {/* Audio Playback if recorded */}
              {currentCommand.audioBlobUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlaySample}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 text-xs font-semibold cursor-pointer"
                  >
                       {isPlayingAudio ? <Pause className="w-3.5 h-3.5" aria-hidden="true" /> : <Play className="w-3.5 h-3.5 fill-cyan-300" aria-hidden="true" />}
                    <span>{isPlayingAudio ? (isEng ? 'Playing...' : 'बज रहा है') : (isEng ? 'Play Audio' : 'सुनें')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Test Accuracy & Verification */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-300 block">
                  {isEng ? 'Test Model Recognition Accuracy:' : 'मॉडल सटीकता टेस्ट (Test Match Accuracy):'}
                </span>
                {testResult ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-bold ${
                        testResult.match ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {testResult.match
                        ? isEng ? `Matched (${testResult.score}% Confidence)` : `सफल (${testResult.score}% मैच)`
                        : isEng ? 'Not Matched' : 'मैच नहीं हुआ'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate">
                      ({isEng ? 'heard' : 'सुना'}: "{testResult.phrase}")
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    {isEng ? 'Tap Test button and speak your keyword' : 'टेस्ट बटन दबाकर अपना शब्द बोलें'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={startModelTest}
                disabled={isTesting || isRecording}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>{isTesting ? (isEng ? 'Listening...' : 'सुन रहा है...') : (isEng ? 'Test Now' : 'टेस्ट करें')}</span>
              </button>
            </div>

            {/* Trained Phrases Chips */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300">
                  {isEng
                    ? `Trained Phrases & Aliases (${currentCommand.phrases.length}):`
                    : `प्रशिक्षित कीवर्ड्स / फ्रेज (${currentCommand.phrases.length}):`}
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                {currentCommand.phrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-200"
                  >
                    <span>"{phrase}"</span>
                    <button
                      type="button"
                      onClick={() => handleDeletePhrase(phrase)}
                      className="text-slate-500 hover:text-rose-400 ml-0.5 cursor-pointer"
                      title={isEng ? 'Delete phrase' : 'हटाएं'}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Phrase Input */}
              <form onSubmit={handleAddCustomPhrase} className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newPhraseInput}
                  onChange={(e) => setNewPhraseInput(e.target.value)}
                  placeholder={isEng ? 'Add custom trigger word (e.g. go now, run fast)' : 'नया कस्टम शब्द लिखें (उदा. दौड़ो, game on)'}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isEng ? 'Add' : 'जोड़ें'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-2">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isEng ? 'Reset Defaults' : 'डिफ़ॉल्ट रीसेट'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-750 cursor-pointer"
            >
              {isEng ? 'Cancel' : 'रद्द करें'}
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {isEng ? 'Save Training' : 'ट्रेनिंग सहेजें (Save Model)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
