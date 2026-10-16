import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC<{ lang?: 'hi' | 'en' | 'hinglish' }> = ({ lang = 'en' }) => {
  const isEng = lang === 'en';
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:right-auto md:w-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-xl border border-amber-400">
      <WifiOff className="w-4 h-4 text-slate-950 animate-bounce" />
      <span>
        {isEng
          ? 'Offline Mode Active — Stopwatch, Timer & Alarms work without internet!'
          : lang === 'hinglish'
          ? 'Offline Mode Active — Stopwatch, Timer & Alarms bina internet ke kaam karte hain!'
          : 'ऑफलाइन मोड सक्रिय — स्टॉपवॉच, टाइमर और अलार्म बिना इंटरन्ट के काम कर रहे हैं!'}
      </span>
    </div>
  );
};
