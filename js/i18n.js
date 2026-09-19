/* DÉRIVE — moteur de localisation.
   - Une langue = un fichier js/lang/xx.js qui appelle I18N.register(code, définition).
   - t('a.b.c', {name:'Mara', n:2}) : interpolation nommée, pluriels par tableau, repli sur l'anglais. */
'use strict';

const I18N = {
  langs: {},
  order: [],
  current: 'en',
  fallback: 'en',
  _warned: {},

  register: function (code, def) {
    // def = { name, dir?, plural: function(n) -> index, fontClass?, strings: {...} }
    this.langs[code] = def;
    if (this.order.indexOf(code) < 0) this.order.push(code);
  },

  available: function () {
    const self = this;
    return this.order.map(function (c) { return { code: c, name: self.langs[c].name }; });
  },

  detect: function () {
    const nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (let i = 0; i < nav.length; i++) {
      const full = String(nav[i]).toLowerCase();
      const short = full.split('-')[0];
      if (full.indexOf('zh') === 0 && this.langs.zh) return 'zh';
      if (full.indexOf('pt') === 0 && this.langs.pt) return 'pt';
      if (this.langs[short]) return short;
    }
    return this.fallback;
  },

  setLang: function (code) {
    if (!this.langs[code]) code = this.fallback;
    this.current = code;
    const def = this.langs[code];
    document.documentElement.lang = code;
    document.documentElement.setAttribute('data-lang', code);
    document.documentElement.dir = def.dir || 'ltr';
    return code;
  },

  _lookup: function (code, key) {
    const def = this.langs[code];
    if (!def) return undefined;
    const parts = key.split('.');
    let cur = def.strings;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  },

  raw: function (key) {
    let v = this._lookup(this.current, key);
    if (v === undefined && this.current !== this.fallback) {
      v = this._lookup(this.fallback, key);
      if (v !== undefined && !this._warned[this.current + ':' + key]) {
        this._warned[this.current + ':' + key] = true;
        if (window.console) console.warn('[i18n] clé manquante en ' + this.current + ' : ' + key);
      }
    }
    return v;
  },

  plural: function (n) {
    const def = this.langs[this.current];
    if (def && typeof def.plural === 'function') return def.plural(n);
    return n === 1 ? 0 : 1;
  },

  t: function (key, params) {
    let v = this.raw(key);
    if (v === undefined) {
      if (!this._warned['!' + key]) { this._warned['!' + key] = true; if (window.console) console.warn('[i18n] clé inconnue : ' + key); }
      return key;
    }
    if (Array.isArray(v)) {
      const n = params && (params.n !== undefined ? params.n : params.count);
      const idx = Math.min(this.plural(typeof n === 'number' ? n : 0), v.length - 1);
      v = v[idx];
    }
    if (typeof v !== 'string') return String(v);
    if (params) {
      const self = this;
      v = v.replace(/\{(\w+)\}/g, function (m, k) {
        let p = params[k];
        if (p === undefined || p === null) return m;
        // Convention : une valeur "@clé.i18n" est traduite au moment de l'affichage (le journal reste juste après un changement de langue).
        if (typeof p === 'string' && p.charAt(0) === '@') return self.t(p.slice(1));
        return String(p);
      });
    }
    return v;
  },

  // Formate un nombre selon la langue courante.
  num: function (n, digits) {
    try {
      return new Intl.NumberFormat(this.localeTag(), { minimumFractionDigits: digits || 0, maximumFractionDigits: digits === undefined ? 1 : digits }).format(n);
    } catch (e) {
      return (digits ? n.toFixed(digits) : String(Math.round(n * 10) / 10));
    }
  },

  localeTag: function () {
    const map = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN' };
    return map[this.current] || this.current;
  },

  // Liste "a, b et c" avec la conjonction de la langue.
  list: function (items) {
    if (!items.length) return '';
    if (items.length === 1) return items[0];
    const and = this.t('ui.and');
    return items.slice(0, -1).join(', ') + ' ' + and + ' ' + items[items.length - 1];
  }
};

function t(key, params) { return I18N.t(key, params); }
