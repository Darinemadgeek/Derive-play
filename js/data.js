/* DÉRIVE — données de jeu : archétypes, traits, objets, recettes, météo, difficultés, kits, événements, déblocages.
   Tous les textes sont des clés i18n (voir js/lang/*.js). Les fonctions reçoivent `g`, l'API de partie (voir game.js). */
'use strict';

const DATA = {};

DATA.names = [
  ['Mara', 'f'], ['Tomas', 'm'], ['Aiko', 'f'], ['Yusuf', 'm'], ['Elena', 'f'], ['Kwame', 'm'], ['Ingrid', 'f'], ['Rafael', 'm'],
  ['Nadia', 'f'], ['Lucas', 'm'], ['Priya', 'f'], ['Jonas', 'm'], ['Sofia', 'f'], ['Emeka', 'm'], ['Lena', 'f'], ['Diego', 'm'],
  ['Hana', 'f'], ['Karim', 'm'], ['Zoe', 'f'], ['Mateo', 'm'], ['Anya', 'f'], ['Bilal', 'm'], ['Nora', 'f'], ['Léo', 'm'],
  ['Sana', 'f'], ['Viktor', 'm'], ['Ines', 'f'], ['Oscar', 'm'], ['Mei', 'f'], ['Arun', 'm'],
  ['Maz', 'm'], ['Fafa', 'm'], ['Proff', 'm']
];

DATA.colors = [[232, 114, 42], [76, 175, 125], [78, 166, 220], [201, 139, 220], [224, 168, 58], [200, 69, 45], [120, 200, 200], [180, 180, 90]];
DATA.skins = [[244, 208, 176], [222, 184, 135], [198, 134, 66], [141, 85, 36], [90, 56, 30]];
DATA.hairs = [[30, 22, 18], [90, 60, 30], [170, 120, 60], [210, 190, 150], [120, 120, 120], [60, 30, 20]];

// Compétences : fish (pêche), med (médecine), sea (marine), str (force), mind (esprit). 0–3.
DATA.archetypes = {
  sailor:   { skills: { fish: 1, med: 0, sea: 3, str: 2, mind: 1 }, base: true },
  doctor:   { skills: { fish: 0, med: 3, sea: 0, str: 1, mind: 2 }, base: true },
  fisher:   { skills: { fish: 3, med: 0, sea: 2, str: 2, mind: 0 }, base: true },
  mechanic: { skills: { fish: 0, med: 1, sea: 2, str: 2, mind: 1 }, base: true },
  student:  { skills: { fish: 1, med: 1, sea: 0, str: 1, mind: 2 }, base: true },
  cook:     { skills: { fish: 2, med: 1, sea: 0, str: 1, mind: 1 }, base: true },
  retiree:  { skills: { fish: 1, med: 1, sea: 1, str: 0, mind: 3 }, unlock: 'retiree' },
  soldier:  { skills: { fish: 0, med: 2, sea: 1, str: 3, mind: 1 }, unlock: 'soldier' },
  musician: { skills: { fish: 0, med: 0, sea: 0, str: 1, mind: 3 }, unlock: 'musician', gives: { harmonica: 1 } },
  diver:    { skills: { fish: 2, med: 0, sea: 2, str: 3, mind: 0 }, unlock: 'diver' },
  child:    { skills: { fish: 0, med: 0, sea: 0, str: 0, mind: 2 }, unlock: 'child', needs: 0.6 },
  priest:   { skills: { fish: 0, med: 1, sea: 0, str: 1, mind: 3 }, unlock: 'priest' }
};

DATA.traits = ['optimist', 'seasick', 'tough', 'selfish', 'believer', 'insomniac', 'stoic', 'glutton', 'careful', 'leader'];

DATA.conditions = ['sunburn', 'wounded', 'fever', 'infected', 'hypothermia', 'seasick', 'sting'];

// Objets : catégorie et valeur d'affichage (count = quantité, dur = durabilité 0–100, flag = présent/absent, beacon = 0/1/2)
DATA.items = {
  line: 'dur', hooks: 'count', spear: 'flag', knife: 'flag', tarp: 'count', bucket: 'count', still: 'flag', catcher: 'flag',
  patch: 'count', flares: 'count', flaregun: 'flag', mirror: 'flag', whistle: 'flag', medkit: 'count', bandage: 'count',
  rope: 'count', paddles: 'count', anchor: 'flag', beacon: 'beacon', compass: 'flag', notebook: 'flag', harmonica: 'flag',
  cans: 'count', plastic: 'count', wire: 'count', wood: 'count', sail: 'flag'
};

DATA.recipes = [
  { id: 'catcher', need: { tarp: 1, rope: 1 }, keep: {}, gives: { catcher: 1 }, once: 'catcher' },
  { id: 'still', need: { bucket: 1, plastic: 1 }, keep: {}, gives: { still: 1 }, once: 'still' },
  { id: 'spear', need: { wood: 1 }, keep: { knife: 1, rope: 1 }, gives: { spear: 1 }, once: 'spear' },
  { id: 'hooks', need: { wire: 1 }, keep: {}, gives: { hooks: 3 } },
  { id: 'anchor', need: { bucket: 1, rope: 1 }, keep: {}, gives: { anchor: 1 }, once: 'anchor' },
  { id: 'sail', need: { tarp: 1, rope: 1, wood: 1 }, keep: {}, gives: { sail: 1 }, once: 'sail' },
  { id: 'beacon', need: {}, keep: {}, gives: {}, beacon: true }
];

