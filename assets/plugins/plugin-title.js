/**
 * plugin-title.js
 * Docsify plugin: Page title branding + theme button integration.
 *
 * Configuration (in $docsify):
 *   titlePlugin: {
 *     brand: 'RP Rental'   // prefix prepended to every page title
 *   }
 *
 * Responsibilities:
 *  - Prepends brand prefix to document.title on every route change
 *  - Relocates the docsify-darklight-theme button into .settings-bar
 */
(function () {
  'use strict';

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function pluginTitle(hook) {
      hook.doneEach(function () {
        const cfg    = (window.$docsify.titlePlugin) || {};
        const brand  = cfg.brand || '';
        const prefix = brand ? `${brand} |` : '';
        const title  = document.title;

        if (prefix && title && !title.startsWith(prefix)) {
          document.title = `${prefix} ${title}`;
        }
      });
    }
  );
})();
