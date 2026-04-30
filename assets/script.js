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
  let saved = window.localStorage.getItem('docsify-darklight-theme');
  if (!saved) {
    saved = 'dark';
    window.localStorage.setItem('docsify-darklight-theme', 'dark');
  }
  const isDark = saved === 'dark';
  const $html = sq('html');
  $html.toggleClass('dark', isDark).toggleClass('light', !isDark).attr('data-theme', saved);
  
  // Ensure body also gets it early
  document.addEventListener('DOMContentLoaded', () => {
    sq('body').toggleClass('dark', isDark).toggleClass('light', !isDark);
  });
})();

/* ── Global Configuration & Utilities ─────────────────────────────────────── */
window.getSiteRouteInfo = function (rawHash) {
  const hash = typeof rawHash === 'string' ? rawHash : (window.location.hash || '');
  const normalizedHash = hash.replace(/^#/, '');
  const hashParts = normalizedHash.split('?');
  const pathPart = (hashParts[0] || '/').replace(/^\/+/, '');
  const query = hashParts.length > 1 ? '?' + hashParts.slice(1).join('?') : '';
  const segments = pathPart ? pathPart.split('/').filter(Boolean) : [];

  let lang = 'es';
  let pathSegments = segments;

  if (segments[0] === 'en' || segments[0] === 'es') {
    lang = segments[0];
    pathSegments = segments.slice(1);
  }

  return {
    lang: lang,
    docPath: pathSegments.join('/') || 'README',
    query: query
  };
};

window.getSiteLang = function (rawHash) {
  return window.getSiteRouteInfo(rawHash).lang;
};

window.getSiteBaseHash = function (lang) {
  return '#/' + (lang === 'en' ? 'en' : 'es') + '/';
};

window.buildSiteLangHash = function (targetLang, rawHash) {
  const info = window.getSiteRouteInfo(rawHash);
  const base = window.getSiteBaseHash(targetLang);
  const docPath = info.docPath === 'README' ? '' : info.docPath;
  return docPath ? base + docPath + info.query : base + info.query;
};

window.prefixSiteLangHref = function (href, targetLang) {
  if (!href || !href.startsWith('#/')) return href;
  if (/^#\/(en|es)(\/|$|\?)/.test(href)) return href;

  const lang = targetLang === 'en' ? 'en' : 'es';
  const hrefParts = href.slice(2).split('?');
  const pathPart = (hrefParts[0] || '').replace(/^\/+/, '');
  const query = hrefParts.length > 1 ? '?' + hrefParts.slice(1).join('?') : '';

  if (!pathPart || pathPart === 'README') {
    return window.getSiteBaseHash(lang) + query;
  }

  return window.getSiteBaseHash(lang) + pathPart + query;
};

window.rewriteLanguageScopedLinks = function (root) {
  const lang = window.getSiteLang();
  const scope = root || document;
  const anchors = scope.querySelectorAll('a[href^="#/"]');

  anchors.forEach(function (anchor) {
    const currentHref = anchor.getAttribute('href');
    const nextHref = window.prefixSiteLangHref(currentHref, lang);
    if (nextHref !== currentHref) {
      anchor.setAttribute('href', nextHref);
    }
  });
};

window.syncDocumentLang = function (rawHash) {
  document.documentElement.setAttribute('lang', window.getSiteLang(rawHash));
};

window.syncDocumentLang();
window.addEventListener('hashchange', function () {
  window.syncDocumentLang();
});

window.SITE_CONFIG = {
  auth: {
    password: '1Ac43E47-CAD0-4D8d-aeC4-8b69F991e444'
  },
  branding: {
    company: 'YEAIP SOLUCIONES SA DE CV',
    presentationNotice: {
      es: 'Confidencial',
      en: 'Confidential'
    },
    footerPrefix: {
      es: 'Confidencial — Creado por',
      en: 'Confidential — Created by'
    }
  },
  loginUI: {
    title: { es: 'Propuesta Comercial Fase 2', en: 'Commercial Proposal Phase 2' },
    prompt: { es: 'Por favor ingresa la contraseña para acceder a la documentación.', en: 'Please enter the password to access the documentation.' },
    placeholder: { es: 'Contraseña', en: 'Password' },
    button: { es: 'Entrar', en: 'Enter' },
    warning: { es: 'CONFIDENCIAL — CONTENIDO PROTEGIDO', en: 'CONFIDENTIAL — PROTECTED CONTENT' },
    error: { es: 'Contraseña incorrecta.', en: 'Incorrect password.' }
  }
};

/* ── Global Login Protection ────────────────────────────────────────────── */
(function () {
  const checkAuth = function () {
    const lang = window.getSiteLang();
    const conf = window.SITE_CONFIG;
    const auth = window.sessionStorage.getItem('site-auth');
    if (auth === 'true') return true;

    const existingScreen = document.getElementById('login-screen');
    if (existingScreen) existingScreen.remove();

    // Show login screen
    const loginHtml = `
      <div id="login-screen">
        <button id="login-lang-toggle" class="login-lang-btn">${lang === 'en' ? 'ES' : 'EN'}</button>
        <div class="login-card">
          <div class="login-logo">RP RENTAL</div>
          <div class="login-title">${conf.loginUI.title[lang]}</div>
          <p>${conf.loginUI.prompt[lang]}</p>
          <div class="input-group">
            <input type="password" id="site-pwd" placeholder="${conf.loginUI.placeholder[lang]}" autofocus>
          </div>
          <button id="login-btn">${conf.loginUI.button[lang]}</button>
          <div class="login-notice">
            ${conf.loginUI.warning[lang]}
          </div>
          <div class="login-footer">${conf.branding.company}</div>
        </div>
      </div>
    `;
    
    // We must use vanilla JS here because sQuery might not be loaded yet
    // depending on the script injection order in index.html
    document.body.insertAdjacentHTML('afterbegin', loginHtml);
    document.body.classList.add('is-locked');

    const handleLogin = function () {
      const pwd = document.getElementById('site-pwd').value;
      if (pwd === conf.auth.password) {
        window.sessionStorage.setItem('site-auth', 'true');
        document.getElementById('login-screen').remove();
        document.body.classList.remove('is-locked');
        window.location.reload();
      } else {
        alert(conf.loginUI.error[lang]);
      }
    };

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('site-pwd').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    document.getElementById('login-lang-toggle').addEventListener('click', () => {
      const nextLang = lang === 'en' ? 'es' : 'en';
      window.location.hash = window.buildSiteLangHash(nextLang);
      checkAuth();
    });

    return false;
  };

  // Run check
  if (!checkAuth()) {
    // Stop Docsify from initializing if not auth
    window.$docsify = { el: '#non-existent-element' };
  }
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

  plugins: [
    function (hook, vm) {
      hook.afterEach(function (html, next) {
        const lang = window.getSiteLang();
        const conf = window.SITE_CONFIG.branding;
        const footer = `<div class="site-footer">
          ${conf.footerPrefix[lang]} <strong>${conf.company}</strong>
        </div>`;
        next(html + footer);
      });
    },
    function (hook) {
      hook.doneEach(function () {
        setTimeout(function () {
          window.rewriteLanguageScopedLinks();
        }, 50);
      });
    }
  ]
};

/* ── Language toggle ────────────────────────────────────────────────────── */
sq(function () {
  const $langToggle = sq('#lang-toggle');

  const updateLabel = function () {
    const isEn = window.getSiteLang() === 'en';
    $langToggle.html(isEn ? 'ES' : 'EN');
    sq('#present-toggle').html(isEn ? '<span>🖥️</span> PRESENT' : '<span>🖥️</span> PRESENTAR');
  };

  $langToggle.on('click', function () {
    const nextLang = window.getSiteLang() === 'en' ? 'es' : 'en';
    window.location.hash = window.buildSiteLangHash(nextLang);
  });

  window.addEventListener('hashchange', updateLabel);
  updateLabel();
});
