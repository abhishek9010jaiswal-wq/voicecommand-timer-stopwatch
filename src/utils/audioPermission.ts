/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeviceType = 'android' | 'ios' | 'desktop' | 'unknown';

export interface DeviceInstruction {
  device: DeviceType;
  titleHindi: string;
  titleEnglish: string;
  stepsHindi: string[];
  stepsEnglish: string[];
  icon: string;
}

export function detectDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints !== undefined && (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1) return 'ios';
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'desktop';
  return 'unknown';
}

export function isEmbeddedInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export const DEVICE_PERMISSIONS_GUIDE: Record<DeviceType, DeviceInstruction> = {
  android: {
    device: 'android',
    titleHindi: 'Android फ़ोन / नए ब्राउज़र के लिए निर्देश',
    titleEnglish: 'Android Phone / Modern Chrome Instructions',
    stepsHindi: [
      'नए Android और Chrome ब्राउज़र में 🔒 ताला नहीं होता।',
      'एड्रेस बार में URL के बाईं ओर स्थित "🎛️ कंट्रोल्स / सेटिंग्स" आइकॉन पर टैप करें (या ऊपर दाईं ओर ⋮ तीन डॉट्स मेनू दबाएं)।',
      '"Site settings" या "Permissions" में जाकर "Microphone" (माइक्रोफ़ोन) को चुनें।',
      '"Allow" (अनुमति दें) पर टैप करें और पेज को रीफ़्रेश करें।',
    ],
    stepsEnglish: [
      'Modern Android and Chrome have removed the 🔒 lock icon.',
      'Tap the "🎛️ Page controls / Tune" icon next to the URL (or tap the ⋮ three dots menu in the top-right).',
      'Select "Site settings" or "Permissions" > "Microphone".',
      'Change the setting to "Allow" and refresh the page.',
    ],
    icon: '📱',
  },
  ios: {
    device: 'ios',
    titleHindi: 'iPhone / iPad (Safari) के लिए निर्देश',
    titleEnglish: 'iPhone / iPad (Safari) Instructions',
    stepsHindi: [
      'Safari एड्रेस बार में बाईं ओर "aA" (पेज सेटिंग्स) आइकॉन पर टैप करें।',
      '"Website Settings" (वेबसाइट सेटिंग्स) विकल्प चुनें।',
      '"Microphone" पर टैप करके "Allow" (अनुमति दें) चुनें।',
      'ऐप पर वापस आकर पुनः प्रयास करें।',
    ],
    stepsEnglish: [
      'In Safari address bar, tap the "aA" (Page settings) icon on the left.',
      'Tap "Website Settings".',
      'Under "Microphone", select "Allow".',
      'Return to the clock and tap retry.',
    ],
    icon: '🍎',
  },
  desktop: {
    device: 'desktop',
    titleHindi: 'कंप्यूटर / डेस्कटॉप ब्राउज़र के लिए निर्देश',
    titleEnglish: 'Desktop Browser Instructions',
    stepsHindi: [
      'एड्रेस बार में URL के आगे स्थित "🎛️ Site information" या साइड आइकॉन पर क्लिक करें।',
      '"Microphone" विकल्प को "Allow" (अनुमति दें) पर सेट करें।',
      'पेज को रीलोड करें।',
    ],
    stepsEnglish: [
      'Click the "🎛️ Site information / Tune" icon next to the URL in the address bar.',
      'Toggle the "Microphone" permission to "Allow".',
      'Reload the page.',
    ],
    icon: '💻',
  },
  unknown: {
    device: 'unknown',
    titleHindi: 'माइक्रोफ़ोन सेटिंग्स निर्देश',
    titleEnglish: 'Microphone Permission Instructions',
    stepsHindi: [
      'ब्राउज़र मेनू या सेटिंग्स में जाएं।',
      'साइट सेटिंग्स (Site Settings) > Microphone में जाकर Allow करें।',
    ],
    stepsEnglish: [
      'Open your browser menu or settings.',
      'Navigate to Site Settings > Microphone and select Allow.',
    ],
    icon: '⚙️',
  },
};

/**
 * Cleanly requests native browser microphone permission on direct user gesture.
 * Compatible with Android Chrome, iOS Safari, and Desktop browsers.
 */
export async function requestNativeMicrophone(): Promise<{
  success: boolean;
  stream: MediaStream | null;
  error?: any;
  errorType?: 'denied' | 'not_supported' | 'device_busy' | 'iframe_blocked' | 'unknown';
}> {
  if (typeof navigator === 'undefined') {
    return { success: false, stream: null, errorType: 'not_supported' };
  }

  // Fallback chain for older/different browser engines
  const getUserMedia =
    navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
    (navigator as any).webkitGetUserMedia?.bind(navigator) ||
    (navigator as any).mozGetUserMedia?.bind(navigator) ||
    (navigator as any).getUserMedia?.bind(navigator);

  if (!getUserMedia) {
    return {
      success: false,
      stream: null,
      errorType: 'not_supported',
    };
  }

  try {
    // Clean, direct, minimal request: triggers native browser permission popup immediately on all devices!
    const stream = await getUserMedia({ audio: true });
    return { success: true, stream };
  } catch (err: any) {
    console.warn('Microphone permission request rejected:', err);
    const errName = err?.name || '';
    const errMsg = String(err?.message || err || '').toLowerCase();

    let errorType: 'denied' | 'not_supported' | 'device_busy' | 'iframe_blocked' | 'unknown' = 'unknown';

    if (
      errName === 'NotAllowedError' ||
      errName === 'PermissionDeniedError' ||
      errMsg.includes('permission') ||
      errMsg.includes('not allowed')
    ) {
      errorType = 'denied';
    } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      errorType = 'not_supported';
    } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
      errorType = 'device_busy';
    }

    return {
      success: false,
      stream: null,
      error: err,
      errorType,
    };
  }
}
