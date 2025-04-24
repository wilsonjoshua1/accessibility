document.addEventListener('DOMContentLoaded', () => {
  const sendCmd = async (action, payload = {}) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] });
      return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    }
  };

  const buttons = {
    increaseText: { action: 'increaseTextSize', display: document.getElementById('sizeDisplay') },
    decreaseText: { action: 'decreaseTextSize', display: document.getElementById('sizeDisplay') },
    // toggleContrast: { action: 'toggleContrast' },
    toggleDyslexia: { action: 'toggleDyslexia' },
    toggleWikiControls: { action: 'toggleWikiControls' },
    resetAll: { action: 'resetAll' }
  };

  // Initialize states
  (async function init() {
    const res = await sendCmd('getState');
    if (res?.success) {
      document.getElementById('sizeDisplay').textContent = `${Math.round(res.size * 100)}%`;
      document.getElementById('toggleWikiControls').textContent = 
        res.wikiControlsHidden ? 'Disable Focus Mode' : 'Enable Focus Mode';
    }
  })();

  Object.entries(buttons).forEach(([id, cfg]) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const res = await sendCmd(cfg.action);
      if (res?.success) {
        if (cfg.display && res.size != null) {
          cfg.display.textContent = `${Math.round(res.size * 100)}%`;
        }
        if (cfg.action === 'toggleWikiControls') {
          btn.textContent = res.isHidden ? 'Disable Focus Mode' : 'Enable Focus Mode';
        }
        if (id === 'resetAll') {
          document.getElementById('lineFocusSelect').value = 'off';
        }
      }
    });
  });

  // Color Filters
  document.getElementById('colorFilterSelect').addEventListener('change', async e => {
    const filter = e.target.value;
    await sendCmd(filter === 'none' ? 'resetColorFilter' : 'setColorFilter', { filter });
  });

  // Custom Colors
  document.getElementById('applyColors').addEventListener('click', async () => {
    const textColor = document.getElementById('textColorInput').value;
    const bgColor = document.getElementById('bgColorInput').value;
    await sendCmd('setCustomColors', { textColor, bgColor });
  });
  document.getElementById('resetColors').addEventListener('click', async () => {
    await sendCmd('resetCustomColors');
  });

  // Line Focus toggle
  document.getElementById('lineFocusSelect').addEventListener('change', async e => {
    const on = e.target.value === 'on';
    await sendCmd(on ? 'enableLineFocus' : 'disableLineFocus');
  });

  
});
document.addEventListener('DOMContentLoaded', () => {


  function togglePageContrast() {
    const body = document.body;
    const isDark = body.classList.contains('high-contrast');

    if (isDark) {
      body.classList.remove('high-contrast');
      body.style.backgroundColor = '';
      body.style.color = '';
    } else {
      body.classList.add('high-contrast');
      body.style.backgroundColor = 'black';
      body.style.color = 'white';
    }
  }
});

// Reference to the TTS controls
const startButton = document.getElementById("tts-start");
const pauseButton = document.getElementById("tts-pause");
const resumeButton = document.getElementById("tts-resume");
const stopButton = document.getElementById("tts-stop");
const sectionSelect = document.getElementById("section-select");

// State to track TTS status
let isSpeaking = false;
let isPaused = false;

// Handle start TTS
startButton.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "startTTS" });
    isSpeaking = true;
    isPaused = false;
  });
});

// Handle pause TTS
pauseButton.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "pauseTTS" });
    isSpeaking = false;
    isPaused = true;
  });
});

// Handle resume TTS
resumeButton.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "resumeTTS" });
    isSpeaking = true;
    isPaused = false;
  });
});

// Handle stop TTS
stopButton.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "stopTTS" });
    isSpeaking = false;
    isPaused = false;
  });
});


