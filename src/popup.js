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
          
          if (tab.url.includes('benjerry.com')) {
            const response = await chrome.tabs.sendMessage(tab.id, { action: config.action });
            
            if (response?.success && config.display) {
              // Update size display if this button affects font size
              config.display.textContent = `${Math.round(response.size * 100)}%`;
            }
          } else {
            alert('Please use this on benjerry.com');
          }
        } catch (error) {
          console.error('Error:', error);
          // Fallback injection if needed
          try {
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true
            });
            await chrome.scripting.executeScript({
              target: {tabId: tab.id},
              files: ['content.js']
            });
            const response = await chrome.tabs.sendMessage(tab.id, { action: config.action });
            if (response?.success && config.display) {
              config.display.textContent = `${Math.round(response.size * 100)}%`;
            }
          } catch (fallbackError) {
            console.error('Fallback failed:', fallbackError);
          }
        }
      });
    });
  });