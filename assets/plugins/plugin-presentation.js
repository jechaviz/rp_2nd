/**
 * plugin-presentation.js
 * Docsify plugin: Reveal.js presentation engine.
 *
 * Configuration (in $docsify):
 *   presentation: {
 *     sections: [                             // ordered section map
 *       { id: 'README', next: 'prd',   prev: null },
 *       { id: 'prd',    next: 'loe',   prev: 'README' },
 *       ...
 *     ]
 *   }
 *
 * Responsibilities:
 *  - Captures raw Markdown per route (beforeEach)
 *  - Transforms Markdown → Reveal.js <section> slides
 *  - Manages Reveal instance lifecycle (start / stop)
 *  - Cross-section keyboard navigation (ArrowLeft / ArrowRight)
 *  - Intercepts internal links inside the presentation
 *  - Delegates Mermaid rendering to window.renderMermaidSlides()
 *  - Wires #present-toggle and #close-present buttons
 *  - Auto-restarts when 'restart-presentation' session flag is set
 */
(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────────────────── */
  let deck           = null;
  let isInitializing = false;
  let currentMarkdown= '';

  /* ── Spinner slide ──────────────────────────────────────────────────────── */
  const SPINNER_SLIDE = '<section class="title-slide"><div class="spinner-container"><div class="spinner"></div></div></section>';

  function showSpinner() {
    sq('#reveal-container .slides').html(SPINNER_SLIDE);
    if (deck) deck.sync();
  }

  /* ── Slide HTML builders ─────────────────────────────────────────────────── */

  function createSlideHtml(markdown, isTitleSlide, isOverview) {
    const cls = isTitleSlide ? 'title-slide' : (isOverview ? 'overview-slide' : '');
    return `<section class="${cls}" data-markdown>\n<textarea data-template class="data-template">\n${markdown}\n</textarea>\n</section>`;
  }

  function processSingleSlide(markdown, breadcrumb, sectionName) {
    breadcrumb  = breadcrumb  || '';
    sectionName = sectionName || '';

    const lines          = markdown.split('\n');
    const mainContent    = [];
    const noteContent    = [];
    const mermaidContent = [];

    let inMermaidBlock  = false;
    let inCodeBlock     = false;
    let hasH1           = false;
    let hasOtherContent = false;
    let hasMermaid      = false;

    const hasVisual = lines.some(function (line) {
      const t = line.trim();
      return t.match(/^[\-\*\+]\s/) || t.match(/^\d+\.\s/) ||
             t.startsWith('![')     || t.startsWith('```mermaid') ||
             t.startsWith('>');
    });

    for (const line of lines) {
      const t = line.trim();

      if      (t.startsWith('# '))              hasH1 = true;
      else if (t && !t.startsWith('Note:'))     hasOtherContent = true;

      if (t.startsWith('```mermaid')) {
        inMermaidBlock = true; hasMermaid = true; continue;
      }
      if (inMermaidBlock) {
        if (t === '```') { inMermaidBlock = false; continue; }
        mermaidContent.push(line); continue;
      }
      if (t.startsWith('```')) {
        inCodeBlock = !inCodeBlock; mainContent.push(line); continue;
      }
      if (inCodeBlock) { mainContent.push(line); continue; }
      if (!t)          { continue; }

      const isHeader     = t.startsWith('#');
      const isVisualElem = t.match(/^[\-\*\+]\s/) || t.match(/^\d+\.\s/) ||
                           t.startsWith('![')      || t.startsWith('>') ||
                           t.startsWith('<div');

      if (isHeader || isVisualElem) {
        if (t.startsWith('>')) noteContent.push(line.substring(1).trim());
        else                   mainContent.push(line);
      } else {
        if (!hasVisual && !t.startsWith('Note:')) mainContent.push(line);
        else                                       noteContent.push(line);
      }
    }

    /* Mermaid slide */
    if (hasMermaid) {
      const headerHtml = mainContent
        .filter(function (l) { return l.trim().startsWith('#'); })
        .map(function (l) {
          const level = l.match(/^(#+)/)[1].length;
          const text  = l.replace(/^#+\s*/, '');
          return `<h${level}>${text}</h${level}>`;
        }).join('');

      const mermaidId = 'mermaid-' + Math.random().toString(36).substr(2, 9);
      const noteHtml  = noteContent.length
        ? `<aside class="notes">${noteContent.join(' ')}</aside>` : '';
      const bc = sectionName + (breadcrumb ? ` > ${breadcrumb}` : '');

      const noticeText = window.SITE_CONFIG && window.getSiteLang
          ? `${window.SITE_CONFIG.branding.company} — ${window.SITE_CONFIG.branding.presentationNotice[window.getSiteLang()]}`
          : '';
      const notice = noticeText ? `<div class="confidential-notice">${noticeText}</div>` : '';
      return `<section class="mermaid-slide"><div class="slide-inner">${notice}<div class="breadcrumb">${bc}</div>${headerHtml}<div class="mermaid" id="${mermaidId}">${mermaidContent.join('\n')}</div></div>${noteHtml}</section>`;
    }

    /* Regular slide */
    let slideMarkdown = '';
    const isTitleSlide = hasH1 && !hasOtherContent;
    
    if (!isTitleSlide) {
      const noticeText = window.SITE_CONFIG && window.getSiteLang
          ? `${window.SITE_CONFIG.branding.company} — ${window.SITE_CONFIG.branding.presentationNotice[window.getSiteLang()]}`
          : '';
      if (noticeText) {
        slideMarkdown += `<div class="confidential-notice">${noticeText}</div>\n`;
      }
    }

    const fullBc = sectionName + (breadcrumb ? ` > ${breadcrumb}` : '');
    if (fullBc) slideMarkdown += `<div class="breadcrumb">${fullBc}</div>\n\n`;
    slideMarkdown += mainContent.join('\n');
    if (noteContent.length) slideMarkdown += '\n\nNote: ' + noteContent.join(' ');

    return createSlideHtml(slideMarkdown, isTitleSlide, false);
  }

  /* ── Markdown → slides ──────────────────────────────────────────────────── */

  function buildSlides(markdown, sectionLabel) {
    const rawSlides      = markdown.split(/^(?=#{1,2}\s)/gm);
    const processedSlides= [];
    let   currentParent  = '';

    for (const rawSlide of rawSlides) {
      const lines  = rawSlide.split('\n');
      const h2Line = lines.find(function (l) { return l.trim().startsWith('## '); });
      if (h2Line) currentParent = h2Line.replace(/^##\s+/, '').trim();

      const h3Indices = [];
      lines.forEach(function (line, i) {
        if (line.trim().startsWith('### ')) h3Indices.push(i);
      });

      if (h3Indices.length === 0) {
        processedSlides.push(processSingleSlide(rawSlide, '', sectionLabel));
      } else {
        const h3Titles = h3Indices.map(function (i) { return lines[i].trim(); });
        let overviewMd = `<div class="breadcrumb">${sectionLabel}</div>\n\n`;
        overviewMd    += (h2Line ? h2Line + '\n\n' : '') + h3Titles.join('\n\n');
        processedSlides.push(createSlideHtml(overviewMd, false, true));

        for (let i = 0; i < h3Indices.length; i++) {
          const start     = h3Indices[i];
          const end       = h3Indices[i + 1] || lines.length;
          const h3Section = lines.slice(start, end).join('\n');
          processedSlides.push(processSingleSlide(h3Section, currentParent, sectionLabel));
        }
      }
    }

    return processedSlides;
  }

  /* ── Cross-section keyboard navigation ─────────────────────────────────── */

  function attachAutoNav(sectionInfo) {
    if (window.activeAutoNav) {
      window.removeEventListener('keydown', window.activeAutoNav);
    }

    let lastSlideTime = 0;
    deck.on('ready',        function () { if (deck.isLastSlide()) lastSlideTime = Date.now(); });
    deck.on('slidechanged', function () { lastSlideTime = deck.isLastSlide() ? Date.now() : 0; });

    window.activeAutoNav = function (e) {
      const lang  = window.getSiteLang();
      const base  = window.getSiteBaseHash(lang);
      const now   = Date.now();
      const fwd   = e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter';
      const back  = e.key === 'ArrowLeft';

      if (fwd && deck.isLastSlide() && sectionInfo.next && (now - lastSlideTime > 300)) {
        window.sessionStorage.setItem('restart-presentation', 'true');
        window.location.hash = base + sectionInfo.next;
        showSpinner();
        window.removeEventListener('keydown', window.activeAutoNav);
        window.activeAutoNav = null;
      } else if (back && deck.getState().indexh === 0 && sectionInfo.prev) {
        window.sessionStorage.setItem('restart-presentation', 'true');
        window.sessionStorage.setItem('start-at-last-slide', 'true');
        window.location.hash = base + sectionInfo.prev;
        showSpinner();
        window.removeEventListener('keydown', window.activeAutoNav);
        window.activeAutoNav = null;
      }
    };

    window.addEventListener('keydown', window.activeAutoNav);
  }

  /* ── Internal link interception ─────────────────────────────────────────── */

  function handlePresentationClick(e) {
    const link = e.target.closest('a');
    if (!link) return;

    const $link = sq(link);
    const href  = $link.attr('href');

    if (href && !href.startsWith('http') && !href.startsWith('#')) {
      e.preventDefault();
      const base = window.getSiteBaseHash(window.getSiteLang());
      window.sessionStorage.setItem('restart-presentation', 'true');
      window.location.hash = base + href.replace('.md', '');
      showSpinner();
    }
  }

  /* ── startPresentation ──────────────────────────────────────────────────── */

  async function startPresentation() {
    if (!currentMarkdown) { console.warn('[presentation] currentMarkdown is empty — skipping'); return; }
    if (isInitializing)   { console.warn('[presentation] already initializing — skipping'); return; }
    isInitializing = true;
    let initError = null;

    try {
      sq('#reveal-css').removeAttr('disabled');
      sq('#reveal-theme').removeAttr('disabled');

      await new Promise(function (r) { setTimeout(r, 100); });

      // Resolve section from config
      const cfg          = (window.$docsify.presentation) || {};
      const sectionOrder = cfg.sections || [];
      const currentHash  = window.location.hash.split('?')[0];
      const currentPath  = currentHash.split('/').pop() || 'README';
      const sectionIdx   = sectionOrder.findIndex(function (s) {
        return s.id === currentPath || (currentPath === '' && s.id === 'README');
      });
      const sectionInfo  = sectionOrder[sectionIdx] || (sectionOrder[0] || {});
      const lang = window.getSiteLang();
      const sectionLabel = lang === 'en' ? `Section ${sectionIdx + 1}` : `Sección ${sectionIdx + 1}`;

      // Build & inject slides
      const slides = buildSlides(currentMarkdown, sectionLabel);
      sq('#reveal-container .slides').html(slides.join('\n'));
      sq('body').addClass('is-presenting');

      // (Re)create Reveal instance
      if (deck) { deck.destroy(); deck = null; }

      const revealEl = document.querySelector('#reveal-container .reveal');
      if (!revealEl) throw new Error('[presentation] #reveal-container .reveal not found in DOM');

      deck = new Reveal(revealEl,
        {
          plugins:              [RevealMarkdown, RevealNotes],
          embedded:             false,
          hash:                 false,
          respondToHashChanges: false,
          history:              false,
          center:               false,
          transition:           'slide',
          backgroundTransition: 'fade',
          width:                '100%',
          height:               '100%',
          margin:               0.1,
          minScale:             0.2,
          maxScale:             2.0
        }
      );

      await deck.initialize();

      if (window.sessionStorage.getItem('start-at-last-slide') === 'true') {
        window.sessionStorage.removeItem('start-at-last-slide');
        deck.slide(deck.getTotalSlides() - 1);
      }

      // Delegate Mermaid rendering to plugin-mermaid-zoom
      function runMermaid() {
        if (typeof window.renderMermaidSlides === 'function') {
          setTimeout(function () { window.renderMermaidSlides('.reveal'); }, 200);
        }
      }
      deck.on('ready',        runMermaid);
      deck.on('slidechanged', runMermaid);

      attachAutoNav(sectionInfo);

    } catch (err) {
      initError = err;
      console.error('[presentation] startPresentation failed:', err);
    } finally {
      isInitializing = false;
      if (initError) console.error('[presentation] deck state after failure:', deck);
    }
  }

  /* ── stopPresentation ───────────────────────────────────────────────────── */

  function stopPresentation() {
    sq('body').removeClass('is-presenting');
    sq('#reveal-css').attr('disabled', 'true');
    sq('#reveal-theme').attr('disabled', 'true');
    window.sessionStorage.removeItem('restart-presentation');
    if (window.activeAutoNav) {
      window.removeEventListener('keydown', window.activeAutoNav);
      window.activeAutoNav = null;
    }
  }

  /* ── Docsify plugin registration ────────────────────────────────────────── */

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(
    function pluginPresentation(hook) {
      hook.beforeEach(function (markdown) {
        currentMarkdown = markdown;
        return markdown;
      });

      hook.doneEach(function () {
        if (window.sessionStorage.getItem('restart-presentation') === 'true') {
          window.sessionStorage.removeItem('restart-presentation');
          setTimeout(startPresentation, 500);
        }
      });
    }
  );

  /* ── Button wiring ──────────────────────────────────────────────────────── */

  sq(function () {
    sq('#present-toggle').on('click', startPresentation);
    sq('#close-present').on('click', stopPresentation);
    sq('#reveal-container').on('click', handlePresentationClick);
  });
})();
