/* DÉRIVE — audio 100 % procédural (Web Audio API). Aucun fichier son.
   Ambiance : mer, vent, pluie. Effets : clics, tonnerre, mouettes, cloche. Musique : nappe générée. */
'use strict';

const Sound = {
  ctx: null,
  ready: false,
  enabled: true,
  vol: { master: 0.8, music: 0.5, ambient: 0.7, sfx: 0.8 },
  nodes: {},
  amb: { weather: 'sun', night: false, mood: 0.6 },
  musicOn: false,
  _musicTimer: null,
  _gullTimer: null,

  init: function () {
    if (this.ready) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      const c = this.ctx;
      const master = c.createGain(); master.gain.value = this.vol.master; master.connect(c.destination);
      const music = c.createGain(); music.gain.value = this.vol.music; music.connect(master);
      const ambient = c.createGain(); ambient.gain.value = this.vol.ambient; ambient.connect(master);
      const sfx = c.createGain(); sfx.gain.value = this.vol.sfx; sfx.connect(master);
      this.nodes = { master: master, music: music, ambient: ambient, sfx: sfx };
      this._buildNoise();
      this._buildReverb();
      this._buildAmbience();
      this.ready = true;
      this._applyAmbience(true);
      if (c.state === 'suspended') c.resume();
      return true;
    } catch (e) {
      if (window.console) console.warn('Audio indisponible', e);
      return false;
    }
  },

  resume: function () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  setVolumes: function (v) {
    for (const k in v) if (v[k] !== undefined) this.vol[k] = Math.max(0, Math.min(1, v[k]));
    if (!this.ready) return;
    const n = this.nodes, t = this.ctx.currentTime;
    n.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    n.music.gain.setTargetAtTime(this.vol.music, t, 0.05);
    n.ambient.gain.setTargetAtTime(this.vol.ambient, t, 0.05);
    n.sfx.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  },

  // ---------- bruit de base ----------
  _buildNoise: function () {
    const c = this.ctx, len = c.sampleRate * 4;
    const white = c.createBuffer(1, len, c.sampleRate);
    const w = white.getChannelData(0);
    for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
    const brown = c.createBuffer(1, len, c.sampleRate);
    const b = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    this.buffers = { white: white, brown: brown };
  },

  _buildReverb: function () {
    const c = this.ctx, len = c.sampleRate * 2.5;
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    const conv = c.createConvolver(); conv.buffer = buf;
    const wet = c.createGain(); wet.gain.value = 0.35;
    conv.connect(wet); wet.connect(this.nodes.music);
    this.nodes.reverb = conv;
  },

  _loop: function (buffer) {
    const src = this.ctx.createBufferSource(); src.buffer = buffer; src.loop = true; src.start(); return src;
  },

  _buildAmbience: function () {
    const c = this.ctx, n = this.nodes;
    // Mer : bruit brun filtré, modulé lentement (houle)
    const sea = this._loop(this.buffers.brown);
    const seaLp = c.createBiquadFilter(); seaLp.type = 'lowpass'; seaLp.frequency.value = 400;
    const seaG = c.createGain(); seaG.gain.value = 0.5;
    const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
    const lfoG = c.createGain(); lfoG.gain.value = 0.22;
    lfo.connect(lfoG); lfoG.connect(seaG.gain); lfo.start();
    sea.connect(seaLp); seaLp.connect(seaG); seaG.connect(n.ambient);
    // Vent : bruit blanc passe-bande, rafales aléatoires
    const wind = this._loop(this.buffers.white);
    const windBp = c.createBiquadFilter(); windBp.type = 'bandpass'; windBp.frequency.value = 700; windBp.Q.value = 0.7;
    const windG = c.createGain(); windG.gain.value = 0.0;
    wind.connect(windBp); windBp.connect(windG); windG.connect(n.ambient);
    // Pluie : bruit blanc passe-haut
    const rain = this._loop(this.buffers.white);
    const rainHp = c.createBiquadFilter(); rainHp.type = 'highpass'; rainHp.frequency.value = 2500;
    const rainG = c.createGain(); rainG.gain.value = 0.0;
    rain.connect(rainHp); rainHp.connect(rainG); rainG.connect(n.ambient);
    n.seaG = seaG; n.seaLp = seaLp; n.windG = windG; n.windBp = windBp; n.rainG = rainG;
    const self = this;
    (function gust() {
      if (!self.ready) return;
      const base = self._windBase();
      const t = self.ctx.currentTime;
      windG.gain.setTargetAtTime(base * (0.6 + Math.random() * 0.8), t, 1.5);
      windBp.frequency.setTargetAtTime(500 + Math.random() * 600, t, 2);
      setTimeout(gust, 2500 + Math.random() * 4000);
    })();
    this._scheduleGulls();
  },

  _windBase: function () {
    const w = this.amb.weather;
    const base = { calm: 0.0, sun: 0.05, fog: 0.03, cloud: 0.09, rain: 0.14, storm: 0.32 }[w] || 0.05;
    return base * (this.amb.night ? 0.9 : 1);
  },

  setAmbience: function (a) {
    for (const k in a) if (a[k] !== undefined) this.amb[k] = a[k];
    if (this.ready) this._applyAmbience(false);
  },

  _applyAmbience: function (immediate) {
    const n = this.nodes, t = this.ctx.currentTime, tc = immediate ? 0.01 : 2.5;
    const w = this.amb.weather;
    const seaLevel = { calm: 0.25, sun: 0.42, fog: 0.3, cloud: 0.5, rain: 0.55, storm: 0.9 }[w] || 0.4;
    n.seaG.gain.setTargetAtTime(seaLevel, t, tc);
    n.seaLp.frequency.setTargetAtTime(w === 'storm' ? 900 : 380, t, tc);
    n.rainG.gain.setTargetAtTime(w === 'rain' ? 0.09 : (w === 'storm' ? 0.16 : 0), t, tc);
  },

  _scheduleGulls: function () {
    const self = this;
    clearTimeout(this._gullTimer);
    this._gullTimer = setTimeout(function () {
      if (self.ready && !self.amb.night && (self.amb.weather === 'sun' || self.amb.weather === 'cloud' || self.amb.weather === 'calm') && self.amb.gulls) {
        self.play('gull');
      }
      self._scheduleGulls();
    }, 6000 + Math.random() * 14000);
  },

  // ---------- effets ----------
  _tone: function (freq, type, dur, gain, dest, attack, release, detune) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq; if (detune) o.detune.value = detune;
    const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + (attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.nodes.sfx);
    o.start(t); o.stop(t + dur + (release || 0.05));
    return o;
  },

  play: function (name) {
    if (!this.ready || !this.enabled) return;
    const c = this.ctx, t = c.currentTime, sfx = this.nodes.sfx;
    switch (name) {
      case 'click': this._tone(880, 'sine', 0.06, 0.12); break;
      case 'confirm': this._tone(660, 'triangle', 0.12, 0.15); this._tone(990, 'triangle', 0.18, 0.12); break;
      case 'good': [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 'triangle', 0.35, 0.16), i * 90)); break;
      case 'bad': this._tone(220, 'sawtooth', 0.4, 0.12); this._tone(207, 'sawtooth', 0.5, 0.1); break;
      case 'death': [330, 262, 196].forEach((f, i) => setTimeout(() => this._tone(f, 'sine', 0.8, 0.18), i * 320)); break;
      case 'bell': this._tone(1320, 'sine', 1.2, 0.14); this._tone(1980, 'sine', 0.9, 0.06); break;
      case 'fanfare': [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 'triangle', 0.6, 0.16), i * 120)); break;
      case 'gull': {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(2200, t + 0.12); o.frequency.exponentialRampToValueAtTime(1300, t + 0.35);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g); g.connect(this.nodes.ambient); o.start(t); o.stop(t + 0.45);
        break;
      }
      case 'thunder': {
        const src = c.createBufferSource(); src.buffer = this.buffers.brown;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
        src.connect(lp); lp.connect(g); g.connect(sfx); src.start(t); src.stop(t + 3);
        break;
      }
      case 'splash': {
        const src = c.createBufferSource(); src.buffer = this.buffers.white;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.6;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        src.connect(bp); bp.connect(g); g.connect(sfx); src.start(t); src.stop(t + 0.7);
        break;
      }
      case 'page': {
        const src = c.createBufferSource(); src.buffer = this.buffers.white;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        src.connect(hp); hp.connect(g); g.connect(sfx); src.start(t); src.stop(t + 0.3);
        break;
      }
    }
  },

  // ---------- musique : nappe ambiante ----------
  startMusic: function () {
    if (!this.ready || this.musicOn) return;
    this.musicOn = true;
    this._chordIndex = 0;
    this._nextChord();
  },
  stopMusic: function () {
    this.musicOn = false;
    clearTimeout(this._musicTimer);
  },
  _nextChord: function () {
    if (!this.musicOn || !this.ready) return;
    // Progression modale (ré mineur / si bémol / fa / do), registre grave, tempo très lent.
    const chords = [[146.83, 174.61, 220.0], [116.54, 146.83, 174.61], [174.61, 220.0, 261.63], [130.81, 164.81, 196.0], [146.83, 174.61, 220.0], [110.0, 130.81, 164.81]];
    const chord = chords[this._chordIndex % chords.length];
    this._chordIndex++;
    const c = this.ctx, t = c.currentTime;
    const mood = this.amb.mood; // 0 = sombre, 1 = serein
    const dur = 7 + Math.random() * 3;
    const level = 0.045 + 0.02 * mood;
    const dest = this.nodes.reverb;
    chord.forEach((f, i) => {
      const detunes = [-6, 5, -3];
      const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o1.type = 'sawtooth'; o2.type = 'triangle';
      o1.frequency.value = f; o2.frequency.value = f * (this.amb.night ? 1 : 2);
      o1.detune.value = detunes[i]; o2.detune.value = -detunes[i];
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(220 + 300 * mood, t); lp.frequency.linearRampToValueAtTime(500 + 500 * mood, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(200, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dest); g.connect(this.nodes.music);
      o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    });
    // Note haute occasionnelle (sérénité)
    if (Math.random() < 0.35 + 0.3 * mood) {
      const f = chord[Math.floor(Math.random() * 3)] * 4;
      this._tone(f, 'sine', 3 + Math.random() * 2, 0.03 + 0.02 * mood, this.nodes.reverb, 1.2);
    }
    this._musicTimer = setTimeout(() => this._nextChord(), (dur - 2) * 1000);
  }
};
