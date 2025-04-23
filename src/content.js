// Prevent premature document.write
const origWrite = document.write;
document.write = function(c) {
  if (document.readyState === 'loading') return origWrite.apply(this, arguments);
  return null;
};

let currentFontSize = 1.0;
let lineFocusActive = false;
let prevHighlighted = null;

// Inject SVG filters immediately
ensureSVGFilters();

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    switch (req.action) {
      case 'increaseTextSize':
        currentFontSize = Math.min(currentFontSize + 0.05, 2.0);
        applyFontSize();
        return sendResponse({ success: true, size: currentFontSize });
      case 'decreaseTextSize':
        currentFontSize = Math.max(currentFontSize - 0.05, 0.5);
        applyFontSize();
        return sendResponse({ success: true, size: currentFontSize });
      case 'toggleContrast':
        document.body.classList.toggle('high-contrast');
        return sendResponse({ success: true });
      case 'toggleDyslexia':
        const dys = document.body.classList.toggle('dyslexia-mode');
        unboldText();
        if (dys) boldFirstHalfOfWords();
        return sendResponse({ success: true });
      case 'setColorFilter':
        applyColorFilter(req.filter);
        return sendResponse({ success: true });
      case 'resetColorFilter':
        resetColorFilter();
        return sendResponse({ success: true });
      case 'toggleWikiControls':
        const appearanceHeader = document.querySelector('.vector-pinnable-header[data-feature-name="appearance-pinned"]');
        const tocHeader = document.querySelector('.vector-pinnable-header.vector-toc-pinnable-header[data-feature-name="toc-pinned"][data-pinnable-element-id="vector-toc"]');
        const tocList = document.querySelector('#mw-panel-toc-list');
        const headerContainer = document.querySelector('.vector-header-container');
        
        const currentState = localStorage.getItem('tamWikiHideControls') === 'true';
        const newState = !currentState;
        const newDisplayValue = newState ? 'none' : '';
        
        if (appearanceHeader) {
          appearanceHeader.style.display = newDisplayValue;
          const appearanceContainers = document.querySelectorAll('#vector-appearance-pinned-container, #vector-appearance-unpinned-container');
          appearanceContainers.forEach(container => {
            if (container) container.style.display = newDisplayValue;
          });
        }
        
        if (tocHeader) tocHeader.style.display = newDisplayValue;
        if (tocList) tocList.style.display = newDisplayValue;
        if (headerContainer) headerContainer.style.display = newDisplayValue;
        
        localStorage.setItem('tamWikiHideControls', newState ? 'true' : 'false');
        sendResponse({success: true, isHidden: newState});
        break;
      case 'setCustomColors':
        applyCustomColors(req.textColor, req.bgColor);
        return sendResponse({ success: true });
      case 'resetCustomColors':
        resetCustomColors();
        return sendResponse({ success: true });
      case 'enableLineFocus':
        enableLineFocus();
        return sendResponse({ success: true });
      case 'disableLineFocus':
        disableLineFocus();
        return sendResponse({ success: true });
      case 'resetAll':
        resetStyles();
        return sendResponse({ success: true });
      case 'getState':
        sendResponse({
          success: true, 
          size: currentFontSize,
          wikiControlsHidden: localStorage.getItem('tamWikiHideControls') === 'true'
        });
        break;
      default:
        return sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (e) {
    return sendResponse({ success: false, error: e.message });
  }
});

