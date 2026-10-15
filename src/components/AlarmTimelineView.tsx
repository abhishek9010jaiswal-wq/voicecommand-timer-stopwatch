import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Clock,
  Repeat,
  Bell,
  Sparkles,
  Calendar,
  AlertCircle,
  TrendingUp,
  Music,
  CheckCircle2,
} from 'lucide-react';
import { SmartAlarm } from './AlarmManager';
import { AVAILABLE_ALARM_SOUNDS } from '../utils/audio';

interface AlarmTimelineViewProps {
  alarms: SmartAlarm[];
  activeRingingAlarm: SmartAlarm | null;
  lang: 'hi' | 'en' | 'hinglish';
}

interface TimelinePoint {
  id: string;
  alarmId: string;
  alarmLabel: string;
  timeLabel: string;
  exactTime: string;
  timestamp: number;
  repeatIndex: number; // 1-based
  totalRepeats: number;
  intervalMinutes: number;
  soundName: string;
  isNext: boolean;
  minutesFromNow: number;
  color: string;
}

const PALETTE = [
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
];

export const AlarmTimelineView: React.FC<AlarmTimelineViewProps> = ({
  alarms,
  activeRingingAlarm,
  lang,
}) => {
  const [selectedAlarmId, setSelectedAlarmId] = useState<string>('all');

  // Filter active enabled alarms
  const enabledAlarms = useMemo(() => alarms.filter((a) => a.isEnabled), [alarms]);

  // Compute all scheduled rings across active alarms
  const timelineData: TimelinePoint[] = useMemo(() => {
    const points: TimelinePoint[] = [];
    const now = Date.now();

    enabledAlarms.forEach((alarm, alarmIdx) => {
      if (selectedAlarmId !== 'all' && alarm.id !== selectedAlarmId) return;

      const color = PALETTE[alarmIdx % PALETTE.length];
      const soundObj = AVAILABLE_ALARM_SOUNDS.find((s) => s.id === alarm.sound);
      const soundName = soundObj ? soundObj.nameHindi : 'डिजिटल बीप';

      // Starting from current repeat index up to repeatCount
      const remainingRepeats = alarm.repeatCount - alarm.currentRepeatIndex;
      const baseTimestamp = alarm.nextRingTimestamp;

      for (let i = 0; i < remainingRepeats; i++) {
        const ringTimeMs = baseTimestamp + i * alarm.intervalMinutes * 60 * 1000;
        const ringDate = new Date(ringTimeMs);
        const hours = String(ringDate.getHours()).padStart(2, '0');
        const mins = String(ringDate.getMinutes()).padStart(2, '0');
        const secs = String(ringDate.getSeconds()).padStart(2, '0');
        const exactTime = `${hours}:${mins}:${secs}`;
        const timeLabel = `${hours}:${mins}`;

        const diffMinutes = Math.max(0, Math.round((ringTimeMs - now) / 60000));
        const repeatNumber = alarm.currentRepeatIndex + 1 + i;

        points.push({
          id: `${alarm.id}-ring-${repeatNumber}`,
          alarmId: alarm.id,
          alarmLabel: alarm.label,
          timeLabel: `${timeLabel} (#${repeatNumber})`,
          exactTime,
          timestamp: ringTimeMs,
          repeatIndex: repeatNumber,
          totalRepeats: alarm.repeatCount,
          intervalMinutes: alarm.intervalMinutes,
          soundName,
          isNext: i === 0 && points.length === 0,
          minutesFromNow: diffMinutes,
          color,
        });
      }
    });

    // Sort chronologically by timestamp
    points.sort((a, b) => a.timestamp - b.timestamp);

    // Mark the earliest one as isNext
    if (points.length > 0) {
      points[0].isNext = true;
    }

    return points;
  }, [enabledAlarms, selectedAlarmId]);

  // Next ring summary
  const nextRing = timelineData.length > 0 ? timelineData[0] : null;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: TimelinePoint = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-slate-100 max-w-xs animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1">
            <Bell className="w-3.5 h-3.5" />
            <span>{data.alarmLabel}</span>
          </div>

          <div className="space-y-1 font-mono">
            <div className="flex justify-between gap-4 text-slate-300">
              <span className="text-slate-400">समय (Time):</span>
              <span className="font-bold text-white">{data.exactTime}</span>
            </div>

            <div className="flex justify-between gap-4 text-slate-300">
              <span className="text-slate-400">रिपीट क्रम:</span>
              <span className="font-bold text-purple-300">
                रिंग #{data.repeatIndex} of {data.totalRepeats}
              </span>
            </div>

            <div className="flex justify-between gap-4 text-slate-300">
              <span className="text-slate-400">अंतराल गैप:</span>
              <span>हर {data.intervalMinutes} मिनट</span>
            </div>

            <div className="flex justify-between gap-4 text-slate-300">
              <span className="text-slate-400">टोन:</span>
              <span className="text-cyan-300">{data.soundName}</span>
            </div>

            <div className="flex justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800">
              <span className="text-slate-400">बचे हुए मिनट:</span>
              <span className="text-amber-400 font-bold">~{data.minutesFromNow} मिनट में</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (enabledAlarms.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 my-4">
        <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">कोई सक्रिय अलार्म शेड्यूल नहीं है</h4>
        <p className="text-xs text-slate-500 mt-1">
          समयरेखा देखने के लिए पहले कोई अलार्म चालू (Enable) करें या नया बनाएं।
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full my-2 space-y-4 animate-in fade-in">
      {/* Top Controls & Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Next Ring Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              अगला आगामी रिंग (Next Ring)
            </span>
            <span className="text-base font-mono font-black text-white">
              {nextRing ? nextRing.exactTime : '--:--'}
            </span>
            <span className="text-[11px] text-cyan-300 block">
              {nextRing ? `(${nextRing.alarmLabel} #${nextRing.repeatIndex})` : ''}
            </span>
          </div>
        </div>

        {/* Total Scheduled Rings */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              कुल शेड्यूल रिपीट
            </span>
            <span className="text-base font-mono font-black text-white">
              {timelineData.length} रिंग्स
            </span>
            <span className="text-[11px] text-slate-400 block">
              {enabledAlarms.length} सक्रिय अलार्म से
            </span>
          </div>
        </div>

        {/* Filter by Specific Alarm */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-center shadow-lg">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            समयरेखा फ़िल्टर (Filter Alarm)
          </label>
          <select
            value={selectedAlarmId}
            onChange={(e) => setSelectedAlarmId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">सभी अलार्म (Combined Schedule)</option>
            {enabledAlarms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.time} - {a.label} ({a.repeatCount}x)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Recharts Bar Chart: Multi-Repeat Timeline */}
      <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/80 border border-slate-750 shadow-xl backdrop-blur-sm w-full max-w-full overflow-hidden min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              आगामी रिंग्स और अंतराल समयरेखा (Repeat Rings Schedule)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
            रिपीट बार चार्ट
          </span>
        </div>

        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineData}
              margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
            >
              <defs>
                {PALETTE.map((c, i) => (
                  <linearGradient key={c} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.3} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis
                dataKey="repeatIndex"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                domain={[0, 'dataMax + 1']}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="repeatIndex"
                radius={[8, 8, 0, 0]}
                animationDuration={600}
              >
                {timelineData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={entry.color}
                    stroke={entry.isNext ? '#f59e0b' : entry.color}
                    strokeWidth={entry.isNext ? 2 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
            <span>Y-अक्ष: रिपीट क्रम (#1 to #{timelineData[0]?.totalRepeats || 5})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border-2 border-amber-400 bg-amber-400/40" />
            <span>हाइलाइट: अगला आगामी रिंग</span>
          </span>
        </div>
      </div>

      {/* Chronological Sequence Strip (Horizontal Step List) */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-750 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              कालानुक्रमिक रिंग क्रम (Sequential Ring Sequence)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            {timelineData.length} आगामी रिंग्स
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {timelineData.map((pt, idx) => (
            <div
              key={pt.id}
              className={`w-full p-2.5 rounded-2xl border transition-all ${
                pt.isNext
                  ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-850/80 border-slate-750'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  #{pt.repeatIndex}/{pt.totalRepeats}
                </span>

                {pt.isNext && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>

              <span className="text-sm font-mono font-black text-white block">
                {pt.exactTime}
              </span>

              <span className="text-xs font-bold text-slate-200 truncate block mt-0.5">
                {pt.alarmLabel}
              </span>

              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>+{idx * pt.intervalMinutes}m</span>
                <span className="text-cyan-300 truncate max-w-[60px]">{pt.soundName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
