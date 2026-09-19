/* DÉRIVE — statistiques mondiales : combien de traversées terminées, combien de sauvetages, tous joueurs confondus.
   Le jeu est un site statique : le comptage passe par un service de compteurs gratuit (Abacus, https://abacus.jasoncameron.dev).
   - Rien de personnel n'est envoyé : un simple « +1 » sur un compteur, sans nom ni identifiant.
   - Si le service ne répond pas (hors connexion, service arrêté), le jeu continue et affiche les statistiques locales.
   - Le joueur peut couper l'envoi dans les Options. */
'use strict';

const Stats = {
  base: 'https://abacus.jasoncameron.dev',
  cache: null,

  isDev: function () { return location.hostname === 'localhost' || location.hostname === '127.0.0.1'; },
  // Sur la machine de développement, on n'écrit jamais dans les vrais compteurs.
  ns: function () { return this.isDev() ? 'derive-game-dev' : 'derive-game'; },

  enabled: function () {
    const cfg = window.DERIVE_CONFIG || {};
    if (cfg.globalStats === false) return false;
    if (Game.meta && Game.meta.settings && Game.meta.settings.globalStats === false) return false;
    if (this.isDev() && !/[?&]stats=1/.test(location.search)) return false;
    return typeof fetch === 'function';
  },

  _call: function (verb, key) {
    const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 6000) : null;
    return fetch(this.base + '/' + verb + '/' + this.ns() + '/' + key, { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
      .then(function (r) { if (timer) clearTimeout(timer); if (r.status === 404) return { value: 0 }; if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) { return (j && typeof j.value === 'number') ? j.value : 0; });
  },

  // Lit les deux compteurs. Appelle cb({runs, rescues}) ou cb(null) si indisponible.
  load: function (cb) {
    const self = this;
    if (!this.enabled()) { cb(null); return; }
    Promise.all([this._call('get', 'runs'), this._call('get', 'rescues')])
      .then(function (v) { self.cache = { runs: v[0], rescues: v[1] }; cb(self.cache); })
      .catch(function () { cb(self.cache); });
  },

  // Une traversée vient de se terminer devant un vrai joueur.
  record: function (rescued) {
    const self = this;
    if (!this.enabled()) return;
    this._call('hit', 'runs').then(function (v) { self.cache = self.cache || { runs: 0, rescues: 0 }; self.cache.runs = v; }).catch(function () {});
    if (rescued) this._call('hit', 'rescues').then(function (v) { self.cache = self.cache || { runs: 0, rescues: 0 }; self.cache.rescues = v; }).catch(function () {});
  }
};
