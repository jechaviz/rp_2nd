/**
 * plugin-mermaid-zoom.js
 * Docsify plugin: Mermaid init + SVG zoom/pan for Reveal.js slides.
 *
 * Configuration (in $docsify):
 *   mermaidZoom: {
 *     theme:         'dark',   // Mermaid colour theme
 *     securityLevel: 'loose'
 *   }
 *
 * Responsibilities:
 *  - Initializes Mermaid with project settings before Docsify boots
 *  - Exposes window.renderMermaidSlides(scope) for the presentation plugin
 *    → Renders every unprocessed .mermaid element inside `scope`
 *    → Attaches mouse-driven zoom/pan to the resulting SVG
 */
(function () {
  'use strict';

  /* ── Mermaid global init (runs immediately, before Docsify) ─────────────── */
  if (window.mermaid) {
    const cfg = (window.$docsify && window.$docsify.mermaidZoom) || {};
    mermaid.initialize({
      startOnLoad:   false,
      theme:         cfg.theme         || 'dark',
      securityLevel: cfg.securityLevel || 'loose',
      gantt:      { useMaxWidth: true, axisFormat: '%d/%m' },
      flowchart:  { useMaxWidth: true, htmlLabels: true }
    });
  }

  /* ── Render + zoom ──────────────────────────────────────────────────────── */

  /**
   * Renders all unprocessed .mermaid nodes inside `scope` and adds
   * mouse-driven zoom/pan to the resulting SVG.
   *
   * @param {string|Element} [scope='.reveal']
   * @returns {Promise<void>}
   */
  async function renderMermaidSlides(scope) {
    if (!window.mermaid) {
      console.warn('[mermaid-zoom] Mermaid not available.');
      return;
    }

    // Resolve root element via native DOM (sq[0] doesn't reliably unwrap)
    const rootEl = typeof scope === 'string'
      ? document.querySelector(scope)
      : (scope instanceof Element ? scope : document.querySelector('.reveal'));
    if (!rootEl) return;

    const elements = rootEl.querySelectorAll('.mermaid:not([data-mermaid-done])');

    for (const el of elements) {
      const $el  = sq(el);
      const code = el.textContent.trim();
      if (!code) continue;

      try {
        const id    = 'mg-' + Math.random().toString(36).substr(2, 8);
        const { svg } = await window.mermaid.render(id, code);

        $el.html(svg).attr('data-mermaid-done', '1');

        const $svg = $el.find('svg');
        if ($svg.length) {
          $svg.removeAttr('width').removeAttr('height')
            .css({ width: '100%', height: '100%' });

          $el.on('mousemove', function (e) {
            const rect = el.getBoundingClientRect();
            const x    = ((e.clientX - rect.left) / rect.width)  * 100;
            const y    = ((e.clientY - rect.top)  / rect.height) * 100;
            $svg.css('transform-origin', `${x}% ${y}%`);
          });

          $el.on('mouseleave', function () {
            $svg.css('transform-origin', 'center');
          });
        }
      } catch (err) {
        console.error('[mermaid-zoom] Render error:', err, '\nSource:', code);
      }
    }
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  window.renderMermaidSlides = renderMermaidSlides;

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = window.$docsify.plugins || [];
})();