DATA.actions = ['fish', 'watch', 'repair', 'water', 'craft', 'treat', 'paddle', 'rest', 'cheer'];
DATA.energyCost = { fish: 25, watch: 15, repair: 30, water: 15, craft: 25, treat: 20, paddle: 40, rest: -45, cheer: 15 };

DATA.weather = {
  ids: ['sun', 'cloud', 'rain', 'storm', 'fog', 'calm'],
  // transitions : depuis -> poids vers chaque météo (sun, cloud, rain, storm, fog, calm)
  trans: {
    sun:   { sun: 45, cloud: 25, rain: 8, storm: 4, fog: 6, calm: 12 },
    cloud: { sun: 25, cloud: 35, rain: 22, storm: 8, fog: 6, calm: 4 },
    rain:  { sun: 15, cloud: 35, rain: 25, storm: 15, fog: 6, calm: 4 },
    storm: { sun: 10, cloud: 40, rain: 30, storm: 12, fog: 4, calm: 4 },
    fog:   { sun: 30, cloud: 30, rain: 10, storm: 4, fog: 18, calm: 8 },
    calm:  { sun: 45, cloud: 20, rain: 6, storm: 3, fog: 10, calm: 16 }
  },
  wind: { sun: [1, 2], cloud: [1, 2], rain: [1, 3], storm: [3, 3], fog: [0, 1], calm: [0, 0] }
};

DATA.difficulties = {
  calm: { water: 28, food: 10, flares: 4, patch: 3, medkit: 2, crew: 4, stormMul: 0.6, traffic: [0.08, 0.12], dist: [150, 220], drainMul: 0.85 },
  open: { water: 22, food: 8, flares: 3, patch: 2, medkit: 2, crew: 4, stormMul: 1.0, traffic: [0.05, 0.08], dist: [180, 260], drainMul: 1.0 },
  dead: { water: 16, food: 5, flares: 2, patch: 1, medkit: 1, crew: 3, stormMul: 1.5, traffic: [0.03, 0.06], dist: [220, 300], drainMul: 1.15 }
};

DATA.kits = {
  standard: { items: {} },
  fisher: { unlock: 'kit_fisher', items: { hooks: 4, spear: 1, wire: 1 } },
  medic: { unlock: 'kit_medic', items: { medkit: 2, bandage: 3 } },
  signal: { unlock: 'kit_signal', items: { flares: 3, whistle: 1, beacon: 1 } }
};

DATA.unlocks = ['retiree', 'soldier', 'musician', 'diver', 'child', 'priest', 'kit_fisher', 'kit_medic', 'kit_signal'];

// Causes de décès (clés de texte)
DATA.deathCauses = ['thirst', 'hunger', 'wounds', 'fever', 'drowned', 'cold', 'lost', 'shark', 'sunk'];

