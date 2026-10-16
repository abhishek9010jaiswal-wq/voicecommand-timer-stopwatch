import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flag, Maximize2, Minimize2, Copy, Download, Zap } from 'lucide-react';
import { soundEngine, triggerHaptic } from '../utils/audio';

export interface LapItem {
  id: number;
  lapNumber: number;
  lapDurationMs: number;
  totalElapsedMs: number;
  timestamp: string;
}

interface StopwatchProps {
  isRunning: boolean;
  elapsedMs: number;
  onToggle: () => void;
  onReset: () => void;
  onLap: () => void;
  laps: LapItem[];
  lang: 'hi' | 'en' | 'hinglish';
}

export const Stopwatch: React.FC<StopwatchProps> = ({
  isRunning,
  elapsedMs,
  onToggle,
  onReset,
  onLap,
  laps,
  lang,
}) => {
  const isEng = lang === 'en';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copyNotice, setCopyNotice] = useState(false);

  // Format milliseconds into HH : MM : SS . mmm (3-digit millisecond accuracy)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor(ms % 1000);

    const pad = (n: number, z = 2) => String(n).padStart(z, '0');

    return {
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
      milliseconds: pad(milliseconds, 3),
      formatted: `${hours > 0 ? pad(hours) + ':' : ''}${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`,
    };
  };

  const timeParts = formatTime(elapsedMs);

  // Identify fastest & slowest lap
  const lapTimes = laps.map((l) => l.lapDurationMs);
  const fastestTime = laps.length > 1 ? Math.min(...lapTimes) : -1;
  const slowestTime = laps.length > 1 ? Math.max(...lapTimes) : -1;

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        }
      } catch {}
      setIsFullscreen(true);
    } else {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any)?.webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      } catch {}
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const handleCopyLaps = () => {
    if (laps.length === 0) return;
    const text = laps
      .map(
        (l) =>
          `Lap #${l.lapNumber} | Lap: ${formatTime(l.lapDurationMs).formatted} | Total: ${formatTime(l.totalElapsedMs).formatted}`
      )
      .join('\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2000);
  };

  const handleDownloadCsv = () => {
    if (laps.length === 0) return;
    const rows = [
      ['Lap Number', 'Lap Time', 'Total Elapsed', 'Recorded At'],
      ...laps.map((l) => [
        l.lapNumber,
        formatTime(l.lapDurationMs).formatted,
        formatTime(l.totalElapsedMs).formatted,
        l.timestamp,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stopwatch_laps_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-between w-full mx-auto transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl p-4 sm:p-8 flex flex-col items-center justify-between overflow-y-auto'
          : 'max-w-2xl'
      }`}
    >
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono tracking-widest uppercase text-slate-400">
            {isRunning
              ? isEng ? 'RUNNING' : 'RUNNING / चालू है'
              : elapsedMs > 0
              ? isEng ? 'STOPPED' : 'STOPPED / रुका हुआ'
              : isEng ? 'READY' : 'READY / तैयार'}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isEng ? 'Toggle fullscreen' : 'फुलस्क्रीन (Toggle fullscreen)'}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-md ${
            isFullscreen
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40'
          }`}
          title="Fullscreen Mode"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-rose-400" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{isFullscreen ? (isEng ? 'Exit Fullscreen' : 'फुलस्क्रीन बंद करें (Exit)') : (isEng ? 'Fullscreen' : 'फुलस्क्रीन (Fullscreen)')}</span>
        </button>
      </div>

      {/* Main Stopwatch Dial Display */}
      <div className="relative w-full aspect-square max-w-[340px] md:max-w-[380px] flex items-center justify-center my-4">
        {/* Outer Circular Glow / Dial Border */}
        <div
          className={`absolute inset-0 rounded-full border-2 transition-all duration-500 ${
            isRunning
              ? 'border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.25)] animate-pulse'
              : 'border-slate-800'
          }`}
        />

        {/* Secondary Inner Ring */}
        <div className="absolute inset-4 rounded-full border border-dashed border-slate-800/80" />

        {/* Dial Center Glow */}
        <div
          className={`absolute inset-8 rounded-full transition-all duration-700 blur-2xl ${
            isRunning ? 'bg-cyan-500/10' : 'bg-transparent'
          }`}
        />

        {/* Numeric Time Display */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Hours (if > 0) */}
          {parseInt(timeParts.hours, 10) > 0 && (
            <div className="text-xl md:text-2xl font-mono text-cyan-400/80 mb-1">
              {timeParts.hours}h
            </div>
          )}

          {/* Minutes & Seconds */}
          <div className="flex items-baseline font-mono tracking-tight font-black text-white text-4xl sm:text-5xl md:text-7xl drop-shadow-lg">
            <span>{timeParts.minutes}</span>
            <span className={`text-cyan-400 px-0.5 sm:px-1 ${isRunning ? 'animate-pulse' : ''}`}>:</span>
            <span>{timeParts.seconds}</span>
          </div>

          {/* Milliseconds: High-precision 3-digit display */}
          <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5">
            <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-black text-cyan-400 tracking-wider">
              .{timeParts.milliseconds}
            </span>
            <span className="text-[11px] uppercase font-mono tracking-widest text-cyan-500/90 font-bold">
              ms
            </span>
          </div>

          {/* Voice Prompt Badge */}
          <div className="mt-4 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5 shadow-inner">
            <Zap className="w-3 h-3 text-amber-400" aria-hidden="true" />
            <span>
              {isRunning
                ? isEng ? 'Say: "Stop" or "Pause"' : 'बोलो: "स्टॉप" या "रुक जाओ"'
                : isEng ? 'Say: "Start" or "Go"' : 'बोलो: "स्टार्ट" या "शुरू"'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="w-full flex items-center justify-center gap-4 my-6">
        {/* Reset Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playLapChime();
            triggerHaptic(60);
            onReset();
          }}
          disabled={isRunning || elapsedMs === 0}
          className="flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-lg"
          title="Reset Stopwatch"
        >
          <RotateCcw className="w-5 h-5 md:w-6 md:h-6 mb-1 text-slate-400" aria-hidden="true" />
          <span className="text-[10px] md:text-xs font-medium">{isEng ? 'Reset' : 'रीसेट'}</span>
        </button>

        {/* Start / Stop Master Button */}
        <button
          type="button"
          onClick={() => {
            if (isRunning) {
              soundEngine.playStopChime();
              triggerHaptic([40, 40]);
            } else {
              soundEngine.playStartChime();
              triggerHaptic(60);
            }
            onToggle();
          }}
          className={`flex flex-col items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-3xl font-bold text-white shadow-2xl active:scale-95 transition-all cursor-pointer ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              : 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30'
          }`}
          title={isRunning ? 'Stop Stopwatch' : 'Start Stopwatch'}
        >
          {isRunning ? (
            <>
              <Pause className="w-9 h-9 md:w-11 md:h-11 mb-1 fill-white" aria-hidden="true" />
              <span className="text-xs md:text-sm tracking-wide">{isEng ? 'Stop' : 'रोकें (Stop)'}</span>
            </>
          ) : (
            <>
              <Play className="w-9 h-9 md:w-11 md:h-11 mb-1 fill-white ml-1" aria-hidden="true" />
              <span className="text-xs md:text-sm tracking-wide">{isEng ? 'Start' : 'शुरू (Start)'}</span>
            </>
          )}
        </button>

        {/* Lap Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playLapChime();
            triggerHaptic(40);
            onLap();
          }}
          disabled={!isRunning}
          className="flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-lg"
          title="Record Lap"
        >
               <Flag className="w-5 h-5 md:w-6 md:h-6 mb-1 text-cyan-400" aria-hidden="true" />
          <span className="text-[10px] md:text-xs font-medium">{isEng ? 'Lap' : 'लैप (Lap)'}</span>
        </button>
      </div>

      {/* Recorded Laps Table */}
      {laps.length > 0 && (
        <div className="w-full mt-4 bg-slate-900/60 rounded-2xl border border-slate-850 p-4 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {isEng ? `Laps (${laps.length})` : `लैप्स (${laps.length})`}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLaps}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
                title="Copy Laps"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{copyNotice ? (isEng ? 'Copied!' : 'कॉपी हुआ!') : (isEng ? 'Copy' : 'कॉपी')}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {laps.map((lap) => {
              const isFastest = lap.lapDurationMs === fastestTime && laps.length > 1;
              const isSlowest = lap.lapDurationMs === slowestTime && laps.length > 1;

              return (
                <div
                  key={lap.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                    isFastest
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                      : isSlowest
                      ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                      #{lap.lapNumber}
                    </span>
                    {isFastest && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {isEng ? 'FAST' : 'फास्ट'}
                      </span>
                    )}
                    {isSlowest && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {isEng ? 'SLOW' : 'धीमा'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 font-mono text-sm">
                    <div className="text-right">
                      <span className="text-[10px] block text-slate-500">{isEng ? 'Lap Time' : 'लैप टाइम'}</span>
                      <span className="font-bold">{formatTime(lap.lapDurationMs).formatted}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] block text-slate-500">{isEng ? 'Total' : 'कुल टाइम'}</span>
                      <span className="text-slate-400">{formatTime(lap.totalElapsedMs).formatted}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
