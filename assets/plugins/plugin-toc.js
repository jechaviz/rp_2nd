/**
 * plugin-toc.js
 * Docsify plugin: Floating in-page Table of Contents.
 *
 * Configuration (in $docsify):
 *   toc: {
 *     headings: 'h2, h3',    // which headings to index
 *     title:    '',           // optional panel header (empty = no header)
 *     position: 'side'        // 'side' (default, right edge) | 'top-right'
 *   }
 *
 * Responsibilities:
 *  - After each route change, scans .markdown-section for headings
 *  - Builds a floating TOC panel with smooth-scroll anchor links
 *  - Highlights the active heading using IntersectionObserver (scroll-spy)
 *  - Hides during presentation (body.is-presenting)
 *  - Hides automatically when the page has fewer than 2 headings
 */
(function () {
  'use strict';

  const PANEL_ID = 'doc-toc';

  /* ── Ensure the panel exists in the DOM ─────────────────────────────────── */
  function getOrCreatePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('nav');
      panel.id = PANEL_ID;
      const isEn = window.location.hash.includes('/en/');
      panel.setAttribute('aria-label', isEn ? 'Table of contents' : 'Tabla de contenido');
      
      // Add toggle button
      const toggle = document.createElement('button');
      toggle.className = 'toc-toggle';
      toggle.innerHTML = '<span>☰</span>';
      toggle.onclick = function() {
        panel.classList.toggle('toc-collapsed');
      };
      panel.appendChild(toggle);
      
      // Create a container for the content
      const inner = document.createElement('div');
      inner.className = 'toc-inner';
      panel.appendChild(inner);
      
      document.body.appendChild(panel);
    }
    return panel;
  }

  /* ── Build TOC from headings found in the rendered content ──────────────── */
  function buildToc() {
    const cfg      = (window.$docsify && window.$docsify.toc) || {};
    const selector = cfg.headings || 'h2, h3';
    const title    = cfg.title    !== undefined ? cfg.title : '';
    const position = cfg.position || 'side';   // 'side' | 'top-right'

    const panel    = getOrCreatePanel();

    // Apply position class (remove previous one first)
    panel.classList.remove('toc-pos-side', 'toc-pos-top-right');
    panel.classList.add('toc-pos-' + position);

    const content  = document.querySelector('.markdown-section');
    if (!content) { panel.classList.remove('toc-visible'); return; }

    const headings = Array.from(content.querySelectorAll(selector));

    // Hide when too few headings
    if (headings.length < 2) {
      panel.classList.remove('toc-visible');
      panel.innerHTML = '';
      return;
    }

    // Ensure every heading has an id for anchoring
    headings.forEach(function (h, i) {
      if (!h.id) h.id = 'toc-heading-' + i;
    });

    // Build inner HTML
    let html = '';
    if (title) html += `<div class="toc-title">${title}</div>`;
    html += '<ul>';
    headings.forEach(function (h) {
      const level = parseInt(h.tagName[1], 10); // 2 or 3
      const text  = h.textContent.trim();
      html += `<li class="toc-item toc-h${level}">
        <a href="#${h.id}" class="toc-link" data-toc-id="${h.id}">${text}</a>
      </li>`;
    });
    html += '</ul>';

    panel.querySelector('.toc-inner').innerHTML = html;
    panel.classList.add('toc-visible');

    // Smooth scroll on click (prevent default hash jump, use scrollIntoView)
    sq('#' + PANEL_ID + ' .toc-link').on('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('data-toc-id');
      const target   = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update active immediately on click
        setActive(targetId);
      }
    });

    // Activate scroll-spy
    startScrollSpy(headings);
  }

  /* ── Scroll-spy via IntersectionObserver ─────────────────────────────────── */
  let currentObserver = null;

  function startScrollSpy(headings) {
    if (currentObserver) currentObserver.disconnect();

    currentObserver = new IntersectionObserver(function (entries) {
      // Find the topmost visible heading
      const visible = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });

      if (visible.length) {
        setActive(visible[0].target.id);
      }
    }, {
      rootMargin: '0px 0px -60% 0px',
      threshold: 0
    });

    headings.forEach(function (h) { currentObserver.observe(h); });
  }

  function setActive(id) {
    const links = document.querySelectorAll('#' + PANEL_ID + ' .toc-link');
    links.forEach(function (link) {
      link.classList.toggle('toc-active', link.getAttribute('data-toc-id') === id);
    });
  }

  /* ── Docsify plugin registration ─────────────────────────────────────────── */
  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function pluginToc(hook) {
      hook.doneEach(function () {
        // Small delay to ensure Docsify has finished injecting the content
        setTimeout(buildToc, 50);
      });
    }
  );
})();
