const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('completeNotify', {
  getMeta: () => ipcRenderer.invoke('completeNotify:getMeta'),
  getConfig: () => ipcRenderer.invoke('completeNotify:getConfig'),
  saveConfig: (next) => ipcRenderer.invoke('completeNotify:saveConfig', next),
  setUiLanguage: (language) => ipcRenderer.invoke('completeNotify:setUiLanguage', language),
  setCloseBehavior: (behavior) => ipcRenderer.invoke('completeNotify:setCloseBehavior', behavior),
  setAutostart: (enabled) => ipcRenderer.invoke('completeNotify:setAutostart', enabled),
  getAutostart: () => ipcRenderer.invoke('completeNotify:getAutostart'),
  openExternal: (url) => ipcRenderer.invoke('completeNotify:openExternal', url),
  testNotify: (payload) => ipcRenderer.invoke('completeNotify:testNotify', payload),
  openPath: (targetPath) => ipcRenderer.invoke('completeNotify:openPath', targetPath),
  watchStatus: () => ipcRenderer.invoke('completeNotify:watchStatus'),
  watchStart: (payload) => ipcRenderer.invoke('completeNotify:watchStart', payload),
  watchStop: () => ipcRenderer.invoke('completeNotify:watchStop'),
  onWatchLog: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const listener = (_event, line) => handler(line);
    ipcRenderer.on('completeNotify:watchLog', listener);
    return () => ipcRenderer.removeListener('completeNotify:watchLog', listener);
  }
});
