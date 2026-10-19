/* =========================================================
   Ballon d'Or, um retrato do futebol europeu
   App: rankings, filtros, gráficos e perfis (sem build step)
   ========================================================= */
(() => {
'use strict';
const D = window.EF_DATA, I18N = window.EF_I18N, BIOS = window.EF_BIOS || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- estado ---------- */
const params = new URLSearchParams(location.search);
const savedLang = (() => { try { return localStorage.getItem('ef-lang'); } catch (e) { return null; } })();
const navLang = (navigator.language || 'pt').slice(0, 2);
const S = {
  lang: ['pt', 'en', 'es'].includes(params.get('lang')) ? params.get('lang') : (savedLang || (['en', 'es'].includes(navLang) ? navLang : 'pt')),
  sys: 'own', dec: 'all', tab: 'players', q: '', limit: 50, merge: false, year: 2025
};
let T = I18N[S.lang];

/* ---------- dados base ---------- */
const SCALE = D.scale;
const ROWS = D.rows.map(([y, pos, pts, pid, clubs, nat]) => ({ y, pos, pts, pid, clubs, nat, own: pos <= SCALE.length ? SCALE[pos - 1] : 0 }));
const P = D.players, CL = D.clubs, CO = D.countries;
const YEARS = [...new Set(ROWS.map(r => r.y))].sort((a, b) => a - b);
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const CONFS = ['UEFA', 'CONMEBOL', 'CAF', 'AFC', 'CONCACAF'];
const CONF_COL = { UEFA: '#5b8def', CONMEBOL: '#19b5a5', CAF: '#e0ac2b', AFC: '#e03a3e', CONCACAF: '#ef8a3c' };
const PAL = ['#e0ac2b', '#19b5a5', '#e03a3e', '#eef1f4', '#5b8def', '#ef8a3c', '#9ad66b', '#f28fb0', '#8fa2c0'];
const STRIPED = { 'Milan': 'stripes', 'Internazionale': 'stripes', 'Juventus': 'stripes', 'Barcelona': 'stripes', 'Atlético Madrid': 'stripes', 'Athletic Bilbao': 'stripes',
  'Newcastle United': 'stripes', 'Red Star Belgrade': 'stripes', 'Porto': 'stripes', 'Olympiacos': 'stripes', 'Club Brugge': 'stripes', 'Partizan': 'stripes', 'Sunderland': 'stripes',
  'Celtic': 'hoops', 'Sporting CP': 'hoops', 'Queens Park Rangers': 'hoops', 'Ajax': 'band', 'Feyenoord': 'halves', 'Blackburn Rovers': 'halves', 'Sampdoria': 'hoopband', 'Rapid Wien': 'halves' };
const yearsInDec = d => d === 'all' ? YEARS : YEARS.filter(y => y >= d && y <= d + 9);
const inFilter = r => S.dec === 'all' || (r.y >= S.dec && r.y <= S.dec + 9);
const score = (r, sys = S.sys) => sys === 'own' ? r.own : r.pts;
const nf = () => new Intl.NumberFormat(T.htmlLang);
const fmt = n => nf().format(n);
const natOf = r => (S.merge && r.nat === 'FRG') ? 'GER' : r.nat;
const cName = c => CO[c] ? CO[c][S.lang] : c;
const decLabel = d => d === 'all' ? T.decAll : T.decName(d);

/* ---------- utilidades visuais ---------- */
function hashHue(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
function clubColors(c) {
  if (c.colors) return c.colors;
  const h = hashHue(c.name);
  return [`hsl(${h} 45% 38%)`, '#eef1f4'];
}
function lum(hex) {
  if (!hex || hex[0] !== '#') return 0.3;
  let h = hex.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function flag(code, cls = 'flag') {
  const c = CO[code]; if (!c) return '';
  return `<img class="${cls}" src="assets/flags/${code}.svg" alt="${esc(c[S.lang])}" title="${esc(c[S.lang])}" loading="lazy" decoding="async">`;
}
let svgUid = 0;
function miniShirt(c1, c2, style, cls = 'mini') {
  const id = 'm' + (++svgUid);
  let fill = `<rect width="40" height="44" fill="${c1}"/>`;
  if (style === 'stripes') fill += [6, 18, 30].map(x => `<rect x="${x}" width="5" height="44" fill="${c2}"/>`).join('');
  else if (style === 'hoops' || style === 'hoopband') fill += [12, 24, 36].map(y => `<rect y="${y}" width="40" height="5" fill="${c2}"/>`).join('');
  else if (style === 'band') fill += `<rect x="14" width="12" height="44" fill="${c2}"/>`;
  else if (style === 'halves') fill += `<rect x="20" width="20" height="44" fill="${c2}"/>`;
  return `<svg class="${cls}" viewBox="0 0 40 44" aria-hidden="true"><defs><clipPath id="${id}"><path d="M13 3 L5 6 L0 15 L6 20 L9 17 L9 41 Q20 43 31 41 L31 17 L34 20 L40 15 L35 6 L27 3 Q20 7 13 3Z"/></clipPath></defs><g clip-path="url(#${id})">${fill}<path d="M13 3 Q20 7 27 3" stroke="${style ? c1 : c2}" stroke-width="3" fill="none"/><path d="M0 15 L6 20 M40 15 L34 20" stroke="${c2}" stroke-width="3"/></g></svg>`;
}
const DEC_PATTERN = { all: 'shards', 1950: 'plain', 1960: 'plain', 1970: 'pin', 1980: 'shadow', 1990: 'shards', 2000: 'panel', 2010: 'hoop', 2020: 'wave' };
const DEC_COLLAR = { all: 'polo', 1950: 'lace', 1960: 'crew', 1970: 'polo', 1980: 'wrap', 1990: 'polo', 2000: 'crew', 2010: 'crew', 2020: 'polo' };
function shirtName(name) {
  const parts = name.split(' ');
  if (parts.length === 1) return name;
  if (/Júnior$/.test(name)) return parts[0] + ' JR';
  const particles = ['van', 'de', 'di', 'del', 'da', 'dos', 'ter', 'le', 'du', 'mac'];
  for (let i = 1; i < parts.length - 1; i++) if (particles.includes(parts[i].toLowerCase())) return parts.slice(i).join(' ');
  return parts[parts.length - 1];
}
function bigShirt({ c1 = '#eef1f4', c2 = '#0d1b36', style = null, name = '', num = 1, pattern = 'shards', collar = 'polo', raw = false }) {
  const u = 's' + (++svgUid);
  const dark = lum(c1) < 0.5;
  const txt = style ? '#ffffff' : (dark ? '#ffffff' : '#0d1b36');
  const stroke = style ? '#0d1b36' : (dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.2)');
  const tone = dark ? 'rgba(255,255,255,.08)' : 'rgba(13,27,54,.07)';
  const BODY = 'M100 26 L58 38 L8 92 L42 132 L72 110 L72 300 Q150 312 228 300 L228 110 L258 132 L292 92 L242 38 L200 26 Q150 44 100 26 Z';
  const pat = {
    shards: `<pattern id="${u}p" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><path d="M0 28 L18 0 L36 28 L18 56Z M36 28 L56 10 L56 46Z" fill="${tone}"/><path d="M18 0 L36 28" stroke="${tone}" stroke-width="2"/></pattern>`,
    pin: `<pattern id="${u}p" width="16" height="16" patternUnits="userSpaceOnUse"><rect x="7" width="2" height="16" fill="${tone}"/></pattern>`,
    shadow: `<pattern id="${u}p" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="22" height="44" fill="${tone}"/></pattern>`,
    panel: `<pattern id="${u}p" width="300" height="320" patternUnits="userSpaceOnUse"><path d="M72 110 L104 110 L96 300 L72 300Z M228 110 L196 110 L204 300 L228 300Z" fill="${tone}"/></pattern>`,
    hoop: `<pattern id="${u}p" width="40" height="40" patternUnits="userSpaceOnUse"><rect y="0" width="40" height="3" fill="${tone}"/></pattern>`,
    wave: `<pattern id="${u}p" width="60" height="24" patternUnits="userSpaceOnUse"><path d="M0 12 Q15 0 30 12 T60 12" stroke="${tone}" stroke-width="5" fill="none"/></pattern>`,
    plain: `<pattern id="${u}p" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="transparent"/></pattern>`
  }[pattern] || '';
  let club = '';
  if (style === 'stripes') club = [7, 51, 95, 139, 183, 227, 271].map(x => `<rect x="${x}" y="0" width="22" height="320" fill="${c2}"/>`).join('');
  else if (style === 'hoops') club = [70, 130, 190, 250].map(y => `<rect x="0" y="${y}" width="300" height="30" fill="${c2}"/>`).join('');
  else if (style === 'hoopband') club = `<rect x="0" y="150" width="300" height="34" fill="${c2}"/>`;
  else if (style === 'band') club = `<rect x="118" y="0" width="64" height="320" fill="${c2}"/>`;
  else if (style === 'halves') club = `<rect x="150" y="0" width="150" height="320" fill="${c2}"/>`;
  const trim = style ? '#eef1f4' : c2;
  const collars = {
    polo: `<path d="M96 14 Q150 36 204 14 L208 30 Q150 50 92 30 Z" fill="${trim}"/><path d="M98 22 Q150 42 202 22" stroke="${c1}" stroke-width="2" fill="none" opacity=".6"/>`,
    crew: `<path d="M100 26 Q150 44 200 26" stroke="${trim}" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    lace: `<path d="M100 26 Q150 44 200 26" stroke="${trim}" stroke-width="12" fill="none" stroke-linecap="round"/>`,
    wrap: `<path d="M100 26 Q150 44 200 26" stroke="${trim}" stroke-width="8" fill="none"/><path d="M104 32 Q150 50 196 32" stroke="${c1 === trim ? '#e03a3e' : c1}" stroke-width="3" fill="none"/>`
  }[collar];
  const nm = esc((raw ? name : shirtName(name)).toUpperCase());
  const fs = nm.length > 16 ? 15 : nm.length > 12 ? 19 : nm.length > 9 ? 24 : 28;
  return `<svg viewBox="0 0 300 320" role="img" aria-label="${esc(name)}">
  <defs>${pat}
    <clipPath id="${u}c"><path d="${BODY}"/></clipPath>
    <linearGradient id="${u}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
  </defs>
  <g clip-path="url(#${u}c)">
    <rect width="300" height="320" fill="${c1}"/>${club}
    <rect width="300" height="320" fill="url(#${u}p)"/>
    <path d="M8 92 L42 132 L52 122 L18 82Z M292 92 L258 132 L248 122 L282 82Z" fill="${trim}"/>
    <path d="M72 110 L72 300 M228 110 L228 300" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
    <path d="M110 160 Q140 200 120 260 M190 150 Q170 210 186 270" stroke="rgba(0,0,0,.1)" stroke-width="6" fill="none"/>
    <rect width="300" height="320" fill="url(#${u}g)"/>
  </g>
  ${collars}
  <text x="150" y="92" text-anchor="middle" font-family="Big Shoulders Display, Arial Narrow, sans-serif" font-weight="800" font-size="${fs}" letter-spacing="2" fill="${txt}" stroke="${stroke}" stroke-width="${style ? 3 : 0}" paint-order="stroke">${nm}</text>
  <text x="150" y="236" text-anchor="middle" font-family="Big Shoulders Display, Arial Narrow, sans-serif" font-weight="900" font-size="${num > 9 ? 120 : 140}" fill="${txt}" stroke="${stroke}" stroke-width="${style ? 5 : 0}" paint-order="stroke">${num}</text>
  <use href="#ball" x="252" y="96" width="22" height="22" transform="rotate(32 263 107)"/>
</svg>`;
}
function shirtForPlayer(pid, rows, num) {
  const cnt = {};
  rows.filter(r => r.pid === pid).forEach(r => r.clubs.forEach(c => cnt[c] = (cnt[c] || 0) + score(r)));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const club = top ? CL[top[0]] : null;
  const [c1, c2] = club ? clubColors(club) : ['#eef1f4', '#0d1b36'];
  return bigShirt({ c1, c2, style: club ? STRIPED[club.name] : null, name: P[pid].name, num, pattern: DEC_PATTERN[S.dec], collar: DEC_COLLAR[S.dec] });
}
function shirtForEntity(tab, key, label, num) {
  let c1 = '#eef1f4', c2 = '#0d1b36', style = null;
  if (tab === 'clubs') { [c1, c2] = clubColors(CL[key]); style = STRIPED[CL[key].name]; }
  else if (tab === 'countries' || tab === 'leagues') { const s = CO[key].stripes; c1 = s[0]; c2 = s.find(x => x !== c1) || '#0d1b36'; }
  else if (tab === 'confs') { c1 = CONF_COL[key]; c2 = '#eef1f4'; }
  return bigShirt({ c1, c2, style, name: label, num, pattern: DEC_PATTERN[S.dec], collar: DEC_COLLAR[S.dec], raw: true });
}
const photoUrl = (file, w = 400) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;
const bioOf = p => BIOS[p.key || p.name];


/* ---------- fotos: tabela verificada (data/photos.js) ---------- */
const PH = (window.EF_PHOTOS && window.EF_PHOTOS.p) || {};
const WT = (window.EF_PHOTOS && window.EF_PHOTOS.t) || {};
function wikiThumb(pid, w = 120) {
  const v = PH[pid]; if (!v) return '';
  const [wk, a, b, ...rest] = v.split('/'); const fn = rest.join('/');
  const base = wk === 'c' ? 'commons' : wk;
  const q = encodeURIComponent(fn).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const ext = /\.(svg|tiff?)$/i.test(fn) ? '.png' : '';
  return `https://upload.wikimedia.org/wikipedia/${base}/thumb/${a}/${b}/${q}/${w}px-${q}${ext}`;
}
function photoFor(pid, w) {
  const bio = bioOf(P[pid]);
  const list = [];
  if (bio && bio.photo) list.push(photoUrl(bio.photo, w));
  const t = wikiThumb(pid, w <= 120 ? 120 : 500); if (t) list.push(t);
  return list;
}
window.__efImgFail = img => {
  const next = (img.dataset.next || '').split('|').filter(Boolean);
  if (next.length) { img.dataset.next = next.slice(1).join('|'); img.src = next[0]; return; }
  if (img.classList.contains('avatar')) { const s = document.createElement('span'); s.className = 'monogram'; s.textContent = img.dataset.ini || ''; img.replaceWith(s); }
  else img.parentNode.innerHTML = `<div class="d-shirt">${window.__efShirt}</div>`;
};
function imgTag(pid, w, cls, alt = '') {
  const urls = photoFor(pid, w); if (!urls.length) return '';
  return `<img class="${cls}" alt="${esc(alt)}" loading="lazy" decoding="async" src="${esc(urls[0])}" data-next="${esc(urls.slice(1).join('|'))}" data-ini="${esc(initials(P[pid].name))}" onerror="window.__efImgFail(this)">`;
}
/* ---------- agregação ---------- */
function aggregate(tab, sys = S.sys, rows = ROWS.filter(inFilter)) {
  const M = new Map();
  const get = k => { let e = M.get(k); if (!e) { e = { key: k, pts: 0, apps: 0, wins: 0, pod: 0, top10: 0, best: 999, players: new Set(), years: new Set(), topP: new Map() }; M.set(k, e); } return e; };
  for (const r of rows) {
    let keys;
    if (tab === 'players') keys = [r.pid];
    else if (tab === 'countries') keys = [natOf(r)];
    else if (tab === 'confs') keys = [CO[r.nat].conf];
    else if (tab === 'clubs') keys = r.clubs;
    else keys = [...new Set(r.clubs.map(c => CL[c].country))];
    const v = score(r, sys);
    for (const k of keys) {
      const e = get(k);
      e.pts += v; e.apps++; e.players.add(r.pid); e.years.add(r.y);
      if (r.pos === 1) e.wins++;
      if (r.pos <= 3) e.pod++;
      if (r.pos <= 10) e.top10++;
      if (r.pos < e.best) e.best = r.pos;
      e.topP.set(r.pid, (e.topP.get(r.pid) || 0) + v);
    }
  }
  const list = [...M.values()].sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.best - b.best || labelOf(tab, a.key).localeCompare(labelOf(tab, b.key)));
  let rank = 0, prev = null;
  list.forEach((e, i) => { if (prev === null || e.pts !== prev) rank = i + 1; e.rank = rank; prev = e.pts; });
  return list;
}
function labelOf(tab, k) {
  if (tab === 'players') return P[k].name;
  if (tab === 'clubs') return CL[k].name;
  if (tab === 'confs') return k;
  return cName(k);
}

/* ---------- i18n estático ---------- */
function getPath(o, path) { return path.split('.').reduce((a, k) => a && a[k], o); }
function applyI18n() {
  T = I18N[S.lang];
  document.documentElement.lang = T.htmlLang;
  document.title = T.title;
  $('meta[name=description]').setAttribute('content', T.metaDesc);
  $$('[data-i]').forEach(el => {
    if (el.dataset.i === 'brandSub') { el.textContent = `${T.heroL2} ${T.heroL3}`; return; }
    const v = getPath(T, el.dataset.i); if (typeof v === 'string') el.textContent = v;
  });
  $('.skip').textContent = T.nav.ranking;
  $$('.langs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  $('#cleanList').innerHTML = T.methodClean.map(x => `<li>${esc(x)}</li>`).join('');
  $('#eraList').innerHTML = T.eras.map(([a, b]) => `<li><b>${esc(a)}</b>${esc(b)}</li>`).join('');
  $('.drawer-x').setAttribute('aria-label', T.profile.close);
}

/* ---------- controles ---------- */
function buildControls() {
  $('#decades').innerHTML = ['all', ...DECADES].map(d => `<button class="dec" role="radio" data-dec="${d}" aria-checked="${String(S.dec) === String(d)}">${esc(decLabel(d))}</button>`).join('');
  $('#tabs').innerHTML = Object.keys(T.tabs).map(t => `<button class="tab" role="tab" data-tab="${t}" aria-selected="${t === S.tab}">${esc(T.tabs[t])}</button>`).join('');
  $('#sysSeg').dataset.v = S.sys;
  $$('#sysSeg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.sys === S.sys)));
}
function bindControls() {
  $('#sysSeg').addEventListener('click', e => { const b = e.target.closest('[data-sys]'); if (!b || b.dataset.sys === S.sys) return; S.sys = b.dataset.sys; update(true); });
  $('#decades').addEventListener('click', e => { const b = e.target.closest('[data-dec]'); if (!b) return; S.dec = b.dataset.dec === 'all' ? 'all' : +b.dataset.dec; S.limit = 50; if (S.dec !== 'all' && !yearsInDec(S.dec).includes(S.year)) S.year = yearsInDec(S.dec).slice(-1)[0]; update(true); });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; S.tab = b.dataset.tab; S.limit = 50; S.q = ''; $('#search').value = ''; update(false); });
  $('#search').addEventListener('input', e => { S.q = e.target.value.trim(); renderTable(false); });
  $('#mergeGer').addEventListener('change', e => { S.merge = e.target.checked; update(true); });
  $('#more').addEventListener('click', () => { S.limit += 50; renderTable(false); });
  $('.langs').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; S.lang = b.dataset.lang; try { localStorage.setItem('ef-lang', S.lang); } catch (x) {} const u = new URL(location); u.searchParams.set('lang', S.lang); history.replaceState(null, '', u); applyI18n(); update(false); });
}

/* ---------- hero ---------- */
let lastHeroKey = null;
function renderHero() {
  const rows = ROWS.filter(inFilter);
  const top = aggregate('players')[0];
  const key = `${top.key}|${S.dec}|${S.sys}`;
  if (key !== lastHeroKey) {
    $('#heroShirt').innerHTML = shirtForPlayer(top.key, rows, 1);
    lastHeroKey = key;
  }
  const scope = S.dec === 'all' ? T.scopeAll : T.scopeDecade(decLabel(S.dec).toLowerCase());
  $('#heroShirtCap').innerHTML = `${esc(T.shirtCaption('', scope)).replace(/: $/, ':')} <b>${esc(P[top.key].name)}</b>, ${fmt(top.pts)} ${T.points} (${esc(S.sys === 'own' ? T.sysOwn : T.sysOff).toLowerCase()})`;
  const stats = [
    [new Set(rows.map(r => r.y)).size, T.statEditions],
    [new Set(rows.map(r => r.pid)).size, T.statPlayers],
    [new Set(rows.flatMap(r => r.clubs)).size, T.statClubs],
    [new Set(rows.map(natOf)).size, T.statCountries]
  ];
  $('#stats').innerHTML = stats.map(([n, l]) => `<div><dt>${esc(l)}</dt><dd data-n="${n}">${fmt(n)}</dd></div>`).join('');
  if (!reduceMotion) $$('#stats dd').forEach(dd => countUp(dd, +dd.dataset.n));
}
function countUp(el, to) {
  const t0 = performance.now(), dur = 900;
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function renderLed() {
  const wins = ROWS.filter(r => r.pos === 1).sort((a, b) => a.y - b.y);
  const html = wins.map(r => `<span class="led-item">${r.y} <span>${esc(P[r.pid].name)}</span> <i>${esc(CL[r.clubs[r.clubs.length - 1]].name)}</i></span>`).join('');
  $('#ledTrack').innerHTML = html + html;
}

/* ---------- ranking ---------- */
function entityCell(tab, e) {
  const k = e.key;
  if (tab === 'players') {
    const p = P[k], bio = bioOf(p);
    const rowsP = ROWS.filter(r => r.pid === k && inFilter(r));
    const clubs = [...new Set(rowsP.flatMap(r => r.clubs))].slice(0, 3).map(c => esc(CL[c].name)).join(', ');
    const mono = `<span class="monogram" style="background:${CO[p.nat].stripes[0]};color:${lum(CO[p.nat].stripes[0]) > .5 ? '#0d1b36' : '#fff'}">${esc(initials(p.name))}</span>`;
    const av = imgTag(k, 120, 'avatar') || mono;
    return `${av}<span class="r-name-txt"><strong>${esc(p.name)}</strong><small><span class="chip">${flag(p.nat)} ${esc(cName(p.nat))}</span><span>${clubs}</span></small></span>`;
  }
  const topPid = [...e.topP.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const sub = `<span>${e.players.size} ${esc(T.colPlayers.toLowerCase())}</span><span>${esc(P[topPid].name)}</span>`;
  if (tab === 'clubs') { const c = CL[k]; const [c1, c2] = clubColors(c); return `${miniShirt(c1, c2, STRIPED[c.name], 'mini mini-l')}<span class="r-name-txt"><strong>${esc(c.name)}</strong><small><span class="chip">${flag(c.country)} ${esc(cName(c.country))}</span>${sub}</small></span>`; }
  if (tab === 'confs') return `<span class="tag-conf" style="background:${CONF_COL[k]}">${esc(k)}</span><span class="r-name-txt"><strong>${esc(T.confNames[k])}</strong><small>${sub}</small></span>`;
  if (tab === 'leagues') { const nClubs = new Set(ROWS.filter(inFilter).flatMap(r => r.clubs).filter(c => CL[c].country === k)).size; return `${flag(k, 'flag flag-l')}<span class="r-name-txt"><strong>${esc(cName(k))}</strong><small><span>${nClubs} ${esc(T.statClubs)}</span>${sub}</small></span>`; }
  return `${flag(k, 'flag flag-l')}<span class="r-name-txt"><strong>${esc(cName(k))}</strong><small><span>${esc(CO[k].conf)}</span>${sub}</small></span>`;
}
const slug = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const initials = n => n.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase();
function normalizeStr(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function renderTable(animate) {
  const list = aggregate(S.tab);
  const other = aggregate(S.tab, S.sys === 'own' ? 'off' : 'own');
  const otherRank = new Map(other.map(e => [e.key, e.rank]));
  const max = list.length ? list[0].pts : 1;
  const q = normalizeStr(S.q);
  const filtered = q ? list.filter(e => normalizeStr(labelOf(S.tab, e.key) + (S.tab === 'confs' ? ' ' + T.confNames[e.key] : '')).includes(q)) : list;
  const shown = filtered.slice(0, S.limit);
  const isP = S.tab === 'players';
  const head = `<div class="rhead" role="row"><span>${T.colRank}</span><span>${T.colName}</span><span></span><span>${T.colApps}</span><span>${T.colWins}</span><span>${T.colPod}</span><span>${isP ? T.colBest : T.colPlayers}</span><span>${T.colPts}</span></div>`;
  const otherShort = S.sys === 'own' ? T.sysOffShort : T.sysOwnShort;
  const rowsHtml = shown.map(e => {
    const or = otherRank.get(e.key), d = or - e.rank;
    const cls = d > 0 ? 'delta-down' : d < 0 ? 'delta-up' : 'delta-eq';
    return `<div class="rrow${e.rank <= 3 ? ' is-top' : ''}" role="row" tabindex="0" data-key="${e.key}">
      <span class="r-rank">${e.rank}<small class="${cls}" title="${esc(T.otherSys(otherShort))}">${esc(otherShort)} ${or}${T.posAbbr}</small></span>
      <span class="r-name">${entityCell(S.tab, e)}</span>
      <span class="r-bar"><i style="--w:${(e.pts / max * 100).toFixed(2)}%"></i></span>
      <span class="r-num">${e.apps}</span><span class="r-num wins">${e.wins || ''}</span><span class="r-num">${e.pod || ''}</span>
      <span class="r-num">${isP ? e.best + T.posAbbr : e.players.size}</span>
      <span class="r-pts">${fmt(e.pts)}</span></div>`;
  }).join('');
  const box = $('#rtable');
  const before = animate && !reduceMotion ? new Map($$('.rrow', box).map(el => [el.dataset.key, el.getBoundingClientRect().top])) : null;
  box.innerHTML = head + (rowsHtml || `<p class="empty">${esc(T.noResults)}</p>`);
  if (before) {
    $$('.rrow', box).forEach(el => {
      const b = before.get(el.dataset.key), a = el.getBoundingClientRect().top;
      if (b === undefined) el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)' });
      else if (Math.abs(b - a) > 1) el.animate([{ transform: `translateY(${b - a}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  $('#more').hidden = filtered.length <= S.limit;
  $('#search').placeholder = T.searchPh[S.tab];
  $('#mergeWrap').hidden = S.tab !== 'countries';
  $('#tabHint').textContent = T.tabHint[S.tab];
  // pódio
  $('#podium').innerHTML = q ? '' : list.slice(0, 3).map((e, i) => {
    const label = labelOf(S.tab, e.key);
    const shirt = S.tab === 'players' ? shirtForPlayer(e.key, ROWS.filter(inFilter), i + 1) : shirtForEntity(S.tab, e.key, S.tab === 'confs' ? e.key : label, i + 1);
    const meta = S.tab === 'players' ? `<span class="chip">${flag(P[e.key].nat)} ${esc(cName(P[e.key].nat))}</span>${e.wins ? `<span>${esc(T.winsTitle(e.wins))}</span>` : ''}` : `<span>${e.players.size} ${esc(T.colPlayers.toLowerCase())}</span>${e.wins ? `<span>${esc(T.winsTitle(e.wins))}</span>` : ''}`;
    return `<article class="pod pod-${i + 1}" tabindex="0" data-key="${e.key}"><span class="pod-place">${e.rank}</span><div class="pod-shirt">${shirt}</div><h3 class="pod-name">${esc(label)}</h3><div class="pod-meta">${meta}</div><div class="pod-pts">${fmt(e.pts)} ${T.points}</div></article>`;
  }).join('');
  const range = S.dec === 'all' ? T.decRange(YEARS[0], YEARS[YEARS.length - 1]) : T.decRange(yearsInDec(S.dec)[0], yearsInDec(S.dec).slice(-1)[0]);
  $('#periodLabel').textContent = `${S.sys === 'own' ? T.sysOwn : T.sysOff}, ${range}`;
}
function bindTable() {
  const open = el => { const k = el.dataset.key; if (S.tab === 'players') openPlayer(+k); else openEntity(S.tab, S.tab === 'clubs' ? +k : k); };
  ['#rtable', '#podium'].forEach(sel => {
    $(sel).addEventListener('click', e => { const el = e.target.closest('[data-key]'); if (el) open(el); });
    $(sel).addEventListener('keydown', e => { if (e.key === 'Enter') { const el = e.target.closest('[data-key]'); if (el) open(el); } });
  });
  $('#podium').addEventListener('pointermove', e => { const el = e.target.closest('.pod'); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); });
}

/* ---------- edições ---------- */
function renderYearline() {
  const all = []; for (let y = YEARS[0]; y <= YEARS[YEARS.length - 1]; y++) all.push(y);
  $('#yearline').innerHTML = all.map(y => {
    const none = !YEARS.includes(y);
    const dim = S.dec !== 'all' && (y < S.dec || y > S.dec + 9);
    return `<button class="yr${none ? ' none' : ''}${y % 10 === 0 ? ' dec-start' : ''}" role="tab" data-y="${y}" aria-selected="${y === S.year}" ${dim ? 'style="opacity:.35"' : ''}>${y}</button>`;
  }).join('');
  const sel = $(`.yr[data-y="${S.year}"]`);
  if (sel) { const bar = $('#yearline'); bar.scrollLeft = sel.offsetLeft - bar.clientWidth / 2 + sel.clientWidth / 2; }
}
function eraFor(y) { const idx = y <= 1994 ? 0 : y <= 2006 ? 1 : y <= 2009 ? 2 : y <= 2015 ? 3 : y <= 2021 ? 4 : 5; return T.eras[idx]; }
function renderEdition() {
  const y = S.year;
  const rows = ROWS.filter(r => r.y === y).sort((a, b) => a.pos - b.pos);
  if (!rows.length) { $('#edition').innerHTML = `<div class="ed-card"><p class="ed-year">${y}</p><p>${esc(T.noEdition)}</p></div>`; return; }
  const w = rows[0], total = rows.reduce((s, r) => s + r.pts, 0);
  const era = eraFor(y);
  $('#edition').innerHTML = `<aside class="ed-card">
      <p class="ed-year">${y}</p>
      <div class="pod-shirt">${(() => { const c = CL[w.clubs[w.clubs.length - 1]]; const [c1, c2] = clubColors(c); return bigShirt({ c1, c2, style: STRIPED[c.name], name: P[w.pid].name, num: 1, pattern: DEC_PATTERN[Math.floor(y / 10) * 10], collar: DEC_COLLAR[Math.floor(y / 10) * 10] }); })()}</div>
      <p>${esc(T.winnerOf(y))}</p>
      <h3 class="ed-win">${esc(P[w.pid].name)}</h3>
      <p>${flag(w.nat)} ${esc(cName(w.nat))}, ${w.clubs.map(c => esc(CL[c].name)).join(' / ')}</p>
      <p>${esc(T.votedIn(rows.length))}</p>
      <p>${esc(T.winnerShare((w.pts / total * 100).toFixed(1).replace('.', S.lang === 'en' ? '.' : ',')))}</p>
      <div class="ed-era"><b>${esc(T.era)}:</b> ${esc(era[1])}</div>
    </aside>
    <div style="overflow-x:auto"><table class="ed-table"><thead><tr><th>${T.colRank}</th><th>${T.colName}</th><th class="cl">${T.profile.club}</th><th class="n">${T.sysOffShort}</th><th class="n">${T.sysOwnShort}</th></tr></thead><tbody>
    ${rows.map(r => `<tr data-pid="${r.pid}" tabindex="0"><td class="p">${r.pos}</td><td>${flag(r.nat)} ${esc(P[r.pid].name)}</td><td class="cl">${r.clubs.map(c => esc(CL[c].name)).join(' / ')}</td><td class="n">${fmt(r.pts)}</td><td class="n">${fmt(r.own)}</td></tr>`).join('')}
    </tbody></table></div>`;
}
function bindEditions() {
  $('#yearline').addEventListener('click', e => { const b = e.target.closest('[data-y]'); if (!b) return; S.year = +b.dataset.y; $$('.yr').forEach(x => x.setAttribute('aria-selected', String(x === b))); renderEdition(); });
  $('#edition').addEventListener('click', e => { const tr = e.target.closest('[data-pid]'); if (tr) openPlayer(+tr.dataset.pid); });
  $('#edition').addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('[data-pid]'); if (tr) openPlayer(+tr.dataset.pid); } });
}

/* ---------- gráficos ---------- */
const charts = {};
function chartDefaults() {
  if (!window.Chart) return;
  Chart.defaults.color = '#c6d0de';
  Chart.defaults.font.family = 'Archivo, system-ui, sans-serif';
  Chart.defaults.borderColor = 'rgba(238,241,244,.10)';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = '#060d1c';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(238,241,244,.2)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.animation.duration = reduceMotion ? 0 : 700;
}
function mk(id, cfg) { if (!window.Chart) return; if (charts[id]) charts[id].destroy(); charts[id] = new Chart($('#' + id), cfg); }
function renderCharts() {
  const years = yearsInDec(S.dec);
  const rows = ROWS.filter(inFilter);
  // 1. confederações por ano (100%)
  const byYC = {};
  rows.forEach(r => { const c = CO[r.nat].conf; byYC[r.y] = byYC[r.y] || {}; byYC[r.y][c] = (byYC[r.y][c] || 0) + score(r); });
  mk('chConf', { type: 'bar', data: { labels: years, datasets: CONFS.map(c => ({ label: c, backgroundColor: CONF_COL[c], data: years.map(y => { const t = Object.values(byYC[y] || {}).reduce((a, b) => a + b, 0) || 1; return +(((byYC[y] || {})[c] || 0) / t * 100).toFixed(1); }) })) },
    options: { maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, max: 100, ticks: { callback: v => v + '%' } } }, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y}%` } } } } });
  // 2. corrida de nacionalidades (acumulado)
  const nats = aggregate('countries').slice(0, 8).map(e => e.key);
  const cum = {}; nats.forEach(n => cum[n] = 0);
  const series = nats.map(() => []);
  years.forEach(y => { rows.filter(r => r.y === y).forEach(r => { const n = natOf(r); if (n in cum) cum[n] += score(r); }); nats.forEach((n, i) => series[i].push(cum[n])); });
  mk('chRace', { type: 'line', data: { labels: years, datasets: nats.map((n, i) => ({ label: cName(n), data: series[i], borderColor: PAL[i], backgroundColor: PAL[i], pointRadius: 0, borderWidth: 2.5, tension: .25 })) },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { ticks: { callback: v => fmt(v) } } }, plugins: { legend: { position: 'bottom' } } } });
  // 3. ligas
  const leagues = aggregate('leagues');
  const topL = leagues.slice(0, 8), rest = leagues.slice(8).reduce((s, e) => s + e.pts, 0);
  mk('chLeague', { type: 'doughnut', data: { labels: [...topL.map(e => cName(e.key)), '...'], datasets: [{ data: [...topL.map(e => e.pts), rest], backgroundColor: PAL, borderColor: '#0d1b36', borderWidth: 2 }] },
    options: { maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => `${c.label}: ${fmt(c.parsed)} ${T.points}` } } } } });
  // 4. mapa de calor clubes x décadas (sempre todas as décadas)
  const allClubs = aggregate('clubs', S.sys, ROWS).slice(0, 14);
  const cell = {}; let mx = 1;
  ROWS.forEach(r => { const d = Math.floor(r.y / 10) * 10; r.clubs.forEach(c => { const k = c + '|' + d; cell[k] = (cell[k] || 0) + score(r); }); });
  allClubs.forEach(e => DECADES.forEach(d => mx = Math.max(mx, cell[e.key + '|' + d] || 0)));
  $('#heat').innerHTML = `<span></span>${DECADES.map(d => `<span class="hh">${String(d).slice(2)}</span>`).join('')}` + allClubs.map(e => {
    const c = CL[e.key]; const [c1, c2] = clubColors(c);
    return `<span class="hl">${miniShirt(c1, c2, STRIPED[c.name])}${esc(c.name)}</span>` + DECADES.map(d => { const v = cell[e.key + '|' + d] || 0; const a = Math.sqrt(v / mx); return `<span class="hc${S.dec === d ? ' sel' : ''}" title="${esc(c.name)} ${decLabel(d)}: ${fmt(v)}" style="background:${v ? `rgba(224,172,43,${(0.08 + a * 0.92).toFixed(2)})` : ''}">${v ? fmt(v) : ''}</span>`; }).join('');
  }).join('');
  // 5. fatia do vencedor
  const share = years.map(y => { const rs = ROWS.filter(r => r.y === y); const t = rs.reduce((s, r) => s + r.pts, 0); const w = rs.find(r => r.pos === 1); return { y, v: +(w.pts / t * 100).toFixed(1), n: P[w.pid].name }; });
  mk('chShare', { type: 'line', data: { labels: share.map(s => s.y), datasets: [{ label: '%', data: share.map(s => s.v), borderColor: '#e0ac2b', backgroundColor: 'rgba(224,172,43,.15)', fill: true, tension: .3, pointRadius: 3, pointBackgroundColor: '#e0ac2b' }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${share[c.dataIndex].n}: ${c.parsed.y}%` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }, y: { ticks: { callback: v => v + '%' } } } } });
}

/* ---------- os dois rankings ---------- */
function renderMovers() {
  const own = aggregate('players', 'own'), off = aggregate('players', 'off');
  const ro = new Map(own.map(e => [e.key, e.rank])), rf = new Map(off.map(e => [e.key, e.rank]));
  const pool = own.filter(e => e.rank <= 60 || rf.get(e.key) <= 60).map(e => ({ k: e.key, o: ro.get(e.key), f: rf.get(e.key), d: rf.get(e.key) - ro.get(e.key) }));
  const li = m => `<li data-pid="${m.k}" tabindex="0"><span>${flag(P[m.k].nat)} <strong>${esc(P[m.k].name)}</strong></span><span class="mv-pos">${T.sysOffShort} ${m.f}${T.posAbbr} &nbsp; ${T.sysOwnShort} <b>${m.o}${T.posAbbr}</b><span class="mv-d ${m.d > 0 ? 'up' : 'down'}">${m.d > 0 ? '+' : ''}${m.d}</span></span></li>`;
  $('#mvUp').innerHTML = pool.filter(m => m.d > 0).sort((a, b) => b.d - a.d).slice(0, 12).map(li).join('');
  $('#mvDown').innerHTML = pool.filter(m => m.d < 0).sort((a, b) => a.d - b.d).slice(0, 12).map(li).join('');
}

/* ---------- metodologia ---------- */
function renderScale() { $('#scaleTable').innerHTML = SCALE.map((v, i) => `<div><b>${i + 1}${T.posAbbr}</b><span>${fmt(v)}</span></div>`).join(''); }

/* ---------- gaveta ---------- */
let lastFocus = null;
function openDrawer(html, colors) {
  lastFocus = document.activeElement;
  const dr = $('#drawer');
  $('#drawerBody').innerHTML = html;
  if (colors) { const d = $('.d-hero', dr); if (d) { d.style.setProperty('--c1', colors[0]); d.style.setProperty('--c2', colors[1]); } }
  dr.setAttribute('aria-hidden', 'false');
  $('.drawer-panel', dr).scrollTop = 0;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('.drawer-x', dr).focus(), 50);
}
function closeDrawer() {
  if (/^#p\d+/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  $('#drawer').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (charts.dChart) { charts.dChart.destroy(); delete charts.dChart; }
  if (lastFocus) lastFocus.focus();
}
const wikiLang = () => S.lang;
async function wikiSummary(p) {
  const bio = bioOf(p), wl = S.lang;
  const get = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
  let title = bio && bio.wiki && bio.wiki[wl];
  if (!title && WT[p.id]) {
    if (wl === 'en') title = WT[p.id];
    else {
      const j = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=langlinks&lllang=${wl}&redirects=1&titles=${encodeURIComponent(WT[p.id])}`);
      const pg = j && j.query ? Object.values(j.query.pages)[0] : null;
      title = pg && pg.langlinks ? pg.langlinks[0]['*'] : null;
      if (!title) { const r = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(WT[p.id].replace(/ /g, '_'))}`); return r; }
    }
  }
  if (!title) return null;
  return get(`https://${wl}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
}
function honoursHtml(h) {
  if (!h || !h.length) return '';
  const order = ['wc', 'ucl', 'euro', 'copa', 'afcon', 'icc', 'uel', 'cwc', 'usc', 'unl', 'oly', 'league', 'cup', 'boot'];
  return `<h4>${T.profile.honours}</h4><div class="honours">${[...h].sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t)).map(x => `<div class="honour"><b>${x.n}</b><span>${esc(T.honourNames[x.t] || x.t)}</span></div>`).join('')}</div>`;
}
function openPlayer(pid) {
  const p = P[pid], bio = bioOf(p);
  try { history.replaceState(null, '', `#p${pid}-${slug(p.name)}`); } catch (e) {}
  const mine = ROWS.filter(r => r.pid === pid).sort((a, b) => a.y - b.y);
  const ownAll = aggregate('players', 'own', ROWS), offAll = aggregate('players', 'off', ROWS);
  const eo = ownAll.find(e => e.key === pid), ef = offAll.find(e => e.key === pid);
  const clubCnt = {}; mine.forEach(r => r.clubs.forEach(c => clubCnt[c] = (clubCnt[c] || 0) + 1));
  const mainClub = CL[Object.entries(clubCnt).sort((a, b) => b[1] - a[1])[0][0]];
  const cols = clubColors(mainClub);
  const L = S.lang;
  const tx = o => o ? (o[L] || o.pt || o.en) : '';
  const facts = [
    [T.profile.nat, `${flag(p.nat)} ${esc(cName(p.nat))}${p.natAlt ? ' / ' + p.natAlt.map(cName).map(esc).join(' / ') : ''}`],
    bio && bio.position ? [T.profile.position, esc(tx(bio.position))] : null,
    bio && bio.born ? [T.profile.born, `${bio.born}${bio.birthplace ? ', ' + esc(bio.birthplace) : ''}${bio.died ? ` (${T.profile.died} ${bio.died})` : ''}`] : null,
    bio && bio.career ? [T.profile.career, esc(bio.career)] : null
  ].filter(Boolean);
  const ph = imgTag(pid, 500, '', p.name);
  const photo = ph
    ? `<div><div class="d-photo">${ph}</div><p class="d-photo-cap">${T.profile.photoCredit}${bio && bio.photo && bio.photoYear ? ', ' + bio.photoYear : ''}</p></div>`
    : `<div><div class="d-photo"><div class="d-shirt" id="dShirtSlot"></div></div></div>`;
  window.__efShirt = bigShirt({ c1: cols[0], c2: cols[1], style: STRIPED[mainClub.name], name: p.name, num: eo.best, pattern: 'shards', collar: 'polo' });
  const html = `
  <header class="d-hero">${photo}
    <div><p class="d-tag">${esc(bio ? tx(bio.tagline) : (eo.wins ? T.winsTitle(eo.wins) : ''))}</p>
      <h2 class="d-title" id="dTitle">${esc(p.name)}</h2>
      <dl class="d-facts">${facts.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${b}</dd>`).join('')}</dl></div>
  </header>
  <div class="d-body">
    <h4 style="margin-top:4px">${T.profile.allTime}</h4>
    <div class="d-kpis">
      <div class="d-kpi gold"><b>${eo.wins}</b><span>${T.colWins}</span></div>
      <div class="d-kpi"><b>${eo.best}${T.posAbbr}</b><span>${T.colBest}</span></div>
      <div class="d-kpi"><b>${eo.rank}${T.posAbbr}</b><span>${T.sysOwn}<br>${fmt(eo.pts)} ${T.points}</span></div>
      <div class="d-kpi"><b>${ef.rank}${T.posAbbr}</b><span>${T.sysOff}<br>${fmt(ef.pts)} ${T.points}</span></div>
    </div>
    ${bio ? `<p style="margin-top:20px">${esc(tx(bio.bio))}</p>${bio.ballon ? `<h4>${T.profile.ballon}</h4><p>${esc(tx(bio.ballon))}</p>` : ''}` : `<div id="dWiki" class="wiki"><p>${T.profile.loading}</p></div>`}
    <h4>${T.profile.timeline}</h4>
    <div class="d-chart"><canvas id="dChart"></canvas></div>
    ${bio ? honoursHtml(bio.honours) : ''}
    ${bio && bio.highlights ? `<h4>${T.profile.highlights}</h4><ul class="hl">${(bio.highlights[L] || bio.highlights.pt || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    <h4>${T.profile.clubs}</h4>
    <div class="d-clubs">${Object.keys(clubCnt).map(c => { const cl = CL[c]; const [a, b] = clubColors(cl); return `<span class="chip">${miniShirt(a, b, STRIPED[cl.name])}${esc(cl.name)}</span>`; }).join('')}</div>
    <h4>${T.profile.edition}s</h4>
    <table class="ed-table"><thead><tr><th>${T.profile.edition}</th><th>${T.profile.pos}</th><th class="cl">${T.profile.club}</th><th class="n">${T.sysOffShort}</th><th class="n">${T.sysOwnShort}</th></tr></thead>
    <tbody>${mine.map(r => `<tr><td>${r.y}</td><td class="p">${r.pos}</td><td class="cl">${r.clubs.map(c => esc(CL[c].name)).join(' / ')}</td><td class="n">${fmt(r.pts)}</td><td class="n">${fmt(r.own)}</td></tr>`).join('')}</tbody></table>
    ${bio ? `<div id="dWiki" class="wiki" style="margin-top:24px"></div>` : ''}
    ${bio && bio.sources && bio.sources.length ? `<h4>${T.profile.sources}</h4><ul class="src">${bio.sources.map(s => `<li><a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\//, ''))}</a></li>`).join('')}</ul>` : ''}
  </div>`;
  openDrawer(html, [cols[0], cols[1]]);
  if (window.Chart) {
    charts.dChart = new Chart($('#dChart'), { type: 'scatter',
      data: { datasets: [{ data: mine.map(r => ({ x: r.y, y: r.pos })), pointRadius: mine.map(r => r.pos === 1 ? 9 : 6), pointBackgroundColor: mine.map(r => r.pos === 1 ? '#e0ac2b' : r.pos <= 3 ? '#eef1f4' : '#19b5a5'), showLine: true, borderColor: 'rgba(238,241,244,.25)', borderWidth: 1.5 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.x}: ${c.parsed.y}${T.posAbbr}` } } },
        scales: { x: { min: Math.min(...mine.map(r => r.y)) - 1, max: Math.max(...mine.map(r => r.y)) + 1, ticks: { stepSize: 1, callback: v => String(v) }, grid: { display: false } }, y: { reverse: true, min: 0, suggestedMax: Math.max(10, ...mine.map(r => r.pos)) + 1, ticks: { callback: v => v ? v + T.posAbbr : '' } } } } });
  }
  const slot = $('#dShirtSlot'); if (slot) slot.innerHTML = window.__efShirt;
  wikiSummary(p).then(w => {
    const box = $('#dWiki');
    if (!w) { if (box && !bio) box.innerHTML = `<p>${T.profile.noWiki}</p>`; return; }
    if (box) box.innerHTML = `${bio ? '' : `<p>${esc(w.extract || '')}</p>`}<p><small>${T.profile.wikiSummary}</small> <a href="${esc(w.content_urls && w.content_urls.desktop.page)}" target="_blank" rel="noopener">${T.profile.readMore}</a></p>`;
  });
}
function openEntity(tab, key) {
  const list = aggregate(tab), e = list.find(x => x.key === key);
  if (!e) return;
  const label = labelOf(tab, key);
  const shirt = shirtForEntity(tab, key, tab === 'confs' ? key : label, e.rank);
  let cols = ['#1a3264', '#122650'];
  if (tab === 'clubs') cols = clubColors(CL[key]);
  else if (tab === 'confs') cols = [CONF_COL[key], '#122650'];
  else cols = [CO[key].stripes[0], CO[key].stripes[CO[key].stripes.length - 1]];
  const topPlayers = [...e.topP.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const range = S.dec === 'all' ? T.decRange(YEARS[0], YEARS[YEARS.length - 1]) : decLabel(S.dec);
  const sub = tab === 'clubs' ? `${flag(CL[key].country)} ${esc(cName(CL[key].country))}` : tab === 'confs' ? esc(T.confNames[key]) : tab === 'countries' ? esc(CO[key].conf) : '';
  const html = `
  <header class="d-hero"><div><div class="d-photo"><div class="d-shirt">${shirt}</div></div></div>
    <div><p class="d-tag">${esc(T.tabs[tab])}</p><h2 class="d-title" id="dTitle">${esc(label)}</h2><dl class="d-facts"><dt>${esc(S.sys === 'own' ? T.sysOwn : T.sysOff)}</dt><dd>${esc(range)}</dd>${sub ? `<dt></dt><dd>${sub}</dd>` : ''}</dl></div></header>
  <div class="d-body">
    <div class="d-kpis">
      <div class="d-kpi gold"><b>${e.rank}${T.posAbbr}</b><span>${T.colRank}</span></div>
      <div class="d-kpi"><b>${fmt(e.pts)}</b><span>${T.colPts}</span></div>
      <div class="d-kpi"><b>${e.wins}</b><span>${T.colWins}</span></div>
      <div class="d-kpi"><b>${e.players.size}</b><span>${T.colPlayers}</span></div>
    </div>
    <h4>${T.profile.byDecade}</h4><div class="d-chart"><canvas id="dChart"></canvas></div>
    <h4>${T.profile.topPlayers}</h4>
    <ol class="d-list">${topPlayers.map(([pid, v], i) => `<li data-pid="${pid}"><b>${i + 1}</b><span>${flag(P[pid].nat)} ${esc(P[pid].name)}</span><span>${fmt(v)} ${T.points}</span></li>`).join('')}</ol>
  </div>`;
  openDrawer(html, cols);
  $('#drawerBody .d-list').addEventListener('click', ev => { const li = ev.target.closest('[data-pid]'); if (li) openPlayer(+li.dataset.pid); });
  if (window.Chart) {
    const per = DECADES.map(d => {
      const prev = S.dec; S.dec = d; const v = (aggregate(tab).find(x => x.key === key) || { pts: 0 }).pts; S.dec = prev; return v;
    });
    charts.dChart = new Chart($('#dChart'), { type: 'bar', data: { labels: DECADES.map(decLabel), datasets: [{ data: per, backgroundColor: DECADES.map(d => d === S.dec ? '#e0ac2b' : '#19b5a5'), borderRadius: 3 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${fmt(c.parsed.y)} ${T.points}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => fmt(v) } } } } });
  }
}
function bindDrawer() {
  $('#drawer').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#drawer').getAttribute('aria-hidden') === 'false') closeDrawer(); });
  $('#movers').addEventListener('click', e => { const li = e.target.closest('[data-pid]'); if (li) openPlayer(+li.dataset.pid); });
  $('#movers').addEventListener('keydown', e => { if (e.key === 'Enter') { const li = e.target.closest('[data-pid]'); if (li) openPlayer(+li.dataset.pid); } });
}

/* ---------- camisa do hero acompanha o cursor ---------- */
function bindShirtTilt() {
  if (reduceMotion) return;
  const h = $('#heroShirt'), fig = $('.hero-shirt');
  fig.addEventListener('pointermove', e => { const r = fig.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; h.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 10}deg)`; });
  fig.addEventListener('pointerleave', () => { h.style.transform = ''; });
}

/* ---------- ciclo ---------- */
function update(animate) {
  buildControls();
  renderHero();
  renderTable(animate);
  renderYearline();
  renderEdition();
  renderCharts();
  renderMovers();
  renderScale();
}
function init() {
  chartDefaults();
  applyI18n();
  renderLed();
  bindControls(); bindTable(); bindEditions(); bindDrawer(); bindShirtTilt();
  update(false);
  const m = location.hash.match(/^#p(\d+)/); if (m && P[+m[1]]) openPlayer(+m[1]);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();
