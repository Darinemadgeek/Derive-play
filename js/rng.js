/* DÉRIVE — générateur pseudo-aléatoire déterministe (mulberry32).
   Sérialisable : l'état est un entier 32 bits, sauvegardé avec la partie. */
'use strict';

function RNG(seed) {
  this.state = (seed >>> 0) || 0x9e3779b9;
}
RNG.prototype.next = function () {
  // mulberry32
  this.state = (this.state + 0x6D2B79F5) >>> 0;
  let t = this.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
RNG.prototype.int = function (min, max) { // entier dans [min, max] inclus
  return min + Math.floor(this.next() * (max - min + 1));
};
RNG.prototype.range = function (min, max) { // réel dans [min, max)
  return min + this.next() * (max - min);
};
RNG.prototype.chance = function (p) {
  return this.next() < p;
};
RNG.prototype.pick = function (arr) {
  if (!arr || !arr.length) return undefined;
  return arr[Math.floor(this.next() * arr.length)];
};
RNG.prototype.weighted = function (items, weightFn) {
  let total = 0;
  const ws = items.map(function (it) { const w = Math.max(0, weightFn(it) || 0); total += w; return w; });
  if (total <= 0) return undefined;
  let r = this.next() * total;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r < 0) return items[i]; }
  return items[items.length - 1];
};
RNG.prototype.shuffle = function (arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(this.next() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
};
RNG.prototype.save = function () { return this.state; };
RNG.prototype.load = function (s) { this.state = (s >>> 0) || 1; };

function randomSeed() {
  if (window.crypto && window.crypto.getRandomValues) {
    const a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] || 1;
  }
  return (Math.floor(Math.random() * 4294967295) >>> 0) || 1;
}
