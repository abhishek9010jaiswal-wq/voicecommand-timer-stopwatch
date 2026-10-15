import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Clock,
  Repeat,
  Volume2,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  BellRing,
  Music,
  LayoutList,
  BarChart3,
} from 'lucide-react';
import { AlarmTimelineView } from './AlarmTimelineView';
import {
  soundEngine,
  triggerHaptic,
  speakText,
  AlarmSoundType,
  AVAILABLE_ALARM_SOUNDS,
  requestNotificationPermission,
  showSystemNotification,
} from '../utils/audio';

export interface SmartAlarm {
  id: string;
  time: string; // "HH:MM" (24 hour)
  label: string;
  repeatCount: number; // e.g. 5
  intervalMinutes: number; // e.g. 2
  currentRepeatIndex: number; // 0-based: 0 of 5, 1 of 5...
  nextRingTimestamp: number; // epoch ms
  isEnabled: boolean;
  sound: AlarmSoundType;
  createdAt: number;
}

interface AlarmManagerProps {
  alarms: SmartAlarm[];
  onAddAlarm: (alarm: Omit<SmartAlarm, 'id' | 'createdAt' | 'currentRepeatIndex'>) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onUpdateAlarm: (updated: SmartAlarm) => void;
  activeRingingAlarm: SmartAlarm | null;
  onDismissRing: (alarm: SmartAlarm) => void;
  onStopAllRepeats: (alarm: SmartAlarm) => void;
  lang: 'hi' | 'en' | 'hinglish';
}

