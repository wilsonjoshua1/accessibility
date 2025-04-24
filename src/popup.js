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
    toggleWikiControls: { action: 'toggleWikiControls' },
    resetAll: { action: 'resetAll' }
  };

  // Initialize states (text size & wiki controls label)
  (async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes('en.wikipedia.org/wiki/Texas_A%26M_University')) return;
    const res = await sendCmd('getState');
    if (res?.success) {
      document.getElementById('sizeDisplay').textContent = `${Math.round(res.size * 100)}%`;
      const wikiBtn = document.getElementById('toggleWikiControls');
      if (wikiBtn) {
        wikiBtn.textContent = res.wikiControlsHidden ? 'Turn off Focus Mode' : 'Turn on Focus Mode';
      }
    }
  })();

  Object.entries(buttons).forEach(([id, cfg]) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url.includes('en.wikipedia.org/wiki/Texas_A%26M_University')) {
        alert('Please use this on the Texas A&M University Wikipedia page');
        return;
      }

      const res = await sendCmd(cfg.action);
      if (res?.success) {
        if (cfg.display && res.size != null) {
          cfg.display.textContent = `${Math.round(res.size * 100)}%`;
        }
        if (cfg.action === 'toggleWikiControls') {
          btn.textContent = res.isHidden ? 'Turn off Focus Mode' : 'Turn on Focus Mode';
        }
        if (id === 'resetAll') {
          // also reset Reading Aid dropdown
          const lf = document.getElementById('lineFocusSelect');
          if (lf) lf.value = 'off';
        }
      }
    });
  });

  // Color Filters
  document.getElementById('colorFilterSelect').addEventListener('change', async e => {
    const filter = e.target.value;
    await sendCmd(filter === 'none' ? 'resetColorFilter' : 'setColorFilter', { filter });
  });

  // Custom Colors
  document.getElementById('applyColors').addEventListener('click', async () => {
    const textColor = document.getElementById('textColorInput').value;
    const bgColor = document.getElementById('bgColorInput').value;
    await sendCmd('setCustomColors', { textColor, bgColor });
  });
  document.getElementById('resetColors').addEventListener('click', async () => {
    await sendCmd('resetCustomColors');
  });

  // Line Focus toggle
  document.getElementById('lineFocusSelect').addEventListener('change', async e => {
    const on = e.target.value === 'on';
    await sendCmd(on ? 'enableLineFocus' : 'disableLineFocus');
  });
});
