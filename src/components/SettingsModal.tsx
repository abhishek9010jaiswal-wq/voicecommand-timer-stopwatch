import React, { useState, useEffect } from 'react';
import {
  X,
  Settings2,
  KeyRound,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Save,
  Globe,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LanguageCode, translations } from '../utils/translations';
import { soundEngine, triggerHaptic } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const LS_BYOK = 'chronos_byok_keys';

function loadByokKeys(): string[] {
  try {
    const raw = localStorage.getItem(LS_BYOK) || '';
    if (!raw.trim()) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  } catch { return []; }
}

function saveByokKeys(keys: string[]) {
  try {
    if (keys.length === 0) localStorage.removeItem(LS_BYOK);
    else localStorage.setItem(LS_BYOK, keys.join(','));
  } catch {}
}

function maskKey(key: string): string {
  if (key.length <= 12) return key.slice(0, 4) + '****';
  return key.slice(0, 6) + '****' + key.slice(-4);
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLanguageChange,
  isMuted,
  onToggleMute,
}) => {
  const t = translations[lang];
  const [keys, setKeys] = useState<string[]>(() => loadByokKeys());
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const firstInputRef = React.useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      setKeys(loadByokKeys());
      setMsg(null);
      setTestResult(null);
      setInput('');
      setRevealed({});
      setEditIndex(null);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const persist = (next: string[]) => {
    setKeys(next);
    saveByokKeys(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) {
      setMsg({ type: 'err', text: t.byokInvalid });
      return;
    }
    if (keys.includes(val)) {
      setMsg({ type: 'err', text: t.byokDuplicate });
      return;
    }
    const next = [...keys, val];
    persist(next);
    setInput('');
    setMsg({ type: 'ok', text: t.byokSaved });
    triggerHaptic(40);
    setTimeout(() => setMsg(null), 2500);
  };

  const handleDelete = (idx: number) => {
    const next = keys.filter((_, i) => i !== idx);
    persist(next);
    triggerHaptic(30);
  };

  const startEdit = (idx: number) => {
    setEditIndex(idx);
    setEditValue(keys[idx]);
  };

  const confirmEdit = () => {
    if (editIndex === null) return;
    const val = editValue.trim();
    if (!val) return;
    if (keys.some((k, i) => i !== editIndex && k === val)) {
      setMsg({ type: 'err', text: t.byokDuplicate });
      return;
    }
    const next = [...keys];
    next[editIndex] = val;
    persist(next);
    setEditIndex(null);
    setEditValue('');
    setMsg({ type: 'ok', text: t.byokSaved });
    setTimeout(() => setMsg(null), 2500);
  };

  const handleTest = async () => {
    const byok = keys.join(',');
    setTesting(true);
    setTestResult(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (byok.trim()) headers['X-Gemini-Keys'] = byok;
      const res = await fetch('/api/parse-voice-command', {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcript: 'start stopwatch', capturedAt: performance.now(), currentLocalTime: new Date().toLocaleTimeString('en-US', { hour12: false }) }),
      });
      const data = await res.json() as { action?: string; feedbackMessage?: string; geminiError?: string; error?: string };
      if (res.ok && data.action === 'START_STOPWATCH') {
        if (data.geminiError) {
          const errMsg = data.geminiError.slice(0, 200);
          setTestResult({ ok: false, text: `✗ API issue: ${errMsg}. Local parser works! Add valid key for full NLP.` });
          soundEngine.playStopChime();
        } else {
          setTestResult({ ok: true, text: `✓ API working! ${data.feedbackMessage || 'OK'}` });
          soundEngine.playStartChime();
        }
      } else if (data.error) {
        setTestResult({ ok: false, text: data.error });
      } else {
        setTestResult({ ok: false, text: data.feedbackMessage || data.action || 'Unexpected response' });
      }
    } catch (err) {
      setTestResult({ ok: false, text: String(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in" onClick={onClose} role="presentation">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="settings-title" className="text-sm sm:text-base font-bold text-white">{t.settingsTitle}</h3>
              <p className="text-[11px] text-slate-400">{t.settingsSubtitle}</p>
            </div>
          </div>
          <button type="button" aria-label="Close settings" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <section className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-xs">
              <Globe className="w-4 h-4" />
              <span>{t.languageSection}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['en', 'hi', 'hinglish'] as LanguageCode[]).map(code => (
                <button key={code} type="button" onClick={() => onLanguageChange(code)}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${lang === code ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'}`}>
                  {code === 'en' ? 'English' : code === 'hi' ? 'हिंदी' : 'Hinglish'}
                </button>
              ))}
            </div>
          </section>

          <section className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-xs">
              <Volume2 className="w-4 h-4" />
              <span>{t.audioSection}</span>
            </div>
            <button type="button" onClick={onToggleMute}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${isMuted ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-slate-900 border-slate-700 text-slate-200'}`}>
              <span className="flex items-center gap-2">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}<span>{isMuted ? 'Muted' : 'Sound On'}</span></span>
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${isMuted ? 'bg-rose-500 text-white' : 'bg-cyan-500 text-white'}`}>{isMuted ? 'Off' : 'On'}</span>
            </button>
          </section>

          <section className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center gap-2 mb-1 text-cyan-300 font-bold text-xs">
              <KeyRound className="w-4 h-4" />
              <span>{t.byokTitle}</span>
              {keys.length > 0 && <span className="ml-auto px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">{keys.length} keys</span>}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">{t.byokSubtitle}</p>
            <p className="text-[10px] text-slate-500 mb-3">{t.byokHint}</p>

            <form onSubmit={handleAdd} className="flex gap-2 mb-3">
              <input ref={firstInputRef} aria-label={t.byokAddPlaceholder} type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={t.byokAddPlaceholder}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400" />
              <button type="submit" className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 cursor-pointer flex items-center gap-1 flex-shrink-0">
                <Plus className="w-3.5 h-3.5" /><span>Add</span>
              </button>
            </form>

            {msg && (
              <div className={`mb-2 px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 ${msg.type === 'ok' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'}`}>
                {msg.type === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}

            {keys.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-900/40">{t.byokEmpty}</div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {keys.map((k, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-700">
                    {editIndex === idx ? (
                      <>
                        <input autoFocus type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400" />
                        <button type="button" onClick={confirmEdit} className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer"><Save className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => { setEditIndex(null); setEditValue(''); }} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 min-w-0 text-xs font-mono text-slate-200 truncate">{revealed[idx] ? k : maskKey(k)}</span>
                        <button type="button" aria-label={revealed[idx] ? 'Hide key' : 'Reveal key'} onClick={() => setRevealed(r => ({ ...r, [idx]: !r[idx] }))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer" title={revealed[idx] ? 'Hide' : 'Reveal'}>
                          {revealed[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" aria-label="Edit key" onClick={() => startEdit(idx)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold cursor-pointer">Edit</button>
                        <button type="button" aria-label="Delete key" onClick={() => handleDelete(idx)} className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={handleTest} disabled={testing}
              className="mt-3 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
              <FlaskConical className="w-3.5 h-3.5" />              <span>{testing ? 'Testing...' : t.byokTest + ' (start/stop)'}</span>
            </button>
            {testResult && (
              <div className={`mt-2 px-2.5 py-1.5 rounded-xl text-xs border ${testResult.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>{testResult.text}</div>
            )}
          </section>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-blue-500 cursor-pointer flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /><span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
