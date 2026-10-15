export type LanguageCode = 'hi' | 'en' | 'hinglish';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  stopwatchTab: string;
  timerTab: string;
  alarmsTab: string;
  voiceAssistant: string;
  start: string;
  stop: string;
  pause: string;
  reset: string;
  lap: string;
  resume: string;
  clearLaps: string;
  lapsTitle: string;
  noLapsYet: string;
  fastestLap: string;
  slowestLap: string;
  fullscreen: string;
  exitFullscreen: string;
  timerQuickPresets: string;
  customTimer: string;
  setTimer: string;
  timerFinished: string;
  alarmsTitle: string;
  createAlarm: string;
  alarmTime: string;
  repeatTimes: string;
  intervalGap: string;
  intervalMinutes: string;
  alarmLabel: string;
  activeAlarms: string;
  noAlarms: string;
  ringsIn: string;
  repeatsCount: string;
  dismissAlarm: string;
  stopAllRepeats: string;
  snooze: string;
  alarmRinging: string;
  listeningActive: string;
  listeningPaused: string;
  sayKeywordToStart: string;
  noiseSensitivity: string;
  low: string;
  medium: string;
  high: string;
  voiceGuide: string;
  installApp: string;
  speechSynthesis: string;
  soundEffects: string;
  keepScreenAwake: string;
  settingsTitle: string;
  settingsSubtitle: string;
  byokTitle: string;
  byokSubtitle: string;
  byokAddPlaceholder: string;
  byokTest: string;
  byokDelete: string;
  byokEmpty: string;
  byokHint: string;
  byokSaved: string;
  byokInvalid: string;
  byokDuplicate: string;
  languageSection: string;
  audioSection: string;
  save: string;
  cancel: string;
}

