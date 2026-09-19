/* DÉRIVE — amorçage. */
'use strict';

const App = {
  start: function () {
    Game.loadMeta();
    const settings = Game.meta.settings || {};
    const lang = (settings.lang && I18N.langs[settings.lang]) ? settings.lang : I18N.detect();
    I18N.setLang(lang);
    if (settings.vol) Sound.setVolumes(settings.vol);
    Scene.init(document.getElementById('scene'));
    UI.init();
    Game.onChange = function (reason) { UI.onChange(reason); };
    UI.showTitle();
    // L'audio ne peut démarrer qu'après un geste de l'utilisateur (règle des navigateurs).
    const kick = function () {
      if (Sound.init()) { Sound.resume(); Sound.startMusic(); }
      document.removeEventListener('pointerdown', kick); document.removeEventListener('keydown', kick);
    };
    document.addEventListener('pointerdown', kick);
    document.addEventListener('keydown', kick);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) Sound.resume(); });
    window.addEventListener('beforeunload', function () { if (Game.state && !Game.state.ended) Game.save(); });
    // Application installable (Android) et jeu hors connexion : uniquement quand le jeu est servi en https
    // (GitHub Pages, itch.io). Jamais en file:// ni dans Electron. « ?sw=1 » force l'activation pour un test local.
    if ('serviceWorker' in navigator && !UI.isDesktop && (location.protocol === 'https:' || /[?&]sw=1/.test(location.search))) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sans gravité : le jeu marche sans */ });
    }
    // Mode « capture » : index.html?shot=N ouvre directement une situation de jeu reproductible
    // (utilisé par make-store-images.bat pour produire les captures d'écran de la page Steam).
    const m = /[?&]shot=(\d+)/.exec(location.search) || /^#shot(\d+)$/.exec(location.hash);
    if (m) this.shot(parseInt(m[1], 10));
  },

  shot: function (n) {
    const presets = {
      1: { w: 'sun', day: 3, phase: 'plan', dist: 210 },
      2: { w: 'storm', day: 6, event: 'storm', dist: 170 },
      3: { w: 'cloud', day: 9, phase: 'rations', dist: 140 },
      4: { w: 'calm', day: 12, event: 'shark_night', night: true, dist: 90 },
      5: { w: 'sun', day: 17, event: 'ship_sighting', dist: 9 }
    };
    const p = presets[n] || presets[1];
    Game.newGame({ difficulty: 'open', kit: 'standard', seed: 4242 + n * 17 });
    const st = Game.state;
    st.day = p.day; Game.applyWeather(p.w); st.land.dist = p.dist; st.water = 11; st.food = 5.5; st.raft.hp = 72;
    st.survivors.forEach((s, i) => { s.thirst = 30 + i * 12; s.hunger = 25 + i * 9; s.energy = 80 - i * 15; s.morale = 70 - i * 10; s.hp = 95 - i * 8; });
    st.survivors[1].cond.push('sunburn');
    if (p.event) { st.queue = [p.event]; st.eventPhase = p.night ? 'night' : 'day'; st.phase = 'events'; Game.nextEvent(); }
    else if (p.phase === 'rations') { st.phase = 'rations'; }
    else { const acts = ['fish', 'watch', 'paddle', 'rest']; Game.alive().forEach((s, i) => { s.action = acts[i % acts.length]; }); }
    UI.showGame();
    Scene.setTimeNow(Scene.targetTime);
    UI.el.toast.classList.remove('show');
  },

  setLang: function (code) {
    I18N.setLang(code);
    Game.meta.settings.lang = I18N.current;
    Game.saveMeta();
    UI.refresh();
  },

  toggleFullscreen: function () {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch (e) { /* non supporté */ }
  }
};

document.addEventListener('DOMContentLoaded', function () { App.start(); });
