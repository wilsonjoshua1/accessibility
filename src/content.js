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
        const isDyslexiaModeActive = document.body.classList.toggle('dyslexia-mode');
        
        // Always clean up first to ensure we start fresh
        unboldText();
        
        if (isDyslexiaModeActive) {
          boldFirstHalfOfWords();
        }
        
        sendResponse({success: true});
        break;
      case 'toggleWikiControls':
        // Target the appearance header element
        const appearanceHeader = document.querySelector('.vector-pinnable-header[data-feature-name="appearance-pinned"]');
        // Target the TOC header with the exact attributes
        const tocHeader = document.querySelector('.vector-pinnable-header.vector-toc-pinnable-header[data-feature-name="toc-pinned"][data-pinnable-element-id="vector-toc"]');
        // Target the entire TOC list
        const tocList = document.querySelector('#mw-panel-toc-list');
        // Target the header container
        const headerContainer = document.querySelector('.vector-header-container');
        
        // Default is visible (false), so we toggle the opposite of current state
        const currentState = localStorage.getItem('tamWikiHideControls') === 'true';
        const newState = !currentState;
        const newDisplayValue = newState ? 'none' : '';
        
        // Handle appearance panel
        if (appearanceHeader) {
          appearanceHeader.style.display = newDisplayValue;
          
          // Also toggle all child elements to ensure complete visibility change
          const appearanceContainers = document.querySelectorAll('#vector-appearance-pinned-container, #vector-appearance-unpinned-container');
          appearanceContainers.forEach(container => {
            if (container) container.style.display = newDisplayValue;
          });
        }
        
        // Handle TOC header with very specific selector
        if (tocHeader) {
          tocHeader.style.display = newDisplayValue;
        }
        
        // Handle entire TOC list
        if (tocList) {
          tocList.style.display = newDisplayValue;
        }
        
        // Handle header container
        if (headerContainer) {
          headerContainer.style.display = newDisplayValue;
        }
        
        // Store the new preference
        localStorage.setItem('tamWikiHideControls', newState ? 'true' : 'false');
        
        sendResponse({success: true, isHidden: newState});
        break;
      case 'resetAll':
        resetStyles();
        sendResponse({success: true});
        break;
      case 'getState':
        // Added to return current state for popup initialization
        sendResponse({
          success: true, 
          size: currentFontSize,
          wikiControlsHidden: localStorage.getItem('tamWikiHideControls') === 'true'
        });
        break;
      default:
        sendResponse({success: false, error: 'Unknown action'});
    }
  } catch (error) {
    sendResponse({success: false, error: error.message});
  }
  return true;
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

// Improved function to bold first half of each word
function boldFirstHalfOfWords() {
  // Start with a clean state
  unboldText();

  // Keep track of processed nodes to avoid reprocessing
  const processedNodes = new WeakSet();
  
  // Wikipedia specific: Focus on main content
  const contentAreas = [
    document.getElementById('mw-content-text'),
    document.getElementById('firstHeading')
  ].filter(Boolean);
  
  if (contentAreas.length === 0) {
    console.warn('Could not find main content areas on Wikipedia');
    contentAreas.push(document.body); // Fallback to entire body
  }
  
  // Process each content area
  for (const contentArea of contentAreas) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      contentArea,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip if already processed or if in ignored elements
          if (processedNodes.has(node) ||
              node.parentNode.nodeName === 'SCRIPT' || 
              node.parentNode.nodeName === 'STYLE' ||
              node.parentNode.nodeName === 'NOSCRIPT' ||
              node.parentNode.nodeName === 'CODE' ||
              node.parentNode.nodeName === 'PRE' ||
              node.parentNode.closest('.mw-editsection') || // Skip edit section links
              node.nodeValue.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Process each text node
    for (const textNode of textNodes) {
      // Skip if already processed (additional safety check)
      if (processedNodes.has(textNode)) continue;
      
      const text = textNode.nodeValue;
      if (!text || !text.trim()) continue;
      
      // Split the text into words and spaces
      const parts = text.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      
      for (const part of parts) {
        if (!part.trim()) {
          // Preserve whitespace as is
          fragment.appendChild(document.createTextNode(part));
          continue;
        }
        
        // This is a word - split it in half
        const halfLength = Math.ceil(part.length / 2);
        const firstHalf = part.substring(0, halfLength);
        const secondHalf = part.substring(halfLength);
        
        // Create a bold span for the first half
        const boldSpan = document.createElement('span');
        boldSpan.className = 'first-half-text';
        boldSpan.textContent = firstHalf;
        
        // Append first half (bold) and second half (normal)
        fragment.appendChild(boldSpan);
        
        if (secondHalf) {
          fragment.appendChild(document.createTextNode(secondHalf));
        }
      }
      
      // Mark this node as processed before we replace it
      processedNodes.add(textNode);
      
      // Replace the original text node with our fragment
      if (textNode.parentNode) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    }
  }
}

