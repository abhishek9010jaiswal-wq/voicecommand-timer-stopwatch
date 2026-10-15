if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.addEventListener('error', (e) => {
    const msg = String(e.message || e.error?.message || '');
    if (msg.includes('WebSocket') || e.filename?.includes('@vite/client') || msg.includes('closed without opened')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reasonMsg = String(e.reason?.message || e.reason || '');
    if (reasonMsg.includes('WebSocket') || reasonMsg.includes('closed without opened')) {
      e.preventDefault();
    }
  });
}

import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
