import React, { useState } from 'react';
import { Mic, MicOff, HelpCircle, Activity, Sparkles, Send, X, ShieldAlert } from 'lucide-react';
import { VoiceActionResult } from '../hooks/useVoiceController';

interface VoiceCommandBarProps {
  isListening: boolean;
  micSupported: boolean;
  micPermissionDenied?: boolean;
  onOpenPermissionGuide?: () => void;
  onToggleListening: () => void;
  audioLevel: number;
  interimTranscript: string;
  finalTranscript: string;
  lastAction: VoiceActionResult | null;
  statusMessage: string;
  noiseSensitivity: 'low' | 'medium' | 'high';
  onSetNoiseSensitivity: (level: 'low' | 'medium' | 'high') => void;
  onSimulateCommand: (text: string) => void;
  lang: 'hi' | 'en' | 'hinglish';
}

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  isListening,
  micSupported,
  micPermissionDenied = false,
  onOpenPermissionGuide,
  onToggleListening,
  audioLevel,
  interimTranscript,
  finalTranscript,
  lastAction,
  statusMessage,
  noiseSensitivity,
  onSetNoiseSensitivity,
  onSimulateCommand,
  lang,
}) => {
  const isEng = lang === 'en';
  const [showHelp, setShowHelp] = useState(false);
  const [simText, setSimText] = useState('');

  const handleSimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (simText.trim()) {
      onSimulateCommand(simText.trim());
      setSimText('');
    }
  };

  return (
    <>
      {/* Sticky Bottom Voice Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl w-full max-w-full overflow-hidden">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-2.5 w-full">
          <button
            type="button"
            onClick={onToggleListening}
            aria-label={isListening ? (isEng ? 'Mute microphone' : 'माइक बंद करें') : (isEng ? 'Allow microphone and start listening' : 'माइक अनुमति दें')}
            className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-between md:justify-start cursor-pointer group select-none p-1 rounded-2xl hover:bg-slate-900/60 transition-colors text-left"
            title={isListening ? (isEng ? 'Mic active — tap to mute' : 'माइक सक्रिय है — बंद करने के लिए टैप करें') : (isEng ? 'Tap to allow microphone & listen' : 'माइक्रोफ़ोन अनुमति देने व चालू करने के लिए यहाँ टैप करें')}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleListening();
              }}
              className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl font-bold transition-all duration-300 shadow-lg cursor-pointer flex-shrink-0 ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/35 animate-pulse'
                  : 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 group-hover:scale-105'
              }`}
            >
              {isListening ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}

              {/* Pulsing halo when listening */}
              {isListening && (
                <span className="absolute -inset-1 rounded-2xl bg-rose-500/30 animate-ping pointer-events-none" />
              )}
            </button>

            {/* Audio Volume Waveform Level Meter & Status text */}
            <div className="flex flex-col flex-1 md:flex-initial">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold truncate transition-colors ${
                  isListening
                    ? 'text-cyan-300'
                    : 'text-slate-200 group-hover:text-cyan-300 underline-offset-2'
                }`}>
                  {isListening
                    ? (isEng ? 'Mic Active (Listening)' : 'माइक चालू है (Listening)')
                    : (isEng ? 'Mic Muted (Tap to Allow)' : 'माइक बंद (टैप करें - Allow Mic)')}
                </span>

                {/* Noise filter level */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = noiseSensitivity === 'low' ? 'medium' : noiseSensitivity === 'medium' ? 'high' : 'low';
                    onSetNoiseSensitivity(next);
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900 border border-slate-750 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                  title="Noise Sensitivity Filter"
                >
                  Noise: {noiseSensitivity.toUpperCase()}
                </button>
              </div>

              {/* Live Waveform Level Bar */}
              <div className="w-28 sm:w-36 h-2 bg-slate-900 rounded-full overflow-hidden mt-1 border border-slate-800 flex items-center">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 transition-all duration-75 rounded-full"
                  style={{ width: `${isListening ? Math.max(8, audioLevel) : 0}%` }}
                />
              </div>
            </div>
          </button>

          {/* Center: Live Transcript / Status */}
          <div className="w-full md:flex-1 md:mx-2 text-center md:text-left overflow-hidden">
            {interimTranscript ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono truncate max-w-full animate-pulse">
                <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">"{interimTranscript}"</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 truncate">
                {statusMessage}
              </p>
            )}
          </div>

          {/* Right: Quick Action simulator shortcuts & Help button */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quick 1-tap test pills */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSimulateCommand('start')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-[11px] font-mono font-bold transition cursor-pointer"
                title="Simulate 'start'"
              >
                Start
              </button>
              <button
                type="button"
                onClick={() => onSimulateCommand('stop')}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 text-[11px] font-mono font-bold transition cursor-pointer"
                title="Simulate 'stop'"
              >
                Stop
              </button>
            </div>

            {micPermissionDenied && onOpenPermissionGuide && (
              <button
                type="button"
                onClick={onOpenPermissionGuide}
                className="px-2 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                title={isEng ? 'Microphone settings guide' : 'माइक्रोफ़ोन सेटिंग्स गाइड'}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{isEng ? 'Permission Help' : 'परमिशन सहायता'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title={isEng ? 'Voice Commands Guide' : 'वॉइस कमांड गाइड'}
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Voice Commands Guide & Manual Tester Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-750 p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {isEng ? 'Voice Commands Guide & Tester' : 'वॉइस कमांड्स व विशेषताएं (Voice Commands Guide)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Keyword List */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-750">
                <span className="font-bold text-cyan-300 block mb-1">
                  {isEng ? '⚡ 1. Instant Zero-Delay Start:' : '⚡ 1. तत्काल स्टॉपवॉच शुरू (Instant Zero-Delay Start):'}
                </span>
                <p className="text-slate-300 mb-1">
                  {isEng
                    ? 'Triggers stopwatch the millisecond you utter the word:'
                    : 'जैसे ही आप बोलेंगे, उसी मिलीसेकंड/सेकंड से तुरंत स्टॉपवॉच शुरू हो जाएगी:'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Start', 'Go', 'Run', 'Begin', 'स्टार्ट', 'शुरू', 'चालू'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onSimulateCommand(k.toLowerCase())}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono font-semibold cursor-pointer border border-cyan-500/30"
                    >
                      "{k}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-750">
                <span className="font-bold text-rose-300 block mb-1">
                  {isEng ? '🛑 2. Instant Zero-Delay Stop:' : '🛑 2. तत्काल स्टॉपवॉच रोकना (Instant Zero-Delay Stop):'}
                </span>
                <p className="text-slate-300 mb-1">
                  {isEng
                    ? 'Instant pause / stop on detection:'
                    : 'बैकग्राउंड शोर के बीच भी यह शब्द आते ही तुरंत रुक जाएगा:'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Stop', 'Pause', 'Halt', 'स्टॉप', 'रुक जाओ', 'रोक'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onSimulateCommand(k.toLowerCase())}
                      className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono font-semibold cursor-pointer border border-rose-500/30"
                    >
                      "{k}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-750">
                <span className="font-bold text-purple-300 block mb-1">
                  {isEng ? '🏁 3. Lap & Reset Commands:' : '🏁 3. लैप और रीसेट (Lap & Reset):'}
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => onSimulateCommand('lap')}
                    className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-mono font-semibold cursor-pointer border border-purple-500/30"
                  >
                    "Lap" / "लैप"
                  </button>
                  <button
                    type="button"
                    onClick={() => onSimulateCommand('reset')}
                    className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-mono font-semibold cursor-pointer border border-purple-500/30"
                  >
                    "Reset" / "रीसेट"
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-750">
                <span className="font-bold text-amber-300 block mb-1">
                  {isEng ? '🔔 4. Multi-Repeat Interval Alarm:' : '🔔 4. मल्टी-रिपीट इंटरवल अलार्म:'}
                </span>
                <p className="text-slate-300 mb-1">
                  {isEng
                    ? '"Set 2:00 alarm with 5 repeats every 2 minutes gap"'
                    : '"2:00 बजे का अलार्म लगा दो और 5 बार बजना चाहिए हर 2 मिनट के गैप में"'}
                </p>
                <button
                  type="button"
                  onClick={() => onSimulateCommand('14:00 alarm 5 repeat 2 minute gap')}
                  className="mt-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold cursor-pointer border border-amber-500/30 text-left"
                >
                  ⚡ Test: "14:00 alarm 5 repeats 2 min gap"
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-750">
                <span className="font-bold text-emerald-300 block mb-1">
                  {isEng ? '⏱️ 5. Countdown Timer:' : '⏱️ 5. काउंटडाउन टाइमर (Timer):'}
                </span>
                <p className="text-slate-300 mb-1">
                  {isEng ? '"Set 2 minute timer" or "5 minute timer"' : '"दो मिनट का टाइमर लगा दो" या "5 minute timer"'}
                </p>
                <button
                  type="button"
                  onClick={() => onSimulateCommand('2 minute timer')}
                  className="mt-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[11px] font-semibold cursor-pointer border border-emerald-500/30 text-left"
                >
                  ⚡ Test: "2 minute timer"
                </button>
              </div>
            </div>

            {/* Manual Command Simulator / Tester */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isEng ? '⌨️ Type Command to Test (Simulator):' : '⌨️ वॉइस टेस्ट सिमुलेटर (Type & Test Commands):'}
              </label>
              <form onSubmit={handleSimSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder={isEng ? 'e.g. start, stop, 2 minute timer, 14:00 alarm 5 repeats...' : 'उदा. शुरू, स्टॉप, दो मिनट का टाइमर, 2:00 बजे का अलार्म 5 बार...'}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isEng ? 'Test' : 'टेस्ट'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
