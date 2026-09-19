/* DÉRIVE — logique de jeu : état, phases (planification → actions → événements → rationnement → nuit), sauvegarde, méta-progression. */
'use strict';

const Game = {
  state: null,
  meta: null,
  rng: null,
  onChange: null,
  SAVE_KEY: 'derive.save.v1',
  META_KEY: 'derive.meta.v1',

  // ------------------------------------------------------------ méta (persistant entre les parties)
  loadMeta: function () {
    let m = null;
    try { m = JSON.parse(localStorage.getItem(this.META_KEY) || 'null'); } catch (e) { m = null; }
    if (!m || typeof m !== 'object') m = {};
    m.unlocks = m.unlocks || [];
    m.endings = m.endings || {};
    m.eventsSeen = m.eventsSeen || {};
    m.best = m.best || { days: 0, score: 0 };
    m.runs = m.runs || 0;
    m.stats = m.stats || { daysTotal: 0, treated: 0, failedSignals: 0, fish: 0, deaths: 0, rescued: 0 };
    m.settings = m.settings || {};
    m.bottles = m.bottles || [];
    m.newUnlocks = m.newUnlocks || [];
    this.meta = m;
    return m;
  },
  saveMeta: function () {
    try { localStorage.setItem(this.META_KEY, JSON.stringify(this.meta)); } catch (e) { /* stockage indisponible : on continue sans persistance */ }
  },
  hasUnlock: function (id) { return this.meta.unlocks.indexOf(id) >= 0; },
  unlock: function (id) {
    if (this.hasUnlock(id)) return false;
    this.meta.unlocks.push(id);
    this.meta.newUnlocks.push(id);
    if (this.state) this.log('log.unlock', { what: '@unlock.' + id + '.name' }, 'good');
    this.saveMeta();
    return true;
  },

  // ------------------------------------------------------------ sauvegarde de partie
  hasSave: function () { try { return !!localStorage.getItem(this.SAVE_KEY); } catch (e) { return false; } },
  save: function () {
    if (!this.state) return;
    this.state.rngState = this.rng.save();
    try { localStorage.setItem(this.SAVE_KEY, JSON.stringify(this.state)); } catch (e) { /* ignoré */ }
  },
  load: function () {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.SAVE_KEY) || 'null'); } catch (e) { s = null; }
    if (!s || s.v !== 1) return false;
    this.state = s;
    this.rng = new RNG(1); this.rng.load(s.rngState);
    return true;
  },
  clearSave: function () { try { localStorage.removeItem(this.SAVE_KEY); } catch (e) { /* ignoré */ } },
  abandon: function () { this.clearSave(); this.state = null; },

  changed: function (reason) { if (typeof this.onChange === 'function') this.onChange(reason); },

  // ------------------------------------------------------------ création
  newGame: function (opts) {
    const diffId = opts.difficulty || 'open';
    const kitId = opts.kit || 'standard';
    const diff = DATA.difficulties[diffId];
    const seed = opts.seed || randomSeed();
    this.rng = new RNG(seed);
    const rng = this.rng;
    const s = {
      v: 1, seed: seed, rngState: 0,
      difficulty: diffId, kit: kitId,
      demo: !!(window.DERIVE_CONFIG && window.DERIVE_CONFIG.demo),
      day: 1, phase: 'plan', eventPhase: 'day',
      weather: rng.chance(0.6) ? 'sun' : 'cloud', prevWeather: 'sun', forecast: null, wind: 1, sea: 1, temp: 'mild',
      raft: { hp: 100, canopy: true },
      water: diff.water, food: diff.food,
      items: { line: 100, hooks: 3, spear: 0, knife: 1, tarp: 1, bucket: 1, still: 0, catcher: 0, patch: diff.patch, flares: diff.flares, flaregun: 1, mirror: 1, whistle: 0, medkit: diff.medkit, bandage: 2, rope: 1, paddles: 2, anchor: 0, beacon: 0, compass: 0, notebook: 0, harmonica: 0, cans: 0, plastic: 1, wire: 0, wood: 0, sail: 0 },
      land: { dist: rng.int(diff.dist[0], diff.dist[1]), start: 0 },
      traffic: rng.range(diff.traffic[0], diff.traffic[1]),
      survivors: [],
      log: [], story: [],
      queue: [], current: null, ctx: null, result: null, seenOnce: [], recent: [],
      rations: { water: 2, food: 1 },
      stats: { fish: 0, water: 0, signals: 0, failedSignals: 0, deaths: 0, treated: 0, crafted: 0, kmPaddled: 0 },
      flags: {}, fx: {}, watchers: 0,
      ended: null, score: 0, gained: []
    };
    s.land.start = s.land.dist;
    const kit = DATA.kits[kitId] || DATA.kits.standard;
    for (const k in kit.items) s.items[k] = (s.items[k] || 0) + kit.items[k];
    this.state = s;
    // équipage
    const pool = Object.keys(DATA.archetypes).filter(a => DATA.archetypes[a].base || this.hasUnlock(DATA.archetypes[a].unlock));
    const chosen = rng.shuffle(pool).slice(0, diff.crew);
    const names = rng.shuffle(DATA.names), colors = rng.shuffle(DATA.colors);
    chosen.forEach((arch, i) => {
      const nm = names[i];
      const surv = this.makeSurvivor(arch, nm[0], nm[1], colors[i]);
      s.survivors.push(surv);
      const gives = DATA.archetypes[arch].gives;
      if (gives) for (const k in gives) s.items[k] = (s.items[k] || 0) + gives[k];
    });
    s.forecast = this.genWeather(s.weather).id;
    this.applyWeather(s.weather);
    this.log('log.start', { names: I18N.list(s.survivors.map(x => x.name)), n: s.survivors.length }, 'info');
    this.log('log.startHint', {}, 'info');
    this.morningReport();
    this.meta.runs++; this.saveMeta();
    this.save();
    this.changed('new');
  },

  makeSurvivor: function (arch, name, gender, color) {
    const rng = this.rng;
    const a = DATA.archetypes[arch];
    return {
      id: 's' + rng.int(1000, 999999) + '_' + (this.state.survivors.length + 1),
      name: name, gender: gender, arch: arch,
      skills: Object.assign({}, a.skills),
      trait: rng.pick(DATA.traits),
      needs: a.needs || 1,
      hp: 100, thirst: 15, hunger: 10, energy: 90, morale: 70,
      cond: [], condDays: {}, alive: true, action: null, param: null, cause: null, deathDay: 0,
      color: color, skin: rng.pick(DATA.skins), hair: rng.pick(DATA.hairs), seed: rng.int(1, 2000000000)
    };
  },

  // ------------------------------------------------------------ helpers
  alive: function () { return this.state.survivors.filter(s => s.alive); },
  clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
  log: function (key, params, cls) {
    const s = this.state; if (!s) return;
    s.log.push({ d: s.day, k: key, p: params || {}, c: cls || '' });
    if (s.log.length > 260) s.log.splice(0, s.log.length - 260);
  },
  story: function (key, params) { this.state.story.push({ d: this.state.day, k: key, p: params || {} }); },

  effectiveness: function (s) {
    let e = 1;
    if (s.energy < 25) e *= 0.55; else if (s.energy < 55) e *= 0.8;
    if (s.thirst > 70) e *= 0.7;
    if (s.hunger > 70) e *= 0.8;
    const mul = { wounded: 0.75, fever: 0.5, infected: 0.55, seasick: 0.6, sunburn: 0.9, hypothermia: 0.6, sting: 0.8 };
    s.cond.forEach(c => { if (mul[c]) e *= mul[c]; });
    return this.clamp(e, 0.2, 1);
  },

  itemVal: function (id) { return this.state.items[id] || 0; },
  hasItem: function (id) { return (this.state.items[id] || 0) > 0; },
  hasCanopy: function () { return !!this.state.raft.canopy; },

  canDo: function (s, action) {
    const st = this.state;
    if (!s.alive) return { ok: false, reason: 'dead' };
    switch (action) {
      case 'fish':
        if (st.weather === 'storm') return { ok: false, reason: 'storm' };
        if (!((this.itemVal('line') > 0 && this.itemVal('hooks') > 0) || this.hasItem('spear'))) return { ok: false, reason: 'nogear' };
        return { ok: true };
      case 'paddle':
        if (st.weather === 'storm') return { ok: false, reason: 'storm' };
        if (!this.hasItem('paddles')) return { ok: false, reason: 'nopaddle' };
        return { ok: true };
      case 'water':
        if (st.weather === 'rain' || st.weather === 'storm') return { ok: true };
        if (this.hasItem('still') && (st.weather === 'sun' || st.weather === 'calm' || st.weather === 'cloud')) return { ok: true };
        if (st.weather === 'fog' && this.hasItem('tarp')) return { ok: true };
        return { ok: false, reason: 'nowater' };
      case 'craft':
        return this.availableRecipes().length ? { ok: true } : { ok: false, reason: 'norecipe' };
      case 'treat':
        return this.alive().some(o => o.cond.length > 0 || o.hp < 60) ? { ok: true } : { ok: false, reason: 'nopatient' };
      case 'repair':
        if (st.raft.hp >= 100) return { ok: false, reason: 'raftok' };
        return { ok: true };
      case 'cheer':
        return this.alive().length >= 2 ? { ok: true } : { ok: false, reason: 'alone' };
      default: return { ok: true };
    }
  },

  availableRecipes: function () {
    const st = this.state, out = [];
    DATA.recipes.forEach(r => {
      if (r.beacon) { if (st.items.beacon === 1) out.push(r); return; }
      if (r.once && this.hasItem(r.once)) return;
      if (r.id === 'sail' && this.hasItem('sail')) return;
      for (const k in r.need) if (this.itemVal(k) < r.need[k]) return;
      for (const k in r.keep) if (this.itemVal(k) < r.keep[k]) return;
      out.push(r);
    });
    return out;
  },

  setAction: function (sid, action, param) {
    const s = this.state.survivors.find(x => x.id === sid);
    if (!s || !s.alive || this.state.phase !== 'plan') return;
    const c = this.canDo(s, action);
    if (!c.ok) return;
    s.action = action; s.param = param === undefined ? null : param;
    if (action === 'craft' && !s.param) { const r = this.availableRecipes(); s.param = r.length ? r[0].id : null; }
    if (action === 'treat' && !s.param) { const p = this.sickest(); s.param = p ? p.id : null; }
    this.save();
    this.changed('action');
  },
  sickest: function () {
    const c = this.alive().slice().sort((a, b) => (b.cond.length * 40 + (100 - b.hp)) - (a.cond.length * 40 + (100 - a.hp)));
    return c[0] || null;
  },

  // ------------------------------------------------------------ météo
  genWeather: function (prev) {
    const rng = this.rng, diff = DATA.difficulties[this.state.difficulty];
    const tr = DATA.weather.trans[prev] || DATA.weather.trans.sun;
    const ids = DATA.weather.ids;
    const id = rng.weighted(ids, w => (tr[w] || 1) * (w === 'storm' ? diff.stormMul : 1));
    return { id: id };
  },
  applyWeather: function (id) {
    const st = this.state, rng = this.rng;
    st.weather = id;
    const wr = DATA.weather.wind[id];
    st.wind = rng.int(wr[0], wr[1]);
    st.sea = id === 'storm' ? 3 : Math.max(0, st.wind - (rng.chance(0.5) ? 1 : 0));
    if (id === 'sun' || id === 'calm') st.temp = rng.chance(0.5) ? 'hot' : 'mild';
    else if (id === 'rain' || id === 'storm') st.temp = rng.chance(0.4) ? 'cold' : 'mild';
    else st.temp = rng.chance(0.25) ? 'cold' : 'mild';
  },

  // ------------------------------------------------------------ matin
  morningReport: function () {
    const st = this.state;
    this.log('log.weather', { weather: '@weather.' + st.weather, temp: '@temp.' + st.temp, sea: '@sea.' + st.sea }, 'info');
    if (st.forecast) this.log('log.forecast', { weather: '@weather.' + st.forecast }, 'info');
    // collecte passive
    if (st.weather === 'rain' || st.weather === 'storm') {
      if (this.hasItem('catcher')) { const n = st.weather === 'storm' ? 7 : 5; this.addWater(n); this.log('log.catcherPassive', { n: n }, 'good'); }
      else if (this.itemVal('bucket') > 0) { const n = st.weather === 'storm' ? 3 : 2; this.addWater(n); this.log('log.bucketPassive', { n: n }, 'good'); }
    }
    if (this.hasItem('still') && (st.weather === 'sun' || st.weather === 'calm')) { this.addWater(2); this.log('log.stillPassive', { n: 2 }, 'good'); }
    if (st.land.dist < 40 && !st.flags.birdsHint) { st.flags.birdsHint = true; this.log('log.birds', {}, 'good'); }
    if (st.land.dist < 12 && !st.flags.islandSeen) { st.flags.islandSeen = true; this.log('log.islandSeen', {}, 'good'); }
    if (st.flags.navKnown) this.log('log.navKnown', { km: Math.max(0, Math.round(st.land.dist)) }, 'info');
  },

  startDay: function () {
    const st = this.state;
    st.prevWeather = st.weather;
    this.applyWeather(st.forecast || this.genWeather(st.weather).id);
    // prévision : juste 70 % du temps
    const real = this.genWeather(st.weather).id;
    st.forecast = real;
    st.nextReal = this.rng.chance(0.7) ? real : this.genWeather(st.weather).id;
    st.flags.lashed = false; st.flags.anchored = false; st.flags.guarded = false;
    st.watchers = 0; st.fx = {};
    st.survivors.forEach(s => { if (s.alive) { s.action = null; s.param = null; } });
    this.log('log.daymark', { day: st.day }, 'daymark');
    this.morningReport();
    if (st.day >= 10) this.unlock('retiree');
    if (st.day >= 15) this.unlock('kit_fisher');
    st.phase = 'plan'; st.eventPhase = 'day';
    // démo : fin au-delà du jour maximal
    if (st.demo && st.day > (window.DERIVE_CONFIG.demoMaxDay || 7)) {
      st.queue = ['demo_end']; this.nextEvent(); return;
    }
    if (st.land.dist <= 0) { st.queue = ['landfall']; this.nextEvent(); return; }
    this.save();
    this.changed('day');
  },

  // ------------------------------------------------------------ fin de planification : actions puis événements
  endPlanning: function () {
    const st = this.state; if (st.phase !== 'plan') return;
    this.alive().forEach(s => { if (!s.action || !this.canDo(s, s.action).ok) { s.action = 'rest'; s.param = null; } });
    st.watchers = 0;
    this.alive().forEach(s => this.resolveAction(s));
    // file d'événements du jour
    const q = [];
    if (st.weather === 'storm') q.push('storm');
    // trafic maritime / aérien
    if (!st.ended && this.rng.chance(st.traffic)) {
      const detected = this.rng.chance(st.watchers > 0 ? 0.85 : 0.3);
      if (detected) q.push(this.rng.chance(0.3) ? 'plane_sighting' : 'ship_sighting');
      else if (this.rng.chance(0.5)) st.flags.missedShip = true;
    }
    if (st.items.beacon === 2 && this.rng.chance(0.35)) q.push('beacon_rescue');
    if (st.land.dist <= 0) q.push('landfall');
    else if (st.land.dist < 12) q.push('landfall_sight');
    // événements aléatoires
    const nRand = this.rng.chance(0.35) ? 2 : 1;
    for (let i = 0; i < nRand; i++) { const e = this.pickEvent('day', q); if (e) q.push(e); }
    // événements poussés par les actions (veille) — en tête après la tempête
    if (st.pending && st.pending.length) { st.pending.forEach(id => { if (q.indexOf(id) < 0) q.push(id); }); st.pending = []; }
    st.queue = q; st.eventPhase = 'day'; st.phase = 'events';
    this.nextEvent();
  },

  pickEvent: function (phase, excl) {
    const st = this.state, g = this.api();
    const cands = DATA.events.filter(e => {
      if (e.phase !== phase && e.phase !== 'any') return false;
      if (excl.indexOf(e.id) >= 0) return false;
      if (e.once && st.seenOnce.indexOf(e.id) >= 0) return false;
      if (st.recent.indexOf(e.id) >= 0) return false;
      if (e.cond && !e.cond(g)) return false;
      let w = 0; try { w = e.weight(g); } catch (err) { w = 0; }
      return w > 0;
    });
    if (!cands.length) return null;
    const e = this.rng.weighted(cands, x => x.weight(g));
    return e ? e.id : null;
  },

  resolveAction: function (s) {
    const st = this.state, rng = this.rng, eff = this.effectiveness(s);
    const cost = DATA.energyCost[s.action] || 0;
    s.energy = this.clamp(s.energy - cost, 0, 100);
    const skills = s.skills;
    switch (s.action) {
      case 'fish': {
        const useSpear = this.hasItem('spear') && !(this.itemVal('line') > 0 && this.itemVal('hooks') > 0);
        const wm = { sun: 0, cloud: 0.05, rain: 0.05, storm: -0.3, fog: 0, calm: 0.1 }[st.weather] || 0;
        const chance = (0.32 + skills.fish * 0.14 + (this.hasItem('spear') ? 0.1 : 0) + wm) * (0.5 + 0.5 * eff);
        if (rng.chance(chance)) {
          const n = 1 + (rng.chance(0.25) ? 1 : 0) + (skills.fish >= 2 && rng.chance(0.3) ? 1 : 0);
          st.food += n; st.stats.fish += n; this.meta.stats.fish += n;
          this.log('log.fishCaught', { name: s.name, n: n }, 'good');
          if (s.trait === 'glutton') this.addMorale(s, 3);
        } else this.log('log.fishNothing', { name: s.name }, '');
        if (!useSpear) {
          st.items.line = Math.max(0, st.items.line - rng.int(6, 14));
          if (st.items.line === 0) this.log('log.lineWorn', {}, 'bad');
          if (rng.chance(s.trait === 'careful' ? 0.05 : 0.1)) { st.items.hooks = Math.max(0, st.items.hooks - 1); this.log('log.hookLost', { name: s.name }, 'bad'); }
        }
        break;
      }
      case 'watch': {
        st.watchers++;
        if (s.trait === 'insomniac') st.watchers++;
        if (rng.chance(0.18 * (0.6 + 0.4 * eff))) { st.pending = st.pending || []; st.pending.push(rng.pick(['debris_container', 'oil_slick', 'fishing_net'])); this.log('log.watchFound', { name: s.name }, 'good'); }
        else this.log('log.watchNothing', { name: s.name }, '');
        break;
      }
      case 'repair': {
        let gain = 0;
        if (this.itemVal('patch') > 0) { st.items.patch--; gain = (14 + skills.sea * 4) * eff; this.log('log.repairPatch', { name: s.name, n: Math.round(gain) }, 'good'); }
        else if (this.itemVal('tarp') > 0) { st.items.tarp--; gain = (9 + skills.sea * 2) * eff; this.log('log.repairTarp', { name: s.name, n: Math.round(gain) }, 'good'); }
        else { gain = 5 * eff; this.log('log.repairBail', { name: s.name, n: Math.round(gain) }, ''); }
        st.raft.hp = this.clamp(st.raft.hp + gain, 0, 100);
        break;
      }
      case 'water': {
        let units = 0;
        if (st.weather === 'rain' || st.weather === 'storm') {
          units = ((this.itemVal('bucket') ? 4 : 0) + (this.hasItem('catcher') ? 6 : 0) + (this.itemVal('tarp') ? 2 : 0) + 2) * (st.weather === 'storm' ? 1.5 : 1) * (0.6 + 0.4 * eff);
        } else if (this.hasItem('still')) units = 3 * (0.6 + 0.4 * eff);
        else if (st.weather === 'fog' && this.itemVal('tarp')) units = 1;
        units = Math.round(units);
        if (units > 0) { this.addWater(units); this.log('log.waterCollected', { name: s.name, n: units }, 'good'); }
        else this.log('log.waterNothing', { name: s.name }, '');
        break;
      }
      case 'craft': {
        const r = DATA.recipes.find(x => x.id === s.param);
        if (!r || this.availableRecipes().indexOf(r) < 0) { this.log('log.craftFail', { name: s.name }, 'bad'); break; }
        if (eff < 0.45) { this.log('log.craftTired', { name: s.name }, 'bad'); break; }
        if (r.beacon) {
          const step = (skills.sea >= 2 || s.arch === 'mechanic') ? 2 : 1;
          st.flags.beaconProgress = (st.flags.beaconProgress || 0) + step;
          if (st.flags.beaconProgress >= 2) { st.items.beacon = 2; this.log('log.beaconFixed', { name: s.name }, 'good'); this.story('story.beacon', { name: s.name }); this.unlock('priest'); }
          else this.log('log.beaconProgress', { name: s.name }, 'info');
          break;
        }
        for (const k in r.need) st.items[k] -= r.need[k];
        for (const k in r.gives) st.items[k] = (st.items[k] || 0) + r.gives[k];
        st.stats.crafted++;
        this.log('log.crafted', { name: s.name, what: '@item.' + r.id }, 'good');
        break;
      }
      case 'treat': {
        const p = st.survivors.find(x => x.id === s.param && x.alive) || this.sickest();
        if (!p) { this.log('log.treatNobody', { name: s.name }, ''); break; }
        const cur = p.cond.slice();
        if (this.itemVal('medkit') > 0 && (cur.length || p.hp < 60)) {
          st.items.medkit--;
          p.cond = p.cond.filter(c => c === 'seasick');
          p.hp = this.clamp(p.hp + 15 + 5 * skills.med, 0, 100);
          this.log('log.treatMedkit', { name: s.name, name2: p.name }, 'good');
          if (cur.length) { st.stats.treated++; this.meta.stats.treated++; }
        } else if (this.itemVal('bandage') > 0 && (cur.indexOf('wounded') >= 0 || cur.indexOf('sting') >= 0 || cur.indexOf('sunburn') >= 0)) {
          st.items.bandage--;
          p.cond = p.cond.filter(c => c !== 'wounded' && c !== 'sting' && c !== 'sunburn');
          p.hp = this.clamp(p.hp + 8 + 3 * skills.med, 0, 100);
          this.log('log.treatBandage', { name: s.name, name2: p.name }, 'good');
          st.stats.treated++; this.meta.stats.treated++;
        } else {
          p.hp = this.clamp(p.hp + 4 + 3 * skills.med, 0, 100);
          if (cur.length && rng.chance(0.25 + 0.12 * skills.med)) { const c = p.cond.shift(); this.log('log.treatCured', { name: s.name, name2: p.name, cond: '@cond.' + c }, 'good'); st.stats.treated++; this.meta.stats.treated++; }
          else this.log('log.treatCare', { name: s.name, name2: p.name }, '');
        }
        if (this.meta.stats.treated >= 5) this.unlock('kit_medic');
        break;
      }
      case 'paddle': {
        const km = Math.round((5 + skills.str + (st.flags.paddleBonus || 0)) * eff * 10) / 10;
        st.land.dist -= km; st.stats.kmPaddled += km;
        this.log('log.paddled', { name: s.name, km: I18N.num(km, 1) }, 'good');
        break;
      }
      case 'rest': {
        s.hp = this.clamp(s.hp + 4, 0, 100);
        if (s.cond.indexOf('seasick') >= 0 && rng.chance(0.5)) this.removeCond(s, 'seasick');
        this.log('log.rested', { name: s.name }, '');
        break;
      }
      case 'cheer': {
        const gain = (6 + skills.mind * 3 + (this.hasItem('harmonica') ? 3 : 0) + (s.trait === 'leader' ? 3 : 0)) * eff;
        this.alive().forEach(o => { if (o !== s) this.addMorale(o, gain); });
        this.addMorale(s, 2);
        this.log('log.cheered', { name: s.name }, 'good');
        break;
      }
    }
  },

  addWater: function (n) { this.state.water = Math.max(0, this.state.water + n); if (n > 0) this.state.stats.water += n; },
  addMorale: function (s, n) {
    if (!s.alive) return;
    if (n < 0 && s.trait === 'stoic') n *= 0.5;
    if (n > 0 && s.trait === 'stoic') n *= 0.7;
    s.morale = this.clamp(s.morale + n, 0, 100);
  },
  addCond: function (s, c) {
    if (!s || !s.alive) return;
    if (s.cond.indexOf(c) < 0) { s.cond.push(c); s.condDays[c] = 0; this.log('log.condGained', { name: s.name, cond: '@cond.' + c }, 'bad'); }
  },
  removeCond: function (s, c) {
    const i = s.cond.indexOf(c);
    if (i >= 0) { s.cond.splice(i, 1); delete s.condDays[c]; this.log('log.condLost', { name: s.name, cond: '@cond.' + c }, 'good'); }
  },
  hurt: function (s, n) { if (!s.alive) return; let m = 1; if (s.trait === 'tough') m = 0.8; s.hp = this.clamp(s.hp - n * m, 0, 100); },
  kill: function (s, cause) {
    if (!s.alive) return;
    s.alive = false; s.cause = cause; s.deathDay = this.state.day; s.action = null;
    this.state.stats.deaths++; this.meta.stats.deaths++;
    this.log('log.death', { name: s.name, cause: '@death.' + cause }, 'bad');
    this.story('story.death', { name: s.name, cause: '@death.' + cause, day: this.state.day });
    this.alive().forEach(o => this.addMorale(o, -20));
    if (window.Sound) Sound.play('death');
  },

  // ------------------------------------------------------------ événements
  nextEvent: function () {
    const st = this.state;
    st.result = null; st.current = null; st.ctx = null;
    if (st.ended) { st.phase = 'end'; this.finishRun(); this.save(); this.changed('end'); return; }
    while (st.queue.length) {
      const id = st.queue.shift();
      const e = DATA.eventById[id];
      if (!e) continue;
      if (e.cond && !e.cond(this.api())) continue;
      let ctx = {};
      try { ctx = e.setup ? (e.setup(this.api()) || {}) : {}; } catch (err) { continue; }
      if (st.pendingCtx && st.pendingCtx[id]) { Object.assign(ctx, st.pendingCtx[id]); delete st.pendingCtx[id]; }
      st.current = id; st.ctx = ctx;
      if (e.fx) st.fx[e.fx] = true;
      st.phase = 'events';
      if (e.once && st.seenOnce.indexOf(id) < 0) st.seenOnce.push(id);
      st.recent.push(id); if (st.recent.length > 6) st.recent.shift();
      this.meta.eventsSeen[id] = (this.meta.eventsSeen[id] || 0) + 1;
      this.save(); this.changed('event');
      return;
    }
    // file vide
    if (st.eventPhase === 'day') { st.phase = 'rations'; this.save(); this.changed('rations'); }
    else { this.nightPass(); }
  },

  choiceAvailable: function (idx) {
    const st = this.state, e = DATA.eventById[st.current];
    if (!e) return false;
    const c = e.choices[idx]; if (!c) return false;
    if (typeof c.avail === 'function') { try { return !!c.avail(this.api(), st.ctx); } catch (err) { return false; } }
    return true;
  },

  choose: function (idx) {
    const st = this.state, e = DATA.eventById[st.current];
    if (!e || st.result) return;
    if (!this.choiceAvailable(idx)) return;
    const c = e.choices[idx];
    let res = null;
    try { res = c.run(this.api(), st.ctx); } catch (err) { if (window.console) console.error(err); res = 'ok'; }
    if (typeof res === 'string') res = { r: res, p: {} };
    if (!res || !res.r) res = { r: 'ok', p: {} };
    st.result = { key: 'ev.' + e.id + '.r.' + res.r, params: Object.assign({}, st.ctx, res.p || {}) };
    this.story('story.choice', { title: '@ev.' + e.id + '.t' });
    this.checkDeaths();
    this.save(); this.changed('result');
  },

  checkDeaths: function () {
    const st = this.state;
    st.survivors.forEach(s => { if (s.alive && s.hp <= 0) this.kill(s, s.cause || 'wounds'); });
    if (!this.alive().length && !st.ended) st.ended = { type: 'dead', day: st.day };
    if (st.raft.hp <= 0 && !st.ended) { this.alive().forEach(s => this.kill(s, 'sunk')); st.ended = { type: 'sunk', day: st.day }; }
  },

  queueEvent: function (id, ctx) {
    const st = this.state;
    if (st.queue.indexOf(id) < 0) st.queue.unshift(id);
    if (ctx) { st.pendingCtx = st.pendingCtx || {}; st.pendingCtx[id] = ctx; }
  },

  // ------------------------------------------------------------ rationnement et nuit
  setRation: function (kind, level) {
    const st = this.state; if (st.phase !== 'rations') return;
    st.rations[kind] = level; this.save(); this.changed('ration');
  },

  rationPreview: function () {
    const st = this.state, n = this.alive().length;
    const waterNeed = Math.min(st.water, st.rations.water * n);
    const foodNeed = Math.min(st.food, st.rations.food * n);
    return { waterUsed: waterNeed, foodUsed: foodNeed, waterAfter: st.water - waterNeed, foodAfter: st.food - foodNeed, n: n };
  },

  sleep: function () {
    const st = this.state; if (st.phase !== 'rations') return;
    const crew = this.alive(), rng = this.rng;
    // distribution ronde par ronde
    const got = {}; crew.forEach(s => { got[s.id] = { w: 0, f: 0 }; });
    for (let round = 0; round < st.rations.water; round++) crew.forEach(s => { if (st.water >= 1) { st.water -= 1; got[s.id].w += 1; } });
    for (let round = 0; round < st.rations.food * 2; round++) crew.forEach(s => { if (st.food >= 0.5) { st.food -= 0.5; got[s.id].f += 0.5; } });
    st.food = Math.round(st.food * 2) / 2;
    let shortW = false, shortF = false;
    crew.forEach(s => {
      const w = got[s.id].w, f = got[s.id].f;
      if (w < st.rations.water) shortW = true;
      if (f < st.rations.food) shortF = true;
      const heat = (st.weather === 'sun' || st.weather === 'calm') && st.temp === 'hot' ? (this.hasCanopy() ? 2 : 6) : 0;
      const thirstTable = [30, 9, 1, -10];
      let dT = thirstTable[Math.min(3, w)]; if (dT > 0) dT *= s.needs; dT += heat;
      if (s.action === 'paddle' || s.action === 'repair') dT += 4;
      s.thirst = this.clamp(s.thirst + dT, 0, 100);
      let dH = (14 - 12 * f) * s.needs;
      if (s.trait === 'glutton') dH += 3;
      s.hunger = this.clamp(s.hunger + dH, 0, 100);
      if (w === 0) this.addMorale(s, -8); else if (w >= 3) this.addMorale(s, 3);
      if (f === 0) this.addMorale(s, -5); else if (f >= 2) this.addMorale(s, s.trait === 'glutton' ? 6 : 2);
    });
    if (shortW) this.log('log.shortWater', {}, 'bad');
    if (shortF) this.log('log.shortFood', {}, 'bad');
    this.log('log.rationed', { w: I18N.num(st.rations.water * 0.25, 2), f: I18N.num(st.rations.food, 1) }, 'night');
    if (st.flags.discipline && st.rations.water >= 2) { st.water += 1; }
    // événements nocturnes
    const q = [];
    if (!st.ended && rng.chance(st.traffic * 0.5) && rng.chance(0.4)) q.push('ship_night');
    if (rng.chance(0.6)) { const e = this.pickEvent('night', q); if (e) q.push(e); }
    st.queue = q; st.eventPhase = 'night'; st.phase = 'events';
    this.nextEvent();
  },

  nightPass: function () {
    const st = this.state, rng = this.rng, diff = DATA.difficulties[st.difficulty];
    st.phase = 'night';
    this.alive().forEach(s => {
      s.energy = this.clamp(s.energy + (s.trait === 'insomniac' ? 10 : 18), 0, 100);
      // soif et faim
      let dmg = 0, cause = null;
      if (s.thirst >= 100) { dmg += 25; cause = 'thirst'; } else if (s.thirst >= 75) { dmg += 10; cause = 'thirst'; }
      if (s.hunger >= 100) { dmg += 12; cause = cause || 'hunger'; } else if (s.hunger >= 75) { dmg += 4; cause = cause || 'hunger'; }
      // états
      const cd = { sunburn: 3, wounded: 4, fever: 8, infected: 10, hypothermia: 8, sting: 5, seasick: 0 };
      s.cond.slice().forEach(c => {
        dmg += cd[c] || 0;
        s.condDays[c] = (s.condDays[c] || 0) + 1;
        if (c === 'wounded' && rng.chance(0.15)) { this.removeCond(s, 'wounded'); this.addCond(s, 'infected'); }
        if (c === 'sunburn' && s.condDays[c] >= 3 && st.weather !== 'sun') this.removeCond(s, 'sunburn');
        if (c === 'sting' && s.condDays[c] >= 2) this.removeCond(s, 'sting');
        if (c === 'hypothermia' && st.temp !== 'cold' && st.weather !== 'rain' && st.weather !== 'storm') this.removeCond(s, 'hypothermia');
        if (c === 'seasick' && st.sea <= 1) this.removeCond(s, 'seasick');
        if (c === 'fever' && s.thirst < 50 && rng.chance(0.3)) this.removeCond(s, 'fever');
        if (c === 'seasick') { this.addMorale(s, -3); s.thirst = this.clamp(s.thirst + 4, 0, 100); }
        if (!cause && (c === 'fever' || c === 'infected')) cause = 'fever';
        if (!cause && c === 'wounded') cause = 'wounds';
        if (!cause && c === 'hypothermia') cause = 'cold';
      });
      dmg *= diff.drainMul;
      if (dmg > 0) { this.hurt(s, dmg); s.cause = cause || 'wounds'; }
      else if (s.thirst < 50 && s.hunger < 50) s.hp = this.clamp(s.hp + 2, 0, 100);
      // moral
      let att = -3;
      if (s.trait === 'optimist') att = -1;
      if (st.weather === 'storm') att -= 5;
      if (s.hp < 30) att -= 3;
      this.addMorale(s, att);
      if (s.trait === 'selfish') this.addMorale(s, 1);
    });
    // navire manqué
    if (st.flags.missedShip) { st.flags.missedShip = false; this.log('log.missedShip', {}, 'bad'); }
    // usure du radeau
    let wear = [1, 2, 4, 8][st.sea] || 2;
    if (st.weather === 'storm') { let extra = rng.int(10, 20); if (st.flags.anchored || this.hasItem('anchor')) extra *= 0.5; if (st.flags.lashed) extra *= 0.7; wear += extra; }
    st.raft.hp = this.clamp(st.raft.hp - wear, 0, 100);
    if (wear >= 10) this.log('log.raftWear', { n: Math.round(wear) }, 'bad');
    // dérive
    let drift = [5, 9, 13, 18][st.wind] + rng.int(-3, 3);
    if (this.hasItem('sail')) drift *= 1.5;
    if (st.weather === 'storm' && (st.flags.anchored || this.hasItem('anchor'))) drift *= 0.6;
    st.land.dist -= drift;
    // décès et fin
    this.checkDeaths();
    if (!st.ended) {
      this.meta.stats.daysTotal++;
      st.day++;
      this.startDay();
    } else { st.phase = 'end'; this.finishRun(); this.save(); this.changed('end'); }
  },

  // ------------------------------------------------------------ fin de partie
  rescue: function (type) {
    const st = this.state;
    if (st.ended) return;
    st.ended = { type: type, day: st.day };
    this.story('story.rescue', { type: '@ending.' + type + '.name', day: st.day });
    if (window.Sound) Sound.play('fanfare');
  },
  endDemo: function () { const st = this.state; st.ended = { type: 'demo', day: st.day }; },

  finishRun: function () {
    const st = this.state; if (st.finished) return; st.finished = true;
    const alive = this.alive().length;
    const bonus = { land: 300, ship: 200, plane: 200, beacon: 150, dead: 0, sunk: 0, demo: 0 }[st.ended.type] || 0;
    st.score = st.day * 10 + alive * 100 + bonus;
    const m = this.meta;
    if (st.ended.type !== 'demo') {
      m.endings[st.ended.type] = (m.endings[st.ended.type] || 0) + 1;
      if (st.day > m.best.days) m.best.days = st.day;
      if (st.score > m.best.score) m.best.score = st.score;
      if (st.ended.type === 'ship' || st.ended.type === 'plane' || st.ended.type === 'land' || st.ended.type === 'beacon') m.stats.rescued++;
      m.newUnlocks = [];
      if (st.difficulty === 'dead') this.unlock('soldier');
      if ((st.ended.type === 'ship' || st.ended.type === 'plane' || st.ended.type === 'land' || st.ended.type === 'beacon') && st.stats.deaths === 0) this.unlock('musician');
      if (st.ended.type === 'land') this.unlock('diver');
      if (st.ended.type === 'dead' || st.ended.type === 'sunk') this.unlock('child');
      if (m.stats.failedSignals >= 2) this.unlock('kit_signal');
      st.gained = m.newUnlocks.slice();
    }
    this.saveMeta();
    this.clearSave();
  },

  // ------------------------------------------------------------ API exposée aux événements (data.js)
  api: function () {
    const G = this, st = this.state, rng = this.rng;
    return {
      s: st, rng: rng,
      day: () => st.day,
      weather: () => st.weather, prevWeather: () => st.prevWeather, forecast: () => st.forecast, temp: () => st.temp, seaState: () => st.sea,
      aliveList: () => G.alive(),
      pickAlive: f => { const l = G.alive().filter(f || (() => true)); return l.length ? rng.pick(l) : undefined; },
      byName: n => st.survivors.find(x => x.name === n),
      watchers: () => st.watchers,
      anyAction: a => G.alive().some(x => x.action === a),
      avgMorale: () => { const l = G.alive(); return l.length ? l.reduce((a, x) => a + x.morale, 0) / l.length : 0; },
      bestSkill: (sk, f) => { const l = G.alive().filter(f || (() => true)); if (!l.length) return null; return l.slice().sort((a, b) => b.skills[sk] - a.skills[sk])[0]; },
      bestSkillLevel: sk => { const l = G.alive(); return l.length ? Math.max.apply(null, l.map(x => x.skills[sk])) : 0; },
      check: (s, sk, base) => { if (!s) return rng.chance(base); const e = G.effectiveness(s); return rng.chance(G.clamp(base + s.skills[sk] * 0.12 + (e - 0.7) * 0.3, 0.05, 0.95)); },
      energy: (s, n) => { if (s && s.alive) s.energy = G.clamp(s.energy + n, 0, 100); },
      morale: (s, n) => { if (s) G.addMorale(s, n); else G.alive().forEach(x => G.addMorale(x, n)); },
      hurt: (s, n) => G.hurt(s, n),
      heal: (s, n) => { if (s && s.alive) s.hp = G.clamp(s.hp + n, 0, 100); },
      addCond: (s, c) => G.addCond(s, c), removeCond: (s, c) => G.removeCond(s, c),
      kill: (s, c) => G.kill(s, c),
      has: id => G.hasItem(id), item: id => G.itemVal(id),
      add: (id, n) => { st.items[id] = Math.max(0, (st.items[id] || 0) + n); if (n > 0) G.log('log.gotItem', { what: '@item.' + id, n: n }, 'good'); },
      setItem: (id, v) => { st.items[id] = v; if (v > 0) G.log('log.gotItem', { what: '@item.' + id, n: 1 }, 'good'); },
      loot: (pool, n) => { for (let i = 0; i < n; i++) { const id = rng.pick(pool); if (id === 'flares' || id === 'medkit' || id === 'patch' || id === 'cans' || id === 'plastic' || id === 'rope' || id === 'wire' || id === 'wood' || id === 'tarp' || id === 'bucket' || id === 'paddles' || id === 'hooks' || id === 'bandage') { st.items[id] = (st.items[id] || 0) + 1; if (id === 'cans') { st.food += 1; } G.log('log.gotItem', { what: '@item.' + id, n: 1 }, 'good'); } else if (!(st.items[id] > 0)) { st.items[id] = 1; G.log('log.gotItem', { what: '@item.' + id, n: 1 }, 'good'); } else { st.food += 1; G.log('log.gotItem', { what: '@item.cans', n: 1 }, 'good'); } } },
      water: n => { if (n === 0) return st.water; G.addWater(n); if (n > 0) G.log('log.gotWater', { l: I18N.num(n * 0.25, 2) }, 'good'); return st.water; },
      waterUnits: () => st.water,
      food: n => { if (n) { st.food = Math.max(0, st.food + n); if (n > 0) G.log('log.gotFood', { n: n }, 'good'); } return st.food; },
      raft: n => { st.raft.hp = G.clamp(st.raft.hp + n, 0, 100); if (n < 0) G.log('log.raftDamage', { n: Math.round(-n) }, 'bad'); else G.log('log.raftRepaired', { n: Math.round(n) }, 'good'); },
      raftHp: () => st.raft.hp,
      hasCanopy: () => G.hasCanopy(), setCanopy: b => { st.raft.canopy = b; },
      landDist: () => st.land.dist, dist: n => { st.land.dist += n; if (n < 0) G.log('log.closer', { km: Math.round(-n) }, 'good'); },
      setFlag: (k, v) => { st.flags[k] = v; }, flag: k => st.flags[k],
      queueEvent: (id, ctx) => G.queueEvent(id, ctx),
      rescue: type => G.rescue(type),
      setFx: k => { st.fx[k] = true; },
      stat: k => { st.stats[k] = (st.stats[k] || 0) + 1; if (k === 'failedSignals') G.meta.stats.failedSignals++; },
      log: (k, p, c) => G.log(k, p, c),
      unlockEvent: id => { if (G.meta.bottles.indexOf(id) < 0) { G.meta.bottles.push(id); G.saveMeta(); } },
      addSurvivor: () => {
        const used = st.survivors.map(x => x.name);
        const nm = rng.pick(DATA.names.filter(x => used.indexOf(x[0]) < 0));
        const usedC = st.survivors.map(x => x.color.join());
        const col = rng.pick(DATA.colors.filter(c => usedC.indexOf(c.join()) < 0)) || rng.pick(DATA.colors);
        const pool = Object.keys(DATA.archetypes).filter(a => DATA.archetypes[a].base || G.hasUnlock(DATA.archetypes[a].unlock));
        const ns = G.makeSurvivor(rng.pick(pool), nm[0], nm[1], col);
        ns.hp = 55; ns.thirst = 60; ns.hunger = 55; ns.energy = 40; ns.morale = 50;
        st.survivors.push(ns);
        G.log('log.newSurvivor', { name: ns.name }, 'good');
        G.story('story.newSurvivor', { name: ns.name, day: st.day });
        return ns;
      },
      endDemo: () => G.endDemo()
    };
  }
};