// --- Font size functions ---
function applyFontSize() {
  const styleId = 'accessibility-text-size';
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    body, body *:not(script):not(style):not(svg):not(code) {
      font-size: ${currentFontSize * 100}% !important;
    }
    h1 { font-size: ${currentFontSize * 2.5}em !important; }
    h2 { font-size: ${currentFontSize * 2}em !important; }
    h3 { font-size: ${currentFontSize * 1.75}em !important; }
    h4 { font-size: ${currentFontSize * 1.5}em !important; }
    h5 { font-size: ${currentFontSize * 1.25}em !important; }
    h6 { font-size: ${currentFontSize * 1.1}em !important; }
  `;
  document.head.appendChild(style);
}

// --- Dyslexia mode helpers ---
function boldFirstHalfOfWords() {
  unboldText();
  const processed = new WeakSet();
  const areas = [
    document.getElementById('mw-content-text'),
    document.getElementById('firstHeading')
  ].filter(x => x);
  if (!areas.length) areas.push(document.body);
  areas.forEach(area => {
    const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (processed.has(node) || !node.nodeValue.trim() ||
            ['SCRIPT','STYLE','NOSCRIPT','CODE','PRE'].includes(node.parentNode.nodeName) ||
            node.parentNode.closest('.mw-editsection')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      processed.add(node);
      const text = node.nodeValue;
      const parts = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (!part.trim()) {
          frag.appendChild(document.createTextNode(part));
        } else {
          const half = Math.ceil(part.length / 2);
          const span = document.createElement('span');
          span.className = 'first-half-text';
          span.textContent = part.slice(0, half);
          frag.appendChild(span);
          frag.appendChild(document.createTextNode(part.slice(half)));
        }
      });
      node.parentNode.replaceChild(frag, node);
    }
  });
}

function unboldText() {
  document.querySelectorAll('.first-half-text').forEach(span => {
    const text = document.createTextNode(span.textContent);
    span.parentNode.replaceChild(text, span);
  });
}

// --- Reset all styles ---
function resetStyles() {
  currentFontSize = 1.0;
  ['accessibility-text-size','custom-colors'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  document.body.classList.remove('high-contrast','dyslexia-mode');
  resetColorFilter();
  resetCustomColors();
  disableLineFocus();

  // Reset wiki controls visibility
  const elements = [
    '.vector-pinnable-header[data-feature-name="appearance-pinned"]',
    '.vector-pinnable-header.vector-toc-pinnable-header[data-feature-name="toc-pinned"][data-pinnable-element-id="vector-toc"]',
    '#mw-panel-toc-list',
    '.vector-header-container',
    '#vector-appearance-pinned-container',
    '#vector-appearance-unpinned-container'
  ];
  
  elements.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = '';
    });
  });
  
  localStorage.removeItem('tamWikiHideControls');
}

// --- SVG Filters & Custom Colors ---
function ensureSVGFilters() {
  if (document.getElementById('accessibility-svg-filters')) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.id = 'accessibility-svg-filters';
  svg.setAttribute('style', 'position:absolute;width:0;height:0;');
  svg.innerHTML = `
    <defs>
      <filter id="protanopia-filter"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/></filter>
      <filter id="deuteranopia-filter"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter>
      <filter id="tritanopia-filter"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0"/></filter>
    </defs>`;
  document.body.appendChild(svg);
}

function applyColorFilter(filter) {
  ensureSVGFilters();
  resetColorFilter();
  if (filter && filter !== 'none') {
    document.documentElement.classList.add(`color-blind-${filter}`);
    document.body.classList.add(`color-blind-${filter}`);
  }
}

function resetColorFilter() {
  ['protanopia','deuteranopia','tritanopia'].forEach(f => {
    document.documentElement.classList.remove(`color-blind-${f}`);
    document.body.classList.remove(`color-blind-${f}`);
  });
}

function applyCustomColors(textColor, bgColor) {
  resetCustomColors();
  const style = document.createElement('style');
  style.id = 'custom-colors';
  style.textContent = `
    body, body * { background-color: ${bgColor} !important; color: ${textColor} !important; }
  `;
  document.head.appendChild(style);
}

function resetCustomColors() {
  const el = document.getElementById('custom-colors');
  if (el) el.remove();
}

// --- Improved Line Focus Feature ---
function enableLineFocus() {
  if (lineFocusActive) return;
  lineFocusActive = true;
  
  // Clear any existing highlight first
  clearHighlight();
  
  // Add event listeners with passive for better performance
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('focusin', handleFocusIn, { passive: true });
}

function disableLineFocus() {
  if (!lineFocusActive) return;
  lineFocusActive = false;
  
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('focusin', handleFocusIn);
  clearHighlight();
}

function handleMouseMove(e) {
  const x = e.clientX, y = e.clientY;
  const el = document.elementFromPoint(x, y);
  if (el) {
    highlightNearestTextContainer(el);
  }
}

function handleFocusIn(e) {
  highlightNearestTextContainer(e.target);
}

function highlightNearestTextContainer(el) {
  if (!el) return;
  
  // Find the nearest text container element
  const container = el.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, table, div, section') || el;
  if (container === prevHighlighted) return;
  
  clearHighlight();
  
  // Only highlight if the element contains meaningful text
  if (container.textContent.trim().length > 0) {
    container.classList.add('focused-line');
    prevHighlighted = container;
    
    // Scroll the element into view if needed
    container.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }
}

function clearHighlight() {
  if (prevHighlighted) {
    prevHighlighted.classList.remove('focused-line');
    prevHighlighted = null;
  }
}

// Apply stored preferences on load
function applyStoredPreferences() {
  if (localStorage.getItem('tamWikiHideControls') === 'true') {
    const elements = [
      '.vector-pinnable-header[data-feature-name="appearance-pinned"]',
      '#vector-appearance-pinned-container',
      '#vector-appearance-unpinned-container',
      '.vector-pinnable-header.vector-toc-pinnable-header[data-feature-name="toc-pinned"][data-pinnable-element-id="vector-toc"]',
      '#mw-panel-toc-list',
      '.vector-header-container'
    ];
    
    elements.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
      });
    });
  }
  
  // Handle backward compatibility with old storage key
  if (localStorage.getItem('tamWikiHideAppearance') === 'true') {
    localStorage.setItem('tamWikiHideControls', 'true');
    localStorage.removeItem('tamWikiHideAppearance');
    applyStoredPreferences();
  }
}

// Call this function on load
applyStoredPreferences();

console.log('Texas A&M Wikipedia accessibility enhancer loaded');