export const translations: Record<LanguageCode, Translations> = {
  hi: {
    appTitle: 'Voice Assistant Clock (वॉइस असिस्टेंट क्लॉक)',
    appSubtitle: 'तत्काल वॉइस कंट्रोल स्टॉपवॉच, टाइमर और मल्टी-रिपीट इंटरवल अलार्म',
    stopwatchTab: 'स्टॉपवॉच',
    timerTab: 'टाइमर',
    alarmsTab: 'स्मार्ट अलार्म',
    voiceAssistant: 'वॉइस कंट्रोल',
    start: 'शुरू करें (Start)',
    stop: 'रोकें (Stop)',
    pause: 'रोकें',
    reset: 'रीसेट (Reset)',
    lap: 'लैप (Lap)',
    resume: 'फिर शुरू करें',
    clearLaps: 'लैप्स हटाएं',
    lapsTitle: 'लैप रिकॉर्ड्स',
    noLapsYet: 'अभी कोई लैप रिकॉर्ड नहीं हुआ है',
    fastestLap: 'सबसे तेज',
    slowestLap: 'सबसे धीमा',
    fullscreen: 'फुलस्क्रीन मोड',
    exitFullscreen: 'सामान्य मोड',
    timerQuickPresets: 'त्वरित टाइमर',
    customTimer: 'कस्टम टाइमर',
    setTimer: 'टाइमर लगाएं',
    timerFinished: 'समय समाप्त!',
    alarmsTitle: 'मल्टी-रिपीट इंटरवल अलार्म',
    createAlarm: 'नया अलार्म सेट करें',
    alarmTime: 'अलार्म का समय',
    repeatTimes: 'कितनी बार बजेगा (रिपीट संख्या)',
    intervalGap: 'अंतराल गैप (मिनट में)',
    intervalMinutes: 'मिनट का गैप',
    alarmLabel: 'अलार्म का नाम',
    activeAlarms: 'सक्रिय अलार्म सूची',
    noAlarms: 'कोई सक्रिय अलार्म नहीं है। वॉइस से कहें या नया बनाएं!',
    ringsIn: 'बजेगा',
    repeatsCount: 'बार रिपीट',
    dismissAlarm: 'वर्तमान रिंग बंद करें (अगले अंतराल पर बजेगा)',
    stopAllRepeats: 'अलार्म पूरी तरह बंद करें',
    snooze: 'स्नूज़ करें',
    alarmRinging: 'अलार्म बज रहा है!',
    listeningActive: 'माइक्रोफ़ोन सुन रहा है',
    listeningPaused: 'माइक्रोफ़ोन बंद है',
    sayKeywordToStart: 'शुरू करने के लिए "स्टार्ट" या "शुरू" कहें',
    noiseSensitivity: 'शोर संवेदनशीलता (Noise Filter)',
    low: 'कम (Low)',
    medium: 'मध्यम (Medium)',
    high: 'उच्च (High)',
    voiceGuide: 'वॉइस कमांड गाइड',
    installApp: 'ऐप इंस्टॉल करें',
    speechSynthesis: 'बोलकर पुष्टि करें (Voice Feedback)',
    soundEffects: 'साउंड इफेक्ट्स (Beeper)',
    keepScreenAwake: 'स्क्रीन चालू रखें (Wake Lock)',
    settingsTitle: 'सेटिंग्स',
    settingsSubtitle: 'भाषा और API प्रबंधन',
    byokTitle: 'Gemini API Keys (BYOK)',
    byokSubtitle: 'अपनी खुद की keys जोड़ें — 1500 req/day प्रति key',
    byokAddPlaceholder: 'Gemini API key पेस्ट करें',
    byokTest: 'टेस्ट करें',
    byokDelete: 'हटाएं',
    byokEmpty: 'कोई key नहीं — सर्वर pool या स्थानीय पार्सर का उपयोग होगा',
    byokHint: 'Keys localStorage में सेव, X-Gemini-Keys हेडर से भेजी जाती हैं',
    byokSaved: 'Key सेव हो गई',
    byokInvalid: 'Key खाली नहीं हो सकती',
    byokDuplicate: 'यह key पहले से मौजूद है',
    languageSection: 'भाषा',
    audioSection: 'ऑडियो',
    save: 'सेव करें',
    cancel: 'रद्द करें',
  },
  en: {
    appTitle: 'Voice Assistant Clock',
    appSubtitle: 'Instant voice-controlled stopwatch, countdown & multi-repeat interval alarms',
    stopwatchTab: 'Stopwatch',
    timerTab: 'Timer',
    alarmsTab: 'Smart Alarms',
    voiceAssistant: 'Voice Control',
    start: 'Start',
    stop: 'Stop',
    pause: 'Pause',
    reset: 'Reset',
    lap: 'Lap',
    resume: 'Resume',
    clearLaps: 'Clear Laps',
    lapsTitle: 'Recorded Laps',
    noLapsYet: 'No laps recorded yet',
    fastestLap: 'Fastest',
    slowestLap: 'Slowest',
    fullscreen: 'Fullscreen Gym Mode',
    exitFullscreen: 'Exit Fullscreen',
    timerQuickPresets: 'Quick Timers',
    customTimer: 'Custom Timer',
    setTimer: 'Start Timer',
    timerFinished: "Time's up!",
    alarmsTitle: 'Multi-Repeat Interval Alarms',
    createAlarm: 'Create New Alarm',
    alarmTime: 'Alarm Time',
    repeatTimes: 'Repeat Count (e.g. 5 times)',
    intervalGap: 'Interval Gap (minutes)',
    intervalMinutes: 'minutes gap',
    alarmLabel: 'Alarm Label',
    activeAlarms: 'Active Alarms',
    noAlarms: 'No active alarms. Speak a command or create one manually!',
    ringsIn: 'Rings in',
    repeatsCount: 'times repeat',
    dismissAlarm: 'Dismiss Current Ring (Will ring again next interval)',
    stopAllRepeats: 'Stop All Repeats',
    snooze: 'Snooze',
    alarmRinging: 'Alarm is Ringing!',
    listeningActive: 'Microphone Listening',
    listeningPaused: 'Microphone Paused',
    sayKeywordToStart: 'Say "Start" or "Shuru" to trigger instantly',
    noiseSensitivity: 'Noise Filter Sensitivity',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    voiceGuide: 'Voice Commands Guide',
    installApp: 'Install App',
    speechSynthesis: 'Spoken Confirmations',
    soundEffects: 'Sound Effects & Chimes',
    keepScreenAwake: 'Keep Screen Awake',
    settingsTitle: 'Settings',
    settingsSubtitle: 'Language & API Keys',
    byokTitle: 'Gemini API Keys (BYOK)',
    byokSubtitle: 'Add your own keys — 1500 req/day per key',
    byokAddPlaceholder: 'Paste any Gemini API key',
    byokTest: 'Test',
    byokDelete: 'Remove',
    byokEmpty: 'No keys — server pool or local parser will be used',
    byokHint: 'Keys stored in localStorage, sent via X-Gemini-Keys header',
    byokSaved: 'Key saved',
    byokInvalid: 'Key cannot be empty',
    byokDuplicate: 'Key already exists',
    languageSection: 'Language',
    audioSection: 'Audio',
    save: 'Save',
    cancel: 'Cancel',
  },
  hinglish: {
    appTitle: 'Voice Assistant Clock',
    appSubtitle: 'Instant Voice Stopwatch, Timer aur Multi-Repeat Interval Alarm',
    stopwatchTab: 'Stopwatch',
    timerTab: 'Timer',
    alarmsTab: 'Smart Alarm',
    voiceAssistant: 'Voice Assistant',
    start: 'Start / Shuru',
    stop: 'Stop / Ruko',
    pause: 'Pause',
    reset: 'Reset',
    lap: 'Lap',
    resume: 'Resume',
    clearLaps: 'Laps Hatayein',
    lapsTitle: 'Lap Records',
    noLapsYet: 'Abhi tak koi lap record nahi hua',
    fastestLap: 'Sabse Tej (Fastest)',
    slowestLap: 'Sabse Dheema (Slowest)',
    fullscreen: 'Fullscreen Mode',
    exitFullscreen: 'Normal Mode',
    timerQuickPresets: 'Quick Timers',
    customTimer: 'Custom Timer',
    setTimer: 'Timer Lagayein',
    timerFinished: 'Timer Khatam!',
    alarmsTitle: 'Multi-Repeat Interval Alarm',
    createAlarm: 'Naya Alarm Lagayein',
    alarmTime: 'Alarm Ka Time',
    repeatTimes: 'Kitni baar bajega (5 bar repeat)',
    intervalGap: 'Gap Kitne Minute Ka (2 minute gap)',
    intervalMinutes: 'min ka gap',
    alarmLabel: 'Alarm Ka Naam',
    activeAlarms: 'Active Alarms',
    noAlarms: 'Koi active alarm nahi hai. Bol kar ya manually set karein!',
    ringsIn: 'Bajega',
    repeatsCount: 'baar repeat',
    dismissAlarm: 'Abhi Ka Ring Band Karein (Agli baar phir bajega)',
    stopAllRepeats: 'Alarm Poori Tarah Band Karein',
    snooze: 'Snooze',
    alarmRinging: 'Alarm Baj Raha Hai!',
    listeningActive: 'Mic Sun Raha Hai',
    listeningPaused: 'Mic Band Hai',
    sayKeywordToStart: 'Start karne ke liye "Start" ya "Shuru" bolein',
    noiseSensitivity: 'Noise Sensitivity',
    low: 'Low (Shant jagah)',
    medium: 'Medium (Normal)',
    high: 'High (Tez shor me)',
    voiceGuide: 'Voice Command Guide',
    installApp: 'App Install Karein',
    speechSynthesis: 'Bol Kar Confirm Karein',
    soundEffects: 'Sound Effects',
    keepScreenAwake: 'Screen On Rakhein',
    settingsTitle: 'Settings',
    settingsSubtitle: 'Language & API Keys',
    byokTitle: 'Gemini API Keys (BYOK)',
    byokSubtitle: 'Apni keys add karo — 1500 req/day per key',
    byokAddPlaceholder: 'AIza... key paste karo',
    byokTest: 'Test',
    byokDelete: 'Hatao',
    byokEmpty: 'Koi key nahi — server pool use hoga',
    byokHint: 'Keys localStorage me save, X-Gemini-Keys se bhejdi jayengi',
    byokSaved: 'Keys save ho gayi',
    byokInvalid: 'Invalid key — AIza se start hona chahiye',
    byokDuplicate: 'Ye key pehle se hai',
    languageSection: 'Language',
    audioSection: 'Audio',
    save: 'Save',
    cancel: 'Cancel',
  },
};
