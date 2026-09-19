/* DÉRIVE — interface (DOM). Toute chaîne visible passe par t(). */
'use strict';

const UI = {
  el: {},
  isDesktop: /Electron/i.test(navigator.userAgent),
  current: 'title',
  pauseOpen: false,

  init: function () {
    this.el.title = document.getElementById('screen-title');
    this.el.game = document.getElementById('screen-game');
    this.el.panel = document.getElementById('screen-panel');
    this.el.modal = document.getElementById('modal');
    this.el.toast = document.getElementById('toast');
    const self = this;
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { self.onEscape(); }
      if (e.key === 'Enter' && self.current === 'game') { self.onEnter(); }
    });
    document.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b && window.Sound && Sound.ready) Sound.play('click');
    });
    window.addEventListener('resize', function () { self.applyLayout(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { self.applyLayout(); }, 250); });
  },

  esc: function (s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  h: function (id) { return document.getElementById(id); },

  show: function (name) {
    this.current = name;
    ['title', 'game', 'panel'].forEach(k => this.el[k].classList.toggle('active', k === name));
    if (name !== 'game') this.closeModal();
    this.applyLayout();
  },

  // Choisit la mise en page : ordinateur, téléphone portrait, téléphone paysage. La feuille de style fait le reste.
  tab: 'crew',
  applyLayout: function () {
    const w = window.innerWidth, h = window.innerHeight;
    let mode = 'desktop';
    if (w < 820 || h < 520) mode = (w > h) ? 'mobile-land' : 'mobile-port';
    if (document.body.getAttribute('data-layout') !== mode) document.body.setAttribute('data-layout', mode);
    document.body.classList.toggle('in-game', this.current === 'game');
    requestAnimationFrame(function () { Scene.resize(); });
  },
  setTab: function (tab) {
    this.tab = tab;
    this.el.game.setAttribute('data-tab', tab);
    const box = this.h('g-tabs'); if (!box) return;
    box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.getAttribute('data-tab') === tab));
    if (tab === 'log') { const l = this.h('g-log'); if (l) l.scrollTop = l.scrollHeight; }
  },
  renderTabs: function () {
    const box = this.h('g-tabs'); if (!box) return;
    const tabs = [['crew', 'ui.tabCrew'], ['log', 'ui.tabLog'], ['inv', 'ui.inventory']];
    box.innerHTML = tabs.map(x => '<button data-tab="' + x[0] + '"' + (this.tab === x[0] ? ' class="on"' : '') + '>' + this.esc(t(x[1])) + '</button>').join('');
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => this.setTab(b.getAttribute('data-tab'))));
  },

  toast: function (msg, ms) {
    const el = this.el.toast; el.textContent = msg; el.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), ms || 3200);
  },

  closeModal: function () { this.el.modal.classList.remove('active'); this.el.modal.innerHTML = ''; this.pauseOpen = false; },
  openModal: function (html) { this.el.modal.innerHTML = '<div class="box">' + html + '</div>'; this.el.modal.classList.add('active'); },

  // ------------------------------------------------------------ scène et son
  updateScene: function () {
    const st = Game.state;
    if (!st || this.current !== 'game') {
      Scene.set({ time: 0.3, weather: 'sun', sea: 1, wind: 1, raft: { hp: 100, canopy: true, sail: false }, crew: [{ alive: true, color: [232, 114, 42], skin: [222, 184, 135], hair: [30, 22, 18] }, { alive: true, color: [76, 175, 125], skin: [198, 134, 66], hair: [90, 60, 30] }, { alive: true, color: [78, 166, 220], skin: [244, 208, 176], hair: [210, 190, 150] }, { alive: true, color: [201, 139, 220], skin: [141, 85, 36], hair: [30, 22, 18] }], fx: { fin: false, birds: false, ship: false, plane: false, island: 0, debris: false, whale: false, dolphins: false } });
      if (window.Sound) Sound.setAmbience({ weather: 'sun', night: false, mood: 0.7, gulls: true });
      return;
    }
    const time = { plan: 0.36, events: st.eventPhase === 'night' ? 0.95 : 0.5, rations: 0.74, night: 0.98, end: st.ended && st.ended.type === 'dead' ? 0.98 : 0.6 }[st.phase] || 0.4;
    const ev = st.current ? DATA.eventById[st.current] : null;
    const fx = { fin: !!st.fx.fin && !!ev && ev.fx === 'fin', ship: !!ev && ev.fx === 'ship', plane: !!ev && ev.fx === 'plane', whale: !!ev && ev.fx === 'whale', dolphins: !!ev && ev.fx === 'dolphins', debris: !!ev && (ev.id === 'debris_container' || ev.id === 'oil_slick' || ev.id === 'another_raft'), birds: st.land.dist < 40, island: st.land.dist < 12 ? Math.max(0.15, 1 - Math.max(0, st.land.dist) / 12) : (st.land.dist < 40 ? 0.08 : 0) };
    if (st.ended && (st.ended.type === 'ship' || st.ended.type === 'beacon')) fx.ship = true;
    if (st.ended && st.ended.type === 'plane') fx.plane = true;
    if (st.ended && st.ended.type === 'land') fx.island = 1;
    Scene.set({ time: time, weather: st.weather, sea: st.sea, wind: st.wind, raft: { hp: st.raft.hp, canopy: st.raft.canopy, sail: !!st.items.sail }, crew: st.survivors.map(s => ({ alive: s.alive, color: s.color, skin: s.skin, hair: s.hair, action: st.phase === 'plan' || st.phase === 'events' ? s.action : null })), fx: fx });
    const alive = Game.alive();
    const mood = alive.length ? alive.reduce((a, s) => a + s.morale, 0) / alive.length / 100 : 0;
    if (window.Sound) Sound.setAmbience({ weather: st.weather, night: time > 0.8, mood: mood, gulls: st.land.dist < 40 });
  },

  // ------------------------------------------------------------ écran titre
  showTitle: function () {
    this.show('title');
    const cfg = window.DERIVE_CONFIG || {};
    const langs = I18N.available().map(l => '<button class="btn' + (l.code === I18N.current ? ' on' : '') + '" data-lang="' + l.code + '">' + this.esc(l.name) + '</button>').join('');
    this.el.title.innerHTML =
      '<div class="langbar">' + langs + '</div>' +
      '<div class="title-wrap"><h1>DÉRIVE' + (cfg.demo ? '<span class="demo-tag">' + t('ui.demo') + '</span>' : '') + '</h1><div class="subtitle">' + this.esc(t('ui.subtitle')) + '</div></div>' +
      '<div class="menu">' +
      '<button class="btn btn-primary btn-big" id="b-new">' + this.esc(t('ui.newGame')) + '</button>' +
      (Game.hasSave() ? '<button class="btn btn-big" id="b-continue">' + this.esc(t('ui.continue')) + '</button>' : '') +
      '<button class="btn btn-big" id="b-guide">' + this.esc(t('ui.guide')) + '</button>' +
      '<button class="btn btn-big" id="b-logbook">' + this.esc(t('ui.logbook')) + '</button>' +
      '<button class="btn btn-big" id="b-options">' + this.esc(t('ui.options')) + '</button>' +
      '<button class="btn btn-big" id="b-credits">' + this.esc(t('ui.credits')) + '</button>' +
      (this.isDesktop ? '<button class="btn btn-big btn-ghost" id="b-quit">' + this.esc(t('ui.quit')) + '</button>' : '') +
      '</div>' +
      '<div class="title-foot"><div class="gstats" id="t-stats"></div><div class="version">v' + this.esc(cfg.version || '1.0.0') + '</div></div>';
    const self = this;
    this.el.title.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => App.setLang(b.getAttribute('data-lang'))));
    // Première traversée : on passe d'abord par le guide.
    this.h('b-new').addEventListener('click', () => {
      if (!Game.meta.settings.guideSeen) { Game.meta.settings.guideSeen = true; Game.saveMeta(); self.showGuide(() => self.showNewGame(), t('guide.start')); }
      else self.showNewGame();
    });
    this.h('b-guide').addEventListener('click', () => { Game.meta.settings.guideSeen = true; Game.saveMeta(); self.showGuide(() => self.showTitle()); });
    this.renderStats();
    if (this.h('b-continue')) this.h('b-continue').addEventListener('click', () => { if (Game.load()) { self.showGame(); } else { self.toast(t('ui.noSave')); self.showTitle(); } });
    this.h('b-logbook').addEventListener('click', () => self.showLogbook());
    this.h('b-options').addEventListener('click', () => self.showOptions(() => self.showTitle()));
    this.h('b-credits').addEventListener('click', () => self.showCredits());
    if (this.h('b-quit')) this.h('b-quit').addEventListener('click', () => window.close());
    this.updateScene();
  },

  // ------------------------------------------------------------ nouvelle partie
  showNewGame: function () {
    this.show('panel');
    const self = this;
    const sel = { difficulty: 'open', kit: 'standard' };
    const render = function () {
      const diffs = ['calm', 'open', 'dead'].map(d => '<div class="choice-card' + (sel.difficulty === d ? ' on' : '') + '" data-diff="' + d + '"><div class="t">' + self.esc(t('diff.' + d + '.name')) + '</div><div class="d">' + self.esc(t('diff.' + d + '.desc')) + '</div></div>').join('');
      const kits = ['standard', 'fisher', 'medic', 'signal'].map(k => {
        const kd = DATA.kits[k], locked = kd.unlock && !Game.hasUnlock(kd.unlock);
        return '<div class="choice-card' + (sel.kit === k ? ' on' : '') + (locked ? ' locked' : '') + '" data-kit="' + k + '"><div class="t">' + self.esc(t('kit.' + k + '.name')) + '</div><div class="d">' + self.esc(locked ? t('ui.locked', { how: t('unlock.' + kd.unlock + '.how') }) : t('kit.' + k + '.desc')) + '</div></div>';
      }).join('');
      self.el.panel.innerHTML = '<div class="panel center-box"><h2>' + self.esc(t('ui.newGame')) + '</h2>' +
        '<h3 style="margin-top:12px">' + self.esc(t('ui.difficulty')) + '</h3><div class="choice-cards">' + diffs + '</div>' +
        '<h3 style="margin-top:14px">' + self.esc(t('ui.kit')) + '</h3><div class="choice-cards">' + kits + '</div>' +
        '<div class="sep"></div><div class="row spread sticky-actions"><button class="btn" id="b-back">' + self.esc(t('ui.back')) + '</button><button class="btn btn-primary btn-big" id="b-start">' + self.esc(t('ui.start')) + '</button></div></div>';
      self.el.panel.querySelectorAll('[data-diff]').forEach(c => c.addEventListener('click', () => { sel.difficulty = c.getAttribute('data-diff'); render(); }));
      self.el.panel.querySelectorAll('[data-kit]').forEach(c => c.addEventListener('click', () => { if (c.classList.contains('locked')) { self.toast(t('ui.lockedShort')); return; } sel.kit = c.getAttribute('data-kit'); render(); }));
      self.h('b-back').addEventListener('click', () => self.showTitle());
      self.h('b-start').addEventListener('click', () => { Game.newGame(sel); self.showGame(); if (window.Sound) Sound.play('confirm'); });
    };
    render();
  },

  // ------------------------------------------------------------ options
  showOptions: function (onBack) {
    this.show('panel');
    this.el.panel.innerHTML = '<div class="panel center-box" id="opt-box"></div>';
    this.renderOptionsInto(this.h('opt-box'), onBack);
  },
  renderOptionsInto: function (box, onBack) {
    const self = this, v = Sound.vol;
    const langs = I18N.available().map(l => '<button class="btn btn-small' + (l.code === I18N.current ? ' btn-primary' : '') + '" data-lang="' + l.code + '">' + this.esc(l.name) + '</button>').join(' ');
    const slider = (id, key) => '<div class="slider-row"><label>' + this.esc(t('opt.' + key)) + '</label><input type="range" min="0" max="100" value="' + Math.round(v[key] * 100) + '" data-vol="' + key + '"></div>';
    box.innerHTML = '<h2>' + this.esc(t('ui.options')) + '</h2>' +
      '<h3 style="margin-top:10px">' + this.esc(t('opt.language')) + '</h3><div class="row" style="margin-top:6px">' + langs + '</div>' +
      '<div class="sep"></div>' + slider('master', 'master') + slider('music', 'music') + slider('ambient', 'ambient') + slider('sfx', 'sfx') +
      '<div class="sep"></div><label class="check-row"><input type="checkbox" id="o-gstats"' + (Game.meta.settings.globalStats === false ? '' : ' checked') + '><span><b>' + this.esc(t('opt.globalStats')) + '</b><br><span class="muted small">' + this.esc(t('opt.globalStatsHint')) + '</span></span></label>' +
      '<div class="sep"></div><div class="row"><button class="btn" id="o-full">' + this.esc(t('opt.fullscreen')) + '</button><button class="btn btn-danger" id="o-reset">' + this.esc(t('opt.reset')) + '</button></div>' +
      '<div class="sep"></div><div class="row spread"><button class="btn" id="o-back">' + this.esc(t('ui.back')) + '</button></div>';
    box.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { App.setLang(b.getAttribute('data-lang')); self.renderOptionsInto(box, onBack); }));
    box.querySelectorAll('[data-vol]').forEach(r => r.addEventListener('input', () => { const o = {}; o[r.getAttribute('data-vol')] = r.value / 100; Sound.setVolumes(o); Game.meta.settings.vol = Object.assign({}, Sound.vol); Game.saveMeta(); }));
    this.h('o-gstats').addEventListener('change', (ev) => { Game.meta.settings.globalStats = !!ev.target.checked; Game.saveMeta(); });
    this.h('o-full').addEventListener('click', () => App.toggleFullscreen());
    this.h('o-reset').addEventListener('click', () => {
      if (window.confirm(t('opt.resetConfirm'))) { const lang = I18N.current, vol = Object.assign({}, Sound.vol); localStorage.removeItem(Game.META_KEY); Game.clearSave(); Game.loadMeta(); Game.meta.settings = { lang: lang, vol: vol }; Game.saveMeta(); self.toast(t('opt.resetDone')); }
    });
    this.h('o-back').addEventListener('click', () => onBack());
  },

  // ------------------------------------------------------------ journal de bord
  showLogbook: function () {
    this.show('panel');
    const m = Game.meta, self = this;
    const endings = ['ship', 'plane', 'land', 'beacon', 'dead', 'sunk'].map(e => { const n = m.endings[e] || 0; return '<div class="cell' + (n ? '' : ' locked') + '"><div class="t">' + this.esc(n ? t('ending.' + e + '.name') : '???') + '</div><div class="d">' + this.esc(n ? t('lb.timesSeen', { n: n }) : t('lb.notSeen')) + '</div></div>'; }).join('');
    const unlocks = DATA.unlocks.map(u => { const on = Game.hasUnlock(u); return '<div class="cell' + (on ? '' : ' locked') + '"><div class="t">' + this.esc(t('unlock.' + u + '.name')) + '</div><div class="d">' + this.esc(on ? t('lb.unlocked') : t('unlock.' + u + '.how')) + '</div></div>'; }).join('');
    const seen = Object.keys(m.eventsSeen).length, total = DATA.events.filter(e => e.id !== 'demo_end').length;
    this.el.panel.innerHTML = '<div class="panel center-box"><h2>' + this.esc(t('ui.logbook')) + '</h2>' +
      '<div class="kv" style="margin-top:10px"><span class="k">' + this.esc(t('lb.runs')) + '</span><span>' + m.runs + '</span><span class="k">' + this.esc(t('lb.bestDays')) + '</span><span>' + m.best.days + '</span><span class="k">' + this.esc(t('lb.bestScore')) + '</span><span>' + m.best.score + '</span><span class="k">' + this.esc(t('lb.events')) + '</span><span>' + seen + ' / ' + total + '</span><span class="k">' + this.esc(t('lb.daysTotal')) + '</span><span>' + m.stats.daysTotal + '</span></div>' +
      '<h3 style="margin-top:14px">' + this.esc(t('lb.endings')) + '</h3><div class="logbook-grid" style="margin-top:6px">' + endings + '</div>' +
      '<h3 style="margin-top:14px">' + this.esc(t('lb.unlocks')) + '</h3><div class="logbook-grid" style="margin-top:6px">' + unlocks + '</div>' +
      '<div class="sep"></div><button class="btn" id="b-back">' + this.esc(t('ui.back')) + '</button></div>';
    this.h('b-back').addEventListener('click', () => self.showTitle());
  },

  showCredits: function () {
    this.show('panel');
    const e = this.esc.bind(this);
    const ded = ((window.DERIVE_CONFIG || {}).dedications || []).map(d => '<p>' + e(d) + '</p>').join('');
    this.el.panel.innerHTML = '<div class="panel center-box"><h2>' + e(t('ui.credits')) + '</h2>' +
      '<div class="story" style="margin-top:10px">DÉRIVE\n' + e(t('credits.tagline')) + '</div>' +
      (ded ? '<h3 style="margin-top:16px">' + e(t('credits.thanks')) + '</h3><div class="dedications">' + ded + '</div>' : '') +
      '<div class="sep"></div><div class="story small muted">' + e(t('credits.notes')) + '</div>' +
      '<div class="sep"></div><div class="row spread sticky-actions"><button class="btn" id="b-back">' + e(t('ui.back')) + '</button></div></div>';
    this.h('b-back').addEventListener('click', () => this.showTitle());
  },

  // ------------------------------------------------------------ guide
  guideHtml: function () {
    const e = this.esc.bind(this);
    const sec = k => '<h3>' + e(t('guide.' + k + 'T')) + '</h3><div class="guide-text">' + e(t('guide.' + k + 'B')) + '</div>';
    return '<h2>' + e(t('guide.title')) + '</h2><div class="guide-text guide-intro">' + e(t('guide.intro')) + '</div>' + sec('day') + sec('gauges') + sec('actions') + sec('rescue') + sec('tips');
  },
  showGuide: function (onDone, doneLabel) {
    this.show('panel');
    this.el.panel.innerHTML = '<div class="panel center-box guide">' + this.guideHtml() +
      '<div class="sep"></div><div class="row spread sticky-actions"><span></span><button class="btn ' + (doneLabel ? 'btn-primary btn-big' : '') + '" id="b-done">' + this.esc(doneLabel || t('ui.back')) + '</button></div></div>';
    this.h('b-done').addEventListener('click', () => onDone());
  },

  // ------------------------------------------------------------ statistiques (écran-titre)
  renderStats: function () {
    const self = this;
    const put = function (g) {
      const el = self.h('t-stats'); if (!el) return;
      if (g) { el.textContent = t('ui.statsGlobal', { runs: I18N.num(g.runs, 0), rescues: I18N.num(g.rescues, 0) }); return; }
      const m = Game.meta; let done = 0; for (const k in m.endings) done += m.endings[k];
      el.textContent = done ? t('ui.statsLocal', { runs: I18N.num(done, 0), rescues: I18N.num(m.stats.rescued || 0, 0) }) : '';
    };
    put(Stats.cache);
    Stats.load(put);
  },

  // ------------------------------------------------------------ jeu
  showGame: function () {
    this.show('game');
    this.el.game.innerHTML = '<div class="topbar" id="g-top"></div><div class="tabs" id="g-tabs"></div><div class="crew" id="g-crew"></div><div class="side"><div class="log" id="g-log"></div><div class="inv" id="g-inv"></div></div><div class="bottombar" id="g-bottom"></div>';
    this._lastPhase = null;
    this.setTab('crew');
    this.renderGame();
    if (Game.state && Game.state.day === 1 && Game.state.phase === 'plan') this.toast(t('ui.tutorial'), 6000);
  },

  onChange: function (reason) {
    if (this.current !== 'game') return;
    this.renderGame();
    if (reason === 'event' && Game.state.current) {
      const ev = DATA.eventById[Game.state.current];
      if (ev && ev.fx === 'ship' && window.Sound) Sound.play('bell');
      if (ev && ev.id === 'storm' && window.Sound) Sound.play('thunder');
    }
  },

  renderGame: function () {
    const st = Game.state; if (!st) { this.showTitle(); return; }
    // Sur téléphone : l'équipage pendant la planification, le journal dès que la journée se déroule.
    if (st.phase !== this._lastPhase) { this._lastPhase = st.phase; this.tab = (st.phase === 'plan') ? 'crew' : 'log'; this.el.game.setAttribute('data-tab', this.tab); }
    this.renderTabs();
    this.renderTop(); this.renderCrew(); this.renderLog(); this.renderInv(); this.renderBottom(); this.renderModal();
    this.updateScene();
  },

  landHint: function () {
    const st = Game.state;
    if (st.flags.navKnown) return t('land.known', { km: Math.max(0, Math.round(st.land.dist)) });
    if (st.land.dist < 12) return t('land.island');
    if (st.land.dist < 40) return t('land.birds');
    if (st.land.dist < 100) return t('land.far');
    return t('land.open');
  },

  renderTop: function () {
    const st = Game.state, e = this.esc.bind(this);
    const wcls = st.water <= Game.alive().length ? 'bad' : (st.water <= Game.alive().length * 3 ? 'warn' : '');
    const fcls = st.food < Game.alive().length ? 'bad' : (st.food <= Game.alive().length * 2 ? 'warn' : '');
    const rcls = st.raft.hp < 30 ? 'bad' : (st.raft.hp < 60 ? 'warn' : '');
    this.h('g-top').innerHTML = '<span class="logo">DÉRIVE</span><span class="day">' + e(t('ui.day', { n: st.day })) + '</span>' +
      '<div class="stat"><span class="lbl">' + e(t('ui.weather')) + '</span><span class="val">' + e(t('weather.' + st.weather)) + ' · ' + e(t('temp.' + st.temp)) + ' · ' + e(t('sea.' + st.sea)) + '</span></div>' +
      '<div class="stat"><span class="lbl">' + e(t('ui.raft')) + '</span><span class="val ' + rcls + '">' + Math.round(st.raft.hp) + ' %</span><div class="bar raft"><i style="width:' + st.raft.hp + '%"></i></div></div>' +
      '<div class="stat"><span class="lbl">' + e(t('ui.water')) + '</span><span class="val ' + wcls + '">' + I18N.num(st.water * 0.25, 2) + ' L</span></div>' +
      '<div class="stat"><span class="lbl">' + e(t('ui.food')) + '</span><span class="val ' + fcls + '">' + e(t('ui.rations', { n: I18N.num(st.food, 1) })) + '</span></div>' +
      '<div class="stat"><span class="lbl">' + e(t('ui.land')) + '</span><span class="val">' + e(this.landHint()) + '</span></div>' +
      '<span class="spacer"></span><button class="btn btn-small" id="g-menu">' + e(t('ui.menu')) + '</button>';
    this.h('g-menu').addEventListener('click', () => this.openPause());
  },

  renderCrew: function () {
    const st = Game.state, e = this.esc.bind(this), self = this;
    const plan = st.phase === 'plan';
    const html = st.survivors.map(s => {
      const bars = [['hp', s.hp, 'stat.hp'], ['thirst', 100 - s.thirst, 'stat.hydration'], ['hunger', 100 - s.hunger, 'stat.food'], ['energy', s.energy, 'stat.energy'], ['morale', s.morale, 'stat.morale']]
        .map(b => '<span>' + e(t(b[2])) + '</span><div class="bar ' + b[0] + '"><i style="width:' + Math.round(b[1]) + '%"></i></div><span class="v">' + Math.round(b[1]) + '</span>').join('');
      const conds = s.cond.map(c => '<span class="chip">' + e(t('cond.' + c)) + '</span>').join('');
      const skills = ['fish', 'med', 'sea', 'str', 'mind'].filter(k => s.skills[k] >= 2).map(k => '<span class="chip good" title="' + e(t('skill.' + k)) + '">' + e(t('skill.' + k)) + ' ' + '★'.repeat(s.skills[k]) + '</span>').join('');
      let action = '';
      if (s.alive) {
        if (plan) {
          const opts = DATA.actions.map(a => { const c = Game.canDo(s, a); return '<option value="' + a + '"' + (s.action === a ? ' selected' : '') + (c.ok ? '' : ' disabled') + '>' + e(t('action.' + a)) + (c.ok ? '' : ' — ' + e(t('reason.' + c.reason))) + '</option>'; }).join('');
          action = '<div class="action"><select data-act="' + s.id + '"><option value=""' + (s.action ? '' : ' selected') + '>' + e(t('ui.chooseAction')) + '</option>' + opts + '</select></div>';
          if (s.action === 'craft') {
            const rec = Game.availableRecipes().map(r => '<option value="' + r.id + '"' + (s.param === r.id ? ' selected' : '') + '>' + e(t('rec.' + r.id)) + '</option>').join('');
            action += '<div class="action"><select data-param="' + s.id + '">' + rec + '</select></div>';
          } else if (s.action === 'treat') {
            const tg = Game.alive().map(o => '<option value="' + o.id + '"' + (s.param === o.id ? ' selected' : '') + '>' + e(o.name) + (o.cond.length ? ' (' + e(o.cond.map(c => t('cond.' + c)).join(', ')) + ')' : '') + '</option>').join('');
            action += '<div class="action"><select data-param="' + s.id + '">' + tg + '</select></div>';
          }
        } else if (s.action) action = '<div class="tag" style="margin-top:6px">' + e(t('ui.doing', { action: t('action.' + s.action) })) + '</div>';
      } else action = '<div class="tag" style="margin-top:6px">' + e(t('ui.diedOn', { day: s.deathDay, cause: t('death.' + s.cause) })) + '</div>';
      return '<div class="card' + (s.alive ? '' : ' dead') + '"><div class="head"><canvas data-portrait="' + s.id + '"></canvas><div><div class="name">' + e(s.name) + '</div><div class="arch">' + e(t('arch.' + s.arch)) + ' · <span class="tip" data-tip="' + e(t('trait.' + s.trait + '.name') + ' : ' + t('trait.' + s.trait + '.desc')) + '" title="' + e(t('trait.' + s.trait + '.desc')) + '">' + e(t('trait.' + s.trait + '.name')) + '</span></div></div></div>' +
        (s.alive ? '<div class="bars">' + bars + '</div><div class="conds">' + skills + conds + '</div>' : '') + action + '</div>';
    }).join('');
    const box = this.h('g-crew'); const scroll = box.scrollTop; box.innerHTML = html; box.scrollTop = scroll;
    box.querySelectorAll('canvas[data-portrait]').forEach(c => { const s = st.survivors.find(x => x.id === c.getAttribute('data-portrait')); if (s) Scene.drawPortrait(c, s); });
    // Au doigt, pas de survol : toucher un trait affiche sa description.
    box.querySelectorAll('[data-tip]').forEach(el => el.addEventListener('click', () => self.toast(el.getAttribute('data-tip'), 4000)));
    box.querySelectorAll('select[data-act]').forEach(sel => sel.addEventListener('change', () => { const v = sel.value; if (v) Game.setAction(sel.getAttribute('data-act'), v); }));
    box.querySelectorAll('select[data-param]').forEach(sel => sel.addEventListener('change', () => { const s = st.survivors.find(x => x.id === sel.getAttribute('data-param')); if (s) Game.setAction(s.id, s.action, sel.value); }));
  },

  renderLog: function () {
    const st = Game.state, e = this.esc.bind(this);
    const html = st.log.slice(-80).map(l => l.c === 'daymark' ? '<div class="daymark">' + e(t(l.k, l.p)) + '</div>' : '<p class="' + l.c + '">' + e(t(l.k, l.p)) + '</p>').join('');
    const box = this.h('g-log'); box.innerHTML = html; box.scrollTop = box.scrollHeight;
  },

  renderInv: function () {
    const st = Game.state, e = this.esc.bind(this);
    const items = [];
    for (const id in DATA.items) {
      const kind = DATA.items[id], v = st.items[id] || 0;
      if (!v) continue;
      if (kind === 'count') items.push(e(t('item.' + id)) + ' ×' + v);
      else if (kind === 'dur') items.push(e(t('item.' + id)) + ' ' + Math.round(v) + '%');
      else if (kind === 'beacon') items.push(e(t('item.beacon')) + ' (' + e(v === 2 ? t('ui.beaconOk') : t('ui.beaconBroken')) + ')');
      else items.push(e(t('item.' + id)));
    }
    if (!st.raft.canopy) items.push('<span class="chip">' + e(t('ui.noCanopy')) + '</span>');
    this.h('g-inv').innerHTML = '<b>' + e(t('ui.inventory')) + '</b><div class="items">' + items.map(x => '<span class="it">' + x + '</span>').join('') + '</div>';
  },

  renderBottom: function () {
    const st = Game.state, e = this.esc.bind(this);
    let btn = '', hint = '';
    if (st.phase === 'plan') { btn = '<button class="btn btn-primary btn-big" id="g-primary">' + e(t('ui.endPlanning')) + '</button>'; hint = t('ui.hintPlan'); }
    else if (st.phase === 'events') { hint = t('ui.hintEvent'); }
    else if (st.phase === 'rations') { btn = '<button class="btn btn-primary btn-big" id="g-primary">' + e(t('ui.rationTitle')) + '</button>'; hint = t('ui.hintRations'); }
    else if (st.phase === 'end') { btn = '<button class="btn btn-primary btn-big" id="g-primary">' + e(t('ui.seeEnding')) + '</button>'; }
    this.h('g-bottom').innerHTML = '<span class="hint">' + e(hint) + '</span>' + btn;
    const b = this.h('g-primary'); if (b) b.addEventListener('click', () => this.onEnter());
  },

  onEnter: function () {
    const st = Game.state; if (!st || this.pauseOpen) return;
    if (st.phase === 'plan') { const missing = Game.alive().filter(s => !s.action).length; if (missing && !this._confirmedRest) { this._confirmedRest = true; this.toast(t('ui.missingAction', { n: missing }), 3500); return; } this._confirmedRest = false; Game.endPlanning(); }
    else if (st.phase === 'events') { if (st.result) Game.nextEvent(); }
    else if (st.phase === 'rations') { this.renderModal(); }
    else if (st.phase === 'end') { this.renderModal(); }
  },
  onEscape: function () {
    if (this.current !== 'game') return;
    if (this.pauseOpen) { this.closeModal(); this.renderModal(); return; }
    const st = Game.state; if (st && st.phase !== 'events' && st.phase !== 'end') this.openPause();
  },

  renderModal: function () {
    const st = Game.state, e = this.esc.bind(this), self = this;
    if (this.pauseOpen) return;
    if (st.phase === 'events' && st.current) {
      const ev = DATA.eventById[st.current], p = st.ctx || {};
      let html = '<h2>' + e(t('ev.' + ev.id + '.t', p)) + '</h2><div class="story">' + e(t('ev.' + ev.id + '.b', p)) + '</div>';
      if (!st.result) {
        html += '<div class="choices">' + ev.choices.map((c, i) => { const ok = Game.choiceAvailable(i); return '<button class="btn" data-choice="' + i + '"' + (ok ? '' : ' disabled') + '>' + e(t('ev.' + ev.id + '.c.' + c.id, p)) + (ok ? '' : '<small>' + e(t('ui.unavailable')) + '</small>') + '</button>'; }).join('') + '</div>';
      } else {
        html += '<div class="result story">' + e(t(st.result.key, st.result.params)) + '</div><div class="choices"><button class="btn btn-primary" id="m-next">' + e(t('ui.continue2')) + '</button></div>';
      }
      this.openModal(html);
      this.el.modal.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => Game.choose(parseInt(b.getAttribute('data-choice'), 10))));
      if (this.h('m-next')) this.h('m-next').addEventListener('click', () => Game.nextEvent());
      return;
    }
    if (st.phase === 'rations') {
      const pv = Game.rationPreview();
      const wbtn = [0, 1, 2, 3].map(l => '<button class="btn btn-small' + (st.rations.water === l ? ' on' : '') + '" data-rw="' + l + '">' + e(t('ration.w' + l)) + '</button>').join('');
      const fl = [0, 0.5, 1, 2];
      const fbtn = fl.map((l, i) => '<button class="btn btn-small' + (st.rations.food === l ? ' on' : '') + '" data-rf="' + i + '">' + e(t('ration.f' + i)) + '</button>').join('');
      const html = '<h2>' + e(t('ui.rationTitle')) + '</h2><div class="story">' + e(t('ui.rationHelp')) + '</div>' +
        '<div class="ration-grid"><div class="ration-row"><span class="lbl">' + e(t('ui.rationWater')) + '</span>' + wbtn + '</div><div class="ration-row"><span class="lbl">' + e(t('ui.rationFood')) + '</span>' + fbtn + '</div></div>' +
        '<div class="preview">' + e(t('ui.rationPreview', { w: I18N.num(pv.waterUsed * 0.25, 2), f: I18N.num(pv.foodUsed, 1), wl: I18N.num(pv.waterAfter * 0.25, 2), fl: I18N.num(pv.foodAfter, 1) })) + '</div>' +
        '<div class="choices"><button class="btn btn-primary" id="m-sleep">' + e(t('ui.sleep')) + '</button></div>';
      this.openModal(html);
      this.el.modal.querySelectorAll('[data-rw]').forEach(b => b.addEventListener('click', () => Game.setRation('water', parseInt(b.getAttribute('data-rw'), 10))));
      this.el.modal.querySelectorAll('[data-rf]').forEach(b => b.addEventListener('click', () => Game.setRation('food', fl[parseInt(b.getAttribute('data-rf'), 10)])));
      this.h('m-sleep').addEventListener('click', () => { Game.sleep(); });
      return;
    }
    if (st.phase === 'end') { this.renderEnd(); return; }
    this.closeModal();
  },

  renderEnd: function () {
    const st = Game.state, e = this.esc.bind(this), self = this;
    const type = st.ended.type;
    const alive = Game.alive(), dead = st.survivors.filter(s => !s.alive);
    if (type === 'demo') {
      const url = (window.DERIVE_CONFIG && window.DERIVE_CONFIG.steamUrl) || '';
      const html = '<h2>' + e(t('demo.title')) + '</h2><div class="story">' + e(t('demo.body', { day: st.day - 1 })) + '</div><div class="choices">' + (url ? '<a class="btn btn-primary" href="' + e(url) + '" target="_blank" rel="noopener">' + e(t('demo.steam')) + '</a>' : '') + '<button class="btn" id="m-title">' + e(t('ui.toTitle')) + '</button></div>';
      this.openModal(html);
      this.h('m-title').addEventListener('click', () => { Game.state = null; self.showTitle(); });
      return;
    }
    // Statistiques mondiales : comptée une seule fois, et seulement quand un joueur voit réellement l'écran de fin.
    if (!st.counted) { st.counted = true; Stats.record(['ship', 'plane', 'land', 'beacon'].indexOf(type) >= 0); }
    const params = { day: st.day, alive: alive.length, names: I18N.list(alive.map(s => s.name)), n: alive.length };
    const story = st.story.filter(x => x.k !== 'story.choice').map(x => '<p>' + e(t(x.k, x.p)) + '</p>').join('');
    const gained = (st.gained || []).map(u => '<span class="chip good">' + e(t('unlock.' + u + '.name')) + '</span>').join(' ');
    const html = '<h2>' + e(t('ending.' + type + '.name')) + '</h2><div class="story">' + e(t('ending.' + type + '.body', params)) + '</div>' +
      (story ? '<div class="sep"></div><div class="story small muted">' + story + '</div>' : '') +
      '<div class="sep"></div><div class="kv"><span class="k">' + e(t('ui.daysSurvived')) + '</span><span>' + st.day + '</span><span class="k">' + e(t('ui.survivors')) + '</span><span>' + alive.length + ' / ' + st.survivors.length + '</span><span class="k">' + e(t('ui.fishCaught')) + '</span><span>' + st.stats.fish + '</span><span class="k">' + e(t('ui.waterCollected')) + '</span><span>' + I18N.num(st.stats.water * 0.25, 1) + ' L</span><span class="k">' + e(t('ui.score')) + '</span><span><b>' + st.score + '</b></span></div>' +
      (gained ? '<div class="sep"></div><div><b>' + e(t('ui.newUnlocks')) + '</b><br>' + gained + '</div>' : '') +
      '<div class="choices"><button class="btn btn-primary" id="m-again">' + e(t('ui.playAgain')) + '</button><button class="btn" id="m-title">' + e(t('ui.toTitle')) + '</button></div>';
    this.openModal(html);
    this.h('m-again').addEventListener('click', () => { Game.state = null; self.showNewGame(); });
    this.h('m-title').addEventListener('click', () => { Game.state = null; self.showTitle(); });
  },

  openPause: function () {
    const e = this.esc.bind(this), self = this;
    this.pauseOpen = true;
    this.el.modal.innerHTML = '<div class="box" id="pause-box"></div>'; this.el.modal.classList.add('active');
    const render = function () {
      const box = self.h('pause-box');
      box.innerHTML = '<h2>' + e(t('ui.pause')) + '</h2><div class="choices"><button class="btn btn-primary" id="p-resume">' + e(t('ui.resume')) + '</button><button class="btn" id="p-guide">' + e(t('ui.guide')) + '</button><button class="btn" id="p-options">' + e(t('ui.options')) + '</button><button class="btn btn-danger" id="p-abandon">' + e(t('ui.abandon')) + '</button>' + (self.isDesktop ? '<button class="btn btn-ghost" id="p-quit">' + e(t('ui.quit')) + '</button>' : '') + '</div>';
      self.h('p-resume').addEventListener('click', () => { self.closeModal(); self.renderGame(); });
      self.h('p-guide').addEventListener('click', () => {
        box.innerHTML = '<div class="guide">' + self.guideHtml() + '</div><div class="choices"><button class="btn btn-primary" id="p-gback">' + e(t('ui.back')) + '</button></div>';
        self.h('p-gback').addEventListener('click', () => render());
      });
      self.h('p-options').addEventListener('click', () => self.renderOptionsInto(box, () => { render(); self.renderGame(); self.pauseOpen = true; }));
      self.h('p-abandon').addEventListener('click', () => { if (window.confirm(t('ui.abandonConfirm'))) { Game.abandon(); self.closeModal(); self.showTitle(); } });
      if (self.h('p-quit')) self.h('p-quit').addEventListener('click', () => window.close());
    };
    render();
  },

  refresh: function () {
    if (this.current === 'title') this.showTitle();
    else if (this.current === 'game') this.renderGame();
  }
};
