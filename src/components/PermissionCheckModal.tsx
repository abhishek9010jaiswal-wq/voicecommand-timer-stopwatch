/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MicOff,
  AlertTriangle,
  Smartphone,
  Laptop,
  Apple,
  ExternalLink,
  RefreshCw,
  X,
  SlidersHorizontal,
  MoreVertical,
  CheckCircle,
} from 'lucide-react';
import {
  detectDeviceType,
  isEmbeddedInIframe,
  DEVICE_PERMISSIONS_GUIDE,
  DeviceType,
} from '../utils/audioPermission';

interface PermissionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  lang?: 'hi' | 'en' | 'hinglish';
}

export const PermissionCheckModal: React.FC<PermissionCheckModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  lang = 'en',
}) => {
  const isEng = lang === 'en';
  const autoDevice = detectDeviceType();
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>(
    autoDevice === 'unknown' ? 'android' : autoDevice
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const inIframe = isEmbeddedInIframe();

  useEffect(() => {
    if (isOpen) {
      const detected = detectDeviceType();
      setSelectedDevice(detected === 'unknown' ? 'android' : detected);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentGuide = DEVICE_PERMISSIONS_GUIDE[selectedDevice] || DEVICE_PERMISSIONS_GUIDE.android;
  const steps = isEng ? currentGuide.stepsEnglish : currentGuide.stepsHindi;

  const handleRetryClick = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleOpenInNewTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 modal-container">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl shadow-rose-950/50 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-modal-title"
      >
        {/* Header with warning icon and close button */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-b border-rose-500/20 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isEng ? 'Microphone Access Denied (not-allowed)' : 'माइक्रोफ़ोन अनुमति अस्वीकृत (not-allowed)'}</span>
              </div>
              <h2 id="permission-modal-title" className="text-base sm:text-lg font-bold text-white mt-0.5">
                {isEng ? 'How to Enable Microphone Permission' : 'माइक्रोफ़ोन अनुमति कैसे चालू करें'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Switcher Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-1 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
            {isEng ? 'Your Device:' : 'डिवाइस:'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedDevice('android')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex-shrink-0 ${
              selectedDevice === 'android'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDevice('ios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex-shrink-0 ${
              selectedDevice === 'ios'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDevice('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex-shrink-0 ${
              selectedDevice === 'desktop'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed">
          {/* Note about modern browsers and removal of lock icon */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {isEng ? 'Modern Browser Note: ' : 'ध्यान दें: '}
              </span>
              {isEng
                ? 'Modern Android and Chrome browsers have replaced the 🔒 lock icon with a 🎛️ "Page controls / Tune" icon or the ⋮ three-dots menu.'
                : 'नए Android और Chrome ब्राउज़र में ताला (🔒) नहीं होता। इसके स्थान पर "🎛️ कंट्रोल्स" या ⋮ तीन डॉट्स मेनू होता है।'}
            </div>
          </div>

          {/* Step by Step Guide for selected device */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isEng ? currentGuide.titleEnglish : currentGuide.titleHindi}
            </h3>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Helpful tip for embedded frame */}
          {inIframe && (
            <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-bold">
                  {isEng ? 'Opening in Full Tab:' : 'फुल टैब में खोलें:'}
                </p>
                <p className="text-slate-300 text-[11px]">
                  {isEng
                    ? 'If your browser does not show the permission prompt inside the embedded preview, opening in a full tab triggers the prompt directly.'
                    : 'यदि प्रीव्यू में परमिशन प्रॉम्प्ट नहीं आ रहा, तो अलग टैब में खोलकर आसानी से परमिशन दे सकते हैं।'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer shadow-md shadow-cyan-500/20"
              >
                <span>{isEng ? 'Open Tab' : 'टैब खोलें'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition cursor-pointer text-center"
          >
            {isEng ? 'Continue with Manual Controls' : 'मैन्युअल कंट्रोल्स से जारी रखें'}
          </button>

          <button
            type="button"
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/25 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isEng ? 'Retry Microphone Permission' : 'पुनः अनुमति मांगें (Retry)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
