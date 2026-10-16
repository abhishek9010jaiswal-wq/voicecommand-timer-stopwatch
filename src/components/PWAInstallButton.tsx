import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  X,
  Check,
  Laptop,
  Sparkles,
  ExternalLink,
  Apple,
  FileDown,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  downloadWebAppLauncher,
  downloadIOSMobileConfig,
  downloadDesktopShortcut,
} from '../utils/pwaDownloader';

interface PWAInstallButtonProps {
  lang?: 'hi' | 'en' | 'hinglish';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang = 'en' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'android' | 'ios' | 'desktop'>('all');

  const isEng = lang === 'en';

  // If already running in standalone mode (already installed), show verified badge
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
        <Check className="w-3.5 h-3.5" />
        <span>{isEng ? 'App Installed' : 'इंस्टॉल्ड (Installed)'}</span>
      </span>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      try {
        const outcome = await install();
        if (!outcome) setShowInstallGuide(true);
      } catch { setShowInstallGuide(true); }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleDownloadLauncher = () => {
    downloadWebAppLauncher();
    setDownloadSuccessToast(true);
    setTimeout(() => setDownloadSuccessToast(false), 4000);
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 md:gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs md:text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all cursor-pointer flex-shrink-0"
        title={isEng ? 'Install Voice Assistant Clock app' : 'वॉइस असिस्टेंट क्लॉक ऐप इंस्टॉल व डाउनलोड करें'}
      >
        <Download className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-xs sm:text-sm whitespace-nowrap">
          {isEng ? 'Install' : lang === 'hinglish' ? 'Install Karein' : 'इंस्टॉल करें'}
        </span>
      </button>

      {/* Floating Download Notification Banner */}
      {downloadSuccessToast && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-top-4 backdrop-blur-md">
         <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
          <div>
            <span className="font-bold block">
              {isEng ? 'App Package Downloaded!' : 'ऐप पैकेज डाउनलोड हो गया!'}
            </span>
            <span className="text-[11px] text-emerald-300/80">
              VoiceAssistantClock-WebApp.html
            </span>
          </div>
        </div>
      )}

