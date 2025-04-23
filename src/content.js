// Prevent premature document.write
const origWrite = document.write;
document.write = function(c) {
  if (document.readyState==='loading') return origWrite.apply(this, arguments);
  return null;
};

let currentFontSize = 1.0;
let lineFocusActive = false;
let prevHighlighted = null;

// Inject SVG filters immediately
ensureSVGFilters();

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    switch(req.action) {
      case 'increaseTextSize':
        currentFontSize = Math.min(currentFontSize+0.05,2.0);
        applyFontSize();
        return sendResponse({success:true,size:currentFontSize});

      case 'decreaseTextSize':
        currentFontSize = Math.max(currentFontSize-0.05,0.5);
        applyFontSize();
        return sendResponse({success:true,size:currentFontSize});

      case 'toggleContrast':
        document.body.classList.toggle('high-contrast');
        return sendResponse({success:true});

      case 'toggleDyslexia':
        const on = document.body.classList.toggle('dyslexia-mode');
        unboldText();
        if(on) boldFirstHalfOfWords();
        return sendResponse({success:true});

      case 'setColorFilter':
        applyColorFilter(req.filter);
        return sendResponse({success:true});

      case 'resetColorFilter':
        resetColorFilter();
        return sendResponse({success:true});

      case 'setCustomColors':
        applyCustomColors(req.textColor, req.bgColor);
        return sendResponse({success:true});

      case 'resetCustomColors':
        resetCustomColors();
        return sendResponse({success:true});

      case 'enableLineFocus':
        enableLineFocus();
        return sendResponse({success:true});

      case 'disableLineFocus':
        disableLineFocus();
        return sendResponse({success:true});

      case 'resetAll':
        resetStyles();
        return sendResponse({success:true});
    }
  } catch(e) {
    return sendResponse({success:false,error:e.message});
  }
  return true;
});

// --- Existing helpers (font sizing, dyslexia) ---
function applyFontSize() {
  const s=document.getElementById('accessibility-text-size');
  if(s) s.remove();
  const style=document.createElement('style');
  style.id='accessibility-text-size';
  style.textContent=`
    body, body *:not(script):not(style):not(svg):not(code){font-size:${currentFontSize*100}%!important;}
    h1{font-size:${currentFontSize*2.5}em!important;}
    h2{font-size:${currentFontSize*2}em!important;}
    h3{font-size:${currentFontSize*1.75}em!important;}
    h4{font-size:${currentFontSize*1.5}em!important;}
    h5{font-size:${currentFontSize*1.25}em!important;}
    h6{font-size:${currentFontSize*1.1}em!important;}
  `;
  document.head.appendChild(style);
}
function boldFirstHalfOfWords(){/* unchanged */}
function unboldText(){/* unchanged */}
function resetStyles(){
  currentFontSize=1.0;
  ['accessibility-text-size','custom-colors'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.remove();
  });
  document.body.classList.remove('high-contrast','dyslexia-mode');
  resetColorFilter();
  resetCustomColors();
  disableLineFocus();
}

// --- Color filter & custom colors (unchanged) ---
function ensureSVGFilters(){ /* unchanged from above */ }
function applyColorFilter(f){ /* unchanged */ }
function resetColorFilter(){ /* unchanged */ }
function applyCustomColors(t,b){ /* unchanged */ }
function resetCustomColors(){ /* unchanged */ }

// --- Line Focus / Reading Aid ---
function enableLineFocus(){
  if(lineFocusActive) return;
  lineFocusActive = true;
  document.addEventListener('mousemove', trackLine);
  document.addEventListener('focusin', trackLine);
}
function disableLineFocus(){
  lineFocusActive = false;
  document.removeEventListener('mousemove', trackLine);
  document.removeEventListener('focusin', trackLine);
  clearHighlight();
}
function trackLine(e){
  const x = e.clientX, y = e.clientY;
  const el = e.type==='focusin' ? e.target : document.elementFromPoint(x,y);
  highlightContainer(el);
}
function highlightContainer(el){
  if(!el) return;
  const container = el.closest('p, li, blockquote, h1,h2,h3,h4,h5,h6') || el;
  if(container===prevHighlighted) return;
  clearHighlight();
  container.classList.add('focused-line');
  prevHighlighted = container;
}
function clearHighlight(){
  if(prevHighlighted){
    prevHighlighted.classList.remove('focused-line');
    prevHighlighted = null;
  }
}

console.log('Accessibility enhancer loaded with Line Focus');
