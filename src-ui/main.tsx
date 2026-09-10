import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './styles/globals.css';
import { applyTheme, readTheme } from './lib/theme';

applyTheme(readTheme(), window.matchMedia('(prefers-color-scheme: dark)').matches);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

window.requestAnimationFrame(() => {
  document.getElementById('boot')?.remove();
});
