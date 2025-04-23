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
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        
        if (!tab.url.includes('en.wikipedia.org/wiki/Texas_A%26M_University')) {
          alert('Please use this on the Texas A&M University Wikipedia page');
          return;
        }

        // Try to send message to content script
        let response;
        try {
          response = await chrome.tabs.sendMessage(tab.id, { action: config.action });
        } catch (e) {
          // If message fails, inject content script and try again
          await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['content.js']
          });
          await chrome.scripting.insertCSS({
            target: {tabId: tab.id},
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
});