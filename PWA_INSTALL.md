# Chronos Voice — PWA Universal Install

Single build installable on **any device via browser** — no APK/IPA/EXE. Native-app feel (`display: standalone`, offline, push-ready) from one `dist/` over HTTPS.

## 1. Build & Host

```bash
npm install
npm run build            # generates dist/ + manifest.webmanifest + sw.js
# Archive for distribution:
npm run pwa:archive      # creates chronos-voice-pwa-dist.zip (259 KB)
```

Host `dist/` over HTTPS (required for PWA + mic):
- **Vercel / Netlify / Cloudflare Pages**: drop `dist/` or connect repo, `output: dist`.
- **Cloud Run / VPS** (Express): `NODE_ENV=production GEMINI_API_KEYS=key1,key2 tsx server.ts` serves `dist/` + `/api/parse-voice-command` (already wired in `server.ts:325`).
- **Local / offline demo**: `npx serve dist` or `npx vite preview --port 4173` — `localhost` is PWA-exempt (no HTTPS needed locally). Gemini START/STOP falls back to local parser offline.

Env: `GEMINI_API_KEYS` (or `GEMINI_API_KEY`), optional `GEMINI_MODEL=gemini-2.0-flash`, `PORT`.

## 2. Verify Installability

```bash
npm run lint && npm run build
ls dist/manifest.webmanifest dist/sw.js   # both must exist
cat dist/manifest.webmanifest               # standalone, icons 192/512 + maskable
```

Chrome `DevTools → Application → Manifest | Service Workers`: `sw.js` active, 17 precached entries (833 KiB). Lighthouse `PWA` → *Installable*.

## 3. Install Per Device

| Device | Steps |
|--------|-------|
| **Android Chrome / Samsung / Opera** | Open URL → `⋮ → Install app` or `Add to Home screen` → confirm → icon on launcher. Or modal `Install` → prompt. Optional: modal `Download .html` downloads standalone launcher (opt-in). |
| **iPhone / iPad (iOS Safari)** | Open URL in **Safari** → `Share (□↑) → Add to Home Screen → Add` → launches full-screen. iPadOS correctly detects via `maxTouchPoints`. Optional: `Download iOS profile (.mobileconfig)` → Settings trust. |
| **Windows (Chrome/Edge)** | Address bar `Install` (⊕) or `⋮ → Save and share → Install Voice Assistant Clock`. Optional: `Download .url` shortcut. |
| **macOS / Linux / ChromeOS** | Same Chrome/Edge address bar install. |

App runs `standalone` (no browser chrome), `theme_color #090d16`, splash from `background_color`.

## 4. After Install

- Offline: stopwatch/timer/alarms work; Gemini START/STOP falls back to local English `start` → `OfflineIndicator` banner.
- Language: Settings ⚙️ → `English / हिंदी / Hinglish` (`voice_clock_lang`).
- BYOK: Settings → paste `AIza...` keys → `Test` → `start` → `START_STOPWATCH`; stored `localStorage: chronos_byok_keys`, sent `X-Gemini-Keys` (masked UI).
- Mic: needs HTTPS + `Permissions-Policy: microphone=*` (already set); grant via browser prompt.
- Updates: `registerType: autoUpdate` — new deploy → sw.js updates, reload to apply.

## 5. Troubleshooting

- **No prompt**: browser heuristic; use manual `⋮/Share → Install`.
- **HTTP** → PWA/mic blocked; need HTTPS or `localhost`.
- **Icons** → verify `public/pwa-*.png` published to `dist/`.
- **Subpath hosting** → change `vite.config.ts manifest.start_url/scope` if not root.