// ------------------------------------------------------------------
// ÉVÉNEMENTS
// phase : 'day' (après les actions), 'night' (après le rationnement), 'any'
// weight(g) : poids relatif (0 = impossible aujourd'hui). setup(g) : contexte {name,...}. choices[].run(g, ctx) : renvoie l'id de résultat
// ------------------------------------------------------------------
DATA.events = [
  // --- Débris et trouvailles ---
  {
    id: 'debris_container', phase: 'day',
    weight: g => g.watchers() > 0 ? 6 : 3,
    setup: g => ({ name: g.pickAlive(s => s.energy > 20).name }),
    choices: [
      { id: 'swim', avail: g => !!g.pickAlive(s => s.energy > 20), run: (g, c) => {
          const s = g.byName(c.name); g.energy(s, -20);
          if (g.check(s, 'str', 0.45)) { g.loot(['cans', 'cans', 'plastic', 'rope', 'wire', 'wood', 'tarp'], 3); return 'ok'; }
          if (g.rng.chance(0.3)) { g.addCond(s, 'wounded'); g.log('log.wounded', { name: s.name }, 'bad'); return 'hurt'; }
          return 'fail';
        } },
      { id: 'paddle', avail: g => g.has('paddles'), run: g => { g.aliveList().forEach(s => g.energy(s, -12)); g.loot(['cans', 'plastic', 'wood', 'wire'], 2); return 'paddled'; } },
      { id: 'ignore', run: g => { g.morale(null, -3); return 'ignored'; } }
    ]
  },
  {
    id: 'debris_bottle', phase: 'day', weight: g => 3,
    choices: [
      { id: 'open', run: g => { if (g.rng.chance(0.5)) { g.water(2); return 'water'; } g.morale(null, 6); g.unlockEvent('bottle'); return 'message'; } },
      { id: 'skip', run: g => 'skip' }
    ]
  },
  {
    id: 'oil_slick', phase: 'day', weight: g => 2,
    choices: [
      { id: 'search', run: g => { g.aliveList().forEach(s => g.energy(s, -10)); g.loot(['plastic', 'wood', 'cans', 'wire', 'rope', 'bucket'], 3); if (g.rng.chance(0.25)) { const s = g.pickAlive(); g.addCond(s, 'sting'); return 'sting'; } return 'found'; } },
      { id: 'avoid', run: g => 'avoid' }
    ]
  },
  {
    id: 'wreckage_body', phase: 'day', weight: g => g.day() > 3 ? 2 : 0, once: true,
    choices: [
      { id: 'take', run: g => { g.loot(['flares', 'whistle', 'mirror', 'cans', 'medkit'], 2); g.aliveList().forEach(s => { if (s.trait === 'believer') g.morale(s, -8); }); g.morale(null, -4); return 'took'; } },
      { id: 'leave', run: g => { g.aliveList().forEach(s => { if (s.trait === 'believer') g.morale(s, 6); }); return 'left'; } }
    ]
  },
  {
    id: 'another_raft', phase: 'day', weight: g => g.day() > 4 ? 2 : 0, once: true,
    choices: [
      { id: 'board', run: g => {
          g.aliveList().forEach(s => g.energy(s, -10));
          if (g.aliveList().length < 5 && g.rng.chance(0.5)) { const ns = g.addSurvivor(); g.loot(['cans', 'patch', 'bucket'], 2); return { r: 'survivor', p: { name2: ns.name } }; }
          g.raft(12); g.loot(['patch', 'patch', 'cans', 'rope', 'tarp', 'paddles'], 3); return 'salvage';
        } },
      { id: 'leave', run: g => 'leave' }
    ]
  },
  {
    id: 'fishing_net', phase: 'day', weight: g => 2,
    choices: [
      { id: 'cut', avail: g => g.has('knife'), run: g => { const s = g.pickAlive(); g.energy(s, -15); g.add('rope', 2); g.add('hooks', 1); if (g.rng.chance(0.2)) { g.addCond(s, 'wounded'); return { r: 'tangled', p: { name: s.name } }; } return 'cut'; } },
      { id: 'pull', run: g => { const s = g.pickAlive(); g.energy(s, -20); if (g.check(s, 'str', 0.5)) { g.add('rope', 1); g.food(1); return 'pulled'; } return 'lost'; } },
      { id: 'leave', run: g => 'leave' }
    ]
  },
  {
    id: 'beacon_found', phase: 'day', weight: g => (g.day() > 6 && g.item('beacon') === 0 && g.watchers() > 0) ? 1.2 : 0, once: true,
    choices: [ { id: 'take', run: g => { g.setItem('beacon', 1); return 'took'; } } ]
  },
  // --- Faune ---
  {
    id: 'turtle', phase: 'day', weight: g => 3,
    choices: [
      { id: 'kill', avail: g => g.has('knife'), run: g => { g.food(3); g.water(2); g.aliveList().forEach(s => { if (s.trait === 'believer' || s.arch === 'child') g.morale(s, -6); }); return 'killed'; } },
      { id: 'free', run: g => { g.morale(null, 3); return 'freed'; } },
      { id: 'follow', avail: g => g.has('paddles'), run: g => { const s = g.pickAlive(); g.energy(s, -20); g.dist(-6); return 'followed'; } }
    ]
  },
  { id: 'dolphins', phase: 'day', weight: g => 2, fx: 'dolphins', choices: [ { id: 'ok', run: g => { g.morale(null, 8); if (g.rng.chance(0.4)) { g.dist(-4); return 'guided'; } return 'ok'; } } ] },
  {
    id: 'shark_circle', phase: 'day', weight: g => g.day() > 2 ? 4 : 0, fx: 'fin',
    choices: [
      { id: 'still', run: g => { if (g.rng.chance(0.35)) { g.raft(-10); return 'bump'; } g.morale(null, -4); return 'left'; } },
      { id: 'hit', avail: g => g.has('paddles'), run: g => { const s = g.pickAlive(s => s.energy > 20) || g.pickAlive(); g.energy(s, -20); if (g.check(s, 'str', 0.5)) { g.morale(null, 6); return { r: 'chased', p: { name: s.name } }; } g.add('paddles', -1); if (g.rng.chance(0.3)) { g.addCond(s, 'wounded'); return { r: 'bitten', p: { name: s.name } }; } return { r: 'paddlelost', p: { name: s.name } }; } },
      { id: 'bait', avail: g => g.food(0) >= 1, run: g => { g.food(-1); return 'baited'; } }
    ]
  },
  {
    id: 'shark_night', phase: 'night', weight: g => g.day() > 3 ? 3 : 0, fx: 'fin',
    choices: [ { id: 'ok', run: g => { const dmg = g.has('anchor') ? 6 : 14; g.raft(-dmg); g.morale(null, -6); return g.has('anchor') ? 'anchor' : 'bumped'; } } ]
  },
  { id: 'flying_fish', phase: 'night', weight: g => 3, choices: [ { id: 'ok', run: g => { g.food(2); g.morale(null, 3); return 'ok'; } } ] },
  {
    id: 'bird_catch', phase: 'day', weight: g => 2,
    choices: [
      { id: 'grab', run: g => { const s = g.pickAlive(); if (g.check(s, 'str', 0.55)) { g.food(1); return { r: 'caught', p: { name: s.name } }; } return { r: 'missed', p: { name: s.name } }; } },
      { id: 'watch', run: g => { g.morale(null, 3); if (g.landDist() < 60) { g.setFlag('birdsHint', true); return 'hint'; } return 'flew'; } }
    ]
  },
  { id: 'jellyfish', phase: 'day', weight: g => 2, setup: g => ({ name: g.pickAlive().name }),
    choices: [
      { id: 'medkit', avail: g => g.item('medkit') > 0, run: (g, c) => { g.add('medkit', -1); g.log('log.usedMedkit', { name: c.name }, 'info'); return 'treated'; } },
      { id: 'endure', run: (g, c) => { g.addCond(g.byName(c.name), 'sting'); return 'endured'; } }
    ]
  },
  { id: 'whale', phase: 'day', weight: g => 1.5, fx: 'whale', choices: [ { id: 'ok', run: g => { g.morale(null, 10); if (g.rng.chance(0.3)) { g.raft(-8); return 'wave'; } return 'ok'; } } ] },
  { id: 'phosphorescence', phase: 'night', weight: g => g.weather() === 'calm' || g.weather() === 'sun' ? 2 : 0.5, choices: [ { id: 'ok', run: g => { g.morale(null, 6); return 'ok'; } } ] },
  // --- Météo ---
  {
    id: 'rain_squall', phase: 'day', weight: g => (g.weather() === 'cloud' || g.weather() === 'rain') ? 4 : 0,
    choices: [
      { id: 'collect', run: g => { const units = (g.item('bucket') ? 3 : 0) + (g.has('catcher') ? 4 : 0) + (g.item('tarp') ? 2 : 0) + 1; g.water(units); g.aliveList().forEach(s => g.energy(s, -8)); if (g.rng.chance(0.2)) { const s = g.pickAlive(); g.addCond(s, 'hypothermia'); return { r: 'cold', p: { n: units, name: s.name } }; } return { r: 'collected', p: { n: units } }; } },
      { id: 'shelter', run: g => { g.water(g.has('catcher') ? 3 : 1); g.morale(null, 2); return 'sheltered'; } }
    ]
  },
  {
    id: 'storm_warning', phase: 'day', weight: g => g.forecast() === 'storm' ? 6 : 0,
    choices: [
      { id: 'lash', run: g => { g.aliveList().forEach(s => g.energy(s, -10)); g.setFlag('lashed', true); return 'lashed'; } },
      { id: 'anchor', avail: g => g.has('anchor'), run: g => { g.setFlag('lashed', true); g.setFlag('anchored', true); return 'anchored'; } },
      { id: 'nothing', run: g => 'nothing' }
    ]
  },
  {
    id: 'storm', phase: 'day', weight: g => g.weather() === 'storm' ? 12 : 0,
    choices: [
      { id: 'bail', run: g => { g.aliveList().forEach(s => g.energy(s, -25)); g.raft(10); return 'bailed'; } },
      { id: 'hold', run: g => { const s = g.pickAlive(); if (g.flag('lashed') || g.check(s, 'str', 0.4)) { return 'held'; } g.queueEvent('man_overboard', { name: s.name }); return { r: 'overboard', p: { name: s.name } }; } },
      { id: 'pray', run: g => { g.aliveList().forEach(s => { if (s.trait === 'believer' || s.arch === 'priest') g.morale(s, 10); else g.morale(s, 2); }); g.raft(-5); return 'prayed'; } }
    ]
  },
  {
    id: 'man_overboard', phase: 'day', weight: g => 0, // déclenché uniquement par la tempête
    choices: [
      { id: 'rope', avail: g => g.item('rope') > 0, run: (g, c) => { g.log('log.savedRope', { name: c.name }, 'good'); g.morale(null, 4); g.addCond(g.byName(c.name), 'hypothermia'); return 'roped'; } },
      { id: 'dive', run: (g, c) => { const h = g.pickAlive(s => s.name !== c.name && s.energy > 15) || g.pickAlive(s => s.name !== c.name); if (!h) { g.kill(g.byName(c.name), 'drowned'); return 'lost'; } g.energy(h, -30); if (g.check(h, 'str', 0.55)) { g.addCond(g.byName(c.name), 'hypothermia'); return { r: 'saved', p: { name2: h.name } }; } g.kill(g.byName(c.name), 'drowned'); return { r: 'lost2', p: { name2: h.name } }; } },
      { id: 'shout', run: (g, c) => { if (g.rng.chance(0.35)) { g.addCond(g.byName(c.name), 'hypothermia'); return 'climbed'; } g.kill(g.byName(c.name), 'drowned'); return 'lost'; } }
    ]
  },
  {
    id: 'heat_wave', phase: 'day', weight: g => (g.weather() === 'sun' || g.weather() === 'calm') && g.temp() === 'hot' ? 5 : 0,
    choices: [
      { id: 'dip', run: g => { g.aliveList().forEach(s => { s.thirst = Math.max(0, s.thirst - 4); g.morale(s, 3); }); if (g.rng.chance(0.12)) { const s = g.pickAlive(); g.addCond(s, 'wounded'); g.setFx('fin'); return { r: 'shark', p: { name: s.name } }; } return 'dipped'; } },
      { id: 'canopy', run: g => { if (g.hasCanopy()) { return 'shade'; } g.aliveList().forEach(s => { s.thirst += 5; }); return 'noshade'; } },
      { id: 'wet', avail: g => g.item('bucket') > 0, run: g => { g.aliveList().forEach(s => { s.thirst = Math.max(0, s.thirst - 3); }); return 'wet'; } }
    ]
  },
  {
    id: 'cold_night', phase: 'night', weight: g => (g.weather() === 'rain' || g.weather() === 'storm' || g.temp() === 'cold') ? 4 : 0,
    choices: [
      { id: 'huddle', run: g => { g.morale(null, 3); if (g.rng.chance(0.25)) { const s = g.pickAlive(); g.addCond(s, 'hypothermia'); return { r: 'cold', p: { name: s.name } }; } return 'huddled'; } },
      { id: 'tarp', avail: g => g.item('tarp') > 0, run: g => 'tarp' },
      { id: 'nothing', run: g => { const s = g.pickAlive(); g.addCond(s, 'hypothermia'); return { r: 'cold', p: { name: s.name } }; } }
    ]
  },
  {
    id: 'dead_calm', phase: 'day', weight: g => g.weather() === 'calm' ? 3 : 0,
    choices: [
      { id: 'row', avail: g => g.has('paddles'), run: g => { let n = 0; g.aliveList().forEach(s => { if (s.energy > 30) { g.energy(s, -25); n++; } }); g.dist(-4 * Math.min(2, n)); return { r: 'rowed', p: { n: n } }; } },
      { id: 'wait', run: g => { g.morale(null, -4); return 'waited'; } }
    ]
  },
  {
    id: 'fog_horn', phase: 'day', weight: g => g.weather() === 'fog' ? 5 : 0,
    choices: [
      { id: 'whistle', avail: g => g.has('whistle'), run: g => { if (g.rng.chance(0.3)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -5); return 'faded'; } },
      { id: 'shout', run: g => { g.aliveList().forEach(s => g.energy(s, -8)); if (g.rng.chance(0.1)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -6); return 'faded'; } },
      { id: 'flare', avail: g => g.item('flares') > 0, run: g => { g.add('flares', -1); if (g.rng.chance(0.2)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -6); return 'fadedflare'; } }
    ]
  },
  { id: 'sunrise', phase: 'day', weight: g => g.weather() === 'sun' && g.prevWeather() === 'storm' ? 6 : 0.6, choices: [ { id: 'ok', run: g => { g.morale(null, 5); return 'ok'; } } ] },
  // --- Radeau ---
  {
    id: 'raft_leak', phase: 'day', weight: g => g.raftHp() < 45 ? 6 : 1.5,
    choices: [
      { id: 'patch', avail: g => g.item('patch') > 0, run: g => { g.add('patch', -1); g.raft(18); return 'patched'; } },
      { id: 'tarp', avail: g => g.item('tarp') > 0, run: g => { g.add('tarp', -1); g.raft(10); return 'tarped'; } },
      { id: 'bail', run: g => { g.aliveList().forEach(s => g.energy(s, -15)); g.raft(-6); return 'bailed'; } }
    ]
  },
  {
    id: 'canopy_tear', phase: 'day', weight: g => (g.weather() === 'storm' && g.hasCanopy()) ? 5 : 0, once: true,
    choices: [
      { id: 'fix', avail: g => g.item('tarp') > 0 || g.item('rope') > 0, run: g => { if (g.item('rope') > 0) g.add('rope', -1); else g.add('tarp', -1); return 'fixed'; } },
      { id: 'lose', run: g => { g.setCanopy(false); g.morale(null, -5); return 'lost'; } }
    ]
  },
  {
    id: 'valve_hiss', phase: 'night', weight: g => 2,
    choices: [
      { id: 'pump', run: g => { const s = g.pickAlive(s => s.energy > 20) || g.pickAlive(); g.energy(s, -20); g.raft(6); return { r: 'pumped', p: { name: s.name } }; } },
      { id: 'patch', avail: g => g.item('patch') > 0, run: g => { g.add('patch', -1); g.raft(14); return 'patched'; } },
      { id: 'sleep', run: g => { g.raft(-10); return 'slept'; } }
    ]
  },
  // --- Santé ---
  {
    id: 'sunburn', phase: 'day', weight: g => (g.weather() === 'sun' && !g.hasCanopy()) ? 4 : (g.weather() === 'sun' ? 1 : 0),
    setup: g => ({ name: g.pickAlive(s => s.cond.indexOf('sunburn') < 0).name }),
    cond: g => !!g.pickAlive(s => s.cond.indexOf('sunburn') < 0),
    choices: [
      { id: 'cover', avail: g => g.item('tarp') > 0, run: (g, c) => 'covered' },
      { id: 'ignore', run: (g, c) => { g.addCond(g.byName(c.name), 'sunburn'); return 'burned'; } }
    ]
  },
  {
    id: 'fever', phase: 'day', weight: g => g.day() > 3 ? 2.5 : 0,
    setup: g => ({ name: g.pickAlive(s => s.cond.indexOf('fever') < 0).name }),
    cond: g => !!g.pickAlive(s => s.cond.indexOf('fever') < 0),
    choices: [
      { id: 'medkit', avail: g => g.item('medkit') > 0, run: (g, c) => { g.add('medkit', -1); g.heal(g.byName(c.name), 5); return 'treated'; } },
      { id: 'rest', run: (g, c) => { const s = g.byName(c.name); s.action = 'rest'; if (g.rng.chance(0.5)) return 'rested'; g.addCond(s, 'fever'); return 'worse'; } },
      { id: 'ignore', run: (g, c) => { g.addCond(g.byName(c.name), 'fever'); return 'worse'; } }
    ]
  },
  {
    id: 'hook_wound', phase: 'day', weight: g => g.anyAction('fish') ? 3 : 0,
    setup: g => ({ name: g.pickAlive(s => s.action === 'fish').name }),
    choices: [
      { id: 'cut', avail: g => g.has('knife'), run: (g, c) => { const s = g.byName(c.name); g.hurt(s, 6); if (g.item('bandage') > 0) { g.add('bandage', -1); return 'bandaged'; } if (g.rng.chance(0.3)) g.addCond(s, 'wounded'); return 'cut'; } },
      { id: 'pull', run: (g, c) => { const s = g.byName(c.name); g.hurt(s, 12); g.addCond(s, 'wounded'); return 'pulled'; } }
    ]
  },
  {
    id: 'seasick', phase: 'day', weight: g => g.seaState() >= 2 ? 3 : 0,
    setup: g => ({ name: g.pickAlive(s => s.cond.indexOf('seasick') < 0).name }),
    cond: g => !!g.pickAlive(s => s.cond.indexOf('seasick') < 0),
    choices: [
      { id: 'horizon', run: (g, c) => { const s = g.byName(c.name); if (g.rng.chance(0.5)) return 'better'; g.addCond(s, 'seasick'); return 'sick'; } },
      { id: 'water', avail: g => g.waterUnits() >= 1, run: (g, c) => { g.water(-1); return 'better'; } }
    ]
  },
  {
    id: 'food_spoiled', phase: 'day', weight: g => (g.weather() === 'sun' && g.food(0) >= 3) ? 2.5 : 0,
    choices: [
      { id: 'eat', run: g => { g.aliveList().forEach(s => { s.hunger = Math.max(0, s.hunger - 10); }); if (g.rng.chance(0.4)) { const s = g.pickAlive(); g.addCond(s, 'fever'); return { r: 'sick', p: { name: s.name } }; } return 'ate'; } },
      { id: 'throw', run: g => { g.food(-2); return 'threw'; } }
    ]
  },
  // --- Groupe ---
  {
    id: 'argument', phase: 'day', weight: g => g.aliveList().length >= 2 && g.avgMorale() < 60 ? 4 : 1,
    setup: g => { const a = g.pickAlive(); const b = g.pickAlive(s => s !== a); return { name: a.name, name2: b.name }; },
    cond: g => g.aliveList().length >= 2,
    choices: [
      { id: 'side1', run: (g, c) => { g.morale(g.byName(c.name), 6); g.morale(g.byName(c.name2), -8); return 'side1'; } },
      { id: 'side2', run: (g, c) => { g.morale(g.byName(c.name2), 6); g.morale(g.byName(c.name), -8); return 'side2'; } },
      { id: 'mediate', run: (g, c) => { const m = g.bestSkill('mind'); if (g.check(m, 'mind', 0.45)) { g.morale(null, 4); return { r: 'mediated', p: { name3: m.name } }; } g.morale(null, -4); return 'failed'; } }
    ]
  },
  {
    id: 'theft', phase: 'night', weight: g => g.aliveList().some(s => s.trait === 'selfish') && g.waterUnits() >= 2 ? 4 : 0.7,
    setup: g => ({ name: (g.pickAlive(s => s.trait === 'selfish') || g.pickAlive()).name }),
    choices: [
      { id: 'confront', run: (g, c) => { const s = g.byName(c.name); g.water(-1); g.morale(s, -10); g.aliveList().forEach(o => { if (o !== s) g.morale(o, 2); }); return 'confronted'; } },
      { id: 'forgive', run: (g, c) => { g.water(-2); g.morale(g.byName(c.name), 4); g.aliveList().forEach(o => { if (o.name !== c.name) g.morale(o, -4); }); return 'forgave'; } },
      { id: 'guard', run: (g, c) => { const s = g.byName(c.name); g.water(-1); s.thirst = Math.max(0, s.thirst - 6); g.setFlag('guarded', true); const w = g.pickAlive(o => o !== s); if (w) g.energy(w, -10); return 'guarded'; } }
    ]
  },
  {
    id: 'confession', phase: 'night', weight: g => 2, setup: g => ({ name: g.pickAlive().name }),
    choices: [ { id: 'listen', run: g => { g.morale(null, 5); return 'ok'; } }, { id: 'sleep', run: (g, c) => { g.morale(g.byName(c.name), -4); return 'slept'; } } ]
  },
  {
    id: 'birthday', phase: 'day', weight: g => 1.2, once: true, setup: g => ({ name: g.pickAlive().name }),
    choices: [
      { id: 'ration', avail: g => g.food(0) >= 1, run: (g, c) => { g.food(-1); g.morale(null, 6); g.morale(g.byName(c.name), 8); return 'celebrated'; } },
      { id: 'song', run: g => { g.morale(null, 4); return 'sang'; } },
      { id: 'nothing', run: (g, c) => { g.morale(g.byName(c.name), -6); return 'nothing'; } }
    ]
  },
  {
    id: 'despair', phase: 'day', weight: g => g.pickAlive(s => s.morale < 25) ? 6 : 0,
    setup: g => ({ name: g.pickAlive(s => s.morale < 25).name }),
    cond: g => !!g.pickAlive(s => s.morale < 25),
    choices: [
      { id: 'talk', run: (g, c) => { const s = g.byName(c.name); const m = g.bestSkill('mind', o => o !== s) || s; if (g.check(m, 'mind', 0.4)) { g.morale(s, 20); return { r: 'talked', p: { name3: m.name } }; } g.morale(s, 5); return 'halftalked'; } },
      { id: 'water', avail: g => g.waterUnits() >= 1, run: (g, c) => { g.water(-1); const s = g.byName(c.name); s.thirst = Math.max(0, s.thirst - 12); g.morale(s, 12); return 'water'; } },
      { id: 'leave', run: (g, c) => { const s = g.byName(c.name); if (g.rng.chance(0.35)) { g.kill(s, 'lost'); return 'gone'; } g.morale(s, -5); return 'left'; } }
    ]
  },
  {
    id: 'drink_seawater', phase: 'day', weight: g => g.pickAlive(s => s.thirst > 70 && s.morale < 40) ? 5 : 0,
    setup: g => ({ name: g.pickAlive(s => s.thirst > 70 && s.morale < 40).name }),
    cond: g => !!g.pickAlive(s => s.thirst > 70 && s.morale < 40),
    choices: [
      { id: 'stop', run: (g, c) => { const s = g.byName(c.name); if (g.rng.chance(0.7)) { g.morale(s, -4); return 'stopped'; } g.addCond(s, 'fever'); s.thirst += 10; return 'drank'; } },
      { id: 'share', avail: g => g.waterUnits() >= 1, run: (g, c) => { g.water(-1); const s = g.byName(c.name); s.thirst = Math.max(0, s.thirst - 12); g.morale(s, 8); return 'shared'; } }
    ]
  },
  { id: 'nightmare', phase: 'night', weight: g => 1.5, setup: g => ({ name: g.pickAlive().name }),
    choices: [ { id: 'comfort', run: (g, c) => { const s = g.byName(c.name); g.morale(s, 6); const o = g.pickAlive(x => x !== s); if (o) g.energy(o, -8); return 'comforted'; } }, { id: 'ignore', run: (g, c) => { g.morale(g.byName(c.name), -5); return 'ignored'; } } ]
  },
  { id: 'star_navigation', phase: 'night', weight: g => (g.weather() === 'sun' || g.weather() === 'calm') && g.bestSkillLevel('sea') >= 2 ? 3 : 0, once: true,
    setup: g => ({ name: g.bestSkill('sea').name }),
    choices: [ { id: 'ok', run: g => { g.setFlag('navKnown', true); g.setFlag('paddleBonus', 2); return 'ok'; } } ]
  },
  { id: 'harmonica', phase: 'night', weight: g => g.has('harmonica') ? 3 : 0, setup: g => ({ name: (g.pickAlive(s => s.arch === 'musician') || g.pickAlive()).name }),
    choices: [ { id: 'ok', run: g => { g.morale(null, 7); return 'ok'; } } ] },
  // --- Archétypes ---
  { id: 'child_question', phase: 'night', weight: g => g.pickAlive(s => s.arch === 'child') ? 2.5 : 0, once: true, setup: g => ({ name: g.pickAlive(s => s.arch === 'child').name }),
    choices: [ { id: 'honest', run: g => { g.morale(null, -3); g.aliveList().forEach(s => { if (s.trait === 'stoic') g.morale(s, 6); }); return 'honest'; } }, { id: 'hope', run: (g, c) => { g.morale(g.byName(c.name), 10); g.morale(null, 3); return 'hope'; } } ] },
  { id: 'priest_prayer', phase: 'night', weight: g => g.pickAlive(s => s.arch === 'priest') ? 2 : 0, setup: g => ({ name: g.pickAlive(s => s.arch === 'priest').name }),
    choices: [ { id: 'join', run: g => { g.aliveList().forEach(s => g.morale(s, s.trait === 'believer' ? 12 : 5)); return 'joined'; } }, { id: 'decline', run: g => { g.morale(null, 1); return 'declined'; } } ] },
  { id: 'diver_dive', phase: 'day', weight: g => g.pickAlive(s => s.arch === 'diver' && s.energy > 30) && g.raftHp() < 80 ? 3 : 0, setup: g => ({ name: g.pickAlive(s => s.arch === 'diver').name }),
    choices: [ { id: 'dive', run: (g, c) => { const s = g.byName(c.name); g.energy(s, -25); g.raft(15); if (g.rng.chance(0.15)) { g.addCond(s, 'wounded'); g.setFx('fin'); return 'shark'; } return 'fixed'; } }, { id: 'no', run: g => 'no' } ] },
  { id: 'cook_meal', phase: 'day', weight: g => g.pickAlive(s => s.arch === 'cook') && g.food(0) >= 3 ? 3 : 0, setup: g => ({ name: g.pickAlive(s => s.arch === 'cook').name }),
    choices: [ { id: 'feast', run: g => { g.food(-2); g.aliveList().forEach(s => { s.hunger = Math.max(0, s.hunger - 15); g.morale(s, 8); }); return 'feast'; } }, { id: 'save', run: g => 'saved' } ] },
  { id: 'soldier_discipline', phase: 'day', weight: g => g.pickAlive(s => s.arch === 'soldier') && g.avgMorale() < 55 ? 2.5 : 0, once: true, setup: g => ({ name: g.pickAlive(s => s.arch === 'soldier').name }),
    choices: [ { id: 'accept', run: g => { g.setFlag('discipline', true); g.morale(null, -4); return 'accepted'; } }, { id: 'refuse', run: (g, c) => { g.morale(g.byName(c.name), -8); return 'refused'; } } ] },
  { id: 'mechanic_beacon', phase: 'day', weight: g => g.pickAlive(s => s.arch === 'mechanic') && g.item('beacon') === 1 ? 4 : 0, once: true, setup: g => ({ name: g.pickAlive(s => s.arch === 'mechanic').name }),
    choices: [ { id: 'ok', run: g => { g.setFlag('beaconProgress', Math.max(g.flag('beaconProgress') || 0, 1)); return 'ok'; } } ] },
  // --- Signaux et sauvetage ---
  {
    id: 'ship_sighting', phase: 'day', weight: g => 0, // déclenché par le tirage de trafic (game.js)
    fx: 'ship',
    choices: [
      { id: 'flare', avail: g => g.item('flares') > 0, run: g => { g.add('flares', -1); g.stat('signals'); if (g.rng.chance(0.65)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -12); g.stat('failedSignals'); return 'missed'; } },
      { id: 'mirror', avail: g => g.has('mirror') && (g.weather() === 'sun' || g.weather() === 'calm'), run: g => { g.stat('signals'); if (g.rng.chance(0.45)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -10); g.stat('failedSignals'); return 'missed'; } },
      { id: 'shout', run: g => { g.aliveList().forEach(s => g.energy(s, -10)); g.stat('signals'); if (g.rng.chance(0.08)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -12); g.stat('failedSignals'); return 'missed'; } },
      { id: 'save', run: g => { g.morale(null, -6); return 'saved'; } }
    ]
  },
  {
    id: 'ship_night', phase: 'night', weight: g => 0, fx: 'ship',
    choices: [
      { id: 'flare', avail: g => g.item('flares') > 0, run: g => { g.add('flares', -1); g.stat('signals'); if (g.rng.chance(0.8)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -12); g.stat('failedSignals'); return 'missed'; } },
      { id: 'whistle', avail: g => g.has('whistle'), run: g => { g.stat('signals'); if (g.rng.chance(0.15)) { g.rescue('ship'); return 'rescued'; } g.morale(null, -8); g.stat('failedSignals'); return 'missed'; } },
      { id: 'nothing', run: g => { g.morale(null, -6); return 'nothing'; } }
    ]
  },
  {
    id: 'plane_sighting', phase: 'day', weight: g => 0, fx: 'plane',
    choices: [
      { id: 'mirror', avail: g => g.has('mirror') && (g.weather() === 'sun' || g.weather() === 'calm' || g.weather() === 'cloud'), run: g => { g.stat('signals'); if (g.rng.chance(0.55)) { g.rescue('plane'); return 'rescued'; } g.morale(null, -8); g.stat('failedSignals'); return 'missed'; } },
      { id: 'flare', avail: g => g.item('flares') > 0, run: g => { g.add('flares', -1); g.stat('signals'); if (g.rng.chance(0.4)) { g.rescue('plane'); return 'rescued'; } g.morale(null, -8); g.stat('failedSignals'); return 'missed'; } },
      { id: 'wave', run: g => { g.stat('signals'); if (g.rng.chance(0.06)) { g.rescue('plane'); return 'rescued'; } g.morale(null, -8); g.stat('failedSignals'); return 'missed'; } }
    ]
  },
  { id: 'beacon_rescue', phase: 'day', weight: g => 0, fx: 'ship', choices: [ { id: 'ok', run: g => { g.rescue('beacon'); return 'ok'; } } ] },
  {
    id: 'landfall_sight', phase: 'day', weight: g => 0, // déclenché à < 12 km
    choices: [
      { id: 'row', avail: g => g.has('paddles'), run: g => { let n = 0; g.aliveList().forEach(s => { if (s.energy > 15) { g.energy(s, -30); n++; } }); g.dist(-6 * Math.min(2, n) - 2); return { r: 'rowed', p: { n: n } }; } },
      { id: 'drift', run: g => 'drift' }
    ]
  },
  { id: 'landfall', phase: 'day', weight: g => 0, choices: [ { id: 'ok', run: g => { g.rescue('land'); return 'ok'; } } ] },
  { id: 'demo_end', phase: 'day', weight: g => 0, fx: 'fin', choices: [ { id: 'ok', run: g => { g.endDemo(); return 'ok'; } } ] }
];

DATA.eventById = {};
DATA.events.forEach(e => { DATA.eventById[e.id] = e; });
