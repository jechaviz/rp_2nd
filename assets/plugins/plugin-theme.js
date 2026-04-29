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

  window.$docsify = window.$docsify || {};
  window.$docsify.darklightTheme = {
    siteFont:       'Inter, sans-serif',
    defaultTheme:   'dark',
    codeFontFamily: 'Roboto Mono, monospace',
    bodyFontSize:   '16px',
    dark:  { accent: '#38bdf8', background: '#020617', textColor: '#cbd5e0', sidebarSublink: '#94a3b8' },
    light: { accent: '#0284c7', background: '#ffffff', textColor: '#1e293b', sidebarSublink: '#475569' }
  };

  function syncToHtml() {
    const saved = window.localStorage.getItem('docsify-darklight-theme') || 'dark';
    const isDark = saved === 'dark';
    const theme = isDark ? 'dark' : 'light';
    
    const html = document.documentElement;
    html.classList.toggle('dark', isDark);
    html.classList.toggle('light', !isDark);
    html.setAttribute('data-theme', theme);
    
    // Also sync body just in case
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
  }

  // Catch clicks on the theme toggle and poll for a short period
  document.addEventListener('click', (e) => {
    if (e.target.closest('#docsify-darklight-theme')) {
      let attempts = 0;
      const interval = setInterval(() => {
        syncToHtml();
        if (++attempts > 10) clearInterval(interval);
      }, 150);
    }
  });

  // Storage listener for other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'docsify-darklight-theme') syncToHtml();
  });

  function integrateThemeButton() {
    const btnEl = document.getElementById('docsify-darklight-theme');
    const barEl = document.querySelector('.settings-bar');
    if (btnEl && barEl && !btnEl.classList.contains('integrated')) {
      btnEl.classList.add('integrated');
      // Find the language toggle to insert before it
      const langBtn = document.getElementById('lang-toggle');
      if (langBtn) {
        barEl.insertBefore(btnEl, langBtn);
      } else {
        barEl.appendChild(btnEl);
      }
      syncToHtml();
      return true;
    }
    return false;
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function pluginTheme(hook) {
      hook.init(function() {
        syncToHtml();
      });

      hook.doneEach(function () {
        if (!integrateThemeButton()) {
          // Use a MutationObserver as it's more reliable than intervals
          const observer = new MutationObserver((mutations, obs) => {
            if (integrateThemeButton()) {
              obs.disconnect();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          
          // Fallback interval just in case
          setTimeout(() => observer.disconnect(), 5000);
        }
      });
    }
  );

  window.addEventListener('storage', (e) => {
    if (e.key === 'docsify-darklight-theme') syncToHtml();
  });
})();
