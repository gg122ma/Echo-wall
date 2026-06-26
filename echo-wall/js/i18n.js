/**
 * Echo Wall — Internationalization (i18n) Manager
 * Handles loading translation files and applying them to the DOM.
 */
const I18n = {
  currentLang: 'ms',
  translations: {},

  /** Load a translation file from translations/{lang}.json */
  async load(lang) {
    try {
      const res = await fetch(`translations/${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.translations[lang] = await res.json();
      this.currentLang = lang;
      localStorage.setItem('ew-lang', lang);
      this.apply();
    } catch (err) {
      console.error('[i18n] Failed to load language:', lang, err);
    }
  },

  /** Get a translated string by dot-notation key. Returns fallback if missing. */
  t(key, fallback) {
    const parts = key.split('.');
    let obj = this.translations[this.currentLang];
    for (const part of parts) {
      if (obj && obj[part] !== undefined) {
        obj = obj[part];
      } else {
        return fallback || key;
      }
    }
    return typeof obj === 'string' ? obj : key;
  },

  /** Apply all translations to elements with data-i18n attributes. */
  apply() {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    // Placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // Title / aria-label
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    // Update active language button
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
    });
  },

  /** Initialize: load saved language or default to Malay. */
  init() {
    const saved = localStorage.getItem('ew-lang') || 'ms';
    this.load(saved).catch(() => {
      // Fallback: try to load ms anyway
      this.load('ms').catch(() => {
        this.currentLang = 'ms';
        this.apply();
      });
    });
  }
};

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18n.init());
} else {
  I18n.init();
}