export const AlarmManager: React.FC<AlarmManagerProps> = ({
  alarms,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onUpdateAlarm,
  activeRingingAlarm,
  onDismissRing,
  onStopAllRepeats,
  lang,
}) => {
  const isEng = lang === 'en';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('timeline');
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  // Form states for manual creation
  const [alarmTime, setAlarmTime] = useState('14:00');
  const [alarmLabel, setAlarmLabel] = useState(isEng ? 'Afternoon Alarm' : 'दोपहर का अलार्म');
  const [repeatCount, setRepeatCount] = useState(5); // 5 times
  const [intervalMinutes, setIntervalMinutes] = useState(2); // every 2 mins gap
  const [selectedSound, setSelectedSound] = useState<AlarmSoundType>('digital_beep');

  // Request notifications
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsGranted(granted);
    if (granted) {
      soundEngine.playStartChime();
      showSystemNotification(
        isEng ? 'Alarm Notifications Enabled' : 'अलार्म सूचना सक्षम है',
        isEng ? 'Alarms will alert reliably even when in background!' : 'बैकग्राउंड में भी अलार्म समय पर बजेगा!'
      );
    }
  };

  // Helper to format remaining time string e.g. "Rings in 3 hours 15 minutes"
  const getRemainingTimeString = (nextTimestamp: number) => {
    const diffMs = nextTimestamp - Date.now();
    if (diffMs <= 0) return isEng ? 'Ringing now...' : 'अभी बजने वाला है...';

    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);

    if (hours > 0) {
      return isEng ? `Rings in ${hours}h ${mins}m` : `${hours} घंटे ${mins} मिनट में बजेगा`;
    }
    if (mins > 0) {
      return isEng ? `Rings in ${mins}m` : `${mins} मिनट में बजेगा`;
    }
    return isEng ? `Rings in ${diffSecs}s` : `${diffSecs} सेकंड में बजेगा`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTime) return;

    // Calculate initial nextRingTimestamp based on alarmTime (HH:MM)
    const [hours, minutes] = alarmTime.split(':').map((n) => parseInt(n, 10));
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // If time is already past today, schedule for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    onAddAlarm({
      time: alarmTime,
      label: alarmLabel || 'Smart Alarm',
      repeatCount: Math.max(1, repeatCount),
      intervalMinutes: Math.max(1, intervalMinutes),
      nextRingTimestamp: target.getTime(),
      sound: selectedSound,
      isEnabled: true,
    });

    soundEngine.playStartChime();
    setShowCreateModal(false);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto">
      {/* Background Notification Alert Bar */}
      {!notificationsGranted && typeof window !== 'undefined' && 'Notification' in window && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
            <span>{isEng ? 'Allow notifications for reliable background alarm alerts' : 'बैकग्राउंड में अलार्म बजने के लिए सूचना (Notification) की अनुमति दें'}</span>
          </div>
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 active:scale-95 transition cursor-pointer flex-shrink-0"
          >
            {isEng ? 'Enable' : 'अनुमति दें (Enable)'}
          </button>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <span>{isEng ? 'Multi-Repeat Interval Alarms' : 'मल्टी-रिपीट इंटरवल अलार्म'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEng ? 'e.g. 2:00 PM alarm, rings 5 times every 2 min gap' : 'जैसे: 2:00 बजे का अलार्म, 5 बार बजेगा हर 2 मिनट के गैप में'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition shadow-lg shadow-cyan-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isEng ? 'New Alarm' : 'नया अलार्म'}</span>
        </button>
      </div>

      {/* View Switcher: Timeline Chart vs Cards List */}
      <div className="flex items-center justify-between mb-4 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isEng ? 'Timeline' : 'समयरेखा (Timeline View)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>{isEng ? 'Cards List' : 'कार्ड सूची (Cards)'}</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400 pr-2 hidden sm:inline">
          {alarms.filter((a) => a.isEnabled).length} {isEng ? 'Active Alarms' : 'सक्रिय अलार्म'}
        </span>
      </div>

      {/* Recharts Timeline View */}
      {viewMode === 'timeline' && (
        <AlarmTimelineView
          alarms={alarms}
          activeRingingAlarm={activeRingingAlarm}
          lang={lang}
        />
      )}

      {/* Active Ringing Alarm Alert Modal */}
      {activeRingingAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500 p-6 md:p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none" />

            {/* Glowing Bell Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mb-4 animate-bounce">
              <Bell className="w-10 h-10 text-rose-400" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider mb-2">
              {isEng
                ? `Ring #${activeRingingAlarm.currentRepeatIndex + 1} of ${activeRingingAlarm.repeatCount}`
                : `अलार्म रिंग #${activeRingingAlarm.currentRepeatIndex + 1} / ${activeRingingAlarm.repeatCount}`}
            </span>

            <h3 className="text-4xl md:text-5xl font-mono font-black text-white my-2">
              {activeRingingAlarm.time}
            </h3>

            <p className="text-sm font-semibold text-slate-200 mb-1">
              {activeRingingAlarm.label}
            </p>

            <p className="text-xs text-slate-400 mb-6">
              {isEng
                ? `Will ring again in ${activeRingingAlarm.intervalMinutes} min (Total: ${activeRingingAlarm.repeatCount} times)`
                : `अगली बार ${activeRingingAlarm.intervalMinutes} मिनट बाद दोबारा बजेगा (कुल ${activeRingingAlarm.repeatCount} बार)`}
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onDismissRing(activeRingingAlarm)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm shadow-xl active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>
                  {isEng
                    ? `Dismiss Current Ring (Rings again in ${activeRingingAlarm.intervalMinutes}m)`
                    : `अभी बंद करें (अगली बार ${activeRingingAlarm.intervalMinutes}m बाद बजेगा)`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStopAllRepeats(activeRingingAlarm)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>{isEng ? 'Stop All Repeats' : 'सारे रिपीट पूरी तरह बंद करें (Stop All)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alarms List */}
      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {viewMode === 'timeline' ? 'अलार्म नियंत्रण सूची (Alarm Controls)' : 'सक्रिय अलार्म सूची'}
          </span>
          <span className="text-[11px] text-slate-500">
            {alarms.length} अलार्म कॉन्फ़िगर किए गए
          </span>
        </div>
        {alarms.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">कोई अलार्म सेट नहीं है</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              माइक पर बोलें: <span className="text-cyan-400 font-medium">"2:00 बजे का अलार्म लगा दो, 5 बार बजना चाहिए हर 2 मिनट के गैप में"</span> या ऊपर "नया अलार्म" बटन दबाएं।
            </p>
          </div>
        ) : (
          alarms.map((alarm) => {
            const soundObj = AVAILABLE_ALARM_SOUNDS.find((s) => s.id === alarm.sound);
            return (
              <div
                key={alarm.id}
                className={`p-4 rounded-2xl border transition-all ${
                  alarm.isEnabled
                    ? 'bg-slate-900/80 border-slate-750 shadow-lg'
                    : 'bg-slate-900/30 border-slate-850 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        alarm.isEnabled ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Bell className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl md:text-3xl font-mono font-black text-white">
                          {alarm.time}
                        </span>
                        <span className="text-xs font-medium text-slate-300">
                          {alarm.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-medium">
                          <Repeat className="w-3 h-3" />
                          {alarm.repeatCount} बार रिपीट
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium">
                          हर {alarm.intervalMinutes} मिनट में
                        </span>

                        {soundObj && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium">
                            <Music className="w-3 h-3 text-cyan-400" />
                            {soundObj.nameHindi}
                          </span>
                        )}

                        {alarm.currentRepeatIndex > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                            प्रगति: {alarm.currentRepeatIndex}/{alarm.repeatCount}
                          </span>
                        )}
                      </div>

                      {alarm.isEnabled && (
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">
                          ⏱️ {getRemainingTimeString(alarm.nextRingTimestamp)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleAlarm(alarm.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                        alarm.isEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                      }`}
                      title={alarm.isEnabled ? 'Turn off' : 'Turn on'}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          alarm.isEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => onDeleteAlarm(alarm.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Alarm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Create Alarm Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-750 p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                नया मल्टी-रिपीट अलार्म बनाएं
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  अलार्म का समय (Time - HH:MM)
                </label>
                <input
                  type="time"
                  required
                  value={alarmTime}
                  onChange={(e) => setAlarmTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-2xl font-mono font-bold text-white focus:outline-none focus:border-cyan-400 text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  अलार्म का नाम (Label)
                </label>
                <input
                  type="text"
                  value={alarmLabel}
                  onChange={(e) => setAlarmLabel(e.target.value)}
                  placeholder="उदा. दवाई, मीटिंग, उठने का समय"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Repeat Count */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    रिपीट संख्या (Repeat Count)
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {repeatCount} बार
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 3, 5, 7, 10].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setRepeatCount(num)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        repeatCount === num
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval Gap */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    अंतराल गैप (Interval Gap)
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    हर {intervalMinutes} मिनट में
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 5, 10].map((gap) => (
                    <button
                      type="button"
                      key={gap}
                      onClick={() => setIntervalMinutes(gap)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        intervalMinutes === gap
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {gap}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Alarm Sound */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  अलार्म साउंड (Alarm Sound)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {AVAILABLE_ALARM_SOUNDS.map((snd) => {
                    const isSelected = selectedSound === snd.id;
                    return (
                      <div
                        key={snd.id}
                        onClick={() => setSelectedSound(snd.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 text-white'
                            : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-750'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-slate-950 font-bold" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold block">{snd.nameHindi}</span>
                            <span className="text-[10px] text-slate-400">{snd.description}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEngine.previewSound(snd.id);
                          }}
                          className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-cyan-300 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span className="text-[10px]">सुने</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary note */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
                📌 यह अलार्म <strong>{alarmTime}</strong> पर शुरू होगा और हर{' '}
                <strong>{intervalMinutes} मिनट</strong> के अंतराल पर कुल{' '}
                <strong>{repeatCount} बार</strong> बजेगा।
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 cursor-pointer"
                >
                  अलार्म सेट करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
