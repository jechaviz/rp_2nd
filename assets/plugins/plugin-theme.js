/**
 * assets/plugins/plugin-theme.js
 * Docsify plugin: Handles theme toggle integration and positioning.
 *
 * Responsibilities:
 *  - Relocates the docsify-darklight-theme button into the .settings-bar.
 *  - Ensures the button state is synced with the UI.
 */
(function () {
  'use strict';

  function syncToHtml() {
    const saved = window.localStorage.getItem('docsify-darklight-theme') || 'dark';
    const isDark = saved === 'dark';
    const theme = isDark ? 'dark' : 'light';
    
    const html = document.documentElement;
    html.classList.toggle('dark', isDark);
    html.classList.toggle('light', !isDark);
    html.setAttribute('data-theme', theme);
    
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);

    // Update our custom toggle icon if it exists
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = isDark ? '<span>🌙</span>' : '<span>☀️</span>';
    }
  }

  // Handle our custom toggle click
  document.addEventListener('click', (e) => {
    if (e.target.closest('#theme-toggle')) {
      const current = window.localStorage.getItem('docsify-darklight-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('docsify-darklight-theme', next);
      syncToHtml();
      
      // Also try to click the hidden plugin button if it exists to keep it in sync
      const pluginBtn = document.getElementById('docsify-darklight-theme');
      if (pluginBtn) pluginBtn.click();
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'docsify-darklight-theme') syncToHtml();
  });

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function pluginTheme(hook) {
      hook.init(function() {
        syncToHtml();
      });
      hook.doneEach(function() {
        syncToHtml();
      });
    }
  );
})();
