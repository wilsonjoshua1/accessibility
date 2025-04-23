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

  async function updateButtonStates() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('en.wikipedia.org/wiki/Texas_A%26M_University')) return;

      const response = await sendCmd('getState');
      if (response?.success) {
        const wikiButton = document.getElementById('toggleWikiControls');
        if (wikiButton) {
          wikiButton.textContent = response.wikiControlsHidden
            ? 'Turn off Focus Mode'
            : 'Turn on Focus Mode';
        }

        const sizeDisplay = document.getElementById('sizeDisplay');
        if (sizeDisplay) {
          sizeDisplay.textContent = `${Math.round(response.size * 100)}%`;
        }
      }
    } catch (error) {
      console.log('Content script not ready yet:', error);
    }
  }

  Object.entries(buttons).forEach(([id, config]) => {
    const button = document.getElementById(id);
    if (!button) return;

    button.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('en.wikipedia.org/wiki/Texas_A%26M_University')) {
        alert('Please use this on the Texas A&M University Wikipedia page');
        return;
      }

      const response = await sendCmd(config.action);
      if (response?.success) {
        if (config.display) {
          config.display.textContent = `${Math.round(response.size * 100)}%`;
        }
        if (config.action === 'toggleWikiControls') {
          button.textContent = response.isHidden
            ? 'Turn off Focus Mode'
            : 'Turn on Focus Mode';
        }
        if (id === 'resetAll') {
          const lineSelect = document.getElementById('lineFocusSelect');
          if (lineSelect) lineSelect.value = 'off';
        }
      }
    });
  });

  // Initialize button states
  updateButtonStates();

  // Color filter select
  const colorFilterSelect = document.getElementById('colorFilterSelect');
  if (colorFilterSelect) {
    colorFilterSelect.addEventListener('change', async () => {
      const filter = colorFilterSelect.value;
      const action = filter === 'none' ? 'resetColorFilter' : 'setColorFilter';
      const response = await sendCmd(action, { filter });
      if (!response?.success) {
        alert('Failed to apply color filter. Please refresh the page and try again.');
      }
    });
  }
});


  // Color filter
  document.getElementById('colorFilterSelect').addEventListener('change', async e => {
    const filter = e.target.value;
    await sendCmd(filter==='none'?'resetColorFilter':'setColorFilter', { filter });
  });

  // Custom colors
  document.getElementById('applyColors').addEventListener('click', async () => {
    const textColor = document.getElementById('textColorInput').value;
    const bgColor = document.getElementById('bgColorInput').value;
    await sendCmd('setCustomColors', { textColor, bgColor });
  });
  document.getElementById('resetColors').addEventListener('click', async () => {
    await sendCmd('resetCustomColors');
  });


  // **New** Line Focus toggle
  document.getElementById('lineFocusSelect').addEventListener('change', async e => {
    const on = e.target.value === 'on';
    await sendCmd(on ? 'enableLineFocus' : 'disableLineFocus');
  });

