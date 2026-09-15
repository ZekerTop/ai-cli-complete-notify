// Run Vite, then open /tests/update-ui.html. No real release requests are sent.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useUpdateCheck } from '../src-ui/hooks/useUpdateCheck';
import Sidebar from '../src-ui/components/Sidebar';
import '../src-ui/i18n';
import '../src-ui/styles/globals.css';

window.IS_REACT_ACT_ENVIRONMENT = true;
let release: ReturnType<typeof useUpdateCheck>;
let selected = '';
let requests = 0;
let response = 'v2.17.0';
let interval: (() => void) | undefined;
let cleared = false;
const originalFetch = window.fetch;
const originalSetInterval = window.setInterval;
const originalClearInterval = window.clearInterval;
window.fetch = async () => {
  requests++;
  if (response === 'offline') throw new Error('offline');
  return { ok: true, status: 200, json: async () => ({ tag_name: response, html_url: `https://github.com/ZekerTop/ai-cli-complete-notify/releases/tag/${response}` }) } as Response;
};
window.setInterval = ((callback: () => void, ms: number) => {
  if (ms !== 3600000) throw new Error('Expected hourly checks');
  interval = callback;
  return 1;
}) as typeof window.setInterval;
window.clearInterval = () => { cleared = true; };
function Harness() {
  release = useUpdateCheck('2.16.1');
  return <Sidebar activePanel="notifications" onNavigate={id => { selected = id; }} version="2.16.1"
    hasUpdate={release.hasUpdate} language="zh-CN" onLanguageChange={() => {}}
    watchRunning={false} onWatchToggle={() => {}} />;
}
function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}
const root = createRoot(document.getElementById('test-root')!);
try {
  await act(async () => { root.render(<Harness />); });
  assert(requests === 1 && release!.hasUpdate, 'Startup must detect an update without opening About');
  const button = document.querySelector('button[aria-label="发现新版本，点击前往关于项目"]') as HTMLButtonElement;
  assert(button?.querySelector('[aria-hidden="true"]'), 'Version button must show a dot and an accessible hint');
  await act(async () => { button.click(); });
  assert(selected === 'about-project', 'Version button must navigate to About');
  response = 'offline';
  await act(async () => { interval!(); });
  assert(requests === 2 && release!.updateState.status === 'error' && release!.hasUpdate, 'Background failure must preserve known update');
  response = 'v2.16.1';
  await act(async () => { await Promise.all([release!.runUpdateCheck(), release!.runUpdateCheck()]); });
  assert(requests === 3 && !release!.hasUpdate, 'Manual checks must deduplicate and refresh the badge');
  await act(async () => { root.unmount(); });
  assert(cleared, 'Unmount must clear the timer');
  document.getElementById('result')!.textContent = 'PASS: startup, hourly checks, red dot, About navigation, offline recovery, request deduplication, timer cleanup';
} catch (error) {
  document.getElementById('result')!.textContent = `FAIL: ${error}`;
  throw error;
} finally {
  window.fetch = originalFetch;
  window.setInterval = originalSetInterval;
  window.clearInterval = originalClearInterval;
}
