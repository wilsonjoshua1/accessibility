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
        const active = document.body.classList.toggle('dyslexia-mode');
        unboldText();
        if (active) boldFirstHalfOfWords();
        return sendResponse({ success: true });

      case 'setColorFilter':
        applyColorFilter(req.filter);
        return sendResponse({ success: true });

      case 'resetColorFilter':
        resetColorFilter();
        return sendResponse({ success: true });

      case 'toggleWikiControls': {
        const hidden = toggleWikiControls();
        return sendResponse({ success: true, isHidden: hidden });
      }

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
        return sendResponse({
          success: true,
          size: currentFontSize,
          wikiControlsHidden: localStorage.getItem('tamWikiHideControls') === 'true'
        });

      case 'read_text':
        readMainContent();
        return sendResponse({ success: true });

      case 'pause_speech':
        speechSynthesis.pause();
        return sendResponse({ success: true });

      case 'stop_speech':
        speechSynthesis.cancel();
        return sendResponse({ success: true });

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
        if (
          processed.has(node) ||
          !node.nodeValue.trim() ||
          ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'].includes(node.parentNode.nodeName) ||
          node.parentNode.closest('.mw-editsection')
        ) return NodeFilter.FILTER_REJECT;
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
    const txt = document.createTextNode(span.textContent);
    span.parentNode.replaceChild(txt, span);
  });
}

// --- Wiki controls toggling ---
function toggleWikiControls() {
  const wasHidden = localStorage.getItem('tamWikiHideControls') === 'true';
  const hide = !wasHidden;
  const disp = hide ? 'none' : '';

  const appearanceHeader = document.querySelector(
    '.vector-pinnable-header[data-feature-name="appearance-pinned"]'
  );
  if (appearanceHeader) appearanceHeader.style.display = disp;

  document.querySelectorAll(
    '#vector-appearance-pinned-container, #vector-appearance-unpinned-container'
  ).forEach(c => (c.style.display = disp));

  const tocHeader = document.querySelector(
    '.vector-pinnable-header.vector-toc-pinnable-header[data-feature-name="toc-pinned"][data-pinnable-element-id="vector-toc"]'
  );
  if (tocHeader) tocHeader.style.display = disp;

  const tocList = document.querySelector('#mw-panel-toc-list');
  if (tocList) tocList.style.display = disp;

  const headerContainer = document.querySelector('.vector-header-container');
  if (headerContainer) headerContainer.style.display = disp;

  localStorage.setItem('tamWikiHideControls', hide ? 'true' : 'false');
  return hide;
}
function toggleWikiControls() {
  const wasHidden = localStorage.getItem('tamWikiHideControls') === 'true';
  const hide = !wasHidden;
  
  // Wikipedia-specific elements to hide
  const wikiElements = [
    '.vector-pinnable-header',
    '#vector-appearance-pinned-container',
    '#vector-appearance-unpinned-container',
    '.vector-toc-pinnable-header',
    '#mw-panel-toc-list',
    '.vector-header-container',
    '.mw-indicators',
    '.mw-editsection',
    '.catlinks',
    '.mw-footer',
    '.sidebar',
    '.hatnote',
    '.nomobile'
  ];

  wikiElements.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (hide) {
        el.classList.add('wiki-focus-hidden');
      } else {
        el.classList.remove('wiki-focus-hidden');
      }
    });
  });

  localStorage.setItem('tamWikiHideControls', hide ? 'true' : 'false');
  return hide;
}
// --- Reset everything ---
function resetStyles() {
  currentFontSize = 1.0;
  ['accessibility-text-size', 'custom-colors'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  document.body.classList.remove('high-contrast', 'dyslexia-mode');
  resetColorFilter();
  resetCustomColors();
  disableLineFocus();
  unboldText();

  // Show wiki controls again
  toggleWikiControls(); // toggles off if was on
  localStorage.removeItem('tamWikiHideControls');
}

// --- Apply stored wiki-controls preference ---
function applyStoredPreferences() {
  if (localStorage.getItem('tamWikiHideControls') === 'true') {
    toggleWikiControls(); // hides controls on load
  }
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
  resetColorFilter();
  if (filter && filter !== 'none') {
    document.documentElement.classList.add(`color-blind-${filter}`);
    document.body.classList.add(`color-blind-${filter}`);
  }
}

function resetColorFilter() {
  ['protanopia', 'deuteranopia', 'tritanopia'].forEach(f => {
    document.documentElement.classList.remove(`color-blind-${f}`);
    document.body.classList.remove(`color-blind-${f}`);
  });
}

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

// --- Paragraph-by-Paragraph Focus Highlight ---
function enableLineFocus() {
  if (lineFocusActive) return;
  lineFocusActive = true;
  document.addEventListener('mousemove', trackLine);
  document.addEventListener('focusin', trackLine);
}

function disableLineFocus() {
  lineFocusActive = false;
  document.removeEventListener('mousemove', trackLine);
  document.removeEventListener('focusin', trackLine);
  clearHighlight();
}

function trackLine(e) {
  const x = e.clientX, y = e.clientY;
  const el = e.type === 'focusin' ? e.target : document.elementFromPoint(x, y);
  highlightContainer(el);
}

function highlightContainer(el) {
  if (!el) return;
  const container = el.closest('p, li, blockquote, h1,h2,h3,h4,h5,h6') || el;
  if (container === prevHighlighted) return;
  clearHighlight();
  container.classList.add('focused-line');
  prevHighlighted = container;
}

function clearHighlight() {
  if (prevHighlighted) {
    prevHighlighted.classList.remove('focused-line');
    prevHighlighted = null;
  }
}
// Text-to-Speech: Read the main content of the page
function readMainContent() {
  const mainContent = document.querySelector('main') || document.body;
  const textToRead = mainContent.innerText || "Sorry, there's no readable content on this page.";

  const utterance = new SpeechSynthesisUtterance(textToRead);
  utterance.lang = 'en-US';
  utterance.rate = 1; // Adjust rate if needed
  utterance.pitch = 1;

  speechSynthesis.speak(utterance);
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'read_text') {
    readMainContent();
  } else if (request.action === 'pause_speech') {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
  } else if (request.action === 'resume_speech') {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  } else if (request.action === 'stop_speech') {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
  }
});

console.log('Texas A&M Wikipedia accessibility enhancer loaded');
