/* DÉRIVE — rendu procédural de la scène (Canvas 2D). Aucune image externe.
   Scene.set(view) reçoit l'état à afficher ; Scene.frame() dessine à chaque image. */
'use strict';

const Scene = {
  canvas: null, ctx: null,
  W: 960, H: 540, dpr: 1,
  view: {
    time: 0.35, weather: 'sun', sea: 1, wind: 1,
    raft: { hp: 100, canopy: true, sail: false },
    crew: [],
    fx: { fin: false, birds: false, ship: false, plane: false, island: 0, debris: false, fog: false, whale: false, dolphins: false },
    title: false
  },
  targetTime: 0.35, curTime: 0.35,
  t0: 0, last: 0, elapsed: 0,
  clouds: [], stars: [], rain: [], flashT: 0, fogA: 0,
  shipX: -0.2, planeX: -0.2, finX: 0.2, finDir: 1,
  running: false,

  // Prépare les particules (nuages, étoiles, pluie). Déterministe si une graine est fournie (outil de capsules).
  prepare: function (seed) {
    const r = new RNG(seed || 12345);
    this.clouds = []; this.stars = []; this.rain = [];
    for (let i = 0; i < 14; i++) this.clouds.push({ x: r.next() * 1.4 - 0.2, y: 0.05 + r.next() * 0.3, w: 0.12 + r.next() * 0.2, h: 0.02 + r.next() * 0.04, s: 0.4 + r.next() * 0.8, a: r.next() });
    for (let i = 0; i < 140; i++) this.stars.push({ x: r.next(), y: r.next() * 0.55, r: r.next() * 1.4 + 0.3, tw: r.next() * 6.28 });
    for (let i = 0; i < 260; i++) this.rain.push({ x: r.next(), y: r.next(), l: 0.02 + r.next() * 0.03, v: 0.9 + r.next() * 0.6 });
  },

  init: function (canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.prepare(randomSeed());
    this.running = true;
    const self = this;
    function loop(ts) { if (!self.running) return; self.frame(ts); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  },

  // La taille du canvas est décidée par la feuille de style (plein écran sur ordinateur, bandeau sur téléphone) : on la lit, on ne l'impose pas.
  resize: function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    this.canvas.width = Math.floor(w * dpr); this.canvas.height = Math.floor(h * dpr);
    this.W = w; this.H = h;
  },

  set: function (v) {
    for (const k in v) {
      if (k === 'raft' || k === 'fx') { for (const kk in v[k]) this.view[k][kk] = v[k][kk]; }
      else this.view[k] = v[k];
    }
    if (v.time !== undefined) this.targetTime = v.time;
  },
  setTimeNow: function (t) { this.targetTime = t; this.curTime = t; },
  flash: function () { this.flashT = 0.25; },

  // ---------- utilitaires ----------
  lerp: function (a, b, t) { return a + (b - a) * t; },
  mixColor: function (c1, c2, t) {
    return [Math.round(this.lerp(c1[0], c2[0], t)), Math.round(this.lerp(c1[1], c2[1], t)), Math.round(this.lerp(c1[2], c2[2], t))];
  },
  rgb: function (c, a) { return a === undefined ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; },

  // Palette du ciel selon l'heure (0 = minuit, 0.5 = midi) : [haut, horizon]
  skyColors: function (time, weather) {
    const keys = [
      [0.0, [6, 12, 26], [12, 26, 44]],
      [0.22, [18, 24, 52], [70, 50, 70]],
      [0.28, [60, 90, 140], [240, 150, 90]],
      [0.35, [90, 150, 210], [200, 220, 235]],
      [0.5, [70, 140, 215], [190, 220, 240]],
      [0.7, [80, 130, 200], [235, 190, 130]],
      [0.78, [40, 40, 90], [230, 110, 70]],
      [0.85, [14, 20, 50], [60, 40, 70]],
      [1.0, [6, 12, 26], [12, 26, 44]]
    ];
    let a = keys[0], b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) { if (time >= keys[i][0] && time <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; } }
    const f = (time - a[0]) / Math.max(0.0001, (b[0] - a[0]));
    let top = this.mixColor(a[1], b[1], f), hor = this.mixColor(a[2], b[2], f);
    const grey = { cloud: 0.35, rain: 0.6, storm: 0.85, fog: 0.55 }[weather] || 0;
    if (grey) {
      const g1 = [70, 80, 92], g2 = [120, 130, 140];
      top = this.mixColor(top, g1, grey); hor = this.mixColor(hor, g2, grey);
    }
    return { top: top, hor: hor };
  },
  daylight: function (time) {
    // 0 la nuit, 1 en plein jour
    if (time < 0.2 || time > 0.86) return 0;
    if (time < 0.32) return (time - 0.2) / 0.12;
    if (time > 0.74) return 1 - (time - 0.74) / 0.12;
    return 1;
  },

  frame: function (ts) {
    if (!this.last) this.last = ts;
    const dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts; this.elapsed += dt;
    // transition douce de l'heure
    let d = this.targetTime - this.curTime;
    if (d < -0.5) d += 1; if (d > 0.5) d -= 1;
    this.curTime = (this.curTime + d * Math.min(1, dt * 1.2) + 1) % 1;
    this.render(this.ctx, this.W, this.H, this.view, this.curTime, this.elapsed, dt);
  },

  // Rendu complet : réutilisé par l'outil de capsules (tools/capsule.html)
  render: function (ctx, W, H, v, time, el, dt) {
    const dpr = ctx === this.ctx ? this.dpr : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const weather = v.weather;
    const horizon = H * 0.56;
    const light = this.daylight(time);
    const stormy = weather === 'storm';
    const sea = v.sea || 0;

    // ---- ciel
    const sc = this.skyColors(time, weather);
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, this.rgb(sc.top)); g.addColorStop(1, this.rgb(sc.hor));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);

    // ---- étoiles
    if (light < 0.6 && weather !== 'storm' && weather !== 'rain' && weather !== 'fog') {
      const a = (1 - light / 0.6) * (weather === 'cloud' ? 0.4 : 1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * a) + ')';
      for (const s of this.stars) {
        const tw = 0.6 + 0.4 * Math.sin(el * 1.5 + s.tw);
        ctx.globalAlpha = a * tw; ctx.beginPath(); ctx.arc(s.x * W, s.y * horizon, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- soleil / lune
    const ang = (time - 0.25) * Math.PI * 2;
    const sunX = W * 0.5 + Math.sin((time - 0.25) / 0.5 * Math.PI) * W * 0.42;
    const sunY = horizon - Math.sin(Math.max(0, Math.min(Math.PI, (time - 0.25) / 0.5 * Math.PI))) * horizon * 0.85;
    if (time > 0.24 && time < 0.76 && weather !== 'storm' && weather !== 'fog') {
      const sunA = weather === 'rain' ? 0.25 : (weather === 'cloud' ? 0.6 : 1);
      const rad = 26 + (1 - Math.abs(time - 0.5) / 0.25) * 4;
      const glow = ctx.createRadialGradient(sunX, sunY, rad * 0.6, sunX, sunY, rad * 5);
      glow.addColorStop(0, 'rgba(255,240,200,' + (0.55 * sunA) + ')'); glow.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, rad * 5, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,225,' + sunA + ')'; ctx.beginPath(); ctx.arc(sunX, sunY, rad, 0, 6.283); ctx.fill();
    }
    if (light < 0.5 && weather !== 'storm' && weather !== 'fog') {
      const mt = (time + 0.5) % 1;
      const mx = W * 0.5 + Math.sin((mt - 0.25) / 0.5 * Math.PI) * W * 0.4;
      const my = horizon - Math.sin(Math.max(0, Math.min(Math.PI, (mt - 0.25) / 0.5 * Math.PI))) * horizon * 0.8;
      if (mt > 0.26 && mt < 0.74) {
        const ma = (1 - light / 0.5) * (weather === 'rain' ? 0.3 : 1);
        ctx.fillStyle = 'rgba(235,238,245,' + (0.9 * ma) + ')'; ctx.beginPath(); ctx.arc(mx, my, 18, 0, 6.283); ctx.fill();
        ctx.fillStyle = this.rgb(sc.top, 0.9 * ma); ctx.beginPath(); ctx.arc(mx - 8, my - 4, 15, 0, 6.283); ctx.fill();
      }
    }

    // ---- nuages
    const cloudDensity = { sun: 0.25, calm: 0.15, cloud: 0.8, rain: 1, storm: 1, fog: 0.5 }[weather] || 0.3;
    const cloudCol = this.mixColor([250, 250, 252], [60, 62, 70], { sun: 0, calm: 0, cloud: 0.35, rain: 0.6, storm: 0.85, fog: 0.4 }[weather] || 0);
    const cloudLit = this.mixColor(cloudCol, [20, 25, 40], 1 - light);
    const wind = (v.wind || 0);
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      if (c.a > cloudDensity) continue;
      c.x += dt * (0.004 + wind * 0.006) * c.s;
      if (c.x > 1.25) c.x = -0.25;
      const cx = c.x * W, cy = c.y * horizon, cw = c.w * W, ch = c.h * H * (stormy ? 1.6 : 1);
      ctx.fillStyle = this.rgb(cloudLit, 0.85);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, ch, 0, 0, 6.283);
      ctx.ellipse(cx - cw * 0.4, cy + ch * 0.3, cw * 0.5, ch * 0.8, 0, 0, 6.283);
      ctx.ellipse(cx + cw * 0.4, cy + ch * 0.35, cw * 0.55, ch * 0.75, 0, 0, 6.283);
      ctx.fill();
    }

    // ---- île à l'horizon
    if (v.fx.island > 0) {
      const k = Math.min(1, v.fx.island);
      const iw = W * (0.1 + 0.5 * k), ih = H * (0.02 + 0.13 * k);
      const ix = W * 0.72;
      const col = this.mixColor(this.mixColor(sc.hor, [40, 60, 50], 0.5 + 0.5 * k), [10, 18, 20], 1 - light);
      ctx.fillStyle = this.rgb(col);
      ctx.beginPath(); ctx.moveTo(ix - iw / 2, horizon + 1);
      ctx.quadraticCurveTo(ix - iw * 0.25, horizon - ih * 0.7, ix - iw * 0.05, horizon - ih);
      ctx.quadraticCurveTo(ix + iw * 0.2, horizon - ih * 1.1, ix + iw * 0.35, horizon - ih * 0.5);
      ctx.quadraticCurveTo(ix + iw * 0.45, horizon - ih * 0.2, ix + iw / 2, horizon + 1);
      ctx.fill();
    }

    // ---- navire / avion
    if (v.fx.ship) {
      this.shipX += dt * 0.012; if (this.shipX > 1.2) this.shipX = -0.2;
      const sx = this.shipX * W, sw = W * 0.09, sh = H * 0.035;
      const col = this.mixColor([50, 55, 65], [8, 10, 18], 1 - light);
      ctx.fillStyle = this.rgb(col);
      ctx.beginPath(); ctx.moveTo(sx - sw / 2, horizon); ctx.lineTo(sx + sw / 2, horizon); ctx.lineTo(sx + sw * 0.42, horizon - sh * 0.5); ctx.lineTo(sx - sw * 0.45, horizon - sh * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillRect(sx - sw * 0.15, horizon - sh * 1.2, sw * 0.28, sh * 0.7);
      ctx.fillRect(sx + sw * 0.05, horizon - sh * 1.6, sw * 0.06, sh * 0.5);
      if (light < 0.5) { ctx.fillStyle = 'rgba(255,230,150,' + (1 - light) + ')'; ctx.fillRect(sx - sw * 0.1, horizon - sh * 1.0, 3, 3); ctx.fillRect(sx + sw * 0.1, horizon - sh * 1.0, 3, 3); }
    } else this.shipX = -0.2;
    if (v.fx.plane) {
      this.planeX += dt * 0.06; if (this.planeX > 1.3) this.planeX = -0.3;
      const px = this.planeX * W, py = horizon * 0.25 + Math.sin(this.planeX * 4) * 6;
      ctx.fillStyle = this.rgb(this.mixColor([230, 230, 235], [40, 40, 50], 1 - light));
      ctx.beginPath(); ctx.moveTo(px - 16, py); ctx.lineTo(px + 16, py - 2); ctx.lineTo(px + 14, py + 2); ctx.closePath(); ctx.fill();
      ctx.fillRect(px - 4, py - 7, 3, 12); ctx.fillRect(px - 14, py - 4, 3, 5);
    } else this.planeX = -0.3;

    // ---- oiseaux
    if (v.fx.birds && light > 0.2) {
      ctx.strokeStyle = 'rgba(20,25,35,' + (0.7 * light) + ')'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const bx = ((el * 0.03 + i * 0.13) % 1.2 - 0.1) * W, by = horizon * (0.3 + 0.06 * Math.sin(el + i)) + i * 9;
        const fl = Math.sin(el * 6 + i) * 4;
        ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.quadraticCurveTo(bx - 3, by - 4 + fl, bx, by); ctx.quadraticCurveTo(bx + 3, by - 4 + fl, bx + 7, by); ctx.stroke();
      }
    }

    // ---- mer (3 couches)
    const seaBase = this.mixColor([28, 77, 107], [8, 22, 34], 1 - light);
    const seaGrey = { cloud: 0.25, rain: 0.45, storm: 0.55, fog: 0.4 }[weather] || 0;
    const seaCol = this.mixColor(seaBase, [60, 75, 85], seaGrey);
    const amp = [4 + sea * 3, 7 + sea * 6, 10 + sea * 10];
    const speeds = [0.6, 0.9, 1.3];
    const layerY = [horizon, horizon + H * 0.06, horizon + H * 0.16];
    const raftLayer = 1;
    let raftY = 0, raftTilt = 0;
    for (let L = 0; L < 3; L++) {
      const col = this.mixColor(seaCol, [207, 232, 243], L * 0.06 + (light * 0.08));
      const dark = this.mixColor(col, [5, 12, 20], 0.35);
      const grad = ctx.createLinearGradient(0, layerY[L] - amp[L], 0, H);
      grad.addColorStop(0, this.rgb(col)); grad.addColorStop(1, this.rgb(dark));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(0, H);
      const step = 12;
      for (let x = 0; x <= W + step; x += step) {
        const ph = x / W * 6.283;
        const y = layerY[L] + Math.sin(ph * 2.1 + el * speeds[L] * (1 + sea * 0.4)) * amp[L] + Math.sin(ph * 5.3 - el * speeds[L] * 0.7) * amp[L] * 0.35;
        ctx.lineTo(x, y);
        if (L === raftLayer && Math.abs(x - W * 0.5) < step) {
          const y2 = layerY[L] + Math.sin((x + 40) / W * 6.283 * 2.1 + el * speeds[L] * (1 + sea * 0.4)) * amp[L];
          raftY = y; raftTilt = Math.atan2(y2 - y, 40) * 0.6;
        }
      }
      ctx.lineTo(W + step, H); ctx.closePath(); ctx.fill();
      // écume
      if (sea >= 1 || L === 0) {
        ctx.strokeStyle = 'rgba(220,240,250,' + (0.12 + sea * 0.08) * (0.4 + light * 0.6) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x <= W + step; x += step) {
          const ph = x / W * 6.283;
          const y = layerY[L] + Math.sin(ph * 2.1 + el * speeds[L] * (1 + sea * 0.4)) * amp[L] + Math.sin(ph * 5.3 - el * speeds[L] * 0.7) * amp[L] * 0.35;
          if (x === 0) ctx.moveTo(x, y + 2); else ctx.lineTo(x, y + 2);
        }
        ctx.stroke();
      }
      if (L === raftLayer) this.drawRaft(ctx, W, H, v, W * 0.5, raftY, raftTilt, light, el);
      if (L === 1 && v.fx.fin) this.drawFin(ctx, W, H, layerY[2] - 6, light, el, dt);
      if (L === 0 && v.fx.whale) this.drawWhale(ctx, W, H, layerY[1] - 4, light, el);
      if (L === 0 && v.fx.dolphins) this.drawDolphins(ctx, W, H, layerY[1], light, el);
      if (L === 1 && v.fx.debris) this.drawDebris(ctx, W, layerY[2] + 8, light, el);
    }

    // ---- reflet du soleil / lune sur l'eau
    if (weather !== 'storm' && weather !== 'fog' && weather !== 'rain') {
      const rx = (time > 0.24 && time < 0.76) ? sunX : W * 0.5;
      const ra = (time > 0.24 && time < 0.76) ? 0.18 * light : 0.12 * (1 - light);
      const rg = ctx.createLinearGradient(0, horizon, 0, H);
      rg.addColorStop(0, 'rgba(255,245,210,' + ra + ')'); rg.addColorStop(1, 'rgba(255,245,210,0)');
      ctx.fillStyle = rg;
      for (let i = 0; i < 12; i++) {
        const yy = horizon + i * (H - horizon) / 12;
        const ww = 20 + i * 12 + Math.sin(el * 2 + i) * 10;
        ctx.fillRect(rx - ww / 2, yy + 2, ww, 3);
      }
    }

    // ---- pluie
    if (weather === 'rain' || stormy) {
      ctx.strokeStyle = 'rgba(200,220,235,' + (stormy ? 0.35 : 0.25) + ')'; ctx.lineWidth = 1;
      const slant = wind * 0.02;
      ctx.beginPath();
      for (const r of this.rain) {
        r.y += dt * r.v * (stormy ? 1.6 : 1); r.x += dt * slant * r.v;
        if (r.y > 1) { r.y = -0.05; r.x = Math.random(); }
        if (r.x > 1.05) r.x = -0.05;
        ctx.moveTo(r.x * W, r.y * H); ctx.lineTo(r.x * W + slant * 60, (r.y + r.l) * H);
      }
      ctx.stroke();
    }

    // ---- brume
    const fogTarget = weather === 'fog' ? 0.75 : 0;
    this.fogA += (fogTarget - this.fogA) * Math.min(1, dt * 0.8);
    if (this.fogA > 0.01) {
      ctx.fillStyle = 'rgba(190,200,210,' + this.fogA * (0.5 + light * 0.5) + ')';
      ctx.fillRect(0, 0, W, H);
      const fg = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 60);
      fg.addColorStop(0, 'rgba(215,222,228,0)'); fg.addColorStop(0.5, 'rgba(215,222,228,' + this.fogA * 0.5 + ')'); fg.addColorStop(1, 'rgba(215,222,228,0)');
      ctx.fillStyle = fg; ctx.fillRect(0, horizon - 40, W, 100);
    }

    // ---- éclair
    if (stormy && Math.random() < dt * 0.15) this.flashT = 0.2;
    if (this.flashT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, this.flashT * 4) + ')'; ctx.fillRect(0, 0, W, H);
      this.flashT -= dt;
    }

    // ---- vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.1);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  },

  drawRaft: function (ctx, W, H, v, cx, cy, tilt, light, el) {
    const r = v.raft;
    const scale = Math.max(0.8, Math.min(1.6, W / 960));
    const hpF = Math.max(0.2, (r.hp || 0) / 100);
    ctx.save(); ctx.translate(cx, cy - 6 * scale); ctx.rotate(tilt); ctx.scale(scale, scale);
    const shade = 1 - light * 0.55;
    const orange = this.mixColor([232, 114, 42], [40, 20, 8], 1 - light);
    const orangeD = this.mixColor(orange, [0, 0, 0], 0.35);
    const floor = this.mixColor([60, 60, 60], [8, 8, 12], 1 - light);
    // ombre sur l'eau
    ctx.fillStyle = 'rgba(0,10,20,0.35)'; ctx.beginPath(); ctx.ellipse(0, 14, 96, 14, 0, 0, 6.283); ctx.fill();
    // plancher
    ctx.fillStyle = this.rgb(floor); ctx.beginPath(); ctx.ellipse(0, 4, 76, 20, 0, 0, 6.283); ctx.fill();
    // survivants (assis, derrière le boudin avant)
    const crew = v.crew.filter(c => c.alive);
    const n = crew.length;
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * 30, py = -6 + Math.sin(el * 1.3 + i) * 1.5;
      this.drawFigure(ctx, px, py, crew[i], light, el, i);
    }
    // boudin (anneau)
    ctx.lineWidth = 22; ctx.strokeStyle = this.rgb(orangeD); ctx.beginPath(); ctx.ellipse(0, 2, 88, 26, 0, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 16; ctx.strokeStyle = this.rgb(orange); ctx.beginPath(); ctx.ellipse(0, 0, 88, 26, 0, 0, 6.283); ctx.stroke();
    // dégonflement visuel selon l'intégrité
    if (hpF < 0.7) {
      ctx.strokeStyle = 'rgba(0,0,0,' + (0.6 - hpF * 0.6) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-40, 10); ctx.lineTo(-20, 16); ctx.moveTo(30, 12); ctx.lineTo(55, 7); ctx.stroke();
    }
    // reflets
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.25 * light + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -5, 84, 22, 0, 3.4, 5.6); ctx.stroke();
    // auvent
    if (r.canopy) {
      const can = this.mixColor([233, 216, 166], [30, 28, 20], 1 - light);
      ctx.fillStyle = this.rgb(can, 0.92);
      ctx.beginPath(); ctx.moveTo(-70, -8); ctx.quadraticCurveTo(-40, -60, 10, -58); ctx.quadraticCurveTo(50, -56, 62, -10); ctx.lineTo(50, -6); ctx.quadraticCurveTo(40, -44, 8, -46); ctx.quadraticCurveTo(-30, -48, -58, -8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = this.rgb(this.mixColor(can, [0, 0, 0], 0.4)); ctx.lineWidth = 2; ctx.stroke();
    }
    // voile improvisée
    if (r.sail) {
      const can = this.mixColor([233, 216, 166], [30, 28, 20], 1 - light);
      ctx.strokeStyle = this.rgb(this.mixColor([90, 70, 50], [10, 8, 6], 1 - light)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-84, 0); ctx.lineTo(-84, -110); ctx.stroke();
      ctx.fillStyle = this.rgb(can, 0.9);
      const bil = 10 + Math.sin(el * 2) * 4;
      ctx.beginPath(); ctx.moveTo(-84, -106); ctx.quadraticCurveTo(-40 + bil, -80, -20, -30); ctx.lineTo(-84, -20); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  drawFigure: function (ctx, x, y, c, light, el, i) {
    const col = c.color || [200, 200, 200];
    const body = this.mixColor(col, [10, 10, 14], 1 - light * 0.8);
    const skin = this.mixColor(c.skin || [222, 184, 135], [20, 16, 12], 1 - light * 0.8);
    ctx.save(); ctx.translate(x, y);
    const bob = Math.sin(el * 2 + i * 1.7) * 1.2;
    // torse
    ctx.fillStyle = this.rgb(body); ctx.beginPath(); ctx.moveTo(-9, 6); ctx.lineTo(9, 6); ctx.lineTo(7, -14 + bob); ctx.lineTo(-7, -14 + bob); ctx.closePath(); ctx.fill();
    // tête
    ctx.fillStyle = this.rgb(skin); ctx.beginPath(); ctx.arc(0, -21 + bob, 7, 0, 6.283); ctx.fill();
    // cheveux
    ctx.fillStyle = this.rgb(this.mixColor(c.hair || [40, 30, 20], [5, 4, 3], 1 - light * 0.8));
    ctx.beginPath(); ctx.arc(0, -23 + bob, 7, Math.PI, 2 * Math.PI); ctx.fill();
    // bras : pêche / rame / repos
    ctx.strokeStyle = this.rgb(skin); ctx.lineWidth = 3;
    if (c.action === 'fish') { ctx.beginPath(); ctx.moveTo(6, -8 + bob); ctx.lineTo(16, -18 + bob); ctx.stroke(); ctx.strokeStyle = 'rgba(230,230,230,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, -18 + bob); ctx.lineTo(24 + Math.sin(el * 3) * 2, 12); ctx.stroke(); }
    else if (c.action === 'paddle') { const s = Math.sin(el * 3 + i); ctx.beginPath(); ctx.moveTo(6, -8 + bob); ctx.lineTo(14 + s * 3, 2 + s * 3); ctx.stroke(); ctx.strokeStyle = 'rgba(120,90,60,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10 + s * 3, -12 + s * 2); ctx.lineTo(18 + s * 4, 16); ctx.stroke(); }
    else if (c.action === 'watch') { ctx.beginPath(); ctx.moveTo(4, -12 + bob); ctx.lineTo(8, -22 + bob); ctx.stroke(); }
    else if (c.action === 'rest') { ctx.beginPath(); ctx.moveTo(-6, -4 + bob); ctx.lineTo(6, -4 + bob); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(-8, -10 + bob); ctx.lineTo(-11, 2); ctx.moveTo(8, -10 + bob); ctx.lineTo(11, 2); ctx.stroke(); }
    ctx.restore();
  },

  drawFin: function (ctx, W, H, y, light, el, dt) {
    this.finX += dt * 0.05 * this.finDir; if (this.finX > 0.85 || this.finX < 0.15) this.finDir *= -1;
    const x = this.finX * W, bob = Math.sin(el * 2) * 3;
    const col = this.mixColor([70, 80, 90], [10, 14, 20], 1 - light);
    ctx.fillStyle = this.rgb(col);
    ctx.beginPath(); ctx.moveTo(x - 14 * this.finDir, y + bob); ctx.lineTo(x + 10 * this.finDir, y + bob); ctx.quadraticCurveTo(x + 6 * this.finDir, y - 18 + bob, x - 4 * this.finDir, y - 22 + bob); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(220,240,250,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 30 * this.finDir, y + bob + 3); ctx.lineTo(x - 14 * this.finDir, y + bob + 1); ctx.stroke();
  },
  drawWhale: function (ctx, W, H, y, light, el) {
    const x = W * 0.22, ph = (el * 0.5) % 6.283, up = Math.max(0, Math.sin(ph)) * 18;
    const col = this.mixColor([45, 55, 70], [8, 12, 18], 1 - light);
    ctx.fillStyle = this.rgb(col);
    ctx.beginPath(); ctx.ellipse(x, y + 8 - up * 0.5, 70, 14 + up * 0.4, 0, Math.PI, 2 * Math.PI); ctx.fill();
    if (up > 12) { ctx.fillStyle = 'rgba(230,240,250,0.6)'; ctx.beginPath(); ctx.ellipse(x + 30, y - 20 - up, 4, 14 + up * 0.5, 0.2, 0, 6.283); ctx.fill(); }
  },
  drawDolphins: function (ctx, W, H, y, light, el) {
    const col = this.mixColor([120, 135, 150], [20, 24, 30], 1 - light);
    ctx.fillStyle = this.rgb(col);
    for (let i = 0; i < 3; i++) {
      const ph = (el * 1.6 + i * 1.3) % 6.283, x = ((el * 0.04 + i * 0.1) % 1.3 - 0.15) * W;
      const jump = Math.max(0, Math.sin(ph)) * 26;
      if (jump < 2) continue;
      ctx.save(); ctx.translate(x, y - jump); ctx.rotate(-Math.cos(ph) * 0.8);
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 5, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(2, -4); ctx.lineTo(0, -10); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
  drawDebris: function (ctx, W, y, light, el) {
    const x = W * 0.78 + Math.sin(el * 0.7) * 6, bob = Math.sin(el * 1.4) * 3;
    const col = this.mixColor([150, 120, 80], [20, 16, 10], 1 - light);
    ctx.fillStyle = this.rgb(col); ctx.fillRect(x - 24, y + bob - 6, 48, 12);
    ctx.fillStyle = this.rgb(this.mixColor([90, 140, 170], [10, 20, 28], 1 - light)); ctx.fillRect(x - 10, y + bob - 14, 14, 9);
  },

  // Portrait procédural d'un survivant dans un petit canvas (carte d'équipage)
  drawPortrait: function (canvas, s) {
    const size = 88; canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const r = new RNG(s.seed || 1);
    ctx.fillStyle = 'rgb(' + s.color.join(',') + ')'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, size, size);
    const skin = 'rgb(' + s.skin.join(',') + ')', hair = 'rgb(' + s.hair.join(',') + ')';
    // épaules
    ctx.fillStyle = 'rgb(' + s.color.join(',') + ')'; ctx.beginPath(); ctx.ellipse(44, 96, 34, 26, 0, 0, 6.283); ctx.fill();
    // cou et visage
    ctx.fillStyle = skin; ctx.fillRect(38, 56, 12, 16);
    const fw = 24 + r.int(0, 6), fh = 28 + r.int(0, 6);
    ctx.beginPath(); ctx.ellipse(44, 42, fw, fh, 0, 0, 6.283); ctx.fill();
    // cheveux
    const style = r.int(0, 3);
    ctx.fillStyle = hair;
    if (style === 0) { ctx.beginPath(); ctx.ellipse(44, 30, fw + 2, fh * 0.55, 0, Math.PI, 2 * Math.PI); ctx.fill(); }
    else if (style === 1) { ctx.beginPath(); ctx.ellipse(44, 32, fw + 3, fh * 0.7, 0, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.fillRect(44 - fw - 3, 30, 8, 30); ctx.fillRect(44 + fw - 5, 30, 8, 30); }
    else if (style === 2) { ctx.beginPath(); ctx.ellipse(44, 28, fw - 4, fh * 0.4, 0, Math.PI, 2 * Math.PI); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(44, 33, fw + 4, fh * 0.75, 0, Math.PI, 2 * Math.PI); ctx.fill(); ctx.fillRect(44 - fw - 4, 33, fw * 2 + 8, 22); ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(44, 44, fw - 2, fh * 0.75, 0, 0, 6.283); ctx.fill(); }
    // yeux
    const ey = 40 + r.int(-2, 2), ex = 9 + r.int(0, 3);
    ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.ellipse(44 - ex, ey, 4.5, 3, 0, 0, 6.283); ctx.ellipse(44 + ex, ey, 4.5, 3, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.arc(44 - ex, ey, 2, 0, 6.283); ctx.arc(44 + ex, ey, 2, 0, 6.283); ctx.fill();
    // sourcils
    ctx.strokeStyle = hair; ctx.lineWidth = 2; const bt = r.int(-2, 2);
    ctx.beginPath(); ctx.moveTo(44 - ex - 5, ey - 7); ctx.lineTo(44 - ex + 5, ey - 7 - bt); ctx.moveTo(44 + ex - 5, ey - 7 - bt); ctx.lineTo(44 + ex + 5, ey - 7); ctx.stroke();
    // nez et bouche
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(44, ey + 2); ctx.lineTo(42, ey + 10); ctx.lineTo(45, ey + 11); ctx.stroke();
    const mood = s.morale === undefined ? 60 : s.morale;
    const curve = (mood - 50) / 50 * 4;
    ctx.beginPath(); ctx.moveTo(38, ey + 18); ctx.quadraticCurveTo(44, ey + 18 + curve, 50, ey + 18); ctx.stroke();
    // barbe éventuelle
    if (s.gender === 'm' && r.chance(0.4)) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(44, ey + 20, fw - 4, 10, 0, 0, Math.PI); ctx.fill(); }
    // état
    if (s.alive === false) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, size, size); }
    else if (s.hp !== undefined && s.hp < 35) { ctx.fillStyle = 'rgba(200,69,45,0.25)'; ctx.fillRect(0, 0, size, size); }
  }
};
