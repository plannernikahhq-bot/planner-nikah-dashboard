/* Planner Nikah A–Z — Jemputan Digital & RSVP · Created by Hizami Radzi */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var qs = new URLSearchParams(location.search);

  var THEMES = {
    lavender: { label: 'Lavender Kasih', color: '#FFFFFF', fonts: 'Great+Vibes&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400' },
    ivory: { label: 'Ivory Emas', color: '#FBF8F2', fonts: 'Pinyon+Script&family=Cinzel:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400' },
    gerbang: { label: 'Gerbang Nur', color: '#F7F1E6', fonts: 'Alex+Brush&family=Playfair+Display:wght@500;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400' },
    zamrud: { label: 'Zamrud Songket', color: '#0E3B30', fonts: 'Great+Vibes&family=Cinzel:wght@400;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400' }
  };
  var HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  var BULAN = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  var D = null, THEME = 'ivory', DEMO = false, ST = { hadir: '', pax: 1, t: Date.now() };

  // ------------------------------------------------------------ util
  function txt(el, v) { if (typeof el === 'string') el = $(el); if (el) el.textContent = v == null ? '' : v; return el; }
  function show(sel, on) { var el = typeof sel === 'string' ? $(sel) : sel; if (el) el.hidden = !on; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function parseD(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function parseT(s) {
    var m = /(\d{1,2})[:.](\d{2})\s*(am|pm|pg|ptg|mlm|tgh)?/i.exec(String(s || ''));
    if (!m) return null;
    var h = +m[1], min = +m[2], ap = (m[3] || '').toLowerCase();
    if ((ap === 'pm' || ap === 'ptg' || ap === 'mlm') && h < 12) h += 12;
    if ((ap === 'am' || ap === 'pg') && h === 12) h = 0;
    return { h: h, m: min };
  }
  function fmtLong(d) { return d ? HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : ''; }
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function svg(w, h, inner, extra) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" ' + (extra || '') + '>' + inner + '</svg>'; }
  function dataUri(s) { return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) + '")'; }

  // ------------------------------------------------------------ hiasan SVG
  function rose(x, y, r, id) {
    var s = '', i;
    for (i = 0; i < 6; i++) s += '<ellipse cx="' + x + '" cy="' + (y - r * .46) + '" rx="' + (r * .5) + '" ry="' + (r * .58) + '" transform="rotate(' + (i * 60 + 10) + ' ' + x + ' ' + y + ')" fill="url(#' + id + ')" opacity=".9"/>';
    for (i = 0; i < 5; i++) s += '<ellipse cx="' + x + '" cy="' + (y - r * .28) + '" rx="' + (r * .36) + '" ry="' + (r * .42) + '" transform="rotate(' + (i * 72 + 40) + ' ' + x + ' ' + y + ')" fill="url(#' + id + ')"/>';
    for (i = 0; i < 3; i++) s += '<ellipse cx="' + x + '" cy="' + (y - r * .12) + '" rx="' + (r * .22) + '" ry="' + (r * .26) + '" transform="rotate(' + (i * 120 + 20) + ' ' + x + ' ' + y + ')" fill="url(#' + id + 'd)" opacity=".55"/>';
    s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (r * .13) + '" ry="' + (r * .1) + '" fill="url(#' + id + 'd)" opacity=".8"/>';
    return s;
  }
  function leaf(x, y, len, ang, fill) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + ang + ')"><path d="M0 0 Q' + (len * .5) + ' ' + (-len * .3) + ' ' + len + ' 0 Q' + (len * .5) + ' ' + (len * .3) + ' 0 0Z" fill="' + fill + '"/>' +
      '<path d="M2 0 L' + (len * .9) + ' 0" stroke="rgba(255,255,255,.55)" stroke-width="1"/></g>';
  }
  function sprig(x, y, len, ang, col) {
    var s = '<g transform="translate(' + x + ' ' + y + ') rotate(' + ang + ')"><path d="M0 0 L' + len + ' 0" stroke="' + col + '" stroke-width="1.4"/>';
    for (var i = 0; i < 7; i++) { var px = len * (0.35 + i * 0.1); s += '<ellipse cx="' + px + '" cy="-3" rx="3.2" ry="2" fill="' + col + '"/><ellipse cx="' + (px + 3) + '" cy="3" rx="3.2" ry="2" fill="' + col + '"/>'; }
    return s + '</g>';
  }
  function floralCluster(W) {
    var defs = '<defs>' +
      '<radialGradient id="rA" cx=".45" cy=".4" r=".75"><stop offset="0" stop-color="#FBF1FB"/><stop offset=".55" stop-color="#E2C6EA"/><stop offset="1" stop-color="#A983B8"/></radialGradient>' +
      '<radialGradient id="rAd"><stop stop-color="#9A74AE"/><stop offset="1" stop-color="#C7A6D4"/></radialGradient>' +
      '<radialGradient id="rB" cx=".45" cy=".4" r=".75"><stop offset="0" stop-color="#FFF4F4"/><stop offset=".55" stop-color="#F0CBD3"/><stop offset="1" stop-color="#C98C9C"/></radialGradient>' +
      '<radialGradient id="rBd"><stop stop-color="#B8717F"/><stop offset="1" stop-color="#E3AFBB"/></radialGradient></defs>';
    var g = '';
    g += sprig(W * .28, 8, 70, 18, '#C4A6D8') + sprig(W * .64, 6, 64, 158, '#C4A6D8') + sprig(W * .18, 44, 56, 42, '#D5BCE3');
    g += leaf(20, 70, 70, -20, '#A7BCA3') + leaf(95, 38, 60, 25, '#8FAA8C') + leaf(60, 92, 56, 60, '#B8C9B3') + leaf(150, 20, 48, 5, '#A7BCA3');
    g += leaf(W - 20, 76, 70, 200, '#A7BCA3') + leaf(W - 100, 40, 60, 155, '#8FAA8C') + leaf(W - 64, 98, 56, 120, '#B8C9B3') + leaf(W - 150, 18, 48, 175, '#A7BCA3');
    g += rose(48, 42, 40, 'rA') + rose(118, 18, 26, 'rB') + rose(16, 104, 22, 'rB');
    g += rose(W - 52, 50, 44, 'rA') + rose(W - 126, 20, 26, 'rB') + rose(W - 14, 116, 22, 'rA');
    g += '<circle cx="' + (W * .42) + '" cy="16" r="3" fill="#D8BFE3"/><circle cx="' + (W * .58) + '" cy="10" r="2.4" fill="#E9C9D2"/>';
    return defs + g;
  }
  function scrollFlourish(cx, cy, w, col) {
    var h = w * .18;
    var half = 'M0 0 C' + (w * .12) + ' ' + (-h) + ' ' + (w * .3) + ' ' + (-h) + ' ' + (w * .34) + ' 0 C' + (w * .37) + ' ' + (h * .7) + ' ' + (w * .26) + ' ' + (h * .8) + ' ' + (w * .24) + ' ' + (h * .2) +
      ' M' + (w * .34) + ' 0 L' + (w * .5) + ' 0';
    return '<g transform="translate(' + cx + ' ' + cy + ')" fill="none" stroke="' + col + '" stroke-width="1.3" stroke-linecap="round">' +
      '<path d="' + half + '" transform="translate(' + (w * .06) + ' 0)"/><path d="' + half + '" transform="translate(' + (-w * .06) + ' 0) scale(-1 1)"/>' +
      '<path d="M0 -6 L5 0 L0 6 L-5 0Z" fill="' + col + '" stroke="none"/></g>';
  }
  function corner(x, y, sx, sy, col) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + sx + ' ' + sy + ')" fill="none" stroke="' + col + '" stroke-width="1.2">' +
      '<path d="M0 70 C0 30 30 0 70 0"/><path d="M10 64 C10 34 34 10 64 10"/><path d="M0 70 C12 70 16 60 10 54 C5 49 -2 55 3 60"/>' +
      '<path d="M70 0 C70 12 60 16 54 10 C49 5 55 -2 60 3"/><circle cx="22" cy="22" r="3" fill="' + col + '"/></g>';
  }
  function star8(cx, cy, r, attrs) {
    var p = [];
    for (var i = 0; i < 16; i++) { var rr = i % 2 ? r * .62 : r, a = Math.PI / 8 * i - Math.PI / 2; p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); }
    return '<polygon points="' + p.join(' ') + '" ' + attrs + '/>';
  }
  function rebungBand(W, y, h, col) {
    var s = '<g fill="none" stroke="' + col + '" stroke-width="1.2"><path d="M0 ' + y + ' H' + W + '"/><path d="M0 ' + (y + h + 8) + ' H' + W + '"/>';
    for (var x = 0; x < W; x += h) {
      s += '<path d="M' + x + ' ' + (y + h + 4) + ' L' + (x + h / 2) + ' ' + (y + 4) + ' L' + (x + h) + ' ' + (y + h + 4) + '"/>' +
        '<path d="M' + (x + h * .25) + ' ' + (y + h + 4) + ' L' + (x + h / 2) + ' ' + (y + h * .5 + 4) + ' L' + (x + h * .75) + ' ' + (y + h + 4) + '"/>';
    }
    return s + '</g>';
  }
  function mosque(W, H, col) {
    var b = H, s = '';
    function dome(cx, r, body) {
      return '<rect x="' + (cx - r) + '" y="' + (b - body) + '" width="' + (2 * r) + '" height="' + body + '"/>' +
        '<path d="M' + (cx - r) + ' ' + (b - body) + ' C' + (cx - r) + ' ' + (b - body - r * 1.3) + ' ' + cx + ' ' + (b - body - r * 1.25) + ' ' + cx + ' ' + (b - body - r * 1.7) +
        ' C' + cx + ' ' + (b - body - r * 1.25) + ' ' + (cx + r) + ' ' + (b - body - r * 1.3) + ' ' + (cx + r) + ' ' + (b - body) + 'Z"/>' +
        '<rect x="' + (cx - 1) + '" y="' + (b - body - r * 1.7 - 12) + '" width="2" height="12"/>';
    }
    function minaret(cx, w, h) {
      return '<rect x="' + (cx - w / 2) + '" y="' + (b - h) + '" width="' + w + '" height="' + h + '"/>' +
        '<rect x="' + (cx - w / 2 - 3) + '" y="' + (b - h * .72) + '" width="' + (w + 6) + '" height="4"/>' +
        '<path d="M' + (cx - w / 2) + ' ' + (b - h) + ' L' + cx + ' ' + (b - h - w * 1.6) + ' L' + (cx + w / 2) + ' ' + (b - h) + 'Z"/>';
    }
    s += minaret(W * .12, 12, H * .78) + minaret(W * .88, 12, H * .78);
    s += dome(W * .3, 22, H * .22) + dome(W * .7, 22, H * .22) + dome(W * .5, 46, H * .3);
    s += '<rect x="0" y="' + (b - 10) + '" width="' + W + '" height="10"/>';
    return '<g fill="' + col + '">' + s + '</g>';
  }
  function archPath(W, H, m, top) {
    var A = Math.min(H * .34, W * .72);
    return 'M' + m + ' ' + H + ' V' + A + ' C' + m + ' ' + (A * .45) + ' ' + (W / 2 - W * .2) + ' ' + (top + A * .1) + ' ' + (W / 2) + ' ' + top +
      ' C' + (W / 2 + W * .2) + ' ' + (top + A * .1) + ' ' + (W - m) + ' ' + (A * .45) + ' ' + (W - m) + ' ' + A + ' V' + H;
  }

  function drawOrnaments() {
    var top = $('.orn-cover-top'), bot = $('.orn-cover-bottom'), end = $('.orn-end'), inv = $('#inv');
    var W = Math.round(inv.clientWidth || 420);
    var col = getComputedStyle(document.body).getPropertyValue('--gold').trim() || '#B8935A';
    inv.style.backgroundImage = ''; inv.style.backgroundSize = '';
    var div = '';
    if (THEME === 'lavender') {
      top.innerHTML = svg(W, 190, floralCluster(W), 'preserveAspectRatio="xMidYMin slice"');
      bot.innerHTML = svg(W, 190, '<g transform="translate(0 190) scale(1 -1)">' + floralCluster(W) + '</g>', 'preserveAspectRatio="xMidYMax slice"');
      end.innerHTML = svg(W, 90, '<g transform="translate(' + (W / 2 - 60) + ' 12) scale(.55)">' + rose(110, 60, 40, 'eR') + leaf(150, 70, 60, 10, '#A7BCA3') + leaf(70, 70, 60, 170, '#A7BCA3') + '</g>' +
        '<defs><radialGradient id="eR" cx=".45" cy=".4" r=".75"><stop offset="0" stop-color="#FBF1FB"/><stop offset=".55" stop-color="#E2C6EA"/><stop offset="1" stop-color="#A983B8"/></radialGradient><radialGradient id="eRd"><stop stop-color="#9A74AE"/><stop offset="1" stop-color="#C7A6D4"/></radialGradient></defs>');
      div = svg(220, 22, '<path d="M0 11 H92 M128 11 H220" stroke="#C9A7CF" stroke-width="1"/><circle cx="110" cy="11" r="6" fill="#E2C6EA"/><circle cx="110" cy="11" r="2.5" fill="#8E6C9E"/><circle cx="98" cy="11" r="2" fill="#C9A7CF"/><circle cx="122" cy="11" r="2" fill="#C9A7CF"/>');
    } else if (THEME === 'ivory') {
      top.innerHTML = svg(W, 190, corner(34, 34, 1, 1, col) + corner(W - 34, 34, -1, 1, col) + scrollFlourish(W / 2, 64, 200, col));
      bot.innerHTML = svg(W, 190, corner(34, 156, 1, -1, col) + corner(W - 34, 156, -1, -1, col) + scrollFlourish(W / 2, 130, 200, col));
      end.innerHTML = svg(W, 90, scrollFlourish(W / 2, 45, 180, col));
      div = svg(220, 22, '<g fill="none" stroke="' + col + '" stroke-width="1.1"><path d="M8 11 H84 M136 11 H212"/><path d="M84 11 C92 3 100 3 102 11 C100 17 94 16 94 12"/><path d="M136 11 C128 3 120 3 118 11 C120 17 126 16 126 12"/></g>' +
        '<path d="M110 4 L116 11 L110 18 L104 11Z" fill="' + col + '"/><circle cx="8" cy="11" r="1.8" fill="' + col + '"/><circle cx="212" cy="11" r="1.8" fill="' + col + '"/>');
    } else if (THEME === 'gerbang') {
      var cov = $('#cover'), H = Math.max(560, cov.clientHeight - 36), Wa = W - 28;
      var pat = '<defs><pattern id="lat" width="18" height="18" patternUnits="userSpaceOnUse">' + star8(9, 9, 7, 'fill="none" stroke="' + col + '" stroke-width=".7" opacity=".55"') + '</pattern>' +
        '<clipPath id="band"><path d="' + archPath(Wa, H, 0, 0) + ' Z" /></clipPath></defs>';
      var outer = archPath(Wa, H, 0, 0), inner = archPath(Wa, H, 16, 22);
      top.innerHTML = svg(Wa, H, pat +
        '<path d="' + outer + '" fill="url(#lat)"/>' +
        '<path d="' + inner + ' Z" fill="' + getComputedStyle(document.body).getPropertyValue('--paper') + '"/>' +
        '<path d="' + outer + '" fill="none" stroke="' + col + '" stroke-width="1.6"/>' +
        '<path d="' + inner + '" fill="none" stroke="' + col + '" stroke-width="1.2"/>' +
        '<path d="' + archPath(Wa, H, 22, 30) + '" fill="none" stroke="' + col + '" stroke-width=".6" opacity=".7"/>' +
        '<g transform="translate(' + (Wa / 2) + ' -2)"><circle cx="0" cy="-8" r="0" /></g>', 'preserveAspectRatio="none" style="overflow:visible"');
      bot.innerHTML = svg(W, 130, mosque(W, 130, 'rgba(176,138,74,.16)'), 'preserveAspectRatio="xMidYMax meet"');
      end.innerHTML = svg(W, 90, '<g transform="translate(0 -40)">' + mosque(W, 130, 'rgba(176,138,74,.22)') + '</g>', 'preserveAspectRatio="xMidYMax meet"');
      div = svg(220, 22, '<path d="M0 11 H96 M124 11 H220" stroke="' + col + '" stroke-width="1"/>' + star8(110, 11, 9, 'fill="none" stroke="' + col + '" stroke-width="1.2"') + star8(110, 11, 3.5, 'fill="' + col + '"'));
    } else if (THEME === 'zamrud') {
      var tile = svg(64, 64, star8(32, 32, 20, 'fill="none" stroke="#D8B45E" stroke-width="1" opacity=".14"') + star8(0, 0, 20, 'fill="none" stroke="#D8B45E" stroke-width="1" opacity=".14"') +
        star8(64, 0, 20, 'fill="none" stroke="#D8B45E" stroke-width="1" opacity=".14"') + star8(0, 64, 20, 'fill="none" stroke="#D8B45E" stroke-width="1" opacity=".14"') + star8(64, 64, 20, 'fill="none" stroke="#D8B45E" stroke-width="1" opacity=".14"'));
      inv.style.backgroundImage = dataUri(tile); inv.style.backgroundSize = '64px 64px';
      top.innerHTML = svg(W, 190, rebungBand(W, 26, 22, col) + star8(W / 2, 118, 26, 'fill="none" stroke="' + col + '" stroke-width="1.4"') + star8(W / 2, 118, 13, 'fill="' + col + '" opacity=".9"'));
      bot.innerHTML = svg(W, 190, '<g transform="translate(0 190) scale(1 -1)">' + rebungBand(W, 26, 22, col) + '</g>');
      end.innerHTML = svg(W, 90, rebungBand(W, 30, 18, col));
      div = svg(220, 22, '<path d="M0 11 H92 M128 11 H220" stroke="#D8B45E" stroke-width="1"/>' + star8(110, 11, 9, 'fill="none" stroke="#D8B45E" stroke-width="1.2"') + '<circle cx="110" cy="11" r="3" fill="#D8B45E"/>');
    }
    $$('.divider').forEach(function (d) { d.style.backgroundImage = dataUri(div); d.style.backgroundSize = 'contain'; });
    show('#bismCover', THEME === 'gerbang' || THEME === 'zamrud');
  }

  // ------------------------------------------------------------ data contoh
  function demoData() {
    var t = new Date(); t.setDate(t.getDate() + 120);
    var iso = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    var tutup = new Date(t); tutup.setDate(tutup.getDate() - 14);
    return {
      reka: 'ivory', panggilP: 'Aisyah', panggilL: 'Ahmad', penuhP: 'Nur Aisyah binti Ahmad', penuhL: 'Muhammad Ahmad bin Kamal', urutan: 'PL',
      tuanRumah: 'Tuan Haji Ahmad bin Ismail & Puan Hajah Salmah binti Hassan',
      ayat: "Dengan penuh kesyukuran ke hadrat Ilahi, kami menjemput Dato' | Datin | Tuan | Puan | Encik | Cik seisi keluarga ke majlis perkahwinan puteri kesayangan kami",
      majlis: 'Walimatul Urus', tarikh: iso, mula: '11:00 AM', tamat: '4:00 PM',
      tempat: 'Dewan Seri Mawar', alamat: 'No. 1, Jalan Mawar 1, 40000 Shah Alam, Selangor',
      maps: 'https://maps.google.com/?q=Shah+Alam', waze: 'https://waze.com/ul?q=Shah%20Alam', kodPakaian: 'Pastel / Busana Tradisional',
      tentatif: [{ mula: '11:00 AM', aturcara: 'Ketibaan tetamu & jamuan dibuka' }, { mula: '12:30 PM', aturcara: 'Ketibaan pengantin' },
        { mula: '1:00 PM', aturcara: 'Bersanding & renjis-renjis' }, { mula: '1:30 PM', aturcara: 'Makan beradab & potong kek' }, { mula: '4:00 PM', aturcara: 'Majlis bersurai' }],
      rsvp: { buka: true, tutup: tutup.getFullYear() + '-' + pad(tutup.getMonth() + 1) + '-' + pad(tutup.getDate()), maxPax: 5, slot: [], paparUcapan: true },
      ucapan: [{ nama: 'Mak Ngah Salmah', ucapan: 'Selamat pengantin baru! Semoga berkekalan hingga ke Jannah.' },
        { nama: 'Geng Universiti', ucapan: 'Barakallahu lakuma. Tak sabar nak datang!' },
        { nama: 'Keluarga Pak Long', ucapan: 'Semoga dikurniakan zuriat yang soleh dan solehah.' }],
      hubungi: [{ nama: 'Pak Long Hassan', tel: '60123456789' }, { nama: 'Kak Ros', tel: '60133334444' }],
      salamKaut: { bank: 'Maybank', akaun: '1234 5678 9012', nama: 'Nur Aisyah binti Ahmad' },
      doaArab: 'بَارَكَ اللهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
      doaMaksud: 'Semoga Allah memberkati kamu berdua, melimpahkan keberkatan ke atas kamu dan menghimpunkan kamu berdua dalam kebaikan.',
      penutup: 'Kehadiran dan doa restu Tuan/Puan amatlah kami hargai.'
    };
  }

  // ------------------------------------------------------------ paparan
  function applyTheme(t) {
    THEME = THEMES[t] ? t : 'ivory';
    document.body.className = 't-' + THEME + (document.body.classList.contains('opened') ? ' opened' : '');
    $('#fontLink').href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=' + THEMES[THEME].fonts + '&display=swap';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = THEMES[THEME].color;
  }

  function render() {
    var d = D, first = d.urutan === 'LP' ? [d.panggilL, d.panggilP] : [d.panggilP, d.panggilL];
    var full = d.urutan === 'LP' ? [d.penuhL, d.penuhP] : [d.penuhP, d.penuhL];
    var tgl = parseD(d.tarikh), mula = parseT(d.mula), tamat = parseT(d.tamat);
    document.title = (d.majlis || 'Walimatul Urus') + ' · ' + first[0] + ' & ' + first[1];

    txt('#cMajlis', d.majlis || 'Walimatul Urus');
    txt('#cName1', first[0]); txt('#cName2', first[1]);
    txt('#cDate', tgl ? fmtLong(tgl) : ''); txt('#cPlace', d.tempat);
    var untuk = (qs.get('untuk') || qs.get('to') || '').trim().slice(0, 60);
    if (untuk) { txt('#kepadaNama', untuk); show('#kepada', true); $('#fNama').value = untuk; }

    txt('#tuanRumah', d.tuanRumah); txt('#ayat', d.ayat); txt('#full1', full[0]); txt('#full2', full[1]);
    show('#tuanRumah', !!d.tuanRumah);

    if (tgl) {
      txt('#dDay', HARI[tgl.getDay()].toUpperCase()); txt('#dNum', tgl.getDate());
      txt('#dMonth', BULAN[tgl.getMonth()].toUpperCase()); txt('#dYear', tgl.getFullYear());
    }
    txt('#dTime', [d.mula, d.tamat].filter(Boolean).join(' – '));
    var target = tgl ? new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), mula ? mula.h : 11, mula ? mula.m : 0) : null;
    startCountdown(target);
    setupCalendar(tgl, mula, tamat, first);

    var tl = $('#tentatif'); tl.innerHTML = '';
    (d.tentatif || []).forEach(function (x) {
      var li = document.createElement('li');
      var a = document.createElement('span'); a.className = 'tm'; a.textContent = x.mula || '';
      var b = document.createElement('span'); b.className = 'ac'; b.textContent = x.aturcara || '';
      li.appendChild(a); li.appendChild(b); tl.appendChild(li);
    });
    show('#secTentatif', (d.tentatif || []).length > 0);

    txt('#lTempat', d.tempat); txt('#lAlamat', d.alamat);
    var q = encodeURIComponent([d.tempat, d.alamat].filter(Boolean).join(', '));
    $('#mapsBtn').href = d.maps || ('https://www.google.com/maps/search/?api=1&query=' + q);
    $('#wazeBtn').href = d.waze || ('https://waze.com/ul?q=' + q + '&navigate=yes');
    if (d.kodPakaian) { txt('#kodPakaian', '👗 Kod pakaian: ' + d.kodPakaian); show('#kodPakaian', true); }

    renderRsvp();
    renderWishes();

    txt('#doaArab', d.doaArab); txt('#doaMaksud', d.doaMaksud);
    if (d.salamKaut) { txt('#bBank', d.salamKaut.bank); txt('#bAkaun', d.salamKaut.akaun); txt('#bNama', d.salamKaut.nama); show('#secSalam', true); }

    var hb = $('#hubungi'); hb.innerHTML = '';
    (d.hubungi || []).forEach(function (h) {
      var a = document.createElement('a'); a.className = 'btn ghost'; a.target = '_blank'; a.rel = 'noopener';
      var tel = String(h.tel).replace(/[^\d]/g, ''); if (/^0/.test(tel)) tel = '6' + tel;
      a.href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent('Assalamualaikum, saya ingin bertanya tentang majlis ' + first[0] + ' & ' + first[1] + '.');
      a.textContent = '💬 ' + h.nama; hb.appendChild(a);
    });
    var hasCall = (d.hubungi || []).length > 0;
    show('#secHubungi', hasCall); show('#dockCall', hasCall);
    $('#dock').style.gridTemplateColumns = 'repeat(' + (hasCall ? 4 : 3) + ',1fr)';

    txt('#penutup', d.penutup); txt('#endNames', first[0] + ' & ' + first[1]);
  }

  function startCountdown(target) {
    function tick() {
      var diff = target ? target - new Date() : 0;
      if (!target || diff <= 0) { $('#countdown').innerHTML = '<p style="grid-column:1/-1;margin:0;font-style:italic">' + (target ? 'Alhamdulillah, hari yang dinanti telah tiba 🤍' : '') + '</p>'; return false; }
      var s = Math.floor(diff / 1000);
      txt('#cdD', Math.floor(s / 86400)); txt('#cdH', pad(Math.floor(s % 86400 / 3600))); txt('#cdM', pad(Math.floor(s % 3600 / 60))); txt('#cdS', pad(s % 60));
      return true;
    }
    if (tick()) setInterval(tick, 1000);
  }

  function setupCalendar(tgl, mula, tamat, first) {
    if (!tgl) return;
    var s = new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), mula ? mula.h : 11, mula ? mula.m : 0);
    var e = tamat ? new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), tamat.h, tamat.m) : new Date(s.getTime() + 4 * 3600e3);
    function f(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
    var title = (D.majlis || 'Walimatul Urus') + ' ' + first[0] + ' & ' + first[1];
    var loc = [D.tempat, D.alamat].filter(Boolean).join(', ');
    $('#gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + f(s) + '/' + f(e) +
      '&ctz=Asia/Kuala_Lumpur&location=' + encodeURIComponent(loc) + '&details=' + encodeURIComponent(location.href.split('?')[0]);
    $('#icsBtn').onclick = function () {
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Planner Nikah//Jemputan//MS', 'BEGIN:VEVENT', 'UID:' + f(s) + '@planner-nikah',
        'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(s), 'DTEND:' + f(e), 'SUMMARY:' + title.replace(/[,;]/g, ' '), 'LOCATION:' + loc.replace(/[,;]/g, ' '),
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'majlis.ics';
      document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
    };
  }

  // ------------------------------------------------------------ RSVP
  var DONE_KEY = 'pn_rsvp_' + location.host;
  function renderRsvp() {
    var r = D.rsvp || {};
    var tutup = parseD(r.tutup);
    txt('#rsvpNote', r.buka ? ('Mohon sahkan kehadiran' + (tutup ? ' sebelum ' + tutup.getDate() + ' ' + BULAN[tutup.getMonth()] + ' ' + tutup.getFullYear() : '') + '.') : '');
    if (!r.buka) { show('#rsvpForm', false); show('#rsvpClosed', true); return; }
    var slots = r.slot || [];
    var sel = $('#fSlot'); sel.innerHTML = '<option value="">— Pilih slot —</option>';
    slots.forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = x; sel.appendChild(o); });
    show('#slotWrap', slots.length > 0);
    var done = null; try { done = JSON.parse(localStorage.getItem(DONE_KEY) || 'null'); } catch (e) {}
    if (done && done.nama) showThanks(done.nama, done.hadir, true);
  }
  function setHadir(v) {
    ST.hadir = v;
    $$('.opt').forEach(function (b) { b.classList.toggle('on', b.dataset.hadir === v); });
    show('#hadirOnly', v === 'Hadir');
  }
  function setPax(n) { var max = (D.rsvp && D.rsvp.maxPax) || 5; ST.pax = Math.max(1, Math.min(max, n)); txt('#paxVal', ST.pax); }
  function showThanks(nama, hadir, earlier) {
    show('#rsvpForm', false); show('#thanks', true);
    txt('#thanksMsg', (earlier ? 'Anda telah menghantar RSVP sebagai ' + nama + '. ' : nama + ', jawapan anda telah diterima. ') +
      (hadir === 'Hadir' ? 'Kami nantikan kehadiran anda!' : 'Terima kasih atas doa dan ingatan anda.'));
  }
  var ERR = {
    RSVP_CLOSED: 'Maaf, RSVP telah ditutup.', TOO_MANY: 'Terlalu banyak cubaan. Cuba lagi selepas 10 minit.', BUSY: 'Ramai sedang RSVP. Cuba lagi sebentar.',
    INVALID_PAX: 'Bilangan tetamu melebihi had.', INVALID_SLOT: 'Sila pilih slot masa.', INVALID: 'Sila lengkapkan nama dan kehadiran.', FULL: 'Maaf, senarai RSVP telah penuh.'
  };
  function submitRsvp(ev) {
    ev.preventDefault();
    var nama = $('#fNama').value.trim(), err = $('#rsvpErr');
    err.textContent = '';
    if (nama.length < 2) { err.textContent = 'Sila isi nama anda.'; $('#fNama').focus(); return; }
    if (!ST.hadir) { err.textContent = 'Sila pilih Hadir atau Tidak dapat hadir.'; return; }
    var slots = (D.rsvp && D.rsvp.slot) || [];
    if (ST.hadir === 'Hadir' && slots.length && !$('#fSlot').value) { err.textContent = 'Sila pilih slot masa.'; return; }
    var body = { nama: nama, tel: $('#fTel').value, hadir: ST.hadir, pax: ST.hadir === 'Hadir' ? ST.pax : 0, slot: $('#fSlot').value,
      ucapan: $('#fUcapan').value.trim(), laman: $('#fLaman').value, ms: Date.now() - ST.t };
    var btn = $('#rsvpBtn'); btn.setAttribute('aria-disabled', 'true'); btn.textContent = 'Menghantar…';
    var finish = function (res) {
      btn.removeAttribute('aria-disabled'); btn.textContent = 'Hantar RSVP';
      if (res && res.ok) {
        try { localStorage.setItem(DONE_KEY, JSON.stringify({ nama: nama, hadir: ST.hadir })); } catch (e) {}
        if (body.ucapan && D.rsvp.paparUcapan) { D.ucapan.unshift({ nama: nama, ucapan: body.ucapan }); renderWishes(); }
        showThanks(nama, ST.hadir, false);
      } else {
        err.textContent = ERR[res && res.code] || 'Tidak dapat menghantar. Semak internet dan cuba lagi.';
        if (res && res.code === 'RSVP_CLOSED') { show('#rsvpForm', false); show('#rsvpClosed', true); }
      }
    };
    if (DEMO) { setTimeout(function () { finish({ ok: true }); }, 700); return; }
    fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).then(finish).catch(function () { finish(null); });
  }

  var showAll = false;
  function renderWishes() {
    var list = (D.rsvp && D.rsvp.paparUcapan === false) ? [] : (D.ucapan || []);
    var box = $('#wishes'); box.innerHTML = '';
    list.slice(0, showAll ? 40 : 6).forEach(function (w) {
      var c = document.createElement('div'); c.className = 'wish';
      var p = document.createElement('p'); p.textContent = '“' + w.ucapan + '”';
      var b = document.createElement('b'); b.textContent = '— ' + w.nama;
      c.appendChild(p); c.appendChild(b); box.appendChild(c);
    });
    show('#secUcapan', list.length > 0);
    show('#moreWishes', !showAll && list.length > 6);
  }

  // ------------------------------------------------------------ interaksi
  function openInvite() {
    document.body.classList.add('opened');
    show('#dock', true);
    drawOrnaments();
    $$('.content .s').forEach(function (s) { s.classList.add('rv'); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
      $$('.rv').forEach(function (el) { io.observe(el); });
    } else $$('.rv').forEach(function (el) { el.classList.add('in'); });
    if (qs.get('buka') !== '1') setTimeout(function () { $('#content').scrollIntoView({ behavior: 'smooth' }); }, 60);
    else $$('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  function bind() {
    $('#openBtn').addEventListener('click', openInvite);
    $$('.opt').forEach(function (b) { b.addEventListener('click', function () { setHadir(b.dataset.hadir); }); });
    $('#paxMinus').addEventListener('click', function () { setPax(ST.pax - 1); });
    $('#paxPlus').addEventListener('click', function () { setPax(ST.pax + 1); });
    $('#rsvpForm').addEventListener('submit', submitRsvp);
    $('#againBtn').addEventListener('click', function () {
      try { localStorage.removeItem(DONE_KEY); } catch (e) {}
      show('#thanks', false); show('#rsvpForm', true); setHadir(''); $('#fUcapan').value = ''; ST.t = Date.now();
    });
    $('#moreWishes').addEventListener('click', function () { showAll = true; renderWishes(); });
    $('#copyAcc').addEventListener('click', function () {
      var v = String((D.salamKaut || {}).akaun || '').replace(/\s/g, '');
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast('No. akaun disalin'); }, function () { toast(v); });
    });
    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { if (!document.body.classList.contains('opened')) openInvite(); var t = document.getElementById(b.dataset.go); if (t) t.scrollIntoView({ behavior: 'smooth' }); });
    });
    $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { var d = document.getElementById(b.dataset.open); if (d && d.showModal) d.showModal(); }); });
    $$('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); }); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawOrnaments, 200); });
  }

  // ------------------------------------------------------------ mula
  function boot(data, demo) {
    D = data; DEMO = demo;
    D.ucapan = D.ucapan || [];
    var over = (qs.get('reka') || '').toLowerCase();
    applyTheme(THEMES[over] ? over : D.reka);
    if (demo) { txt('#demoTheme', THEMES[THEME].label); show('#demoNote', true); }
    render(); bind();
    fontsReady(function () {
      show('#loading', false); show('#inv', true);
      drawOrnaments();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawOrnaments);
      setPax(1);
      if (qs.get('buka') === '1') { openInvite(); window.scrollTo(0, 0); }
    });
  }

  // Tunggu font tema dimuatkan (maks 3 saat) supaya nama tidak berkelip dengan font lain
  function fontsReady(cb) {
    var done = false, fin = function () { if (!done) { done = true; cb(); } };
    setTimeout(fin, 3000);
    if (!document.fonts || !document.fonts.load) return fin();
    var link = $('#fontLink'), cs = getComputedStyle(document.body);
    var fam = function (v) { return (cs.getPropertyValue(v) || '').split(',')[0].trim(); };
    var go = function () {
      Promise.all([
        document.fonts.load('400 48px ' + fam('--f-script')),
        document.fonts.load('400 18px ' + fam('--f-title')),
        document.fonts.load('400 18px ' + fam('--f-body')),
        document.fonts.load('400 24px Amiri', 'بسم')
      ]).then(fin, fin);
    };
    if (link.sheet) go(); else { link.addEventListener('load', go); link.addEventListener('error', fin); }
  }

  function fail(msg) {
    applyTheme('ivory');
    $('#loading').innerHTML = '<p style="max-width:300px;text-align:center">' + msg + '</p>';
  }

  if (qs.get('demo') === '1' || location.protocol === 'file:') { boot(demoData(), true); return; }
  fetch('/api/jemputan', { headers: { Accept: 'application/json' } })
    .then(function (r) { return (r.headers.get('content-type') || '').indexOf('json') >= 0 ? r.json() : { ok: false, code: 'NOT_CONFIGURED' }; })
    .then(function (res) {
      if (res && res.ok && res.data) boot(res.data, false);
      else if (!res || res.code === 'NOT_CONFIGURED') boot(demoData(), true);
      else if (res.code === 'NO_INVITE_TAB') fail('Jemputan belum disediakan. (Pemilik: pastikan tab "Jemputan Digital" wujud dalam Google Sheet.)');
      else fail('Jemputan tidak dapat dibuka sekarang. Sila cuba sebentar lagi.');
    })
    .catch(function () { boot(demoData(), true); });
})();
