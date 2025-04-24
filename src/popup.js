document.addEventListener('DOMContentLoaded', () => {
  const sendCmd = async (action, payload = {}) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] });
      return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    }
  };

  const buttons = {
    increaseText: { action: 'increaseTextSize', display: document.getElementById('sizeDisplay') },
    decreaseText: { action: 'decreaseTextSize', display: document.getElementById('sizeDisplay') },
    toggleContrast: { action: 'toggleContrast' },
    toggleDyslexia: { action: 'toggleDyslexia' },
    resetAll: { action: 'resetAll' }
  };

  // Initialize text size display
  (async function init() {
    const res = await sendCmd('getState');
    if (res?.success) {
      document.getElementById('sizeDisplay').textContent = `${Math.round(res.size * 100)}%`;
    }
  })();

  Object.entries(buttons).forEach(([id, cfg]) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const res = await sendCmd(cfg.action);
      if (res?.success) {
        if (cfg.display && res.size != null) {
          cfg.display.textContent = `${Math.round(res.size * 100)}%`;
        }
        if (id === 'resetAll') {
          document.getElementById('lineFocusSelect').value = 'off';
        }
      }
    });
  });

  document.getElementById('colorFilterSelect').addEventListener('change', async e => {
    const filter = e.target.value;
    await sendCmd(filter === 'none' ? 'resetColorFilter' : 'setColorFilter', { filter });
  });

  document.getElementById('applyColors').addEventListener('click', async () => {
    const textColor = document.getElementById('textColorInput').value;
    const bgColor = document.getElementById('bgColorInput').value;
    await sendCmd('setCustomColors', { textColor, bgColor });
  });
  document.getElementById('resetColors').addEventListener('click', async () => {
    await sendCmd('resetCustomColors');
  });

  document.getElementById('lineFocusSelect').addEventListener('change', async e => {
    const on = e.target.value === 'on';
    await sendCmd(on ? 'enableLineFocus' : 'disableLineFocus');
  });
});

document.getElementById('read-button')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'read_text' });
  });
});

document.getElementById('pause-button')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'pause_speech' });
  });
});

document.getElementById('resume-button')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'resume_speech' });
  });
});

document.getElementById('stop-button')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'stop_speech' });
  });
});

