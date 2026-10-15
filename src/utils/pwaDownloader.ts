/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to trigger automated file downloads on any client browser
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('File download failed:', err);
    return false;
  }
}

// Generate standalone HTML WebApp package launcher
export function downloadWebAppLauncher(currentUrl?: string) {
  const targetUrl = currentUrl || (typeof window !== 'undefined' ? window.location.href : '/');
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#090d16">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Voice Assistant Clock</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: #090d16;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #06b6d4, #4f46e5);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      box-shadow: 0 10px 25px rgba(6, 182, 212, 0.3);
    }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      margin-bottom: 12px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #06b6d4, #2563eb);
      color: #ffffff;
      box-shadow: 0 10px 20px rgba(6, 182, 212, 0.25);
    }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .instructions {
      text-align: left;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 16px;
      margin-top: 16px;
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⏱️</div>
    <h1>Voice Assistant Clock</h1>
    <p>Voice-controlled stopwatch, countdown timer, and multi-repeat interval alarms.</p>
    <a href="${targetUrl}" class="btn btn-primary" id="launchBtn">🚀 Launch App Now</a>
    <button class="btn btn-secondary" onclick="window.location.reload()">🔄 Refresh</button>
    <div class="instructions">
      <strong>📱 Mobile Installation:</strong><br>
      • <b>Android Chrome:</b> Tap Menu (⋮) &gt; "Install app" or "Add to Home screen"<br>
      • <b>iOS Safari:</b> Tap Share &gt; "Add to Home Screen"<br>
      • <b>PC/Mac:</b> Click the Install icon (⊕) in the browser address bar.
    </div>
  </div>
  <script>
    // Auto redirect when opened
    try {
      window.location.replace("${targetUrl}");
    } catch(e) {}
  </script>
</body>
</html>`;

  return triggerFileDownload(htmlContent, 'VoiceAssistantClock-WebApp.html', 'text/html;charset=utf-8');
}

// Generate Apple iOS WebClip Configuration Profile (.mobileconfig)
export function downloadIOSMobileConfig(currentUrl?: string) {
  const targetUrl = currentUrl || (typeof window !== 'undefined' ? window.location.href : 'https://localhost:3000');
  const uuid1 = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().toUpperCase() : '9B73474F-4C23-4FA7-88D8-' + Math.floor(100000000000 + Math.random() * 900000000000);
  const uuid2 = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().toUpperCase() : 'A1D4E9F2-534B-4DC8-94A1-' + Math.floor(100000000000 + Math.random() * 900000000000);

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>Voice Clock</string>
            <key>PayloadDescription</key>
            <string>Voice Assistant Clock Web App on Home Screen</string>
            <key>PayloadDisplayName</key>
            <string>Voice Assistant Clock</string>
            <key>PayloadIdentifier</key>
            <string>com.voiceassistantclock.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>${uuid1}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${targetUrl}</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Voice Assistant Clock</string>
    <key>PayloadIdentifier</key>
    <string>com.voiceassistantclock.profile</string>
    <key>PayloadOrganization</key>
    <string>Voice Assistant Clock</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${uuid2}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

  return triggerFileDownload(xmlContent, 'VoiceAssistantClock-iOS.mobileconfig', 'application/x-apple-aspen-config');
}

// Generate Windows Desktop Internet Shortcut (.url)
export function downloadDesktopShortcut(currentUrl?: string) {
  const targetUrl = currentUrl || (typeof window !== 'undefined' ? window.location.href : 'https://localhost:3000');
  const shortcutContent = `[InternetShortcut]\nURL=${targetUrl}\nIconIndex=0\n`;
  return triggerFileDownload(shortcutContent, 'VoiceAssistantClock.url', 'application/x-mswinurl');
}