// More thorough unboldText function
function unboldText() {
  // First, collect all the spans to avoid modification during iteration
  const spans = Array.from(document.querySelectorAll('.first-half-text'));
  
  for (const span of spans) {
    if (span && span.parentNode) {
      // Create a text node with the span's content
      const textNode = document.createTextNode(span.textContent);
      
      // Insert the text node before the span
      span.parentNode.insertBefore(textNode, span);
      
      // Remove the span
      span.parentNode.removeChild(span);
    }
  }
  
  // Look for any spans we might have missed (failsafe)
  const remainingSpans = document.querySelectorAll('.first-half-text');
  if (remainingSpans.length > 0) {
    console.warn(`Found ${remainingSpans.length} remaining spans after cleanup`);
    // Try one more time with direct removal
    remainingSpans.forEach(span => {
      if (span && span.parentNode) {
        span.parentNode.removeChild(span);
      }
    });
  }
}

function resetStyles() {
  currentFontSize = 1.0;
  const styles = [
    'accessibility-text-size',
    'accessibility-contrast'
  ];
  
  styles.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.remove();
  });
  
  document.body.classList.remove('high-contrast', 'dyslexia-mode');
  unboldText();
  
  // Show wiki appearance controls again if they were hidden
  const appearanceHeader = document.querySelector('.vector-pinnable-header[data-feature-name="appearance-pinned"]');
  if (appearanceHeader) {
    appearanceHeader.style.display = '';
  }
  
  // Reset TOC header with precise selector
  const tocHeader = document.querySelector('.vector-pinnable-header.vector-toc-pinnable-header[data-feature-name="toc-pinned"][data-pinnable-element-id="vector-toc"]');
  if (tocHeader) {
    tocHeader.style.display = '';
  }
  
  // Reset TOC list
  const tocList = document.querySelector('#mw-panel-toc-list');
  if (tocList) {
    tocList.style.display = '';
  }
  
  // Reset header container
  const headerContainer = document.querySelector('.vector-header-container');
  if (headerContainer) {
    headerContainer.style.display = '';
  }
  
  const appearanceContainers = document.querySelectorAll('#vector-appearance-pinned-container, #vector-appearance-unpinned-container');
  appearanceContainers.forEach(container => {
    if (container) container.style.display = '';
  });
  
  localStorage.removeItem('tamWikiHideControls');
}

// Apply stored preferences on load
function applyStoredPreferences() {
  // Default is visible (false), so only hide if explicitly set to true
  if (localStorage.getItem('tamWikiHideControls') === 'true') {
    // Hide appearance panel
    const appearanceHeader = document.querySelector('.vector-pinnable-header[data-feature-name="appearance-pinned"]');
    if (appearanceHeader) {
      appearanceHeader.style.display = 'none';
    }
    
    const appearanceContainers = document.querySelectorAll('#vector-appearance-pinned-container, #vector-appearance-unpinned-container');
    appearanceContainers.forEach(container => {
      if (container) container.style.display = 'none';
    });
    
    // Hide TOC header with the exact selector
    const tocHeader = document.querySelector('.vector-pinnable-header.vector-toc-pinnable-header[data-feature-name="toc-pinned"][data-pinnable-element-id="vector-toc"]');
    if (tocHeader) {
      tocHeader.style.display = 'none';
    }
    
    // Hide TOC list
    const tocList = document.querySelector('#mw-panel-toc-list');
    if (tocList) {
      tocList.style.display = 'none';
    }
    
    // Hide header container
    const headerContainer = document.querySelector('.vector-header-container');
    if (headerContainer) {
      headerContainer.style.display = 'none';
    }
  }
  
  // Handle backward compatibility with old storage key
  if (localStorage.getItem('tamWikiHideAppearance') === 'true') {
    localStorage.setItem('tamWikiHideControls', 'true');
    localStorage.removeItem('tamWikiHideAppearance');
    applyStoredPreferences(); // Re-apply with the new key
  }
}

// Call this function on load
applyStoredPreferences();

console.log('Texas A&M Wikipedia accessibility enhancer loaded');