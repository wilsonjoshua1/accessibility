document.addEventListener('DOMContentLoaded', function() {
  const buttons = {
    increaseText: {action: 'increaseTextSize', display: document.getElementById('sizeDisplay')},
    decreaseText: {action: 'decreaseTextSize', display: document.getElementById('sizeDisplay')},
    toggleContrast: {action: 'toggleContrast'},
    toggleDyslexia: {action: 'toggleDyslexia'},
    resetAll: {action: 'resetAll'}
  };

  Object.entries(buttons).forEach(([id, config]) => {
    const button = document.getElementById(id);
    if (!button) return;
    
    button.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url.includes('en.wikipedia.org/wiki/Texas_A%26M_University')) {
          alert('Please use this on the Texas A&M University Wikipedia page');
          return;
        }

        let response;
        try {
          response = await chrome.tabs.sendMessage(tab.id, { action: config.action });
        } catch (e) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['styles.css']
          });
          response = await chrome.tabs.sendMessage(tab.id, { action: config.action });
        }

        if (response?.success && config.display) {
          config.display.textContent = `${Math.round(response.size * 100)}%`;
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to execute command. Please refresh the page and try again.');
      }
    });
  });

  // Color filter select handler
  const colorFilterSelect = document.getElementById('colorFilterSelect');
  if (colorFilterSelect) {
    colorFilterSelect.addEventListener('change', async () => {
      const filter = colorFilterSelect.value;
      const action = filter === 'none' ? 'resetColorFilter' : 'setColorFilter';
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let response;
        try {
          response = await chrome.tabs.sendMessage(tab.id, { action, filter });
        } catch (e) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['styles.css']
          });
          response = await chrome.tabs.sendMessage(tab.id, { action, filter });
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to apply color filter. Please refresh the page and try again.');
      }
    });
  }

  // Custom colors apply handler
  const applyColorsBtn = document.getElementById('applyColors');
  if (applyColorsBtn) {
    applyColorsBtn.addEventListener('click', async () => {
      const textColor = document.getElementById('textColorInput').value;
      const bgColor = document.getElementById('bgColorInput').value;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let response;
        try {
          response = await chrome.tabs.sendMessage(tab.id, {
            action: 'setCustomColors',
            textColor,
            bgColor
          });
        } catch (e) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['styles.css']
          });
          response = await chrome.tabs.sendMessage(tab.id, {
            action: 'setCustomColors',
            textColor,
            bgColor
          });
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to apply custom colors. Please refresh the page and try again.');
      }
    });
  }

  // Reset custom colors handler
  const resetColorsBtn = document.getElementById('resetColors');
  if (resetColorsBtn) {
    resetColorsBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let response;
        try {
          response = await chrome.tabs.sendMessage(tab.id, { action: 'resetCustomColors' });
        } catch (e) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['styles.css']
          });
          response = await chrome.tabs.sendMessage(tab.id, { action: 'resetCustomColors' });
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to reset custom colors. Please refresh the page and try again.');
      }
    });
  }

});