      {/* Universally Accessible Install & Download Modal (Android, iOS, Desktop) */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in modal-container">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-750 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {isEng ? 'Install & Download App' : 'Voice Assistant Clock इंस्टॉल करें'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isEng ? 'Install via browser or download launcher' : 'ब्राउज़र से इंस्टॉल या लॉन्चर डाउनलोड करें'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter Device Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4 text-xs">
              <button
                onClick={() => setSelectedTab('all')}
                className={`py-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                  selectedTab === 'all'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isEng ? 'All' : 'सभी'}
              </button>
              <button
                onClick={() => setSelectedTab('android')}
                className={`py-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                  selectedTab === 'android'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Android
              </button>
              <button
                onClick={() => setSelectedTab('ios')}
                className={`py-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                  selectedTab === 'ios'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                iOS / iPhone
              </button>
              <button
                onClick={() => setSelectedTab('desktop')}
                className={`py-1.5 rounded-xl font-bold transition cursor-pointer text-center ${
                  selectedTab === 'desktop'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PC / Laptop
              </button>
            </div>

            {/* Direct Native Install Button if prompt is available */}
            {isInstallable && (
              <div className="mb-4 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-cyan-300 block">
                    {isEng ? 'Direct Browser Install Available!' : 'ब्राउज़र डायरेक्ट इंस्टॉल उपलब्ध है!'}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {isEng
                      ? 'Tap below to add directly to your home screen'
                      : 'सीधे होम स्क्रीन पर ऐप जोड़ने के लिए टैप करें'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await install();
                    setShowInstallGuide(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:from-cyan-400 hover:to-blue-500 shadow-md flex-shrink-0 cursor-pointer active:scale-95"
                >
                  {isEng ? 'Install Now' : 'अभी इंस्टॉल करें'}
                </button>
              </div>
            )}

            <div className="space-y-3.5 text-xs text-slate-300">
              {/* Android Instructions & Download */}
              {(selectedTab === 'all' || selectedTab === 'android') && (
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs sm:text-sm">
                       <Smartphone className="w-4 h-4 text-cyan-400 flex-shrink-0" aria-hidden="true" />
                      <span>Android (Chrome / Samsung Internet / Opera)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadLauncher}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                      title="Download Web App launcher (optional)"
                    >
                 <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isEng ? 'Download .html' : 'डाउनलोड फाइल'}</span>
                    </button>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px] sm:text-xs leading-relaxed">
                    <li>
                      {isEng
                        ? 'Tap browser top-right three dots menu (⋮).'
                        : 'ब्राउज़र के ऊपर दाईं ओर तीन डॉट्स (⋮ मेनू) पर टैप करें।'}
                    </li>
                    <li>
                      {isEng
                        ? 'Select "Install app" or "Add to Home screen".'
                        : 'मेनू से "Install app" या "Add to Home screen" चुनें।'}
                    </li>
                    <li>
                      {isEng
                        ? 'Confirm "Install". The full app icon will appear on your home screen!'
                        : '"Install" पर क्लिक करें। ऐप आपकी होम स्क्रीन पर आइकॉन बन जाएगा!'}
                    </li>
                  </ol>
                </div>
              )}

              {/* iOS Safari Instructions & Apple WebClip Profile Download */}
              {(selectedTab === 'all' || selectedTab === 'ios') && (
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-purple-300 text-xs sm:text-sm">
                      <Apple className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden="true" />
                      <span>iPhone & iPad (iOS Safari)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadIOSMobileConfig()}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                      title="Download Apple iOS WebClip Profile"
                    >
                 <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isEng ? 'iOS Profile (.mobileconfig)' : 'iOS प्रोफाइल'}</span>
                    </button>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px] sm:text-xs leading-relaxed">
                    <li>
                      {isEng
                        ? 'In Safari, tap the Share icon (square with arrow up).'
                        : 'Safari में नीचे Share (शेयर) बटन पर टैप करें।'}
                    </li>
                    <li>
                      {isEng
                        ? 'Scroll down and tap "Add to Home Screen" (+).'
                        : 'नीचे स्क्रॉल करके "Add to Home Screen" (होम स्क्रीन में जोड़ें) चुनें।'}
                    </li>
                    <li>
                      {isEng
                        ? 'Tap "Add" in top-right. Voice Assistant Clock opens full-screen!'
                        : 'ऊपर दाईं ओर "Add" दबाएं। ऐप फुल-स्क्रीन चलेगा!'}
                    </li>
                  </ol>
                </div>
              )}

              {/* Desktop Chrome / Edge Instructions & Shortcut Download */}
              {(selectedTab === 'all' || selectedTab === 'desktop') && (
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-750 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs sm:text-sm">
                       <Laptop className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                      <span>Computer & Laptop (Chrome / Edge / Mac)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadDesktopShortcut()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                      title="Download Windows Desktop Shortcut"
                    >
                 <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isEng ? 'Desktop .url' : 'डेस्कटॉप शॉर्टकट'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 pl-1 leading-relaxed">
                    {isEng
                      ? 'Click the Install icon (⊕) in the Chrome or Edge URL address bar, or click Menu (⋮) > "Save and Share" > "Install Voice Assistant Clock".'
                      : 'URL एड्रेस बार के दाईं ओर Install आइकन (⊕) पर क्लिक करें, या मेनू (⋮) से "Install Voice Assistant Clock" चुनें।'}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadLauncher}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                 <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isEng ? 'Download launcher (.html)' : 'लॉन्चर डाउनलोड (.html)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:from-cyan-400 hover:to-blue-500 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>{isEng ? 'Got it' : 'समझ गया'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
