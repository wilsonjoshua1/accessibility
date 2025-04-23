document.addEventListener('DOMContentLoaded', () => {
  const sendCmd = async (action, payload = {}) => {
    const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
    try {
      return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    } catch {
      await chrome.scripting.executeScript({ target:{tabId:tab.id}, files:['content.js'] });
      await chrome.scripting.insertCSS({ target:{tabId:tab.id}, files:['styles.css'] });
      return await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    }
  };

  // Text size + display buttons
  const mapping = {
    increaseText: ['increaseTextSize','sizeDisplay'],
    decreaseText: ['decreaseTextSize','sizeDisplay'],
    toggleContrast: ['toggleContrast'],
    toggleDyslexia: ['toggleDyslexia'],
    resetAll: ['resetAll']
  };
  Object.entries(mapping).forEach(([id, cfg]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const res = await sendCmd(cfg[0]);
      if (res?.size && cfg[1]) document.getElementById(cfg[1]).textContent = `${Math.round(res.size*100)}%`;
    });
  });

  // Color filter
  document.getElementById('colorFilterSelect').addEventListener('change', async e => {
    const filter = e.target.value;
    await sendCmd(filter==='none'?'resetColorFilter':'setColorFilter', { filter });
  });

  // Custom colors
  document.getElementById('applyColors').addEventListener('click', async () => {
    const textColor = document.getElementById('textColorInput').value;
    const bgColor = document.getElementById('bgColorInput').value;
    await sendCmd('setCustomColors', { textColor, bgColor });
  });
  document.getElementById('resetColors').addEventListener('click', async () => {
    await sendCmd('resetCustomColors');
  });

  // **New** Line Focus toggle
  document.getElementById('lineFocusSelect').addEventListener('change', async e => {
    const on = e.target.value === 'on';
    await sendCmd(on ? 'enableLineFocus' : 'disableLineFocus');
  });
});
