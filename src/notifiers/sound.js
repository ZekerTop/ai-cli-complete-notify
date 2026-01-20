const { spawn } = require('child_process');

function playWindowsTtsAndBeep(text) {
  const safeText = String(text).replace(/"/g, "'");
  const psScript = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("${safeText}"); [console]::Beep(800, 300)`;
  return spawn('powershell', ['-Command', psScript], { stdio: 'ignore', shell: false });
}

function playBeep() {
  const psScript = '[console]::Beep(800, 500)';
  return spawn('powershell', ['-Command', psScript], { stdio: 'ignore', shell: false });
}

function notifySound({ config, title }) {
  return new Promise((resolve) => {
    try {
      if (process.platform !== 'win32') {
        resolve({ ok: false, error: 'sound not supported on this platform' });
        return;
      }

      if (!config.channels.sound.tts) {
        const processRef = playBeep();
        processRef.on('error', (error) => resolve({ ok: false, error: error.message }));
        processRef.on('close', () => resolve({ ok: true, error: null }));
        return;
      }

      const processRef = playWindowsTtsAndBeep(title);
      processRef.on('error', () => {
        if (config.channels.sound.fallbackBeep) {
          const fallback = playBeep();
          fallback.on('error', () => {});
        }
        resolve({ ok: false, error: 'sound notification failed' });
      });
      processRef.on('close', (code) => {
        if (code !== 0 && config.channels.sound.fallbackBeep) {
          const fallback = playBeep();
          fallback.on('error', () => {});
        }
        resolve({ ok: code === 0, error: code === 0 ? null : 'sound notification exited with error' });
      });
    } catch (error) {
      if (config.channels.sound.fallbackBeep && process.platform === 'win32') {
        const fallback = playBeep();
        fallback.on('error', () => {});
      }
      resolve({ ok: false, error: error.message });
    }
  });
}


module.exports = {
  notifySound
};
