import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Bell,
  Volume2,
  Sparkles,
  Repeat,
  Settings2,
  Check,
  Coffee,
} from 'lucide-react';
import {
  soundEngine,
  triggerHaptic,
  speakText,
  AlarmSoundType,
  AVAILABLE_ALARM_SOUNDS,
  showSystemNotification,
} from '../utils/audio';

interface TimerProps {
  initialSeconds?: number;
  initialLabel?: string;
  autoStartTrigger?: number;
  lang: 'hi' | 'en' | 'hinglish';
}

export const Timer: React.FC<TimerProps> = ({
  initialSeconds = 120, // default 2 minutes
  initialLabel = '2 Min Timer',
  autoStartTrigger = 0,
  lang,
}) => {
  const isEng = lang === 'en';
  const speechLang = isEng ? 'en-US' : 'hi-IN';
  const [workSeconds, setWorkSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [timerTitle, setTimerTitle] = useState(initialLabel);
  const [isFinished, setIsFinished] = useState(false);

  // Advanced Customization Options
  const [repeatCount, setRepeatCount] = useState(1); // total repeats
  const [intervalGapSeconds, setIntervalGapSeconds] = useState(60); // gap between repeats (e.g. 1 min)
  const [selectedSound, setSelectedSound] = useState<AlarmSoundType>('digital_beep');
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<'work' | 'gap'>('work'); // 'work' countdown or 'gap' break countdown

  // Manual custom input modal states
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(2);
  const [customSecs, setCustomSecs] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<'work' | 'gap'>(phase);
  const currentRoundRef = useRef(currentRound);
  const repeatCountRef = useRef(repeatCount);
  const intervalGapRef = useRef(intervalGapSeconds);
  const workSecondsRef = useRef(workSeconds);
  const timerTitleRef = useRef(timerTitle);
  const selectedSoundRef = useRef(selectedSound);
  const isEngRef = useRef(isEng);
  const speechLangRef = useRef(speechLang);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);
  useEffect(() => { repeatCountRef.current = repeatCount; }, [repeatCount]);
  useEffect(() => { intervalGapRef.current = intervalGapSeconds; }, [intervalGapSeconds]);
  useEffect(() => { workSecondsRef.current = workSeconds; }, [workSeconds]);
  useEffect(() => { timerTitleRef.current = timerTitle; }, [timerTitle]);
  useEffect(() => { selectedSoundRef.current = selectedSound; }, [selectedSound]);
  useEffect(() => { isEngRef.current = isEng; }, [isEng]);
  useEffect(() => { speechLangRef.current = speechLang; }, [speechLang]);

  // Quick Presets
  const presets = [
    { label: '30s', seconds: 30 },
    { label: '1m', seconds: 60 },
    { label: '2m', seconds: 120 },
    { label: '3m', seconds: 180 },
    { label: '5m', seconds: 300 },
    { label: '10m', seconds: 600 },
    { label: '15m', seconds: 900 },
    { label: '25m (Pomodoro)', seconds: 1500 },
  ];

  // Update when external voice triggers a new timer
  useEffect(() => {
    if (autoStartTrigger > 0 && initialSeconds > 0) {
      setWorkSeconds(initialSeconds);
      setRemainingSeconds(initialSeconds);
      setTimerTitle(initialLabel);
      setCurrentRound(1);
      setPhase('work');
      setIsRunning(true);
      setIsFinished(false);
      soundEngine.enableBackgroundKeepAlive();
    }
  }, [autoStartTrigger, initialSeconds, initialLabel]);

  useEffect(() => {
    if (!isRunning) {
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
      return;
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          const ph = phaseRef.current;
          const cr = currentRoundRef.current;
          const rc = repeatCountRef.current;
          const gap = intervalGapRef.current;
          const ws = workSecondsRef.current;
          const title = timerTitleRef.current;
          const snd = selectedSoundRef.current;
          const eng = isEngRef.current;
          const sLang = speechLangRef.current;
          if (ph === 'work') {
            soundEngine.startAlarmSound(snd);
            triggerHaptic([200, 100, 200, 100, 500]);
            showSystemNotification(eng ? 'Timer Round Complete!' : 'टाइमर राउंड पूरा! (Round Done)', `${title} - ${eng ? 'Round' : 'राउंड'} ${cr}/${rc} ${eng ? 'done' : 'समाप्त'}!`);
            speakText(eng ? `Round ${cr} finished!` : `राउंड ${cr} समाप्त हुआ!`, sLang);
            if (cr < rc) {
              if (gap > 0) {
                setPhase('gap');
                speakText(eng ? `${Math.round(gap / 60)} minute break now.` : `अब ${Math.round(gap / 60)} मिनट का ब्रेक है।`, sLang);
                return gap;
              } else {
                setCurrentRound((r) => r + 1);
                return ws;
              }
            } else {
              if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
              setIsRunning(false);
              setIsFinished(true);
              soundEngine.disableBackgroundKeepAlive();
              speakText(eng ? 'All timer rounds completed!' : 'सभी राउंड समाप्त हुए! All timer repeats completed!', sLang);
              return 0;
            }
          } else {
            soundEngine.playStartChime();
            setPhase('work');
            setCurrentRound((r) => r + 1);
            speakText(isEngRef.current ? `Round ${cr + 1} starting!` : `राउंड ${cr + 1} शुरू हो रहा है!`, speechLangRef.current);
            return ws;
          }
        }
        if (prev <= 4) soundEngine.playTick();
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; } };
  }, [isRunning]);

  const handleStart = () => {
    if (remainingSeconds === 0) {
      setRemainingSeconds(workSeconds);
      setCurrentRound(1);
      setPhase('work');
    }
    setIsFinished(false);
    soundEngine.stopAlarmSound();
    soundEngine.playStartChime();
    soundEngine.enableBackgroundKeepAlive();
    triggerHaptic(50);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    soundEngine.playStopChime();
    soundEngine.disableBackgroundKeepAlive();
    triggerHaptic(30);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    soundEngine.stopAlarmSound();
    soundEngine.disableBackgroundKeepAlive();
    soundEngine.playLapChime();
    setCurrentRound(1);
    setPhase('work');
    setRemainingSeconds(workSeconds);
  };

  const applyPreset = (secs: number, label: string) => {
    setIsRunning(false);
    setIsFinished(false);
    soundEngine.stopAlarmSound();
    setWorkSeconds(secs);
    setRemainingSeconds(secs);
    setTimerTitle(label);
    setCurrentRound(1);
    setPhase('work');
    soundEngine.playStartChime();
  };

  const applyCustomSettings = () => {
    const total = customHours * 3600 + customMinutes * 60 + customSecs;
    if (total > 0) {
      setWorkSeconds(total);
      setRemainingSeconds(total);
      setTimerTitle(`${customHours > 0 ? customHours + 'h ' : ''}${customMinutes}m ${customSecs}s`);
      setCurrentRound(1);
      setPhase('work');
      setIsRunning(false);
      setIsFinished(false);
      setShowSettingsModal(false);
      soundEngine.playStartChime();
    }
  };

  // Format MM : SS or HH : MM : SS
  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  // SVG circular progress calculation
  const totalPhaseDuration = phase === 'work' ? workSeconds : intervalGapSeconds;
  const progressPercent = totalPhaseDuration > 0 ? ((totalPhaseDuration - remainingSeconds) / totalPhaseDuration) * 100 : 0;
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* Finished Alert Banner */}
      {isFinished && (
        <div className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 border-2 border-amber-400 text-center animate-bounce shadow-2xl">
          <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-lg mb-1">
            <Bell className="w-6 h-6 animate-spin" />
            <span>टाइमर समाप्त! (Time's Up!)</span>
          </div>
          <p className="text-xs text-slate-200">
            {timerTitle} — सभी {repeatCount} रिपीट पूरे हो चुके हैं।
          </p>
          <button
            onClick={() => {
              soundEngine.stopAlarmSound();
              setIsFinished(false);
            }}
            className="mt-3 px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition shadow cursor-pointer"
          >
            आवाज बंद करें (Dismiss)
          </button>
        </div>
      )}

      {/* Header Info: Title, Repeats & Phase Badge */}
      <div className="flex items-center justify-between w-full px-2 mb-2">
        <div className="flex items-center gap-2">
           <Sparkles className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-300">
            {timerTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Badge */}
          {phase === 'gap' ? (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 animate-pulse">
              <Coffee className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isEng ? 'Break' : 'गैप ब्रेक (Break)'}</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5" />
              <span>{isEng ? `Round ${currentRound} / ${repeatCount}` : `राउंड ${currentRound} / ${repeatCount}`}</span>
            </span>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer"
            title="Custom Timer & Sound Settings"
          >
            <Settings2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Circular Progress & Display */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center my-3">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className="text-slate-800/80"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            className={`transition-all duration-500 ease-linear ${
              phase === 'gap' ? 'text-amber-400' : 'text-cyan-400'
            }`}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono font-black text-white text-4xl sm:text-5xl md:text-6xl tracking-tight drop-shadow-md">
            {hrs > 0 && <span>{pad(hrs)}:</span>}
            <span>{pad(mins)}:</span>
            <span>{pad(secs)}</span>
          </div>

          <span className="text-[11px] font-mono text-slate-400 mt-2 uppercase tracking-wider">
            {remainingSeconds > 0
              ? phase === 'gap'
                ? isEng ? `Break: ${remainingSeconds}s left` : `ब्रेक गैप: ${remainingSeconds}s शेष`
                : isEng ? `${Math.round((remainingSeconds / workSeconds) * 100)}% left` : `${Math.round((remainingSeconds / workSeconds) * 100)}% शेष`
              : isEng ? 'Round Complete' : 'राउंड पूरा'}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4 my-4">
        <button
          type="button"
          onClick={handleReset}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 transition cursor-pointer shadow-lg"
          title="Reset"
        >
          <RotateCcw className="w-5 h-5 mb-1 text-slate-400" aria-hidden="true" />
          <span className="text-[11px]">{isEng ? 'Reset' : 'रीसेट'}</span>
        </button>

        {isRunning ? (
          <button
            type="button"
            onClick={handlePause}
            className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-95 transition shadow-xl shadow-amber-500/25 cursor-pointer"
          >
            <Pause className="w-8 h-8 fill-slate-950 mb-0.5" aria-hidden="true" />
            <span className="text-xs">{isEng ? 'Pause' : 'रोकें'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold active:scale-95 transition shadow-xl shadow-cyan-500/25 cursor-pointer"
          >
            <Play className="w-8 h-8 fill-white mb-0.5 ml-1" aria-hidden="true" />
            <span className="text-xs">{isEng ? 'Start' : 'शुरू'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 active:scale-95 transition cursor-pointer shadow-lg"
          title="Custom Settings"
        >
          <Settings2 className="w-5 h-5 mb-1 text-cyan-400" />
          <span className="text-[11px]">{isEng ? 'Custom' : 'कस्टम'}</span>
        </button>
      </div>

      {/* Quick Presets Grid */}
      <div className="w-full mt-4 bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            त्वरित प्रीसेट (Quick Presets)
          </span>
          <span className="text-[11px] text-cyan-400">या बोलें: "दो मिनट का टाइमर"</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {presets.map((p) => {
            const isCurrent = workSeconds === p.seconds && !isRunning;
            return (
              <button
                key={p.seconds}
                onClick={() => applyPreset(p.seconds, `${p.label} Timer`)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isCurrent
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-750 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Customization Modal (Duration, Repetitions, Intervals, Sound) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in modal-container">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-750 p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-cyan-400" aria-hidden="true" />
              टाइमर एडवांस्ड सेटिंग्स (Advanced Options)
            </h3>

            {/* Duration Input */}
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              टाइमर अवधि (Duration):
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">घंटे (Hrs)</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={customHours}
                  onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-center text-lg font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">मिनट (Mins)</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-center text-lg font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">सेकंड (Secs)</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customSecs}
                  onChange={(e) => setCustomSecs(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-center text-lg font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Repetitions Count (1 to 10 repeats) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  रिपीट संख्या (Repetitions Count):
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {repeatCount} बार
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 5, 8].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setRepeatCount(n)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      repeatCount === n
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            {/* Interval between repetitions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  रिपीट के बीच अंतराल गैप (Interval Gap):
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {intervalGapSeconds >= 60 ? `${Math.round(intervalGapSeconds / 60)} min` : `${intervalGapSeconds}s`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '0s (तुरंत)', val: 0 },
                  { label: '30s', val: 30 },
                  { label: '1m', val: 60 },
                  { label: '2m', val: 120 },
                ].map((gap) => (
                  <button
                    type="button"
                    key={gap.val}
                    onClick={() => setIntervalGapSeconds(gap.val)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                      intervalGapSeconds === gap.val
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {gap.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alarm Sound Selection */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                अलार्म टोन चुनें (Select Alarm Sound):
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {AVAILABLE_ALARM_SOUNDS.map((snd) => {
                  const isSelected = selectedSound === snd.id;
                  return (
                    <div
                      key={snd.id}
                      onClick={() => setSelectedSound(snd.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 text-white'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-slate-950 font-bold" aria-hidden="true" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{snd.nameHindi}</span>
                          <span className="text-[10px] text-slate-400">{snd.description}</span>
                        </div>
                      </div>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.previewSound(snd.id);
                        }}
                        className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-650 text-cyan-300 text-xs flex items-center gap-1 cursor-pointer"
                        title="ध्वनि सुनें"
                      >
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="text-[10px]">सुने</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={applyCustomSettings}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                सेटिंग्स लागू करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
