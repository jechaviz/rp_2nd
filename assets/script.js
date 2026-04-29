/**
 * script.js — App bootstrap
 *
 * Sets up the Docsify configuration and plugin options.
 * All behaviour lives in assets/plugins/:
 *   plugin-title.js          → page title branding + theme button
 *   plugin-mermaid-zoom.js   → Mermaid init + SVG zoom in slides
 *   plugin-presentation.js   → Reveal.js presentation engine
 */

/* ── Theme class on <html> (prevents flash of unstyled content) ─────────── */
(function () {
  const saved = window.localStorage.getItem('docsify-darklight-theme') || 'dark';
  const isDark = saved === 'dark';
  const $html = sq('html');
  $html.toggleClass('dark', isDark).toggleClass('light', !isDark).attr('data-theme', saved);
})();

/* ── Default to Spanish on first load ───────────────────────────────────── */
if (!window.location.hash || window.location.hash === '#/') {
  window.location.hash = '#/es/';
}

/* ── Docsify configuration ──────────────────────────────────────────────── */
window.$docsify = {

  /* Core */
  name: `<div style="text-align:center;padding:0;">
      <span style="font-family:Outfit;font-weight:900;letter-spacing:-1px;
                   color:var(--heading-h1-color);font-size:1.3rem;display:block;
                   margin-bottom:5px;padding:0;">RP RENTAL FASE 2</span>
    </div>`,
  repo:            '',
  loadSidebar:     true,
  loadNavbar:      true,
  subMaxLevel:     3,
  auto2top:        true,
  fallbackLanguages: ['es', 'en'],

  /* i18n Alias */
  alias: {
    '/(es|en)/.*/_sidebar.md': '/$1/_sidebar.md',
    '/(es|en)/.*/_navbar.md':  '/$1/_navbar.md',
    '^/(?!en|es)(.*)':         '/es/$1'
  },

  /* Theming */
  themeable: { readyTransition: true, responsiveTables: true },
  darklightTheme: {
    siteFont:       'Inter, sans-serif',
    defaultTheme:   'dark',
    codeFontFamily: 'Roboto Mono, monospace',
    bodyFontSize:   '16px',
    dark:  { accent: '#38bdf8', background: '#020617', textColor: '#cbd5e0', sidebarSublink: '#94a3b8' },
    light: { accent: '#0284c7', background: '#ffffff', textColor: '#1e293b', sidebarSublink: '#475569' }
  },

  /* ── Plugin options ─────────────────────────────────────────────────────── */

  /** plugin-title.js */
  titlePlugin: {
    brand: 'RP Rental'
  },

  /** plugin-mermaid-zoom.js */
  mermaidZoom: {
    theme:         'dark',
    securityLevel: 'loose'
  },

  /** plugin-presentation.js */
  presentation: {
    sections: [
      { id: 'README',                   next: 'prd',                     prev: null },
      { id: 'prd',                      next: 'loe',                     prev: 'README' },
      { id: 'loe',                      next: 'software_design_document', prev: 'prd' },
      { id: 'software_design_document', next: null,                       prev: 'loe' }
    ]
  },

  /** plugin-toc.js */
  toc: {
    headings: 'h2, h3',
    title:    '',            // set to a string to show a header above the TOC
    position: 'top-right'   // 'side' (right edge) | 'top-right' (fixed corner)
  },

  plugins: []   // plugins self-register; keep array for compatibility
};

/* ── Language toggle ────────────────────────────────────────────────────── */
sq(function () {
  const $langToggle = sq('#lang-toggle');

  const updateLabel = function () {
    const isEn = window.location.hash.includes('/en/');
    $langToggle.html(isEn ? 'ES' : 'EN');
    sq('#present-toggle').html(isEn ? '<span>🖥️</span> PRESENT' : '<span>🖥️</span> PRESENTAR');
  };

  $langToggle.on('click', function () {
    const hash    = window.location.hash;
    const newHash = hash.includes('/es/')
      ? hash.replace('/es/', '/en/')
      : hash.replace('/en/', '/es/');
    window.location.hash = newHash;
    window.location.reload();
  });

  updateLabel();
});
