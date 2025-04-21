// Handle document.write errors
const originalWrite = document.write;
document.write = function(content) {
  if (document.readyState === 'loading') {
    return originalWrite.apply(document, arguments);
  }
  return null;
};

// Current font size multiplier (default 1.0 = 100%)
let currentFontSize = 1.0;

// Message handler for popup commands
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch(request.action) {
      case 'increaseTextSize':
        currentFontSize = Math.min(currentFontSize + 0.05, 2.0); // Max 200%
        applyFontSize();
        sendResponse({success: true, size: currentFontSize});
        break;
      case 'decreaseTextSize':
        currentFontSize = Math.max(currentFontSize - 0.05, 0.5); // Min 50%
        applyFontSize();
        sendResponse({success: true, size: currentFontSize});
        break;
      case 'toggleContrast':
        document.body.classList.toggle('high-contrast');
        sendResponse({success: true});
        break;
      case 'toggleDyslexia':
        document.body.classList.toggle('dyslexia-mode');
        sendResponse({success: true});
        break;
      case 'resetAll':
        resetStyles();
        sendResponse({success: true});
        break;
      default:
        sendResponse({success: false, error: 'Unknown action'});
    }
  } catch (error) {
    sendResponse({success: false, error: error.message});
  }
  return false;
});

// Apply current font size to ALL text elements
function applyFontSize() {
  const style = document.createElement('style');
  style.id = 'accessibility-text-size';
  style.textContent = `
    body, 
    body *:not(script):not(style):not(svg):not(code) {
      font-size: ${currentFontSize * 100}% !important;
    }
    
    /* Special handling for headings to maintain hierarchy */
    h1 { font-size: ${currentFontSize * 2.5}em !important; }
    h2 { font-size: ${currentFontSize * 2}em !important; }
    h3 { font-size: ${currentFontSize * 1.75}em !important; }
    h4 { font-size: ${currentFontSize * 1.5}em !important; }
    h5 { font-size: ${currentFontSize * 1.25}em !important; }
    h6 { font-size: ${currentFontSize * 1.1}em !important; }
  `;
  
  const existing = document.getElementById('accessibility-text-size');
  if (existing) existing.remove();
  document.head.appendChild(style);
}

// Reset all changes
function resetStyles() {
  currentFontSize = 1.0; // Reset to default
  const styles = [
    'accessibility-text-size',
    'accessibility-contrast'
  ];
  
  styles.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.remove();
  });
  
  document.body.classList.remove('high-contrast', 'dyslexia-mode');
}

console.log('Ben & Jerry\'s accessibility enhancer loaded');