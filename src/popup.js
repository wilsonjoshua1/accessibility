document.addEventListener('DOMContentLoaded', function() {
  const buttons = {
    increaseText: {action: 'increaseTextSize', display: document.getElementById('sizeDisplay')},
    decreaseText: {action: 'decreaseTextSize', display: document.getElementById('sizeDisplay')},
    toggleContrast: {action: 'toggleContrast'},
    toggleDyslexia: {action: 'toggleDyslexia'},
    toggleWikiControls: {action: 'toggleWikiControls'},
    resetAll: {action: 'resetAll'}
  };

  // Update button text based on current state
  async function updateButtonStates() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      
      if (!tab.url.includes('en.wikipedia.org/wiki/Texas_A%26M_University')) {
        return;
      }
      
      // Get current state from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getState' });
      if (response?.success) {
        // Update wiki controls button text
        const wikiButton = document.getElementById('toggleWikiControls');
        if (wikiButton) {
          wikiButton.textContent = response.wikiControlsHidden 
            ? 'Turn off Focus Mode' 
            : 'Turn on Focus Mode';
        }
        
        // Update font size display
        const sizeDisplay = document.getElementById('sizeDisplay');
        if (sizeDisplay) {
          sizeDisplay.textContent = `${Math.round(response.size * 100)}%`;
        }
      }
    } catch (error) {
      console.log('Content script not ready yet:', error);
    }
  }

  // Set up button click handlers
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

        // Send message to content script
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

        if (response?.success) {
          // Update display elements if they exist
          if (config.display) {
            config.display.textContent = `${Math.round(response.size * 100)}%`;
          }
          
          // Update toggle button text if this was a toggle action
          if (config.action === 'toggleWikiControls' && button) {
            button.textContent = response.isHidden 
              ? 'Turn off Focus Mode' 
              : 'Turn on Focus Mode';
          }
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to execute command. Please refresh the page and try again.');
      }
    });
  });
  
  // Initialize button states when popup opens
  updateButtonStates();
});