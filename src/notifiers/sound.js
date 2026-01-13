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
      if (!config.channels.sound.tts) {
        playBeep().on('close', () => resolve({ ok: true, error: null }));
        return;
      }

      const processRef = playWindowsTtsAndBeep(title);
      processRef.on('error', () => {
        if (config.channels.sound.fallbackBeep) playBeep();
        resolve({ ok: false, error: '声音提醒失败' });
      });
      processRef.on('close', (code) => {
        if (code !== 0 && config.channels.sound.fallbackBeep) playBeep();
        resolve({ ok: code === 0, error: code === 0 ? null : '声音提醒异常退出' });
      });
    } catch (error) {
      if (config.channels.sound.fallbackBeep) playBeep();
      resolve({ ok: false, error: error.message });
    }
  });
}

module.exports = {
  notifySound
};

