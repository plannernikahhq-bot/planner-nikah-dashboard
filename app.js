/* Planner Nikah A–Z — Dashboard Web · Created by Hizami Radzi */
(function () {
  'use strict';

  // ---------------------------------------------------------------- utils
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v, persist) { try { (persist ? localStorage : sessionStorage).setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
  };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function blank(v) { return v === '' || v === null || v === undefined; }
  function RM(v) { var x = Math.round(n(v)); return (x < 0 ? '-RM' : 'RM') + Math.abs(x).toLocaleString('en-MY'); }
  var BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  function parseD(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtD(s) { var d = parseD(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : '—'; }
  function fmtDs(s) { var d = parseD(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] : '—'; }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function daysTo(s) { var d = parseD(s); return d ? Math.round((d - today()) / 86400000) : null; }
  function ratio(a, b) { return b > 0 ? Math.max(0, Math.min(1, a / b)) : 0; }
  function pc(a, b) { return Math.round(ratio(a, b) * 100) + '%'; }
  function sum(arr, f) { return arr.reduce(function (s, x) { return s + n(f(x)); }, 0); }
  function cnt(arr, f) { return arr.filter(f).length; }
  function dayPill(d, paid) {
    if (paid) return '<span class="pill ok">Sudah bayar</span>';
    if (d === null) return '<span class="pill">Tiada tarikh</span>';
    if (d < 0) return '<span class="pill bad">Lewat ' + (-d) + ' hari</span>';
    if (d === 0) return '<span class="pill bad">Hari ini</span>';
    if (d <= 7) return '<span class="pill bad">' + d + ' hari lagi</span>';
    if (d <= 30) return '<span class="pill warn">' + d + ' hari lagi</span>';
    return '<span class="pill">' + d + ' hari lagi</span>';
  }

  var CAT_ORDER = ['Urusan Nikah', 'Mas Kahwin & Hantaran', 'Cincin & Barang Kemas', 'Pakaian Pengantin', 'Mekap & Andaman',
    'Tempat / Dewan', 'Katering', 'Pelamin & Dekorasi', 'Fotografi & Video', 'Kad Jemputan & Doorgift',
    'Hiburan & PA System', 'Pengangkutan', 'Penginapan', 'Bulan Madu', 'Lain-lain'];
  var COLORS = ['#A8707B', '#5E7F6E', '#B8912B', '#5B7DB1', '#C9795B', '#8E6C9E', '#3F8F8B', '#8C8C3E',
    '#7FA3C4', '#C48FA0', '#C2A878', '#4E6E58', '#E0917A', '#9D8FC4', '#9A9091'];
  var TEMPOH = ['12 Bulan Sebelum', '9-11 Bulan Sebelum', '6-8 Bulan Sebelum', '3-5 Bulan Sebelum', '1-2 Bulan Sebelum',
    '2 Minggu Sebelum', '1 Minggu Sebelum', 'Sehari Sebelum', 'Hari Majlis', 'Selepas Majlis'];
  var MAJLIS = ['Merisik / Tunang', 'Akad Nikah', 'Resepsi Pihak Perempuan', 'Resepsi Pihak Lelaki'];

  // ---------------------------------------------------------------- state
  var DATA = null, MODE = 'live', LAST = null, PIN = '', VIEW = 'utama', F = { bayar: 'datang', tetamu: 'Belum Jawab', q: '' };

  // ---------------------------------------------------------------- data
  function fetchData(pin) {
    return fetch('/api/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin || '' })
    }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (ct.indexOf('json') < 0) return { ok: false, code: 'NOT_CONFIGURED' };
      return r.json();
    }).catch(function () {
      return { ok: false, code: location.protocol === 'file:' ? 'NOT_CONFIGURED' : 'NETWORK' };
    });
  }

  function handle(res, fromForm, hadPin) {
    if (res && res.ok) {
      DATA = res.data; MODE = 'live'; LAST = new Date(); showApp(); return;
    }
    var code = res && res.code;
    if (code === 'NOT_CONFIGURED') { DATA = makeDemo(); MODE = 'demo'; LAST = new Date(); showApp(); return; }
    if (code === 'NO_PIN') return showLock('');
    if (code === 'WRONG_PIN') {
      store.del('pn_pin'); PIN = '';
      return showLock(fromForm ? 'PIN salah. Cuba lagi.' : (hadPin ? 'PIN telah berubah. Masukkan PIN baharu.' : ''));
    }
    if (code === 'LOCKED') return showLock('Terlalu banyak cubaan salah. Cuba lagi selepas 15 minit.');
    if (code === 'PIN_NOT_SET') return showLock('PIN belum ditetapkan dalam Google Sheet. Isi PIN (sekurang-kurangnya 6 aksara) di tab Dashboard, sel C13.');
    if (code === 'BAD_URL') return showLock('URL Apps Script dalam Vercel tidak betul. Ia mesti bermula dengan https://script.google.com/macros/s/ dan berakhir dengan /exec. Betulkan di Vercel → Settings → Environment Variables, kemudian Redeploy.');
    if (code === 'SCRIPT_NOT_PUBLIC') return showLock('Google Sheet belum benarkan dashboard membaca data. Dalam Apps Script: Deploy → Manage deployments → pastikan "Who has access" = Anyone.');
    if (code === 'READ_ERROR') return showLock('Skrip tidak dapat membaca Google Sheet (' + (res.message || 'ralat') + '). Pastikan nama tab dalam template tidak diubah.');
    // NETWORK / lain-lain
    if (DATA) { setStatus(); showErr('Tiada sambungan internet. Memaparkan data terakhir.'); }
    else showLock('Tidak dapat sambung. Semak internet anda dan cuba lagi.');
  }

  function refresh() {
    if (MODE === 'demo') { DATA = makeDemo(); LAST = new Date(); render(); return; }
    var btn = $('#refreshBtn'); btn.classList.add('spin');
    fetchData(PIN).then(function (res) {
      btn.classList.remove('spin');
      if (res.ok) { DATA = res.data; LAST = new Date(); $('#errBanner').hidden = true; render(); }
      else handle(res, false, true);
    });
  }

  // ---------------------------------------------------------------- shell
  function showLock(msg) {
    $('#loading').hidden = true; $('#app').hidden = true; $('#lock').hidden = false;
    $('#lockMsg').textContent = msg || '';
    $('#lockBtn').disabled = false; $('#lockBtn').textContent = 'Buka Dashboard';
    setTimeout(function () { $('#pin').focus(); }, 50);
  }
  function showApp() {
    $('#loading').hidden = true; $('#lock').hidden = true; $('#app').hidden = false;
    $('#demoBanner').hidden = MODE !== 'demo';
    render();
    if (VIEW === 'edit') loadEdit(false);
  }
  function showErr(msg) { var b = $('#errBanner'); b.textContent = msg; b.hidden = false; }
  function setStatus() {
    var s = $('#status');
    if (MODE === 'demo') { s.className = 'status demo'; s.textContent = 'Mod Demo'; return; }
    var t = LAST ? String(LAST.getHours()).padStart(2, '0') + ':' + String(LAST.getMinutes()).padStart(2, '0') : '';
    s.className = 'status'; s.textContent = '● Live · ' + t;
  }
  function go(view) {
    VIEW = view;
    $$('#nav button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'v-' + view); });
    try { history.replaceState(null, '', '#' + view); } catch (e) {}
    window.scrollTo({ top: 0 });
    if (view === 'edit' && DATA) loadEdit(false);
  }

  // ---------------------------------------------------------------- model
  function model(d) {
    var info = d.info || {};
    var bajet = (d.bajet || []).map(function (x) {
      var seb = blank(x.sebenar) ? null : n(x.sebenar);
      var kos = seb !== null ? seb : n(x.anggaran);
      return { kategori: x.kategori || 'Lain-lain', item: x.item, pihak: x.pihak || 'Bersama', anggaran: n(x.anggaran),
        sebenar: seb, kos: kos, dibayar: n(x.dibayar), baki: kos - n(x.dibayar), status: x.status || 'Belum Mula', vendor: x.vendor };
    });
    var T = {
      anggaran: sum(bajet, function (x) { return x.anggaran; }),
      sebenar: sum(bajet, function (x) { return x.sebenar || 0; }),
      dibayar: sum(bajet, function (x) { return x.dibayar; }),
      baki: sum(bajet, function (x) { return x.baki; })
    };
    T.guna = Math.max(T.anggaran, T.sebenar);
    var cats = {};
    bajet.forEach(function (x) {
      var c = cats[x.kategori] || (cats[x.kategori] = { nama: x.kategori, anggaran: 0, kos: 0, dibayar: 0, items: [] });
      c.anggaran += x.anggaran; c.kos += x.kos; c.dibayar += x.dibayar; c.items.push(x);
    });
    var catList = Object.keys(cats).map(function (k) { return cats[k]; }).sort(function (a, b) {
      var ia = CAT_ORDER.indexOf(a.nama), ib = CAT_ORDER.indexOf(b.nama);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    catList.forEach(function (c) { var i = CAT_ORDER.indexOf(c.nama); c.color = COLORS[(i < 0 ? 14 : i) % COLORS.length]; });

    var pihak = ['Lelaki', 'Perempuan', 'Bersama'].map(function (p) {
      var xs = bajet.filter(function (x) { return x.pihak === p; });
      return { nama: p, kos: sum(xs, function (x) { return x.kos; }), dibayar: sum(xs, function (x) { return x.dibayar; }) };
    });

    var bayaran = (d.bayaran || []).filter(function (x) { return n(x.amaun) > 0; }).map(function (x) {
      var paid = x.status === 'Sudah Bayar';
      return { vendor: x.vendor, perkara: x.perkara, peringkat: x.peringkat, amaun: n(x.amaun), tarikh: x.tarikhAkhir,
        dibayarPada: x.tarikhBayar, paid: paid, hari: daysTo(x.tarikhAkhir) };
    }).sort(function (a, b) { return String(a.tarikh || '9999').localeCompare(String(b.tarikh || '9999')); });
    var unpaid = bayaran.filter(function (x) { return !x.paid; });

    var tetamu = (d.tetamu || []).map(function (x) {
      var r = x.rsvp === 'Hadir' || x.rsvp === 'Tidak Hadir' ? x.rsvp : 'Belum Jawab';
      return { nama: x.nama, pihak: x.pihak || '—', kumpulan: x.kumpulan || 'Lain-lain', pax: n(x.pax), rsvp: r,
        paxHadir: n(x.paxHadir), kad: x.kad === 'Ya', majlis: x.majlis, meja: x.meja };
    });

    var chk = (d.checklist || []).map(function (x) {
      var st = x.status || 'Belum', dd = daysTo(x.sasaran);
      return { tempoh: x.tempoh || 'Lain-lain', tugasan: x.tugasan, pic: x.pic, sasaran: x.sasaran, status: st, hari: dd,
        lewat: dd !== null && dd < 0 && st !== 'Selesai' };
    });
    var urusan = (d.urusan || []).map(function (x) {
      var dd = daysTo(x.sasaran);
      return { urusan: x.urusan, pihak: x.pihak, sasaran: x.sasaran, status: x.status || 'Belum', lewat: dd !== null && dd < 0 && x.status !== 'Selesai' };
    });
    var hantaran = (d.hantaran || []).map(function (x) { return { arah: x.arah, no: x.no, isi: x.isi, jumlah: n(x.jumlah), status: x.status || 'Belum Beli' }; });

    var sim = d.simpanan || { sumberDana: 0, bulanan: [] };
    var bulanan = (sim.bulanan || []).map(function (x) { return { bulan: x.bulan, sasaran: n(x.sasaran), jumlah: blank(x.jumlah) ? null : n(x.jumlah) }; });
    var terkumpul = n(sim.sumberDana) + sum(bulanan, function (x) { return x.jumlah || 0; });

    return {
      info: info, bajet: bajet, T: T, cats: catList, pihak: pihak, bayaran: bayaran, unpaid: unpaid, vendor: d.vendor || [],
      tetamu: tetamu, rsvpOnline: (d.rsvpOnline || []).map(function (x) { return { masa: x.masa, nama: x.nama, hadir: x.hadir === 'Hadir' ? 'Hadir' : 'Tidak Hadir', pax: n(x.pax), slot: x.slot, ucapan: x.ucapan }; }),
      chk: chk, urusan: urusan, hantaran: hantaran, tentatif: d.tentatif || [], ajk: d.ajk || [],
      salam: d.salam || { jumlah: 0, bil: 0, belumTerimaKasih: 0 },
      sim: { sumber: n(sim.sumberDana), bulanan: bulanan, terkumpul: terkumpul }
    };
  }

  // ---------------------------------------------------------------- widgets
  function kpi(lbl, val, sub, tone) {
    return '<div class="card kpi ' + (tone || '') + '"><div class="lbl">' + lbl + '</div><div class="val num">' + val + '</div>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  }
  function prog(label, a, b, tone, right) {
    var r = ratio(a, b);
    return '<div class="prog"><div class="prog-head"><span>' + label + '</span><b class="num">' + (right || pc(a, b)) + '</b></div>' +
      '<div class="bar ' + (tone || '') + '"><i style="width:' + (r * 100).toFixed(1) + '%"></i></div></div>';
  }
  function donut(parts, size, stroke, label, sub) {
    var r = (size - stroke) / 2, C = 2 * Math.PI * r, tot = sum(parts, function (p) { return p.v; }) || 1, off = 0, h = size / 2;
    var segs = parts.filter(function (p) { return p.v > 0; }).map(function (p) {
      var len = p.v / tot * C;
      var s = '<circle r="' + r + '" cx="' + h + '" cy="' + h + '" fill="none" style="stroke:' + p.c + '" stroke-width="' + stroke +
        '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + h + ' ' + h + ')"/>';
      off += len; return s;
    }).join('');
    return '<svg class="donut" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img">' +
      '<circle r="' + r + '" cx="' + h + '" cy="' + h + '" fill="none" style="stroke:var(--line)" stroke-width="' + stroke + '"/>' + segs +
      '<text x="' + h + '" y="' + (h - 2) + '" text-anchor="middle" style="font-weight:800;font-size:' + (size / 8.5) + 'px;fill:var(--ink)">' + esc(label) + '</text>' +
      '<text x="' + h + '" y="' + (h + size / 9) + '" text-anchor="middle" style="font-size:' + (size / 14) + 'px;fill:var(--muted)">' + esc(sub) + '</text></svg>';
  }
  function ring(r01, size, label) {
    var st = 9, rr = (size - st) / 2, C = 2 * Math.PI * rr, h = size / 2;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle r="' + rr + '" cx="' + h + '" cy="' + h + '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="' + st + '"/>' +
      '<circle r="' + rr + '" cx="' + h + '" cy="' + h + '" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="' + st +
      '" stroke-dasharray="' + (C * r01).toFixed(2) + ' ' + C.toFixed(2) + '" transform="rotate(-90 ' + h + ' ' + h + ')"/>' +
      '<text x="' + h + '" y="' + (h + 6) + '" text-anchor="middle" fill="#fff" style="font-weight:800;font-size:18px">' + esc(label) + '</text></svg>';
  }
  function seg(name, opts, cur) {
    return '<div class="seg" data-seg="' + name + '">' + opts.map(function (o) {
      return '<button data-v="' + esc(o[0]) + '" class="' + (o[0] === cur ? 'on' : '') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function statusPill(s) {
    var cls = { 'Selesai': 'ok', 'Selesai Bayar': 'ok', 'Sudah Gubah': 'ok', 'Dalam Proses': 'warn', 'Deposit Dibayar': 'warn',
      'Sudah Tempah': 'rose', 'Sudah Beli': 'warn' }[s] || '';
    return '<span class="pill ' + cls + '">' + esc(s) + '</span>';
  }
  function checkIc(st, lewat) {
    if (st === 'Selesai' || st === 'Sudah Gubah') return '<span class="check-ic ok">✓</span>';
    if (lewat) return '<span class="check-ic bad">!</span>';
    if (st === 'Dalam Proses' || st === 'Sudah Beli') return '<span class="check-ic warn">◐</span>';
    return '<span class="check-ic"></span>';
  }
  function empty(t) { return '<p class="empty">' + t + '</p>'; }

  // ---------------------------------------------------------------- views
  function render() {
    var M = model(DATA);
    var i = M.info;
    $('#coupleName').textContent = (i.lelaki || 'Pengantin') + ' ❤ ' + (i.perempuan || 'Pengantin');
    var meta = [];
    if (i.tarikhNikah) meta.push('Akad nikah ' + fmtD(i.tarikhNikah));
    if (i.lokasi) meta.push(i.lokasi);
    $('#coupleMeta').textContent = meta.join(' · ') || 'Isi maklumat majlis dalam Google Sheet';
    document.title = (i.lelaki && i.perempuan ? i.lelaki + ' & ' + i.perempuan + ' · ' : '') + 'Dashboard Planner Nikah';
    setStatus();
    $('#v-utama').innerHTML = vUtama(M);
    $('#v-bajet').innerHTML = vBajet(M);
    $('#v-bayaran').innerHTML = vBayaran(M);
    $('#v-tetamu').innerHTML = vTetamu(M);
    $('#v-persiapan').innerHTML = vPersiapan(M);
    $('#v-harih').innerHTML = vHariH(M);
  }

  function vUtama(M) {
    var i = M.info, d = daysTo(i.tarikhNikah);
    var chkDone = cnt(M.chk, function (x) { return x.status === 'Selesai'; });
    var big, cap;
    if (d === null) { big = '—'; cap = 'Isi tarikh akad nikah dalam Google Sheet'; }
    else if (d > 0) { big = d + '<small>hari lagi</small>'; cap = 'menuju akad nikah · ' + fmtD(i.tarikhNikah); }
    else if (d === 0) { big = 'Hari ini!'; cap = 'Selamat diijabkabulkan 💍'; }
    else { big = 'Selamat'; cap = 'Pengantin baru sejak ' + fmtD(i.tarikhNikah) + ' 🎉'; }
    var dr = daysTo(i.tarikhResepsi);
    var units = d !== null && d > 0 ? '<div class="units">' +
      '<div><b>' + Math.floor(d / 7) + '</b><span>minggu</span></div>' +
      '<div><b>' + (d / 30.44).toFixed(1) + '</b><span>bulan</span></div>' +
      (dr !== null && dr >= 0 ? '<div><b>' + dr + '</b><span>hari ke resepsi</span></div>' : '') + '</div>' : '';
    var hero = '<div class="card hero"><div><div class="big num">' + big + '</div><p>' + cap + '</p>' + units + '</div>' +
      '<div class="ringbox">' + ring(ratio(chkDone, M.chk.length), 96, pc(chkDone, M.chk.length)) + '<div>Persiapan<br>siap</div></div></div>';

    var hadirPax = sum(M.tetamu.filter(function (x) { return x.rsvp === 'Hadir'; }), function (x) { return x.paxHadir || x.pax; });
    var jemputPax = sum(M.tetamu, function (x) { return x.pax; });
    var kpis = '<div class="grid g4" style="margin-top:12px">' +
      kpi('Anggaran bajet', RM(M.T.anggaran), i.bajetSasaran ? 'Sasaran ' + RM(i.bajetSasaran) + ' · ' + pc(M.T.guna, i.bajetSasaran) : '', M.T.guna > n(i.bajetSasaran) && n(i.bajetSasaran) > 0 ? 'red' : 'rose') +
      kpi('Sudah dibayar', RM(M.T.dibayar), pc(M.T.dibayar, M.T.dibayar + M.T.baki) + ' daripada kos', 'sage') +
      kpi('Baki perlu bayar', RM(M.T.baki), M.unpaid.length + ' bayaran vendor belum selesai', 'gold') +
      kpi('Tetamu sah hadir', hadirPax.toLocaleString('en-MY') + '<small class="muted" style="font-size:14px"> / ' + jemputPax.toLocaleString('en-MY') + '</small>', 'pax · ' + cnt(M.tetamu, function (x) { return x.rsvp === 'Belum Jawab'; }) + ' keluarga belum jawab' + (M.rsvpOnline.length ? ' · RSVP online ' + sum(M.rsvpOnline, function (x) { return x.hadir === 'Hadir' ? x.pax : 0; }) + ' pax' : '')) +
      '</div>';

    var next = M.unpaid.slice(0, 4).map(function (x) {
      return '<div class="row"><div class="main-col"><div class="t">' + esc(x.vendor) + '</div><div class="s">' + esc(x.perkara) + ' · ' + esc(x.peringkat) + ' · ' + fmtDs(x.tarikh) + '</div></div>' +
        '<div class="r"><div class="amt num">' + RM(x.amaun) + '</div>' + dayPill(x.hari, false) + '</div></div>';
    }).join('') || empty('Tiada bayaran tertunggak. 👏');

    var tasks = M.chk.filter(function (x) { return x.status !== 'Selesai'; }).sort(function (a, b) {
      return (a.hari === null ? 1e9 : a.hari) - (b.hari === null ? 1e9 : b.hari);
    }).slice(0, 5).map(function (x) {
      return '<div class="row">' + checkIc(x.status, x.lewat) + '<div class="main-col"><div class="t">' + esc(x.tugasan) + '</div><div class="s">' +
        esc(x.tempoh) + (x.pic ? ' · ' + esc(x.pic) : '') + '</div></div><div class="r">' + (x.sasaran ? dayPill(x.hari, false).replace('hari lagi', 'hari') : '') + '</div></div>';
    }).join('') || empty('Semua tugasan selesai! 🎉');
    var lewat = cnt(M.chk, function (x) { return x.lewat; });

    var urDone = cnt(M.urusan, function (x) { return x.status === 'Selesai'; });
    var hDone = cnt(M.hantaran, function (x) { return x.status === 'Sudah Gubah'; });
    var progress = '<div class="card"><h2>Progres keseluruhan</h2>' +
      prog('Checklist persiapan', chkDone, M.chk.length, '', chkDone + ' / ' + M.chk.length) +
      prog('Urusan nikah & dokumen', urDone, M.urusan.length, '', urDone + ' / ' + M.urusan.length) +
      prog('Dulang hantaran siap digubah', hDone, M.hantaran.length, 'gold', hDone + ' / ' + M.hantaran.length) +
      prog('Simpanan terkumpul vs anggaran', M.sim.terkumpul, M.T.anggaran, 'gold', RM(M.sim.terkumpul) + ' · ' + pc(M.sim.terkumpul, M.T.anggaran)) +
      prog('Bajet sasaran digunakan', M.T.guna, n(i.bajetSasaran), M.T.guna > n(i.bajetSasaran) ? 'red' : 'rose') +
      '</div>';

    return hero + kpis +
      '<div class="grid gm2" style="margin-top:12px">' +
      '<div class="card"><h2>🧾 Bayaran seterusnya <small>' + RM(sum(M.unpaid, function (x) { return x.amaun; })) + ' dalam jadual</small></h2><div class="list">' + next + '</div></div>' +
      '<div class="card"><h2>✅ Tugasan seterusnya ' + (lewat ? '<span class="pill bad">' + lewat + ' lewat</span>' : '') + '</h2><div class="list">' + tasks + '</div></div>' +
      '</div><div style="margin-top:12px">' + progress + '</div>';
  }

  function vBajet(M) {
    var i = M.info, sasaran = n(i.bajetSasaran), lebih = sasaran - M.T.guna;
    var k = '<div class="grid g4">' +
      kpi('Bajet sasaran', RM(sasaran), 'ditetapkan di Dashboard', '') +
      kpi('Jumlah anggaran', RM(M.T.anggaran), M.bajet.length + ' item', 'rose') +
      kpi('Kos sebenar', RM(M.T.sebenar), 'item yang sudah ada harga', 'gold') +
      kpi(lebih >= 0 ? 'Lebihan bajet' : 'Terlebih bajet', RM(Math.abs(lebih)), lebih >= 0 ? 'masih dalam sasaran 👍' : 'melebihi sasaran ⚠️', lebih >= 0 ? 'sage' : 'red') +
      '</div>';
    var used = '<div class="card" style="margin-top:12px">' +
      prog('Bajet sasaran digunakan', M.T.guna, sasaran, M.T.guna > sasaran ? 'red' : 'rose', RM(M.T.guna) + ' · ' + pc(M.T.guna, sasaran)) +
      prog('Sudah dibayar daripada jumlah kos', M.T.dibayar, M.T.dibayar + M.T.baki, '', RM(M.T.dibayar) + ' · ' + pc(M.T.dibayar, M.T.dibayar + M.T.baki)) + '</div>';

    var parts = M.cats.map(function (c) { return { v: c.kos, c: c.color }; });
    var legend = M.cats.filter(function (c) { return c.kos > 0; }).map(function (c) {
      return '<div><i class="dot" style="background:' + c.color + '"></i><span class="l">' + esc(c.nama) + '</span><b>' + pc(c.kos, M.T.dibayar + M.T.baki) + '</b></div>';
    }).join('');
    var donutCard = '<div class="card"><h2>Pecahan kos ikut kategori</h2><div class="donut-wrap">' +
      donut(parts, 170, 26, RM(M.T.dibayar + M.T.baki), 'jumlah kos') + '<div class="legend">' + legend + '</div></div></div>';

    var maxP = Math.max.apply(null, M.pihak.map(function (p) { return p.kos; }).concat([1]));
    var pihakCard = '<div class="card"><h2>Ikut pihak</h2>' + M.pihak.map(function (p) {
      return '<div class="prog"><div class="prog-head"><span>' + p.nama + '</span><b class="num">' + RM(p.kos) + '</b></div>' +
        '<div class="dual"><i class="a" style="width:' + (p.kos / maxP * 100).toFixed(1) + '%"></i><i class="b" style="width:' + (p.dibayar / maxP * 100).toFixed(1) + '%"></i></div>' +
        '<div class="cat-sub"><span>Dibayar ' + RM(p.dibayar) + '</span><span>Baki ' + RM(p.kos - p.dibayar) + '</span></div></div>';
    }).join('') + '<div class="keys"><span><i class="dot" style="background:var(--rose)"></i>Dibayar</span><span><i class="dot" style="background:color-mix(in srgb,var(--rose) 35%,transparent)"></i>Jumlah kos</span></div></div>';

    var maxC = Math.max.apply(null, M.cats.map(function (c) { return c.kos; }).concat([1]));
    var catCard = '<div class="card" style="margin-top:12px"><h2>Ikut kategori <small>tekan untuk lihat item</small></h2>' + M.cats.map(function (c) {
      var items = c.items.map(function (x) {
        return '<div class="row"><div class="main-col"><div class="t">' + esc(x.item) + '</div><div class="s">' + esc(x.pihak) + (x.vendor ? ' · ' + esc(x.vendor) : '') +
          (x.sebenar === null ? ' · anggaran' : '') + '</div></div><div class="r"><div class="amt num">' + RM(x.kos) + '</div>' + statusPill(x.status) + '</div></div>';
      }).join('');
      return '<details class="cat"><summary><div class="cat-head"><span><i class="dot" style="display:inline-block;background:' + c.color + ';margin-right:6px"></i><b>' + esc(c.nama) + '</b><span class="chev">▶</span></span><b class="num">' + RM(c.kos) + '</b></div>' +
        '<div class="dual"><i class="a" style="width:' + (c.kos / maxC * 100).toFixed(1) + '%"></i><i class="b" style="width:' + (c.dibayar / maxC * 100).toFixed(1) + '%"></i></div>' +
        '<div class="cat-sub"><span>Dibayar ' + RM(c.dibayar) + '</span><span>Baki ' + RM(c.kos - c.dibayar) + '</span></div></summary>' +
        '<div class="items">' + items + '</div></details>';
    }).join('') + '</div>';

    // simpanan
    var S = M.sim, rows = S.bulanan;
    var maxM = Math.max.apply(null, rows.map(function (x) { return Math.max(x.jumlah || 0, x.sasaran); }).concat([1]));
    var bars = rows.map(function (x) {
      var d = parseD(x.bulan), lbl = d ? BULAN[d.getMonth()] : '';
      var h = ((x.jumlah || 0) / maxM * 100).toFixed(1), t = (x.sasaran / maxM * 100).toFixed(1);
      return '<div class="mbar" title="' + esc(lbl) + ': ' + RM(x.jumlah || 0) + ' / sasaran ' + RM(x.sasaran) + '"><div class="col"><i class="' + (x.jumlah !== null && x.jumlah < x.sasaran ? 'miss' : '') + '" style="height:' + h + '%"></i>' +
        (x.sasaran ? '<b class="tgt" style="bottom:' + t + '%"></b>' : '') + '</div><span>' + lbl + '</span></div>';
    }).join('');
    var simCard = '<div class="card" style="margin-top:12px"><h2>🏦 Simpanan <small>' + RM(S.terkumpul) + ' terkumpul</small></h2>' +
      prog('Terkumpul vs jumlah anggaran', S.terkumpul, M.T.anggaran, 'gold', pc(S.terkumpul, M.T.anggaran)) +
      '<div class="cat-sub" style="margin:4px 0 6px"><span>Sumber dana sedia ada ' + RM(S.sumber) + '</span><span>Baki perlu kumpul ' + RM(Math.max(0, M.T.anggaran - S.terkumpul)) + '</span></div>' +
      (rows.length ? '<div class="mbars">' + bars + '</div><div class="keys"><span><i class="dot" style="background:var(--sage)"></i>Capai sasaran</span><span><i class="dot" style="background:var(--rose)"></i>Kurang</span><span><i class="dot" style="background:var(--gold)"></i>Garis sasaran bulanan</span></div>' : empty('Tiada rancangan simpanan bulanan lagi.')) +
      '</div>';

    return k + used + '<div class="grid gm2" style="margin-top:12px">' + donutCard + pihakCard + '</div>' + catCard + simCard;
  }

  function vBayaran(M) {
    var belum = sum(M.unpaid, function (x) { return x.amaun; });
    var d30 = sum(M.unpaid.filter(function (x) { return x.hari !== null && x.hari <= 30; }), function (x) { return x.amaun; });
    var lewat = cnt(M.unpaid, function (x) { return x.hari !== null && x.hari < 0; });
    var paid = M.bayaran.filter(function (x) { return x.paid; });
    var k = '<div class="grid g4">' +
      kpi('Belum bayar', RM(belum), M.unpaid.length + ' bayaran', 'gold') +
      kpi('Perlu bayar ≤ 30 hari', RM(d30), 'termasuk yang lewat', d30 > 0 ? 'red' : 'sage') +
      kpi('Bayaran lewat', String(lewat), lewat ? 'segera selesaikan' : 'tiada 👍', lewat ? 'red' : 'sage') +
      kpi('Sudah bayar', RM(sum(paid, function (x) { return x.amaun; })), paid.length + ' bayaran', 'sage') + '</div>';
    var list = M.bayaran.filter(function (x) { return F.bayar === 'semua' || (F.bayar === 'datang' ? !x.paid : x.paid); });
    if (F.bayar === 'sudah') list = list.slice().reverse();
    var rows = list.map(function (x) {
      var c = x.paid ? 'var(--ok)' : (x.hari !== null && x.hari <= 7 ? 'var(--red)' : (x.hari !== null && x.hari <= 30 ? 'var(--amber)' : 'var(--line)'));
      return '<div class="row"><i class="dot" style="background:' + c + '"></i><div class="main-col"><div class="t">' + esc(x.vendor) + '</div><div class="s">' + esc(x.perkara) + ' · ' + esc(x.peringkat) +
        ' · ' + (x.paid && x.dibayarPada ? 'dibayar ' + fmtD(x.dibayarPada) : 'akhir ' + fmtD(x.tarikh)) + '</div></div><div class="r"><div class="amt num">' + RM(x.amaun) + '</div>' + dayPill(x.hari, x.paid) + '</div></div>';
    }).join('') || empty('Tiada rekod.');
    var vend = M.vendor.filter(function (v) { return v.keputusan === 'Dipilih'; }).map(function (v) {
      var r = Math.max(0, Math.min(5, Math.round(n(v.rating))));
      return '<div class="row"><div class="main-col"><div class="t">' + esc(v.nama) + '</div><div class="s">' + esc(v.kategori) + (v.pakej ? ' · ' + esc(v.pakej) : '') + '</div></div>' +
        '<div class="r"><div class="amt num">' + (n(v.harga) ? RM(v.harga) : '') + '</div><span style="color:var(--gold)">' + '★'.repeat(r) + '<span class="muted">' + '★'.repeat(5 - r) + '</span></span></div></div>';
    }).join('') || empty('Belum ada vendor bertanda "Dipilih".');
    return k + '<div class="grid gm2" style="margin-top:12px;align-items:start"><div class="card"><h2>Jadual bayaran</h2>' +
      seg('bayar', [['datang', 'Belum bayar'], ['sudah', 'Sudah bayar'], ['semua', 'Semua']], F.bayar) + '<div class="list">' + rows + '</div></div>' +
      '<div class="card"><h2>🤝 Vendor dipilih <small>' + cnt(M.vendor, function (v) { return v.keputusan === 'Shortlist'; }) + ' dalam shortlist</small></h2><div class="list">' + vend + '</div></div></div>';
  }

  function vTetamu(M) {
    var T = M.tetamu, i = M.info;
    var jemput = sum(T, function (x) { return x.pax; });
    var hadirRows = T.filter(function (x) { return x.rsvp === 'Hadir'; });
    var hadir = sum(hadirRows, function (x) { return x.paxHadir || x.pax; });
    var belum = cnt(T, function (x) { return x.rsvp === 'Belum Jawab'; });
    var kad = cnt(T, function (x) { return !x.kad; });
    var k = '<div class="grid g4">' +
      kpi('Dijemput', jemput.toLocaleString('en-MY') + ' pax', T.length + ' keluarga / kumpulan', 'rose') +
      kpi('Sah hadir', hadir.toLocaleString('en-MY') + ' pax', hadirRows.length + ' keluarga', 'sage') +
      kpi('Belum jawab', String(belum), 'keluarga · perlu follow-up', belum ? 'gold' : 'sage') +
      kpi('Kad belum dihantar', String(kad), kad ? 'keluarga' : 'semua sudah 👍', kad ? 'red' : 'sage') + '</div>';

    var h = hadirRows.length, t = cnt(T, function (x) { return x.rsvp === 'Tidak Hadir'; }), all = T.length || 1;
    var rsvp = '<div class="card"><h2>Status RSVP <small>ikut keluarga</small></h2><div class="stack-bar">' +
      '<i style="width:' + (h / all * 100) + '%;background:var(--sage)"></i><i style="width:' + (t / all * 100) + '%;background:var(--rose)"></i><i style="width:' + (belum / all * 100) + '%;background:var(--gold)"></i></div>' +
      '<div class="keys"><span><i class="dot" style="background:var(--sage)"></i>Hadir <b>' + h + '</b></span><span><i class="dot" style="background:var(--rose)"></i>Tidak hadir <b>' + t + '</b></span><span><i class="dot" style="background:var(--gold)"></i>Belum jawab <b>' + belum + '</b></span></div>' +
      '<div style="margin-top:14px">' + prog('Pax sah hadir vs anggaran tetamu', hadir, n(i.anggaranTetamu), 'rose', hadir + ' / ' + n(i.anggaranTetamu) + ' pax') +
      prog('Jumlah dijemput vs anggaran tetamu', jemput, n(i.anggaranTetamu), jemput > n(i.anggaranTetamu) ? 'red' : 'gold', jemput + ' / ' + n(i.anggaranTetamu) + ' pax') + '</div></div>';

    function groupBars(key, title) {
      var g = {};
      T.forEach(function (x) { g[x[key]] = (g[x[key]] || 0) + x.pax; });
      var ks = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; });
      var mx = Math.max.apply(null, ks.map(function (k2) { return g[k2]; }).concat([1]));
      return '<div class="card"><h2>' + title + '</h2>' + (ks.map(function (k2) {
        return '<div class="prog"><div class="prog-head"><span>' + esc(k2) + '</span><b class="num">' + g[k2] + ' pax</b></div><div class="bar rose"><i style="width:' + (g[k2] / mx * 100).toFixed(1) + '%"></i></div></div>';
      }).join('') || empty('Tiada data.')) + '</div>';
    }

    var q = F.q.toLowerCase();
    var list = T.filter(function (x) { return (F.tetamu === 'Semua' || x.rsvp === F.tetamu) && (!q || String(x.nama).toLowerCase().indexOf(q) >= 0); });
    var rows = list.slice(0, 300).map(function (x) {
      var pill = x.rsvp === 'Hadir' ? 'ok' : (x.rsvp === 'Tidak Hadir' ? 'bad' : 'warn');
      return '<div class="row"><div class="main-col"><div class="t">' + esc(x.nama) + '</div><div class="s">' + esc(x.pihak) + ' · ' + esc(x.kumpulan) + ' · ' + x.pax + ' pax' +
        (x.meja ? ' · Meja ' + esc(x.meja) : '') + (x.kad ? '' : ' · <b style="color:var(--red)">kad belum dihantar</b>') + '</div></div><div class="r"><span class="pill ' + pill + '">' + esc(x.rsvp) + '</span></div></div>';
    }).join('') || empty('Tiada tetamu dalam senarai ini.');
    var R = M.rsvpOnline, rH = R.filter(function (x) { return x.hadir === 'Hadir'; });
    var rCard = '<div class="card" style="margin-top:12px"><h2>💌 RSVP Online <small>dari jemputan digital</small></h2>' +
      '<div class="grid g4">' + kpi('Jawapan', String(R.length), 'keluarga', 'rose') + kpi('Hadir', sum(rH, function (x) { return x.pax; }) + ' pax', rH.length + ' keluarga', 'sage') +
      kpi('Tidak hadir', String(R.length - rH.length), 'keluarga', '') + kpi('Ucapan', String(cnt(R, function (x) { return x.ucapan; })), 'doa & ucapan', 'gold') + '</div>' +
      (R.length ? '<div class="list" style="margin-top:10px">' + R.slice().reverse().slice(0, 12).map(function (x) {
        return '<div class="row"><div class="main-col"><div class="t">' + esc(x.nama) + '</div><div class="s">' + (x.hadir === 'Hadir' ? x.pax + ' pax' : 'Tidak hadir') +
          (x.slot ? ' · ' + esc(x.slot) : '') + (x.masa ? ' · ' + esc(String(x.masa).slice(0, 16)) : '') + (x.ucapan ? '<br>“' + esc(x.ucapan) + '”' : '') + '</div></div>' +
          '<div class="r"><span class="pill ' + (x.hadir === 'Hadir' ? 'ok' : 'bad') + '">' + x.hadir + '</span></div></div>';
      }).join('') + '</div>' + (R.length > 12 ? '<p class="muted small">Senarai penuh di tab "RSVP Online" dalam Google Sheet.</p>' : '')
        : '<p class="empty">Belum ada jawapan. Kongsi link jemputan anda: <b>' + esc(location.origin) + '/jemputan</b></p>') + '</div>';
    return k + rCard + '<div style="margin-top:12px">' + rsvp + '</div><div class="grid gm2" style="margin-top:12px">' + groupBars('pihak', 'Ikut pihak') + groupBars('kumpulan', 'Ikut kumpulan') + '</div>' +
      '<div class="card" style="margin-top:12px"><h2>Senarai tetamu <small>' + list.length + ' keluarga</small></h2>' +
      seg('tetamu', [['Belum Jawab', 'Belum jawab'], ['Hadir', 'Hadir'], ['Tidak Hadir', 'Tidak hadir'], ['Semua', 'Semua']], F.tetamu) +
      '<input class="search" id="q" type="search" placeholder="Cari nama…" value="' + esc(F.q) + '"><div class="list">' + rows + '</div></div>';
  }

  function vPersiapan(M) {
    var C = M.chk, done = cnt(C, function (x) { return x.status === 'Selesai'; }), lewatL = C.filter(function (x) { return x.lewat; });
    var ur = cnt(M.urusan, function (x) { return x.status === 'Selesai'; });
    var hd = cnt(M.hantaran, function (x) { return x.status === 'Sudah Gubah'; });
    var k = '<div class="grid g4">' +
      kpi('Checklist siap', pc(done, C.length), done + ' / ' + C.length + ' tugasan', 'sage') +
      kpi('Tugasan lewat', String(lewatL.length), lewatL.length ? 'perlu diberi perhatian' : 'tiada 👍', lewatL.length ? 'red' : 'sage') +
      kpi('Urusan nikah', ur + ' / ' + M.urusan.length, 'dokumen & proses', 'rose') +
      kpi('Hantaran digubah', hd + ' / ' + M.hantaran.length, 'dulang', 'gold') + '</div>';

    var lw = lewatL.length ? '<div class="card" style="margin-top:12px;border-color:color-mix(in srgb,var(--red) 35%,var(--line))"><h2 style="color:var(--red)">⚠️ Tugasan lewat</h2><div class="list">' +
      lewatL.map(function (x) {
        return '<div class="row">' + checkIc(x.status, true) + '<div class="main-col"><div class="t">' + esc(x.tugasan) + '</div><div class="s">Sasaran ' + fmtD(x.sasaran) + (x.pic ? ' · ' + esc(x.pic) : '') + '</div></div></div>';
      }).join('') + '</div></div>' : '';

    var groups = {};
    C.forEach(function (x) { (groups[x.tempoh] = groups[x.tempoh] || []).push(x); });
    var order = TEMPOH.filter(function (t) { return groups[t]; }).concat(Object.keys(groups).filter(function (t) { return TEMPOH.indexOf(t) < 0; }));
    var firstOpen = order.find ? order.find(function (t) { return groups[t].some(function (x) { return x.status !== 'Selesai'; }); }) : order[0];
    var chk = '<div class="card" style="margin-top:12px"><h2>Checklist A–Z <small>' + done + ' / ' + C.length + '</small></h2>' + order.map(function (t) {
      var xs = groups[t], dn = cnt(xs, function (x) { return x.status === 'Selesai'; });
      return '<details class="cat"' + (t === firstOpen ? ' open' : '') + '><summary><div class="cat-head"><span><b>' + esc(t) + '</b><span class="chev">▶</span></span><span class="num muted">' + dn + ' / ' + xs.length + '</span></div>' +
        '<div class="bar"><i style="width:' + (ratio(dn, xs.length) * 100).toFixed(1) + '%"></i></div></summary><div class="items">' +
        xs.map(function (x) {
          return '<div class="row' + (x.status === 'Selesai' ? ' done' : '') + '">' + checkIc(x.status, x.lewat) + '<div class="main-col"><div class="t">' + esc(x.tugasan) + '</div><div class="s">' +
            (x.sasaran ? fmtD(x.sasaran) : 'tiada tarikh') + (x.pic ? ' · ' + esc(x.pic) : '') + '</div></div></div>';
        }).join('') + '</div></details>';
    }).join('') + '</div>';

    var urus = '<div class="card"><h2>📜 Urusan nikah <small>' + ur + ' / ' + M.urusan.length + '</small></h2>' + prog('Progres', ur, M.urusan.length) + '<div class="list">' +
      M.urusan.map(function (x) {
        return '<div class="row' + (x.status === 'Selesai' ? ' done' : '') + '">' + checkIc(x.status, x.lewat) + '<div class="main-col"><div class="t">' + esc(x.urusan) + '</div><div class="s">' + esc(x.pihak || '') +
          (x.sasaran ? ' · ' + fmtD(x.sasaran) : '') + '</div></div></div>';
      }).join('') + '</div></div>';

    var arahs = ['Lelaki ke Perempuan', 'Perempuan ke Lelaki'];
    var hant = '<div class="card"><h2>🎁 Hantaran <small>' + RM(sum(M.hantaran, function (x) { return x.jumlah; })) + '</small></h2>' + arahs.map(function (a) {
      var xs = M.hantaran.filter(function (x) { return x.arah === a; });
      if (!xs.length) return '';
      var g = cnt(xs, function (x) { return x.status === 'Sudah Gubah'; }), bl = cnt(xs, function (x) { return x.status !== 'Belum Beli'; });
      return '<div class="prog"><div class="prog-head"><span><b>' + (a === arahs[0] ? 'Lelaki → Perempuan' : 'Perempuan → Lelaki') + '</b> · ' + xs.length + ' dulang</span><b class="num">' + g + ' siap</b></div>' +
        '<div class="bar gold"><i style="width:' + (ratio(g, xs.length) * 100).toFixed(1) + '%"></i></div><div class="cat-sub"><span>Sudah beli/gubah ' + bl + '</span><span>Belum beli ' + (xs.length - bl) + '</span></div></div>' +
        '<div class="items" style="margin-bottom:10px">' + xs.map(function (x) {
          return '<div class="row' + (x.status === 'Sudah Gubah' ? ' done' : '') + '">' + checkIc(x.status, false) + '<div class="main-col"><div class="t">' + esc(x.no) + '. ' + esc(x.isi) + '</div></div><div class="r">' + statusPill(x.status) + '</div></div>';
        }).join('') + '</div>';
    }).join('') + '</div>';

    return k + lw + chk + '<div class="grid gm2" style="margin-top:12px;align-items:start">' + urus + hant + '</div>';
  }

  function vHariH(M) {
    var i = M.info, s = M.salam;
    var groups = {};
    M.tentatif.forEach(function (x) { (groups[x.majlis || 'Majlis'] = groups[x.majlis || 'Majlis'] || []).push(x); });
    var order = MAJLIS.filter(function (m) { return groups[m]; }).concat(Object.keys(groups).filter(function (m) { return MAJLIS.indexOf(m) < 0; }));
    var tl = order.map(function (m) {
      var tgl = m === 'Akad Nikah' ? i.tarikhNikah : (m.indexOf('Resepsi') === 0 ? i.tarikhResepsi : '');
      return '<div class="card"><h2>' + esc(m) + (tgl ? ' <small>' + fmtD(tgl) + '</small>' : '') + '</h2><div class="tl">' + groups[m].map(function (x) {
        return '<div class="tl-item"><div class="tl-time">' + esc(x.mula) + (x.tamat ? ' – ' + esc(x.tamat) : '') + '</div><div class="tl-what">' + esc(x.aturcara) + '</div>' +
          ((x.lokasi || x.pic) ? '<div class="tl-meta">' + [x.lokasi, x.pic ? 'PIC: ' + x.pic : ''].filter(Boolean).map(esc).join(' · ') + '</div>' : '') + '</div>';
      }).join('') + '</div></div>';
    }).join('') || '<div class="card">' + empty('Isi tab Tentatif Majlis dalam Google Sheet.') + '</div>';

    var ajk = M.ajk.map(function (x) {
      var tel = String(x.telefon || '').replace(/[^\d+]/g, '');
      return '<div class="row"><div class="main-col"><div class="t">' + esc(x.unit) + '</div><div class="s">' + (x.nama ? esc(x.nama) : '<b style="color:var(--red)">belum ada AJK</b>') +
        (x.masa ? ' · ' + esc(x.masa) : '') + '</div></div><div class="r">' + (tel ? '<a class="tel" href="tel:' + esc(tel) + '">📞 Call</a>' : '') + '</div></div>';
    }).join('') || empty('Isi tab AJK & Tugasan dalam Google Sheet.');

    var k = '<div class="grid g4" style="margin-bottom:12px">' +
      kpi('Duit salam diterima', RM(s.jumlah), n(s.bil) + ' penyumbang', 'gold') +
      kpi('Belum ucap terima kasih', String(n(s.belumTerimaKasih)), 'penyumbang', n(s.belumTerimaKasih) ? 'rose' : 'sage') +
      kpi('Akad nikah', i.tarikhNikah ? fmtDs(i.tarikhNikah) : '—', i.tarikhNikah ? fmtD(i.tarikhNikah) : 'isi di Google Sheet', 'rose') +
      kpi('Resepsi', i.tarikhResepsi ? fmtDs(i.tarikhResepsi) : '—', esc(i.lokasi || ''), 'sage') + '</div>';

    return k + '<div class="grid gm2" style="align-items:start"><div class="stack">' + tl + '</div>' +
      '<div class="card"><h2>📋 AJK bertugas <small>' + cnt(M.ajk, function (x) { return x.nama; }) + ' / ' + M.ajk.length + '</small></h2><div class="list">' + ajk + '</div></div></div>';
  }

  // ---------------------------------------------------------------- demo
  function makeDemo() {
    var t = today();
    function add(days) { var d = new Date(t); d.setDate(d.getDate() + days); return iso(d); }
    var NIKAH = 150;
    var info = { lelaki: 'Ahmad', perempuan: 'Aisyah', tarikhNikah: add(NIKAH), tarikhResepsi: add(NIKAH + 1), lokasi: 'Dewan Seri Mawar, Shah Alam',
      bajetSasaran: 65000, anggaranTetamu: 500, hargaPax: 20 };
    var B = [
      ['Urusan Nikah', 'Kursus pra-perkahwinan (2 orang)', 'Bersama', 300, 300, 300, 'Selesai Bayar'],
      ['Urusan Nikah', 'Ujian saringan HIV & kesihatan', 'Bersama', 150, 120, 120, 'Selesai Bayar'],
      ['Urusan Nikah', 'Yuran pendaftaran & borang nikah', 'Bersama', 100, '', 0, 'Belum Mula'],
      ['Urusan Nikah', 'Sagu hati jurunikah / imam', 'Lelaki', 300, '', 0, 'Belum Mula'],
      ['Mas Kahwin & Hantaran', 'Mas kahwin', 'Lelaki', 300, 300, 0, 'Belum Mula'],
      ['Mas Kahwin & Hantaran', 'Wang hantaran / belanja', 'Lelaki', 10000, 10000, 5000, 'Deposit Dibayar'],
      ['Mas Kahwin & Hantaran', 'Barang isi dulang hantaran', 'Bersama', 1500, '', 400, 'Deposit Dibayar'],
      ['Mas Kahwin & Hantaran', 'Upah gubah hantaran', 'Bersama', 600, 650, 200, 'Deposit Dibayar'],
      ['Cincin & Barang Kemas', 'Cincin merisik / tunang', 'Lelaki', 1200, 1350, 1350, 'Selesai Bayar'],
      ['Cincin & Barang Kemas', 'Cincin nikah (sepasang)', 'Bersama', 2000, '', 0, 'Belum Mula'],
      ['Pakaian Pengantin', 'Baju nikah (sepasang)', 'Bersama', 1500, 1800, 900, 'Deposit Dibayar'],
      ['Pakaian Pengantin', 'Baju sanding (sewa / tempah)', 'Bersama', 1500, '', 0, 'Sudah Tempah'],
      ['Pakaian Pengantin', 'Baju sedondon keluarga', 'Bersama', 800, '', 0, 'Belum Mula'],
      ['Pakaian Pengantin', 'Kasut, tudung & aksesori', 'Bersama', 500, '', 0, 'Belum Mula'],
      ['Mekap & Andaman', 'Mak andam - hari nikah', 'Perempuan', 800, 850, 300, 'Deposit Dibayar'],
      ['Mekap & Andaman', 'Mak andam - hari resepsi', 'Perempuan', 1000, 1100, 300, 'Deposit Dibayar'],
      ['Mekap & Andaman', 'Rawatan kecantikan pra-majlis', 'Perempuan', 300, '', 0, 'Belum Mula'],
      ['Tempat / Dewan', 'Sewa dewan / masjid / homestay', 'Bersama', 3000, 3000, 1000, 'Deposit Dibayar'],
      ['Tempat / Dewan', 'Kanopi, meja & kerusi', 'Bersama', 1500, '', 0, 'Belum Mula'],
      ['Katering', 'Katering resepsi', 'Bersama', 10000, 10000, 2000, 'Deposit Dibayar'],
      ['Katering', 'Jamuan akad nikah', 'Perempuan', 1500, '', 0, 'Belum Mula'],
      ['Katering', 'Air balang / dessert table', 'Bersama', 500, '', 0, 'Belum Mula'],
      ['Pelamin & Dekorasi', 'Pelamin & dais', 'Bersama', 2500, 2800, 0, 'Sudah Tempah'],
      ['Pelamin & Dekorasi', 'Bunga tangan & bunga pahar', 'Bersama', 500, '', 0, 'Belum Mula'],
      ['Pelamin & Dekorasi', 'Dekorasi meja makan beradab', 'Bersama', 600, '', 0, 'Belum Mula'],
      ['Fotografi & Video', 'Jurugambar (nikah + resepsi)', 'Bersama', 2500, 2300, 500, 'Deposit Dibayar'],
      ['Fotografi & Video', 'Videografi / highlight', 'Bersama', 1800, '', 0, 'Belum Mula'],
      ['Fotografi & Video', 'Pre-wedding shoot', 'Bersama', 800, 750, 750, 'Selesai Bayar'],
      ['Kad Jemputan & Doorgift', 'Kad jemputan cetak / e-kad', 'Bersama', 400, 350, 350, 'Selesai Bayar'],
      ['Kad Jemputan & Doorgift', 'Doorgift / cenderahati', 'Bersama', 1500, '', 0, 'Belum Mula'],
      ['Kad Jemputan & Doorgift', 'Buku tetamu & kotak angpau', 'Bersama', 100, '', 0, 'Belum Mula'],
      ['Hiburan & PA System', 'Sistem PA / DJ / pengacara majlis', 'Bersama', 800, '', 0, 'Belum Mula'],
      ['Hiburan & PA System', 'Kompang / silat / persembahan', 'Bersama', 600, '', 0, 'Belum Mula'],
      ['Pengangkutan', 'Kereta pengantin & hiasan', 'Lelaki', 500, '', 0, 'Belum Mula'],
      ['Pengangkutan', 'Van / bas rombongan, minyak & tol', 'Bersama', 600, '', 0, 'Belum Mula'],
      ['Penginapan', 'Hotel / homestay rombongan jauh', 'Bersama', 800, '', 0, 'Belum Mula'],
      ['Bulan Madu', 'Tiket penerbangan', 'Bersama', 1500, 1280, 1280, 'Selesai Bayar'],
      ['Bulan Madu', 'Hotel & aktiviti', 'Bersama', 2000, '', 0, 'Belum Mula'],
      ['Lain-lain', 'Tip petugas & sagu hati AJK', 'Bersama', 500, '', 0, 'Belum Mula'],
      ['Lain-lain', 'Dana kecemasan (±5% bajet)', 'Bersama', 2500, '', 0, 'Belum Mula']
    ];
    var bajet = B.map(function (x) { return { kategori: x[0], item: x[1], pihak: x[2], anggaran: x[3], sebenar: x[4], dibayar: x[5], status: x[6], vendor: '' }; });
    bajet[17].vendor = 'Dewan Seri Mawar'; bajet[19].vendor = 'Katering Selera Kampung'; bajet[22].vendor = 'Pelamin Indah'; bajet[25].vendor = 'Studio Kenangan';

    var P = [
      ['Dewan Seri Mawar', 'Sewa dewan', 'Deposit', 1000, -120, true],
      ['Katering Selera Kampung', 'Katering resepsi', 'Deposit', 2000, -60, true],
      ['Studio Kenangan', 'Jurugambar', 'Deposit', 500, -45, true],
      ['Butik Seri Andam', 'Mak andam', 'Deposit', 600, -30, true],
      ['Pelamin Indah', 'Pelamin & dais', 'Deposit', 800, 5, false],
      ['Butik Nur Kasih', 'Baju nikah', 'Baki Penuh', 900, 21, false],
      ['Studio Kenangan', 'Jurugambar', 'Baki Penuh', 1800, NIKAH - 7, false],
      ['Dewan Seri Mawar', 'Sewa dewan', 'Baki Penuh', 2000, NIKAH - 14, false],
      ['Katering Selera Kampung', 'Katering resepsi', 'Baki Penuh', 8000, NIKAH - 7, false],
      ['Pelamin Indah', 'Pelamin & dais', 'Baki Penuh', 2000, NIKAH - 3, false]
    ];
    var bayaran = P.map(function (x) {
      return { vendor: x[0], perkara: x[1], peringkat: x[2], amaun: x[3], tarikhAkhir: add(x[4]), tarikhBayar: x[5] ? add(x[4] - 2) : '', kaedah: 'Online Transfer', status: x[5] ? 'Sudah Bayar' : 'Belum Bayar' };
    });
    var vendor = [
      { kategori: 'Tempat / Dewan', nama: 'Dewan Seri Mawar', pakej: 'Dewan 600 pax + aircond', harga: 3000, rating: 5, keputusan: 'Dipilih' },
      { kategori: 'Katering', nama: 'Katering Selera Kampung', pakej: 'RM20/pax, 4 lauk + pinggan kaca', harga: 10000, rating: 5, keputusan: 'Dipilih' },
      { kategori: 'Katering', nama: 'Katering Contoh A', pakej: 'RM18/pax, 3 lauk', harga: 9000, rating: 4, keputusan: 'Tidak' },
      { kategori: 'Pelamin & Dekorasi', nama: 'Pelamin Indah', pakej: 'Pelamin + dais + bunga', harga: 2800, rating: 4, keputusan: 'Dipilih' },
      { kategori: 'Fotografi & Video', nama: 'Studio Kenangan', pakej: '2 jurugambar, album + softcopy', harga: 2300, rating: 5, keputusan: 'Dipilih' },
      { kategori: 'Mekap & Andaman', nama: 'Butik Seri Andam', pakej: 'Nikah + resepsi', harga: 1950, rating: 4, keputusan: 'Dipilih' },
      { kategori: 'Hiburan & PA System', nama: 'Bunyi Merdu PA', pakej: 'PA + DJ 4 jam', harga: 800, rating: 4, keputusan: 'Shortlist' }
    ];
    var G = [['Keluarga Pak Long Hassan', 'Lelaki', 'Keluarga', 6, 'Hadir'], ['Keluarga Mak Ngah Salmah', 'Perempuan', 'Keluarga', 5, 'Hadir'],
      ['Keluarga Pak Su Razak', 'Lelaki', 'Keluarga', 4, 'Hadir'], ['Keluarga Mak Teh Rohani', 'Perempuan', 'Keluarga', 7, 'Belum Jawab'],
      ['Rakan pejabat - Siti & suami', 'Perempuan', 'Rakan Kerja', 2, 'Hadir'], ['Rakan pejabat - Faizal', 'Lelaki', 'Rakan Kerja', 1, 'Tidak Hadir'],
      ['Geng universiti Ahmad', 'Lelaki', 'Kawan', 8, 'Hadir'], ['Geng sekolah Aisyah', 'Perempuan', 'Kawan', 6, 'Belum Jawab'],
      ['Jiran - Encik Kamal sekeluarga', 'Perempuan', 'Jiran', 4, 'Hadir'], ['Jiran - Puan Lim', 'Lelaki', 'Jiran', 2, 'Belum Jawab'],
      ['Dato\' Ismail & Datin', 'Lelaki', 'VIP', 2, 'Hadir'], ['Keluarga Tok Wan Kedah', 'Lelaki', 'Saudara', 9, 'Belum Jawab'],
      ['Keluarga Opah Perak', 'Perempuan', 'Saudara', 8, 'Hadir'], ['Rakan pejabat - Team Finance', 'Lelaki', 'Rakan Kerja', 6, 'Belum Jawab'],
      ['Kawan usrah Aisyah', 'Perempuan', 'Kawan', 5, 'Hadir'], ['Keluarga Pak Andak', 'Perempuan', 'Keluarga', 5, 'Tidak Hadir'],
      ['Imam & AJK surau', 'Lelaki', 'VIP', 4, 'Hadir'], ['Kawan futsal Ahmad', 'Lelaki', 'Kawan', 7, 'Belum Jawab']];
    var tetamu = G.map(function (x, k) {
      return { nama: x[0], pihak: x[1], kumpulan: x[2], pax: x[3], kad: k % 5 === 3 ? 'Tidak' : 'Ya', rsvp: x[4], paxHadir: x[4] === 'Hadir' ? x[3] : '',
        majlis: x[1] === 'Lelaki' ? 'Resepsi Pihak Lelaki' : 'Resepsi Pihak Perempuan', meja: x[4] === 'Hadir' ? String(k + 1) : '' };
    });
    var TASKS = {
      '12 Bulan Sebelum': ['Bincang & tetapkan tarikh dengan kedua-dua keluarga', 'Tetapkan jumlah bajet & sumber dana', 'Buka akaun simpanan khas kahwin', 'Majlis merisik / bertunang', 'Persetujuan wang hantaran & mas kahwin', 'Tetapkan konsep & tema majlis', 'Anggar bilangan tetamu', 'Survey & tempah dewan / lokasi'],
      '9-11 Bulan Sebelum': ['Hadiri kursus pra-perkahwinan', 'Survey & tempah katering (buat food tasting)', 'Tempah jurugambar & videografer', 'Tempah pelamin & dekorasi', 'Tempah mak andam', 'Senarai kasar tetamu kedua-dua pihak'],
      '6-8 Bulan Sebelum': ['Buat ujian saringan HIV', 'Tempah / cari baju nikah & sanding', 'Beli cincin nikah', 'Tempah kad jemputan / design e-kad', 'Tempah doorgift', 'Tempah PA system / pengacara / kompang', 'Rancang & tempah bulan madu', 'Pre-wedding photoshoot'],
      '3-5 Bulan Sebelum': ['Hantar borang permohonan nikah ke pejabat agama', 'Dapatkan pengesahan wali & saksi', 'Tetapkan jurunikah & tarikh akad', 'Muktamadkan senarai tetamu', 'Beli barang hantaran & tempah penggubah', 'Fitting baju pertama', 'Lantik AJK majlis & bahagikan tugas', 'Tempah kereta pengantin & pengangkutan rombongan'],
      '1-2 Bulan Sebelum': ['Edar kad jemputan / e-kad', 'Susun tentatif majlis penuh', 'Sahkan menu & bilangan pax dengan katering', 'Fitting baju akhir', 'Beli kasut, aksesori & barang peribadi', 'Semak baki bayaran semua vendor', 'Rawatan kulit / kesihatan pra-majlis', 'Tempah hotel / homestay rombongan jauh'],
      '2 Minggu Sebelum': ['Follow-up RSVP tetamu', 'Pelan susunan meja & tempat duduk VIP', 'Taklimat AJK', 'Hantar tentatif kepada semua vendor', 'Sediakan sampul untuk tip & sagu hati', 'Siapkan gubahan hantaran'],
      '1 Minggu Sebelum': ['Sahkan masa ketibaan semua vendor', 'Latihan (rehearsal) lafaz akad nikah', 'Sediakan beg kecemasan', 'Ambil baju pengantin', 'Siapkan mas kahwin & dokumen nikah', 'Rehat & jaga kesihatan'],
      'Sehari Sebelum': ['Pasang pelamin & dekorasi', 'Berinai (jika ada)', 'Semak semua barang & dokumen', 'Tidur awal'],
      'Hari Majlis': ['Sarapan & bersiap ikut jadual mak andam', 'Bawa IC, dokumen nikah & mas kahwin', 'Akad nikah', 'Sesi bergambar keluarga', 'Majlis resepsi / bersanding', 'Bayar baki vendor & beri sagu hati'],
      'Selepas Majlis': ['Kira & rekod duit salam', 'Hantar ucapan terima kasih kepada tetamu', 'Pulangkan barang sewa', 'Daftar & ambil sijil / kad nikah', 'Kemas kini status perkahwinan', 'Semak laporan bajet akhir', 'Terima gambar & video dari vendor']
    };
    var OFF = [-365, -300, -210, -120, -45, -14, -7, -1, 0, 14];
    var checklist = [], j = 0;
    TEMPOH.forEach(function (tp, ti) {
      TASKS[tp].forEach(function (tk) {
        var dd = NIKAH + OFF[ti], st = 'Belum';
        if (dd < -20) st = 'Selesai';
        else if (dd < 0) st = (j % 3 === 0) ? 'Belum' : (j % 3 === 1 ? 'Selesai' : 'Dalam Proses');
        else if (dd < 30 && j % 4 === 0) st = 'Dalam Proses';
        checklist.push({ tempoh: tp, tugasan: tk, pic: j % 4 === 0 ? 'Ahmad' : (j % 4 === 1 ? 'Aisyah' : ''), sasaran: add(dd), status: st, siap: '' });
        j++;
      });
    });
    var U = ['Sijil kursus pra-perkahwinan', 'Ujian saringan HIV / kesihatan', 'Borang permohonan kebenaran berkahwin', 'Salinan kad pengenalan pengantin',
      'Gambar berukuran passport', 'Pengesahan pemastautin', 'Salinan IC & maklumat wali', 'Salinan IC 2 orang saksi', 'Kebenaran rentas negeri / daerah',
      'Bayaran pendaftaran nikah', 'Temuduga / pengesahan pegawai agama', 'Tetapkan jurunikah / juru akad', 'Sediakan mas kahwin ikut kadar negeri',
      'Pendaftaran perkahwinan & ambil sijil nikah'];
    var urusan = U.map(function (x, k) { return { urusan: x, pihak: k === 6 ? 'Perempuan' : (k > 10 && k < 13 ? 'Lelaki' : 'Bersama'), sasaran: add(k < 5 ? -40 + k * 5 : 20 + k * 6), status: k < 5 ? 'Selesai' : (k < 7 ? 'Dalam Proses' : 'Belum') }; });
    var HL = ['Wang hantaran / mas kahwin', 'Cincin', 'Sirih junjung', 'Telekung & sejadah', 'Kasut & beg tangan', 'Set mekap / skincare', 'Kain pasang / pakaian', 'Coklat / kek', 'Buah-buahan / kuih'];
    var HP = ['Sirih junjung', 'Baju Melayu & samping', 'Kasut & tali pinggang', 'Jam tangan / dompet', 'Songkok / perfume', 'Kek', 'Coklat', 'Buah-buahan', 'Kuih tradisional', 'Al-Quran / sejadah', 'Wajik / halwa'];
    var hantaran = HL.map(function (x, k) { return { arah: 'Lelaki ke Perempuan', no: k + 1, isi: x, jumlah: 120, status: k < 2 ? 'Sudah Gubah' : (k < 5 ? 'Sudah Beli' : 'Belum Beli') }; })
      .concat(HP.map(function (x, k) { return { arah: 'Perempuan ke Lelaki', no: k + 1, isi: x, jumlah: 100, status: k < 3 ? 'Sudah Beli' : 'Belum Beli' }; }));
    var tentatif = [['Akad Nikah', '7:00 AM', '8:30 AM', 'Pengantin bersiap (mak andam)', 'Rumah pengantin perempuan', 'Butik Seri Andam'],
      ['Akad Nikah', '9:00 AM', '9:30 AM', 'Rombongan lelaki tiba & sesi suai kenal', 'Masjid Al-Hidayah', 'Pak Long Hassan'],
      ['Akad Nikah', '9:30 AM', '10:00 AM', 'Khutbah nikah & lafaz akad', 'Masjid Al-Hidayah', 'Jurunikah'],
      ['Akad Nikah', '10:00 AM', '10:30 AM', 'Doa, sarung cincin & batal air sembahyang', 'Masjid Al-Hidayah', ''],
      ['Akad Nikah', '10:30 AM', '12:00 PM', 'Jamuan & sesi bergambar', 'Dewan masjid', 'Studio Kenangan'],
      ['Resepsi Pihak Perempuan', '11:00 AM', '11:45 AM', 'Tetamu mula hadir & jamuan dibuka', 'Dewan Seri Mawar', 'Katering Selera Kampung'],
      ['Resepsi Pihak Perempuan', '12:30 PM', '1:00 PM', 'Ketibaan pengantin (kompang / silat)', 'Dewan Seri Mawar', 'Ketua kompang'],
      ['Resepsi Pihak Perempuan', '1:00 PM', '1:30 PM', 'Bersanding & renjis-renjis', 'Pelamin', 'Pengacara'],
      ['Resepsi Pihak Perempuan', '1:30 PM', '2:30 PM', 'Makan beradab & potong kek', 'Meja beradab', ''],
      ['Resepsi Pihak Perempuan', '2:30 PM', '4:00 PM', 'Sesi bergambar tetamu & bersurai', 'Pelamin', 'Studio Kenangan']
    ].map(function (x) { return { majlis: x[0], mula: x[1], tamat: x[2], aturcara: x[3], lokasi: x[4], pic: x[5] }; });
    var ajk = [['Pengerusi / penyelaras majlis', 'Pak Long Hassan', '012-3456789', '8:00 AM - 5:00 PM'], ['Penyambut tetamu', 'Kak Ros & Mak Ngah', '013-2223344', '10:30 AM - 3:00 PM'],
      ['Urusan meja beradab & VIP', 'Pak Su Razak', '019-8887766', ''], ['Kaunter doorgift & buku tetamu', 'Adik Farah', '011-12345678', ''],
      ['Penjaga kotak duit salam', 'Mak Teh Rohani', '017-5554433', ''], ['Urusan katering & pinggan', '', '', ''],
      ['Urusan pengantin (pengapit)', 'Nabila', '018-7776655', ''], ['Pengangkutan & parkir', 'Hafiz & Amin', '016-2345678', ''],
      ['Urusan rombongan & hantaran', 'Pak Andak', '012-9998877', ''], ['Kebersihan & keceriaan', '', '', ''],
      ['Siaraya / PA system', 'Bunyi Merdu PA', '014-3332211', ''], ['Kewangan (bayar vendor & tip)', 'Aisyah', '', '']
    ].map(function (x) { return { unit: x[0], nama: x[1], telefon: x[2], majlis: '', masa: x[3] }; });
    var bulanan = [];
    for (var m = -8; m <= 4; m++) {
      var d = new Date(t.getFullYear(), t.getMonth() + m, 1);
      bulanan.push({ bulan: iso(d), sasaran: 3500, lelaki: '', perempuan: '', jumlah: m <= 0 ? [3000, 3600, 3500, 4000, 2800, 3700, 3500, 3900, 1500][m + 8] : '' });
    }
    var rsvpOnline = [['Keluarga Encik Ali', 'Hadir', 4, 'Selamat pengantin baru! Semoga bahagia hingga ke Jannah.'], ['Nurul & suami', 'Hadir', 2, 'Barakallahu lakuma wa baraka alaikuma.'],
      ['Cikgu Rahman', 'Tidak Hadir', 0, 'Maaf tidak dapat hadir. Semoga majlis berjalan lancar.'], ['Geng Pejabat', 'Hadir', 5, ''], ['Kak Long Mira', 'Hadir', 3, 'Tahniah adik!']]
      .map(function (x, k) { return { masa: add(-6 + k) + ' 10:0' + k, nama: x[0], hadir: x[1], pax: x[2], slot: '', ucapan: x[3] }; });
    return { info: info, bajet: bajet, bayaran: bayaran, vendor: vendor, tetamu: tetamu, rsvpOnline: rsvpOnline, checklist: checklist, urusan: urusan,
      hantaran: hantaran, tentatif: tentatif, ajk: ajk, salam: { jumlah: 0, bil: 0, belumTerimaKasih: 0 },
      simpanan: { sumberDana: 8000, bulanan: bulanan } };
  }

  // ---------------------------------------------------------------- edit (tulis ke Google Sheet)
  var ED_TABLES = [['bajet', '💰 Bajet'], ['bayaran', '🧾 Bayaran'], ['tetamu', '👥 Tetamu'], ['checklist', '✅ Checklist'],
    ['urusan', '📜 Urusan Nikah'], ['hantaran', '🎁 Hantaran'], ['vendor', '🤝 Vendor'], ['tentatif', '🕰️ Tentatif'], ['ajk', '📋 AJK'],
    ['salam', '🧧 Duit Salam'], ['simpanan', '🏦 Simpanan'], ['rsvp', '💌 RSVP Online'], ['maklumat', '💍 Maklumat Majlis']];
  var E = { t: 'bajet', cache: {}, at: {}, q: '', loading: false, err: '', cur: null };
  var ED_MSG = {
    WRONG_PIN: 'PIN telah berubah. Sila masukkan PIN semula.',
    LOCKED: 'Terlalu banyak cubaan PIN salah. Cuba lagi selepas 15 minit.',
    CHANGED: 'Rekod ini telah berubah dalam Google Sheet. Senarai dimuat semula, sila cuba lagi.',
    FULL: 'Jadual ini sudah penuh. Tambah baris baharu terus dalam Google Sheet.',
    READ_ONLY: 'Ini laman demo, jadi perubahan tidak disimpan. Dalam dashboard anda sendiri, butang ini menyimpan terus ke Google Sheet.',
    TOO_MANY: 'Terlalu banyak simpanan dalam masa singkat. Tunggu seminit.',
    BUSY: 'Google Sheet sedang sibuk. Cuba lagi sebentar.',
    NETWORK: 'Tiada sambungan internet. Cuba lagi.',
    SCRIPT_NOT_PUBLIC: 'Google Sheet tidak membalas. Cuba lagi sebentar.',
    NO_SHEET: 'Tab tidak dijumpai dalam Google Sheet: ',
    NO_COLUMN: 'Kolum tidak dijumpai dalam Google Sheet: ',
    KEY_REQUIRED: 'Sila isi: ',
    INVALID_FIELD: 'Nilai tidak sah untuk: ',
    TOO_LONG: 'Teks terlalu panjang.',
    OLD_SCRIPT: 'Skrip dalam Google Sheet anda versi lama. Kemas kini skrip (rujuk panduan) untuk guna ciri Edit.'
  };
  function edMsg(res) {
    var c = (res && res.code) || 'NETWORK', m = ED_MSG[c] || ('Ralat: ' + c);
    return /: $/.test(m) && res && res.message ? m + res.message : m;
  }
  function editApi(body) {
    body.pin = PIN;
    return fetch('/api/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return (r.headers.get('content-type') || '').indexOf('json') >= 0 ? r.json() : { ok: false, code: 'NETWORK' }; })
      .catch(function () { return { ok: false, code: 'NETWORK' }; });
  }
  var toastT;
  function toast(m) {
    var t = $('#toast'); t.textContent = m; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  function loadEdit(force) {
    if (MODE === 'demo') { renderEdit(); return; }
    var t = E.t;
    if (!force && E.cache[t] && Date.now() - E.at[t] < 60000) { renderEdit(); return; }
    E.loading = true; E.err = ''; renderEdit();
    editApi({ op: 'get', t: t }).then(function (res) {
      if (res && res.code === 'WRONG_PIN') { E.loading = false; handle(res, false, true); return; }
      if (res && res.ok && res.fields) { E.cache[t] = res; E.at[t] = Date.now(); }
      if (E.t !== t) return;
      E.loading = false;
      E.err = res && res.ok ? (res.fields ? '' : ED_MSG.OLD_SCRIPT) : edMsg(res);
      renderEdit();
    });
  }

  function edField(d, h) {
    for (var i = 0; i < d.fields.length; i++) if (d.fields[i].h === h) return d.fields[i];
    return { h: h, type: 'text' };
  }
  function edFmt(f, v) {
    if (blank(v)) return '';
    if (f.type === 'num') return /RM/.test(f.h) ? RM(v) : String(v);
    if (f.type === 'date') return fmtD(v);
    return String(v);
  }

  function renderEdit() {
    var chips = '<div class="chips" id="edChips">' + ED_TABLES.map(function (x) {
      return '<button type="button" data-t="' + x[0] + '" class="' + (x[0] === E.t ? 'on' : '') + '">' + esc(x[1]) + '</button>';
    }).join('') + '</div>';
    var body, d = E.cache[E.t];
    if (MODE === 'demo') {
      body = '<div class="card">' + empty('Mod demo: sambungkan Google Sheet anda dahulu. Selepas itu anda boleh tambah dan kemas kini data terus dari sini.') + '</div>';
    } else if (E.loading && !d) {
      body = '<div class="card" style="display:flex;gap:12px;align-items:center"><div class="spinner"></div><span class="muted">Memuatkan dari Google Sheet…</span></div>';
    } else if (E.err) {
      body = '<div class="card"><p class="empty" style="color:var(--red)">' + esc(E.err) + '</p><button type="button" class="btn ghost" data-act="reload">Cuba lagi</button></div>';
    } else if (d && d.single) {
      var r0 = d.rows[0] || { v: {} };
      body = '<div class="card"><h2>' + esc(d.label) + '</h2><div class="list">' + d.fields.map(function (f) {
        return '<div class="row"><div class="main-col"><div class="s">' + esc(f.h) + '</div><div class="t">' + (esc(edFmt(f, r0.v[f.h])) || '—') + '</div></div></div>';
      }).join('') + '</div><button type="button" class="btn primary" data-act="edit0" style="margin-top:12px">✏️ Edit maklumat majlis</button></div>';
    } else if (d) {
      var q = E.q.toLowerCase();
      var rows = d.rows.filter(function (r) {
        if (!q) return true;
        return (r.k + ' ' + d.show.map(function (h) { return r.v[h]; }).join(' ')).toLowerCase().indexOf(q) >= 0;
      });
      var list = rows.slice(0, 300).map(function (r) {
        var sub = d.show.map(function (h) { return edFmt(edField(d, h), r.v[h]); }).filter(Boolean).join(' · ');
        return '<div class="row tap" data-r="' + r.r + '"><div class="main-col"><div class="t">' + esc(r.k) + '</div>' +
          (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div><span class="go">›</span></div>';
      }).join('');
      body = '<div class="card"><h2>' + esc(d.label) + ' <small>' + d.rows.length + ' rekod' + (E.loading ? ' · memuat semula…' : '') + '</small></h2>' +
        '<div class="edit-bar"><input id="eq" class="search" type="search" placeholder="Cari…" value="' + esc(E.q) + '" autocomplete="off">' +
        (d.add ? '<button type="button" class="btn add" data-act="add">+ Tambah</button>' : '') + '</div>' +
        '<div class="list" style="margin-top:6px">' + (list || empty(q ? 'Tiada padanan.' : 'Belum ada rekod.' + (d.add ? ' Tekan + Tambah.' : ''))) + '</div>' +
        (rows.length > 300 ? '<p class="muted small">Memaparkan 300 rekod pertama. Guna carian untuk rekod lain.</p>' : '') + '</div>';
    } else {
      body = '';
    }
    $('#v-edit').innerHTML = '<p class="edit-hint muted">Pilih bahagian, tekan rekod untuk edit, atau tekan <b>+ Tambah</b>. Semua perubahan disimpan terus ke Google Sheet anda.</p>' + chips + body;
    var on = $('#edChips .on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function openForm(row) {
    var d = E.cache[E.t];
    if (!d) return;
    E.cur = { r: row ? row.r : 0, k: row ? row.k : '', isNew: !row, orig: row ? row.v : {} };
    $('#editTitle').textContent = (row || d.single ? 'Edit · ' : 'Tambah · ') + d.label;
    var html = d.fields.map(function (f, i) {
      var v = row ? row.v[f.h] : '';
      if (v === null || v === undefined) v = '';
      var id = 'ef' + i, attr = ' id="' + id + '" data-h="' + esc(f.h) + '"';
      if (f.lock) return '<div class="fld ro"><label>' + esc(f.h) + ' <small>(automatik)</small></label><div>' + (esc(edFmt(f, v)) || '—') + '</div></div>';
      var input;
      if (f.type === 'list') {
        var opts = (f.options || []).slice();
        if (v !== '' && opts.indexOf(String(v)) < 0) opts.unshift(String(v));
        input = '<select' + attr + '><option value="">—</option>' + opts.map(function (o) {
          return '<option' + (String(o) === String(v) ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'num') {
        input = '<input' + attr + ' type="number" inputmode="decimal" step="any"' + (f.min !== undefined ? ' min="' + f.min + '"' : '') +
          (f.max !== undefined ? ' max="' + f.max + '"' : '') + ' value="' + esc(v) + '">';
      } else if (f.type === 'date') {
        input = '<input' + attr + ' type="date" value="' + esc(v) + '">';
      } else if (f.type === 'time') {
        input = '<input' + attr + ' type="time" value="' + esc(v) + '">';
      } else {
        input = '<input' + attr + ' type="text" maxlength="200" value="' + esc(v) + '">';
      }
      return '<div class="fld' + (f.h === d.key ? ' req' : '') + '"><label for="' + id + '">' + esc(f.h) + '</label>' + input + '</div>';
    }).join('');
    if (row) html += (d.ro || []).map(function (h) {
      return '<div class="fld ro"><label>' + esc(h) + ' <small>(automatik)</small></label><div>' + (esc(row.v[h]) || '—') + '</div></div>';
    }).join('');
    $('#editFields').innerHTML = html;
    $('#editErr').textContent = '';
    $('#editDel').hidden = !row || !d.clear;
    $('#editSave').disabled = false; $('#editSave').textContent = '💾 Simpan ke Google Sheet';
    $('#editDlg').showModal();
    if (!row) { var first = $('#editFields input, #editFields select'); if (first) setTimeout(function () { first.focus(); }, 50); }
  }

  function edSave(op, f) {
    var btn = op === 'clear' ? $('#editDel') : $('#editSave'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Menyimpan…'; $('#editErr').textContent = '';
    editApi({ op: op, t: E.t, r: E.cur.r, k: E.cur.k, f: f }).then(function (res) {
      btn.disabled = false; btn.textContent = label;
      if (res && res.ok && res.version) {
        $('#editDlg').close();
        toast(op === 'clear' ? 'Rekod dipadam dari Google Sheet ✓' : 'Disimpan ke Google Sheet ✓');
        loadEdit(true); refresh();
        return;
      }
      if (res && res.ok) { $('#editErr').textContent = ED_MSG.OLD_SCRIPT; return; }
      if (res && res.code === 'WRONG_PIN') { $('#editDlg').close(); handle(res, false, true); return; }
      $('#editErr').textContent = edMsg(res);
      if (res && res.code === 'CHANGED') loadEdit(true);
    });
  }

  $('#editForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var d = E.cache[E.t], cur = E.cur, f = {}, bad = '';
    $$('#editFields [data-h]').forEach(function (inp) {
      var h = inp.dataset.h, v = inp.value.trim();
      if (inp.validity && !inp.validity.valid) bad = bad || h;
      var o = cur.orig[h]; o = o === null || o === undefined ? '' : String(o);
      if (cur.isNew ? v !== '' : v !== o) f[h] = v;
    });
    if (bad) { $('#editErr').textContent = 'Nilai tidak sah untuk: ' + bad; return; }
    if (d.key && (cur.isNew ? !f[d.key] : f[d.key] === '')) { $('#editErr').textContent = 'Sila isi: ' + d.key; return; }
    if (!Object.keys(f).length) { $('#editDlg').close(); toast('Tiada perubahan'); return; }
    edSave(cur.isNew ? 'add' : 'update', f);
  });
  $('#editDel').addEventListener('click', function () {
    if (!E.cur || E.cur.isNew) return;
    if (!confirm('Padam rekod "' + E.cur.k + '" dari Google Sheet?\n\nKolum automatik (formula) tidak akan terjejas.')) return;
    edSave('clear', {});
  });
  $('#v-edit').addEventListener('click', function (e) {
    var chip = e.target.closest('#edChips button');
    if (chip) { E.t = chip.dataset.t; E.q = ''; loadEdit(false); return; }
    var act = e.target.closest('[data-act]');
    if (act) {
      var a = act.dataset.act;
      if (a === 'reload') loadEdit(true);
      if (a === 'add') openForm(null);
      if (a === 'edit0') { var d0 = E.cache[E.t]; if (d0) openForm(d0.rows[0] || { r: 0, k: '', v: {} }); }
      return;
    }
    var row = e.target.closest('.row.tap');
    if (row) {
      var d = E.cache[E.t], r = Number(row.dataset.r);
      for (var i = 0; d && i < d.rows.length; i++) if (d.rows[i].r === r) { openForm(d.rows[i]); break; }
    }
  });
  $('#v-edit').addEventListener('input', function (e) {
    if (e.target.id !== 'eq') return;
    E.q = e.target.value; var pos = e.target.selectionStart; renderEdit();
    var q = $('#eq'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} }
  });

  // ---------------------------------------------------------------- events
  $('#lockForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pin = $('#pin').value.trim();
    if (pin.length < 6) { $('#lockMsg').textContent = 'PIN sekurang-kurangnya 6 aksara.'; return; }
    var btn = $('#lockBtn'); btn.disabled = true; btn.textContent = 'Menyemak… (5–10 saat)'; $('#lockMsg').textContent = '';
    fetchData(pin).then(function (res) {
      if (res.ok) { PIN = pin; store.del('pn_pin'); store.set('pn_pin', pin, $('#remember').checked); $('#pin').value = ''; }
      handle(res, true, false);
    });
  });
  $('#pinToggle').addEventListener('click', function () { var i = $('#pin'); i.type = i.type === 'password' ? 'text' : 'password'; });
  $('#nav').addEventListener('click', function (e) { var b = e.target.closest('button[data-view]'); if (b) go(b.dataset.view); });
  $('#refreshBtn').addEventListener('click', refresh);
  $('#menuBtn').addEventListener('click', function () {
    $('#versionInfo').textContent = MODE === 'demo' ? 'Mod demo · data contoh' : 'Disambung ke Google Sheet · ' + (DATA && DATA.info ? '' : '');
    $('#logoutBtn').hidden = MODE === 'demo';
    $('#menu').showModal();
  });
  $('#howBtn').addEventListener('click', function () { $('#help').showModal(); });
  $('#helpBtn').addEventListener('click', function () { $('#menu').close(); $('#help').showModal(); });
  $('#inviteBtn').addEventListener('click', function () { $('#menu').close(); window.open('/jemputan', '_blank', 'noopener'); });
  $('#inviteCopy').addEventListener('click', function () {
    var link = location.origin + '/jemputan';
    $('#menu').close();
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { alert('Link jemputan disalin: ' + link); }, function () { prompt('Salin link jemputan:', link); });
  });
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; });
  $('#installBtn').addEventListener('click', function () {
    $('#menu').close();
    if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } else $('#install').showModal();
  });
  $('#logoutBtn').addEventListener('click', function () { store.del('pn_pin'); PIN = ''; DATA = null; E.cache = {}; $('#menu').close(); showLock('Dashboard dikunci.'); });
  $$('dialog').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  });
  $('#views').addEventListener('click', function (e) {
    var b = e.target.closest('.seg button');
    if (!b) return;
    var s = b.parentNode.dataset.seg;
    if (s === 'bayar') F.bayar = b.dataset.v;
    if (s === 'tetamu') F.tetamu = b.dataset.v;
    render();
  });
  $('#views').addEventListener('input', function (e) {
    if (e.target.id !== 'q') return;
    F.q = e.target.value; var pos = e.target.selectionStart; render();
    var q = $('#q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} }
  });
  setInterval(function () { if (MODE === 'live' && DATA && document.visibilityState === 'visible') refresh(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && MODE === 'live' && DATA && LAST && Date.now() - LAST > 2 * 60 * 1000) refresh();
  });

  // ---------------------------------------------------------------- start
  var h = (location.hash || '').replace('#', '');
  if (['utama', 'bajet', 'bayaran', 'tetamu', 'persiapan', 'harih', 'edit'].indexOf(h) >= 0) go(h);
  PIN = store.get('pn_pin') || '';
  var hadPin = !!PIN;
  fetchData(PIN).then(function (res) { handle(res, false, hadPin); });
})();
