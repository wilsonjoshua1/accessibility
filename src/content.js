// Handle document.write errors
const originalWrite = document.write;
document.write = function(content) {
  if (document.readyState === 'loading') {
    return originalWrite.apply(document, arguments);
  }
  return null;
};

let currentFontSize = 1.0;

// Ensure SVG filters are in the DOM immediately
ensureSVGFilters();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch(request.action) {
      case 'increaseTextSize':
        currentFontSize = Math.min(currentFontSize + 0.05, 2.0);
        applyFontSize();
        sendResponse({success: true, size: currentFontSize});
        break;
      case 'decreaseTextSize':
        currentFontSize = Math.max(currentFontSize - 0.05, 0.5);
        applyFontSize();
        sendResponse({success: true, size: currentFontSize});
        break;
      case 'toggleContrast':
        document.body.classList.toggle('high-contrast');
        sendResponse({success: true});
        break;
      case 'toggleDyslexia':
        const dys = document.body.classList.toggle('dyslexia-mode');
        unboldText();
        if (dys) boldFirstHalfOfWords();
        sendResponse({success: true});
        break;

      // Color filter
      case 'setColorFilter':
        applyColorFilter(request.filter);
        sendResponse({success: true});
        break;
      case 'resetColorFilter':
        resetColorFilter();
        sendResponse({success: true});
        break;

      // Custom colors
      case 'setCustomColors':
        applyCustomColors(request.textColor, request.bgColor);
        sendResponse({success: true});
        break;
      case 'resetCustomColors':
        resetCustomColors();
        sendResponse({success: true});
        break;

      case 'resetAll':
        resetStyles();
        sendResponse({success: true});
        break;
      default:
        sendResponse({success: false, error: 'Unknown action'});
    }
  } catch (e) {
    sendResponse({success: false, error: e.message});
  }
  return true;
});


// --- Existing helper functions ---

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

function boldFirstHalfOfWords() {
  unboldText();
  const processedNodes = new WeakSet();
  const contentAreas = [
    document.getElementById('mw-content-text'),
    document.getElementById('firstHeading')
  ].filter(Boolean);
  if (contentAreas.length === 0) contentAreas.push(document.body);

  for (const contentArea of contentAreas) {
    const walker = document.createTreeWalker(
      contentArea,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          if (processedNodes.has(node) ||
              !node.nodeValue.trim() ||
              ['SCRIPT','STYLE','NOSCRIPT','CODE','PRE'].includes(node.parentNode.nodeName) ||
              node.parentNode.closest('.mw-editsection')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );
    let node;
    while (node = walker.nextNode()) {
      processedNodes.add(node);
      const text = node.nodeValue;
      const parts = text.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      for (const part of parts) {
        if (!part.trim()) {
          fragment.appendChild(document.createTextNode(part));
        } else {
          const half = Math.ceil(part.length/2);
          const b = document.createElement('span');
          b.className = 'first-half-text';
          b.textContent = part.slice(0, half);
          fragment.appendChild(b);
          fragment.appendChild(document.createTextNode(part.slice(half)));
        }
      }
      node.parentNode.replaceChild(fragment, node);
    }
  }
}

function unboldText() {
  document.querySelectorAll('.first-half-text').forEach(span => {
    const txt = document.createTextNode(span.textContent);
    span.parentNode.replaceChild(txt, span);
  });
}

function resetStyles() {
  currentFontSize = 1.0;
  ['accessibility-text-size'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  document.body.classList.remove('high-contrast', 'dyslexia-mode');
  resetColorFilter();
  resetCustomColors();
  unboldText();
}

// --- New helper functions for color filters & custom colors ---

// --- New: SVG filters injection ---
function ensureSVGFilters() {
    if (document.getElementById('accessibility-svg-filters')) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.id = 'accessibility-svg-filters';
    svg.setAttribute('style', 'position:absolute;width:0;height:0;');
    svg.innerHTML = `
      <defs>
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix"
            values="0.567 0.433 0 0 0
                    0.558 0.442 0 0 0
                    0 0.242 0.758 0 0
                    0 0 0 1 0"/>
        </filter>
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix"
            values="0.625 0.375 0 0 0
                    0.7 0.3 0 0 0
                    0 0.3 0.7 0 0
                    0 0 0 1 0"/>
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix"
            values="0.95 0.05 0 0 0
                    0 0.433 0.567 0 0
                    0 0.475 0.525 0 0
                    0 0 0 1 0"/>
        </filter>
      </defs>`;
    document.body.appendChild(svg);
  }
  
  // --- Apply / Reset Color Filters ---
  function applyColorFilter(filter) {
    ensureSVGFilters();
    resetColorFilter();
    if (filter && filter !== 'none') {
      document.body.classList.add(`color-blind-${filter}`);
      document.documentElement.classList.add(`color-blind-${filter}`);
    }
  }
  
  function resetColorFilter() {
    ['protanopia', 'deuteranopia', 'tritanopia'].forEach(f => {
      document.body.classList.remove(`color-blind-${f}`);
      document.documentElement.classList.remove(`color-blind-${f}`);
    });
  }
  
  // --- Apply / Reset Custom Colors ---
  function applyCustomColors(textColor, bgColor) {
    resetCustomColors();
    const style = document.createElement('style');
    style.id = 'custom-colors';
    style.textContent = `
      body, body * {
        background-color: ${bgColor} !important;
        color: ${textColor} !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  function resetCustomColors() {
    const el = document.getElementById('custom-colors');
    if (el) el.remove();
  }
  
  console.log('Accessibility enhancer with color filters loaded');