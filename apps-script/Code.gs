/** @OnlyCurrentDoc */
/**
 * Planner Nikah A–Z — Sambungan Dashboard Web & Jemputan Digital (RSVP)
 * Created by Hizami Radzi
 *
 * Skrip ini:
 *  - Membenarkan DASHBOARD anda membaca ringkasan data (perlu PIN di tab Dashboard, sel C13).
 *  - Membenarkan JEMPUTAN DIGITAL membaca butiran majlis dari tab "Jemputan Digital" (tanpa PIN).
 *  - Menyimpan jawapan RSVP tetamu ke tab "RSVP Online".
 *  - Membenarkan anda KEMAS KINI data dari dashboard (perlu PIN; hanya kolum input, formula tidak disentuh).
 *  - Hanya fail ini sahaja yang boleh dibaca / ditulis (@OnlyCurrentDoc).
 *  - Nombor telefon tetamu TIDAK dihantar ke dashboard atau jemputan.
 *
 * JANGAN ubah kod ini. Ikut panduan "Cara Sambung Dashboard" & "Cara Guna Jemputan Digital".
 */

var VERSION = '2.1';
var PIN_SHEET = 'Dashboard';
var PIN_CELL = 'C13';
var MAX_FAILS = 10;
var LOCK_SECONDS = 900;
var INVITE_SHEET = 'Jemputan Digital';
var RSVP_SHEET = 'RSVP Online';
var RSVP_HEAD_ROW = 6;
var RSVP_MAX_ROWS = 5000;

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return json_({ ok: true, app: 'planner-nikah', version: VERSION });
  try {
    if (p.action === 'invite') return json_(inviteGet_());
    if (p.action === 'rsvp') return json_(rsvpSave_(p));
  } catch (err) {
    return json_({ ok: false, code: 'READ_ERROR', message: String(err && err.message || err) });
  }

  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return json_({ ok: false, code: 'LOCKED' });

  var ss = SpreadsheetApp.getActive();
  var pinSheet = ss.getSheetByName(PIN_SHEET);
  var pin = pinSheet ? String(pinSheet.getRange(PIN_CELL).getDisplayValue()).trim() : '';
  if (pin.length < 6) return json_({ ok: false, code: 'PIN_NOT_SET' });

  if (String(p.pin || '').trim() !== pin) {
    cache.put('fails', String(fails + 1), LOCK_SECONDS);
    return json_({ ok: false, code: 'WRONG_PIN' });
  }

  try {
    if (p.action === 'edit') return json_(editGet_(ss, p.t));
    if (p.action === 'save') return json_(editSave_(ss, p));
    return json_({ ok: true, version: VERSION, updated: new Date().toISOString(), data: collect_(ss) });
  } catch (err) {
    return json_({ ok: false, code: 'READ_ERROR', message: String(err && err.message || err) });
  }
}

/** Jalankan dari editor (butang Run) untuk semak skrip boleh baca data anda. */
function ujiSambungan() {
  var d = collect_(SpreadsheetApp.getActive());
  var j = inviteGet_();
  Logger.log('OK! Pengantin: ' + d.info.lelaki + ' & ' + d.info.perempuan +
    ' | Item bajet: ' + d.bajet.length + ' | Tetamu: ' + d.tetamu.length +
    ' | RSVP online: ' + d.rsvpOnline.length + ' | Reka jemputan: ' + (j.data && j.data.reka));
}

// =========================================================================
// JEMPUTAN DIGITAL (awam, tanpa PIN — hanya maklumat jemputan)
// =========================================================================

var REKA = { 'Lavender Kasih': 'lavender', 'Ivory Emas': 'ivory', 'Gerbang Nur': 'gerbang', 'Zamrud Songket': 'zamrud' };

function inviteGet_() {
  var ss = SpreadsheetApp.getActive();
  var tz = ss.getSpreadsheetTimeZone();
  var cfg = readInviteConfig_(ss, tz);
  if (!cfg) return { ok: false, code: 'NO_INVITE_TAB' };

  var tentatif = [];
  if (cfg.tentatif && cfg.tentatif !== 'Tidak papar') {
    rows_(ss, 'Tentatif Majlis', 6, tz, { majlis: 'Majlis', mula: 'Masa Mula', tamat: 'Masa Tamat', aturcara: 'Aturcara', lokasi: 'Lokasi' }, 'aturcara')
      .forEach(function (r) { if (r.majlis === cfg.tentatif) tentatif.push({ mula: str_(r.mula), tamat: str_(r.tamat), aturcara: str_(r.aturcara) }); });
  }

  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var rsvpOpen = cfg.rsvpBuka !== 'Tidak' && (!cfg.rsvpTutup || today <= cfg.rsvpTutup);
  var ucapan = [];
  if (cfg.paparUcapan !== 'Tidak') {
    var list = rows_(ss, RSVP_SHEET, RSVP_HEAD_ROW, tz, { masa: 'Masa', nama: 'Nama', ucapan: 'Ucapan', papar: 'Papar Ucapan?' }, 'nama');
    for (var i = list.length - 1; i >= 0 && ucapan.length < 40; i--) {
      var u = list[i];
      if (str_(u.ucapan) && u.papar !== 'Tidak') ucapan.push({ nama: str_(u.nama).slice(0, 60), ucapan: str_(u.ucapan).slice(0, 300), masa: str_(u.masa).slice(0, 10) });
    }
  }

  var hubungi = [];
  [[cfg.wakil1, cfg.tel1], [cfg.wakil2, cfg.tel2]].forEach(function (w) {
    var tel = String(w[1] || '').replace(/[^\d+]/g, '');
    if (w[0] && tel) hubungi.push({ nama: w[0], tel: tel });
  });

  return {
    ok: true, version: VERSION,
    data: {
      reka: REKA[cfg.reka] || 'lavender',
      panggilP: cfg.panggilP, panggilL: cfg.panggilL, penuhP: cfg.penuhP, penuhL: cfg.penuhL,
      urutan: cfg.urutan === 'Lelaki & Perempuan' ? 'LP' : 'PL',
      tuanRumah: cfg.tuanRumah, ayat: cfg.ayat, majlis: cfg.majlis || 'Walimatul Urus',
      tarikh: cfg.tarikh, mula: cfg.mula, tamat: cfg.tamat,
      tempat: cfg.tempat, alamat: cfg.alamat, maps: safeUrl_(cfg.maps), waze: safeUrl_(cfg.waze),
      kodPakaian: cfg.kodPakaian, tentatif: tentatif,
      rsvp: { buka: rsvpOpen, tutup: cfg.rsvpTutup, maxPax: Math.max(1, Math.min(20, Number(cfg.maxPax) || 5)),
              slot: String(cfg.slot || '').split(',').map(function (s) { return s.trim(); }).filter(String).slice(0, 8),
              paparUcapan: cfg.paparUcapan !== 'Tidak' },
      ucapan: ucapan, hubungi: hubungi,
      salamKaut: (cfg.bank && cfg.akaun) ? { bank: cfg.bank, akaun: String(cfg.akaun), nama: cfg.namaAkaun } : null,
      doaArab: cfg.doaArab, doaMaksud: cfg.doaMaksud, penutup: cfg.penutup
    }
  };
}

function readInviteConfig_(ss, tz) {
  var sh = ss.getSheetByName(INVITE_SHEET);
  if (!sh) return null;
  var last = sh.getLastRow();
  if (last < 4) return null;
  var rng = sh.getRange(1, 1, last, 4);
  var vals = rng.getValues(), shown = rng.getDisplayValues();
  var cfg = {};
  for (var i = 0; i < vals.length; i++) {
    var key = String(vals[i][3] || '').trim();
    if (!key) continue;
    var v = vals[i][1];
    // Tarikh -> yyyy-MM-dd; lain-lain (termasuk masa) -> teks seperti dipapar dalam sel.
    cfg[key] = (v instanceof Date && v.getFullYear() >= 1901) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(shown[i][1]).trim();
  }
  return cfg;
}

// =========================================================================
// RSVP (awam — dengan had & pengesahan)
// =========================================================================

function rsvpSave_(p) {
  var ss = SpreadsheetApp.getActive();
  var tz = ss.getSpreadsheetTimeZone();
  var cfg = readInviteConfig_(ss, tz);
  if (!cfg) return { ok: false, code: 'NO_INVITE_TAB' };
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  if (cfg.rsvpBuka === 'Tidak' || (cfg.rsvpTutup && today > cfg.rsvpTutup)) return { ok: false, code: 'RSVP_CLOSED' };

  var nama = clean_(p.nama, 60);
  var tel = String(p.tel || '').replace(/[^\d+]/g, '').slice(0, 16);
  var hadir = p.hadir === 'Tidak Hadir' ? 'Tidak Hadir' : (p.hadir === 'Hadir' ? 'Hadir' : '');
  var maxPax = Math.max(1, Math.min(20, Number(cfg.maxPax) || 5));
  var pax = hadir === 'Hadir' ? Math.floor(Number(p.pax) || 0) : 0;
  var slots = String(cfg.slot || '').split(',').map(function (s) { return s.trim(); }).filter(String);
  var slot = hadir === 'Hadir' && slots.indexOf(String(p.slot || '')) >= 0 ? String(p.slot) : '';
  var ucapan = clean_(p.ucapan, 300);

  if (nama.length < 2 || !hadir) return { ok: false, code: 'INVALID' };
  if (hadir === 'Hadir' && (pax < 1 || pax > maxPax)) return { ok: false, code: 'INVALID_PAX', maxPax: maxPax };
  if (hadir === 'Hadir' && slots.length && !slot) return { ok: false, code: 'INVALID_SLOT' };

  var cache = CacheService.getScriptCache();
  var minuteKey = 'rsvp_m_' + Math.floor(Date.now() / 60000);
  var perMin = Number(cache.get(minuteKey) || 0);
  if (perMin >= 40) return { ok: false, code: 'BUSY' };
  var who = 'rsvp_w_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, (nama + '|' + tel).toLowerCase()));
  var mine = Number(cache.get(who) || 0);
  if (mine >= 3) return { ok: false, code: 'TOO_MANY' };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = ss.getSheetByName(RSVP_SHEET);
    if (!sh) return { ok: false, code: 'NO_RSVP_TAB' };
    if (sh.getLastRow() > RSVP_MAX_ROWS) return { ok: false, code: 'FULL' };
    var row = Math.max(sh.getLastRow() + 1, RSVP_HEAD_ROW + 1);
    // Cari baris kosong pertama (templat sudah berformat hingga baris 500).
    var names = sh.getRange(RSVP_HEAD_ROW + 1, 2, Math.max(1, sh.getMaxRows() - RSVP_HEAD_ROW), 1).getValues();
    for (var i = 0; i < names.length; i++) { if (names[i][0] === '') { row = RSVP_HEAD_ROW + 1 + i; break; } }
    sh.getRange(row, 1, 1, 8).setValues([[
      Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'), nama, tel, hadir, pax, slot, ucapan, 'Ya'
    ]]);
  } finally {
    lock.releaseLock();
  }
  cache.put(minuteKey, String(perMin + 1), 120);
  cache.put(who, String(mine + 1), 600);
  return { ok: true };
}

/** Buang aksara kawalan & elak "formula injection" dalam Google Sheet. */
function clean_(v, max) {
  var s = String(v || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function safeUrl_(u) { u = String(u || '').trim(); return /^https:\/\//i.test(u) ? u : ''; }

// =========================================================================
// DASHBOARD (perlu PIN)
// =========================================================================

function collect_(ss) {
  var tz = ss.getSpreadsheetTimeZone();
  var dash = ss.getSheetByName('Dashboard');
  var info = {
    lelaki: str_(dash.getRange('C5').getValue()),
    perempuan: str_(dash.getRange('C6').getValue()),
    tarikhNikah: date_(dash.getRange('C7').getValue(), tz),
    tarikhResepsi: date_(dash.getRange('C8').getValue(), tz),
    lokasi: str_(dash.getRange('C9').getValue()),
    bajetSasaran: num_(dash.getRange('C10').getValue()),
    anggaranTetamu: num_(dash.getRange('C11').getValue()),
    hargaPax: num_(dash.getRange('C12').getValue())
  };

  var bajet = rows_(ss, 'Bajet Utama', 6, tz, {
    kategori: 'Kategori', item: 'Item Perbelanjaan', pihak: 'Pihak', anggaran: 'Anggaran (RM)',
    sebenar: 'Kos Sebenar (RM)', dibayar: 'Dibayar (RM)', status: 'Status', vendor: 'Vendor'
  }, 'item');

  var bayaran = rows_(ss, 'Jadual Bayaran', 6, tz, {
    vendor: 'Vendor', perkara: 'Perkara', peringkat: 'Peringkat Bayaran', amaun: 'Amaun (RM)',
    tarikhAkhir: 'Tarikh Akhir', tarikhBayar: 'Tarikh Dibayar', kaedah: 'Kaedah', status: 'Status'
  }, 'vendor');

  var vendor = rows_(ss, 'Vendor', 6, tz, {
    kategori: 'Kategori', nama: 'Nama Vendor', pakej: 'Pakej / Apa Termasuk', harga: 'Sebut Harga (RM)',
    rating: 'Rating (1-5)', keputusan: 'Keputusan'
  }, 'nama');

  // Tiada nombor telefon tetamu dihantar.
  var tetamu = rows_(ss, 'Senarai Tetamu', 6, tz, {
    nama: 'Nama / Keluarga', pihak: 'Pihak', kumpulan: 'Kumpulan', pax: 'Bil. Dijemput (pax)',
    kad: 'Kad Dihantar?', rsvp: 'RSVP', paxHadir: 'Pax Sah Hadir', majlis: 'Majlis', meja: 'No. Meja'
  }, 'nama');

  var rsvpOnline = rows_(ss, RSVP_SHEET, RSVP_HEAD_ROW, tz, {
    masa: 'Masa', nama: 'Nama', hadir: 'Kehadiran', pax: 'Bil. Pax', slot: 'Slot Masa', ucapan: 'Ucapan'
  }, 'nama');

  var checklist = rows_(ss, 'Checklist A-Z', 6, tz, {
    tempoh: 'Tempoh', tugasan: 'Tugasan', pic: 'PIC', sasaran: 'Tarikh Sasaran', status: 'Status', siap: 'Tarikh Siap'
  }, 'tugasan');

  var urusan = rows_(ss, 'Urusan Nikah', 6, tz, {
    urusan: 'Dokumen / Urusan', pihak: 'Pihak', sasaran: 'Tarikh Sasaran', status: 'Status'
  }, 'urusan');

  var hantaran = rows_(ss, 'Hantaran', 6, tz, {
    arah: 'Arah Hantaran', no: 'No. Dulang', isi: 'Isi Hantaran', jumlah: 'Jumlah (RM)', status: 'Status'
  }, 'isi');

  var tentatif = rows_(ss, 'Tentatif Majlis', 6, tz, {
    majlis: 'Majlis', mula: 'Masa Mula', tamat: 'Masa Tamat', aturcara: 'Aturcara', lokasi: 'Lokasi', pic: 'PIC'
  }, 'aturcara');

  var ajk = rows_(ss, 'AJK & Tugasan', 6, tz, {
    unit: 'Unit / Tugas', nama: 'Nama AJK', telefon: 'No. Telefon', majlis: 'Majlis', masa: 'Masa Bertugas'
  }, 'unit');

  var salam = rows_(ss, 'Duit Salam', 6, tz, {
    nama: 'Nama Tetamu', pihak: 'Pihak', amaun: 'Amaun (RM)', terimaKasih: 'Terima Kasih Dihantar?'
  }, 'nama');

  var simpanan = rows_(ss, 'Simpanan', 21, tz, {
    bulan: 'Bulan', sasaran: 'Sasaran (RM)', lelaki: 'Simpan - Lelaki (RM)', perempuan: 'Simpan - Perempuan (RM)',
    jumlah: 'Jumlah Bulan Ini (RM)'
  }, 'bulan');
  var sumber = 0;
  var sim = ss.getSheetByName('Simpanan');
  if (sim) sim.getRange('C8:C15').getValues().forEach(function (r) { sumber += num_(r[0]); });

  return {
    info: info,
    bajet: bajet,
    bayaran: bayaran,
    vendor: vendor,
    tetamu: tetamu,
    rsvpOnline: rsvpOnline,
    checklist: checklist,
    urusan: urusan,
    hantaran: hantaran,
    tentatif: tentatif,
    ajk: ajk,
    salam: { jumlah: salam.reduce(function (s, r) { return s + num_(r.amaun); }, 0),
             bil: salam.length,
             belumTerimaKasih: salam.filter(function (r) { return r.terimaKasih !== 'Ya'; }).length },
    simpanan: { sumberDana: sumber, bulanan: simpanan }
  };
}

/** Baca jadual ikut nama header (tahan jika kolum dialih). */
function rows_(ss, sheetName, headerRow, tz, map, keyField) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  var last = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (last <= headerRow) return [];
  var range = sh.getRange(headerRow, 1, last - headerRow + 1, lastCol);
  var values = range.getValues();
  var shown = range.getDisplayValues();
  var head = values[0].map(function (h) { return String(h).trim(); });
  var idx = {};
  Object.keys(map).forEach(function (k) { idx[k] = head.indexOf(map[k]); });
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var o = {};
    Object.keys(idx).forEach(function (k) {
      var v = idx[k] >= 0 ? row[idx[k]] : '';
      // Masa sahaja (cth. 9:30 AM) guna teks paparan supaya tiada isu zon waktu 1899.
      o[k] = v instanceof Date ? (v.getFullYear() < 1901 ? shown[i][idx[k]] : date_(v, tz)) : v;
    });
    var key = o[keyField];
    if (key !== '' && key !== null && key !== undefined) out.push(o);
  }
  return out;
}

// =========================================================================
// KEMAS KINI DARI DASHBOARD (perlu PIN)
// Hanya kolum dalam senarai di bawah boleh ditulis. Sel yang mengandungi
// formula TIDAK akan ditulis walaupun disenaraikan.
// Jenis: text | num | date | time | list (pilihan dibaca dari dropdown sheet)
// =========================================================================

var WRITE_LIMIT = 60; // simpanan maksimum seminit

var EDIT = {
  maklumat: { label: 'Maklumat Majlis', sheet: 'Dashboard', single: true, fields: [
    ['Nama pengantin lelaki', 'text', 'C5'], ['Nama pengantin perempuan', 'text', 'C6'],
    ['Tarikh akad nikah', 'date', 'C7'], ['Tarikh resepsi', 'date', 'C8'], ['Lokasi majlis', 'text', 'C9'],
    ['Bajet sasaran (RM)', 'num', 'C10'], ['Anggaran bilangan tetamu (pax)', 'num', 'C11'], ['Harga katering / pax (RM)', 'num', 'C12']] },
  bajet: { label: 'Bajet', sheet: 'Bajet Utama', head: 6, key: 'Item Perbelanjaan', show: ['Kategori', 'Anggaran (RM)', 'Status'], fields: [
    ['Kategori', 'list'], ['Item Perbelanjaan', 'text'], ['Pihak', 'list'], ['Anggaran (RM)', 'num'], ['Kos Sebenar (RM)', 'num'],
    ['Dibayar (RM)', 'num'], ['Status', 'list'], ['Vendor', 'text'], ['Catatan', 'text']] },
  bayaran: { label: 'Bayaran', sheet: 'Jadual Bayaran', head: 6, key: 'Vendor', show: ['Perkara', 'Amaun (RM)', 'Status'], fields: [
    ['Vendor', 'text'], ['Perkara', 'text'], ['Peringkat Bayaran', 'list'], ['Amaun (RM)', 'num'], ['Tarikh Akhir', 'date'],
    ['Tarikh Dibayar', 'date'], ['Kaedah', 'list'], ['Status', 'list'], ['No. Resit / Catatan', 'text']] },
  tetamu: { label: 'Tetamu', sheet: 'Senarai Tetamu', head: 6, key: 'Nama / Keluarga', show: ['Pihak', 'Bil. Dijemput (pax)', 'RSVP'], fields: [
    ['Nama / Keluarga', 'text'], ['Pihak', 'list'], ['Kumpulan', 'list'], ['Bil. Dijemput (pax)', 'num'], ['Kad Dihantar?', 'list'],
    ['RSVP', 'list'], ['Pax Sah Hadir', 'num'], ['Majlis', 'list'], ['No. Meja', 'text'], ['Catatan', 'text']] },
  checklist: { label: 'Checklist', sheet: 'Checklist A-Z', head: 6, key: 'Tugasan', show: ['Tempoh', 'Status'], ro: ['Tarikh Sasaran'], fields: [
    ['Tempoh', 'list'], ['Tugasan', 'text'], ['PIC', 'text'], ['Status', 'list'], ['Tarikh Siap', 'date'], ['Catatan', 'text']] },
  urusan: { label: 'Urusan Nikah', sheet: 'Urusan Nikah', head: 6, key: 'Dokumen / Urusan', show: ['Pihak', 'Status'], fields: [
    ['Dokumen / Urusan', 'text'], ['Pihak', 'list'], ['Tempat / Pejabat', 'text'], ['Tarikh Sasaran', 'date'], ['Status', 'list'], ['Catatan', 'text']] },
  vendor: { label: 'Vendor', sheet: 'Vendor', head: 6, key: 'Nama Vendor', show: ['Kategori', 'Sebut Harga (RM)', 'Keputusan'], fields: [
    ['Kategori', 'list'], ['Nama Vendor', 'text'], ['PIC', 'text'], ['No. Telefon', 'text'], ['IG / Website', 'text'],
    ['Pakej / Apa Termasuk', 'text'], ['Sebut Harga (RM)', 'num'], ['Rating (1-5)', 'num', 1, 5], ['Keputusan', 'list'],
    ['Tarikh Tempah', 'date'], ['Catatan', 'text']] },
  hantaran: { label: 'Hantaran', sheet: 'Hantaran', head: 6, key: 'Isi Hantaran', show: ['Arah Hantaran', 'Status'], ro: ['Jumlah (RM)'], fields: [
    ['Arah Hantaran', 'list'], ['No. Dulang', 'num'], ['Isi Hantaran', 'text'], ['Kos Barang (RM)', 'num'], ['Kos Gubah (RM)', 'num'],
    ['Status', 'list'], ['Penggubah / PIC', 'text'], ['Catatan', 'text']] },
  tentatif: { label: 'Tentatif', sheet: 'Tentatif Majlis', head: 6, key: 'Aturcara', show: ['Majlis', 'Masa Mula'], fields: [
    ['Majlis', 'list'], ['Masa Mula', 'time'], ['Masa Tamat', 'time'], ['Aturcara', 'text'], ['Lokasi', 'text'], ['PIC', 'text'], ['Catatan', 'text']] },
  ajk: { label: 'AJK', sheet: 'AJK & Tugasan', head: 6, key: 'Unit / Tugas', show: ['Nama AJK', 'Majlis'], fields: [
    ['Unit / Tugas', 'text'], ['Nama AJK', 'text'], ['No. Telefon', 'text'], ['Majlis', 'list'], ['Masa Bertugas', 'text'], ['Catatan', 'text']] },
  salam: { label: 'Duit Salam', sheet: 'Duit Salam', head: 6, key: 'Nama Tetamu', show: ['Pihak', 'Amaun (RM)', 'Terima Kasih Dihantar?'], fields: [
    ['Nama Tetamu', 'text'], ['Hubungan', 'text'], ['Pihak', 'list'], ['Amaun (RM)', 'num'], ['Jenis', 'list'], ['Hadiah (barang)', 'text'],
    ['Terima Kasih Dihantar?', 'list'], ['Catatan', 'text']] },
  simpanan: { label: 'Simpanan', sheet: 'Simpanan', head: 21, key: 'Bulan', add: false, clear: false,
    show: ['Simpan - Lelaki (RM)', 'Simpan - Perempuan (RM)'], ro: ['Sasaran (RM)', 'Jumlah Bulan Ini (RM)'], fields: [
    ['Simpan - Lelaki (RM)', 'num'], ['Simpan - Perempuan (RM)', 'num'], ['Catatan', 'text']] },
  rsvp: { label: 'RSVP Online', sheet: RSVP_SHEET, head: RSVP_HEAD_ROW, key: 'Nama', add: false, show: ['Kehadiran', 'Bil. Pax', 'Papar Ucapan?'],
    ro: ['Masa', 'Ucapan'], fields: [
    ['Kehadiran', 'list'], ['Bil. Pax', 'num', 0, 20], ['Papar Ucapan?', 'list'], ['Catatan', 'text']] }
};

function editCols_(sh, cfg) {
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var head = sh.getRange(cfg.head, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
  var col = {};
  head.forEach(function (h, i) { if (h && !col[h]) col[h] = i + 1; });
  return col;
}

function listOptions_(cell) {
  var dv = cell.getDataValidation();
  if (!dv) return null;
  var type = dv.getCriteriaType(), c = dv.getCriteriaValues();
  var out = [];
  if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) out = c[0];
  else if (type === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    c[0].getDisplayValues().forEach(function (r) { r.forEach(function (v) { if (String(v).trim()) out.push(String(v).trim()); }); });
  } else return null;
  return out.map(String).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).slice(0, 60);
}

function editVal_(v, shown, type, tz) {
  if (type === 'date') return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : '';
  if (type === 'time') {
    var m = String(shown).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
    if (!m) return '';
    var h = Number(m[1]) % 12;
    if (!m[3]) h = Number(m[1]); else if (/p/i.test(m[3])) h += 12;
    return ('0' + h).slice(-2) + ':' + m[2];
  }
  if (type === 'num') return v === '' || v === null ? '' : (isFinite(Number(v)) ? Number(v) : '');
  return String(shown);
}

function editGet_(ss, t) {
  var cfg = EDIT[t];
  if (!cfg) return { ok: false, code: 'BAD_TABLE' };
  var sh = ss.getSheetByName(cfg.sheet);
  if (!sh) return { ok: false, code: 'NO_SHEET', message: cfg.sheet };
  var tz = ss.getSpreadsheetTimeZone();
  var base = { ok: true, version: VERSION, t: t, label: cfg.label, single: !!cfg.single,
    add: !cfg.single && cfg.add !== false, clear: !cfg.single && cfg.clear !== false, key: cfg.key || '', show: cfg.show || [] };

  if (cfg.single) {
    var v1 = {};
    base.fields = cfg.fields.map(function (f) {
      var cell = sh.getRange(f[2]);
      v1[f[0]] = editVal_(cell.getValue(), cell.getDisplayValue(), f[1], tz);
      return { h: f[0], type: f[1], lock: !!cell.getFormula() };
    });
    base.rows = [{ r: 0, k: '', v: v1 }];
    return base;
  }

  var col = editCols_(sh, cfg);
  if (!col[cfg.key]) return { ok: false, code: 'NO_COLUMN', message: cfg.key };
  var first = cfg.head + 1, last = sh.getLastRow();
  var fields = cfg.fields.filter(function (f) { return col[f[0]]; });
  base.fields = fields.map(function (f) {
    var o = { h: f[0], type: f[1] };
    if (f[1] === 'list') { var opts = listOptions_(sh.getRange(first, col[f[0]])); if (opts && opts.length) o.options = opts; else o.type = 'text'; }
    if (f[1] === 'num') { o.min = f[2] !== undefined ? f[2] : 0; o.max = f[3] !== undefined ? f[3] : 100000000; }
    return o;
  });
  base.ro = (cfg.ro || []).filter(function (h) { return col[h]; });
  base.rows = [];
  if (last >= first) {
    var n = last - first + 1, lastCol = sh.getLastColumn();
    var rg = sh.getRange(first, 1, n, lastCol), vals = rg.getValues(), shown = rg.getDisplayValues();
    var kc = col[cfg.key] - 1;
    for (var i = 0; i < n; i++) {
      var k = String(shown[i][kc]).trim();
      if (!k) continue;
      var v = {};
      fields.forEach(function (f) { var c = col[f[0]] - 1; v[f[0]] = editVal_(vals[i][c], shown[i][c], f[1], tz); });
      base.ro.forEach(function (h) { v[h] = String(shown[i][col[h] - 1]); });
      base.rows.push({ r: first + i, k: k, v: v });
    }
  }
  return base;
}

function editConvert_(raw, f, opts, tz) {
  var type = f[1], s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (s === '') return { v: '' };
  if (type === 'num') {
    var x = Number(s.replace(/[,\s]/g, '').replace(/^RM/i, ''));
    var min = f[2] !== undefined ? f[2] : 0, max = f[3] !== undefined ? f[3] : 100000000;
    if (!isFinite(x) || x < min || x > max) return { err: f[0] };
    return { v: Math.round(x * 100) / 100 };
  }
  if (type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { err: f[0] };
    return { v: Utilities.parseDate(s, tz, 'yyyy-MM-dd') };
  }
  if (type === 'time') {
    var m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return { err: f[0] };
    return { v: (Number(m[1]) * 60 + Number(m[2])) / 1440 };
  }
  if (type === 'list' && opts && opts.length) {
    return opts.indexOf(s) >= 0 ? { v: s } : { err: f[0] };
  }
  return { v: clean_(s, 200) };
}

function editSave_(ss, p) {
  var cfg = EDIT[p.t];
  if (!cfg) return { ok: false, code: 'BAD_TABLE' };
  var op = String(p.op || '');
  if (['update', 'add', 'clear'].indexOf(op) < 0) return { ok: false, code: 'INVALID' };
  var cache = CacheService.getScriptCache();
  var w = Number(cache.get('writes') || 0);
  if (w >= WRITE_LIMIT) return { ok: false, code: 'TOO_MANY' };
  cache.put('writes', String(w + 1), 60);

  var input;
  try { input = JSON.parse(String(p.f || '{}')); } catch (e) { return { ok: false, code: 'INVALID' }; }
  if (!input || typeof input !== 'object') return { ok: false, code: 'INVALID' };

  var sh = ss.getSheetByName(cfg.sheet);
  if (!sh) return { ok: false, code: 'NO_SHEET', message: cfg.sheet };
  var tz = ss.getSpreadsheetTimeZone();
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(10000)) return { ok: false, code: 'BUSY' };
  try {
    if (cfg.single) {
      if (op !== 'update') return { ok: false, code: 'INVALID' };
      var todo1 = [];
      for (var a = 0; a < cfg.fields.length; a++) {
        var f1 = cfg.fields[a];
        if (!Object.prototype.hasOwnProperty.call(input, f1[0])) continue;
        var c1 = editConvert_(input[f1[0]], f1, null, tz);
        if (c1.err) return { ok: false, code: 'INVALID_FIELD', message: c1.err };
        todo1.push([sh.getRange(f1[2]), c1.v]);
      }
      todo1.forEach(function (x) { if (!x[0].getFormula()) x[0].setValue(x[1]); });
      return { ok: true, version: VERSION, r: 0 };
    }

    var col = editCols_(sh, cfg), first = cfg.head + 1, maxRow = sh.getMaxRows();
    var kc = col[cfg.key];
    if (!kc) return { ok: false, code: 'NO_COLUMN', message: cfg.key };
    var row;
    if (op === 'add') {
      if (cfg.add === false) return { ok: false, code: 'INVALID' };
      var keys = sh.getRange(first, kc, maxRow - first + 1, 1).getDisplayValues();
      for (var i = 0; i < keys.length; i++) { if (!String(keys[i][0]).trim()) { row = first + i; break; } }
      if (!row) return { ok: false, code: 'FULL' };
    } else {
      row = Math.floor(Number(p.r));
      if (!(row >= first && row <= maxRow)) return { ok: false, code: 'INVALID' };
      var cur = String(sh.getRange(row, kc).getDisplayValue()).trim();
      if (!cur || cur !== String(p.k || '').trim()) return { ok: false, code: 'CHANGED' };
    }

    if (op === 'clear') {
      if (cfg.clear === false) return { ok: false, code: 'INVALID' };
      clearRow_(sh, row, col);
      return { ok: true, version: VERSION, r: row };
    }

    var todo = [];
    for (var j = 0; j < cfg.fields.length; j++) {
      var f = cfg.fields[j];
      if (!col[f[0]] || !Object.prototype.hasOwnProperty.call(input, f[0])) continue;
      var cell2 = sh.getRange(row, col[f[0]]);
      var opts = f[1] === 'list' ? listOptions_(cell2) : null;
      var c = editConvert_(input[f[0]], f, opts, tz);
      if (c.err) return { ok: false, code: 'INVALID_FIELD', message: c.err };
      if (f[0] === cfg.key && c.v === '') return { ok: false, code: 'KEY_REQUIRED', message: cfg.key };
      todo.push([cell2, c.v]);
    }
    if (op === 'add' && !todo.some(function (x) { return x[0].getColumn() === kc && x[1] !== ''; })) {
      return { ok: false, code: 'KEY_REQUIRED', message: cfg.key };
    }
    if (op === 'add') clearRow_(sh, row, col); // buang sisa data lama dalam baris kosong
    todo.forEach(function (x) { if (!x[0].getFormula()) x[0].setValue(x[1]); });
    return { ok: true, version: VERSION, r: row };
  } finally {
    lock.releaseLock();
  }
}

// Dropdown setiap tab: [tab, header, senarai (baris 1 tab "Senarai"), baris akhir]
var DROPDOWNS = [
  ['Bajet Utama', 'Kategori', 'Kategori', 200], ['Bajet Utama', 'Pihak', 'Pihak', 200], ['Bajet Utama', 'Status', 'StatusBajet', 200],
  ['Jadual Bayaran', 'Peringkat Bayaran', 'Peringkat', 200], ['Jadual Bayaran', 'Kaedah', 'Kaedah', 200], ['Jadual Bayaran', 'Status', 'StatusBayar', 200],
  ['Vendor', 'Kategori', 'Kategori', 200], ['Vendor', 'Keputusan', 'PilihVendor', 200],
  ['Senarai Tetamu', 'Pihak', 'Pihak', 200], ['Senarai Tetamu', 'Kumpulan', 'Kumpulan', 200], ['Senarai Tetamu', 'Kad Dihantar?', 'YaTidak', 200],
  ['Senarai Tetamu', 'RSVP', 'RSVP', 200], ['Senarai Tetamu', 'Majlis', 'Majlis', 200],
  ['Checklist A-Z', 'Tempoh', 'Tempoh', 200], ['Checklist A-Z', 'Status', 'StatusTugas', 200],
  ['Urusan Nikah', 'Pihak', 'Pihak', 60], ['Urusan Nikah', 'Status', 'StatusTugas', 60],
  ['Hantaran', 'Arah Hantaran', 'Hantaran', 60], ['Hantaran', 'Status', 'StatusBeli', 60],
  ['Tentatif Majlis', 'Majlis', 'Majlis', 100], ['AJK & Tugasan', 'Majlis', 'Majlis', 100],
  ['Duit Salam', 'Pihak', 'Pihak', 500], ['Duit Salam', 'Jenis', 'Salam', 500], ['Duit Salam', 'Terima Kasih Dihantar?', 'YaTidak', 500]
];

/** Pasang semula dropdown dalam semua tab (selamat dijalankan berulang kali; data tidak diubah). */
function setupDropdown() {
  var ss = SpreadsheetApp.getActive();
  var ls = ss.getSheetByName('Senarai');
  if (!ls) { Logger.log('Tab "Senarai" tidak dijumpai.'); return; }
  var lv = ls.getDataRange().getDisplayValues(), lists = {};
  lv[0].forEach(function (h, c) {
    var n = 0;
    for (var r = 1; r < lv.length; r++) if (String(lv[r][c]).trim()) n = r;
    if (String(h).trim() && n) lists[String(h).trim()] = ls.getRange(2, c + 1, n, 1);
  });
  var done = [], miss = [];
  DROPDOWNS.forEach(function (d) {
    var sh = ss.getSheetByName(d[0]);
    if (!sh || !lists[d[2]]) { miss.push(d[0] + ' / ' + d[1]); return; }
    var col = editCols_(sh, { head: 6 })[d[1]];
    if (!col) { miss.push(d[0] + ' / ' + d[1]); return; }
    var last = Math.min(d[3], sh.getMaxRows());
    var rule = SpreadsheetApp.newDataValidation().requireValueInRange(lists[d[2]], true).setAllowInvalid(true).build();
    sh.getRange(7, col, last - 6, 1).setDataValidation(rule);
    done.push(d[0] + ' / ' + d[1]);
  });
  var vs = ss.getSheetByName('Vendor');
  var rc = vs ? editCols_(vs, { head: 6 })['Rating (1-5)'] : 0;
  if (rc) vs.getRange(7, rc, Math.min(200, vs.getMaxRows()) - 6, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireNumberBetween(1, 5).setAllowInvalid(false).build());
  Logger.log('Dropdown dipasang: ' + done.length + (miss.length ? ' | Tidak dijumpai: ' + miss.join(', ') : ''));
}

/** Kosongkan semua sel input (bukan formula) dalam satu baris, dalam lebar jadual sahaja. */
function clearRow_(sh, row, col) {
  var lastCol = 0;
  Object.keys(col).forEach(function (h) { lastCol = Math.max(lastCol, col[h]); });
  if (!lastCol) return;
  var formulas = sh.getRange(row, 1, 1, lastCol).getFormulas()[0];
  for (var c = 0; c < lastCol; c++) {
    if (!formulas[c]) sh.getRange(row, c + 1).clearContent();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function num_(v) { var n = Number(v); return isFinite(n) ? n : 0; }
function date_(v, tz) { return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : ''; }

// =========================================================================
// SEDIAKAN TAB (dijalankan sekali oleh pembuat template)
// =========================================================================

/** Cipta tab "Jemputan Digital" & "RSVP Online" (tidak menimpa data sedia ada). */
function setupJemputan() {
  var ss = SpreadsheetApp.getActive();
  var ROSE = '#A8707B', ROSE_L = '#F7ECEE', SAGE = '#5E7F6E', INPUT = '#FFF6D5', BLUE = '#1F4FBF', MUTED = '#8A8A8A', CALC = '#F5F3F0';

  // ---------- Jemputan Digital ----------
  if (!ss.getSheetByName(INVITE_SHEET)) {
    var sh = ss.insertSheet(INVITE_SHEET);
    sh.setTabColor(ROSE).setHiddenGridlines(true);
    sh.getRange('A1:C2').setBackground(ROSE_L);
    sh.getRange('A1').setValue('💌 Jemputan Digital & RSVP').setFontSize(18).setFontWeight('bold').setFontColor(ROSE);
    sh.getRange('A2').setValue('Isi kotak kuning. Jemputan anda di: link-vercel-anda/jemputan  ·  Created by Hizami Radzi')
      .setFontStyle('italic').setFontColor(MUTED);
    sh.setRowHeight(1, 34);
    var dash = "Dashboard!";
    var rows = [
      ['h', '① REKA BENTUK'],
      ['reka', 'Reka bentuk jemputan', 'Lavender Kasih', 'Pratonton semua: …/jemputan?reka=lavender | ivory | gerbang | zamrud', ['Lavender Kasih', 'Ivory Emas', 'Gerbang Nur', 'Zamrud Songket']],
      ['h', '② PENGANTIN'],
      ['panggilP', 'Nama panggilan pengantin perempuan', '=' + dash + 'C6', 'Auto dari tab Dashboard. Boleh tulis ganti.'],
      ['panggilL', 'Nama panggilan pengantin lelaki', '=' + dash + 'C5', 'Auto dari tab Dashboard. Boleh tulis ganti.'],
      ['penuhP', 'Nama penuh pengantin perempuan', 'Nur Aisyah binti Ahmad', ''],
      ['penuhL', 'Nama penuh pengantin lelaki', 'Muhammad Ahmad bin Kamal', ''],
      ['urutan', 'Urutan nama di muka depan', 'Perempuan & Lelaki', 'Majlis pihak perempuan biasanya: Perempuan & Lelaki', ['Perempuan & Lelaki', 'Lelaki & Perempuan']],
      ['h', '③ TUAN RUMAH & AYAT JEMPUTAN'],
      ['tuanRumah', 'Tuan rumah (ibu bapa)', 'Tuan Haji Ahmad bin Ismail & Puan Hajah Salmah binti Hassan', ''],
      ['ayat', 'Ayat jemputan', 'Dengan penuh kesyukuran ke hadrat Ilahi, kami menjemput Dato\' | Datin | Tuan | Puan | Encik | Cik seisi keluarga ke majlis perkahwinan puteri kesayangan kami', 'Tukar "puteri" kepada "putera" jika majlis pihak lelaki'],
      ['h', '④ MAJLIS'],
      ['majlis', 'Nama majlis', 'Walimatul Urus', 'cth. Walimatul Urus / Majlis Bertandang'],
      ['tarikh', 'Tarikh majlis', '=' + dash + 'C8', 'Auto dari Tarikh resepsi (tab Dashboard)'],
      ['mula', 'Masa mula', '11:00 AM', ''],
      ['tamat', 'Masa tamat', '4:00 PM', ''],
      ['tempat', 'Nama tempat', '=' + dash + 'C9', 'Auto dari tab Dashboard'],
      ['alamat', 'Alamat penuh', 'No. 1, Jalan Mawar 1, 40000 Shah Alam, Selangor', ''],
      ['maps', 'Link Google Maps', '', 'Google Maps → Share → Copy link (mula dengan https://)'],
      ['waze', 'Link Waze', '', 'Waze → Share → Copy link (mula dengan https://)'],
      ['tentatif', 'Tentatif dipapar', 'Resepsi Pihak Perempuan', 'Diambil dari tab Tentatif Majlis', ['Resepsi Pihak Perempuan', 'Resepsi Pihak Lelaki', 'Akad Nikah', 'Merisik / Tunang', 'Tidak papar']],
      ['kodPakaian', 'Kod pakaian (pilihan)', '', 'cth. Pastel / Tema Hijau Zamrud'],
      ['h', '⑤ RSVP'],
      ['rsvpBuka', 'Buka RSVP', 'Ya', '', ['Ya', 'Tidak']],
      ['rsvpTutup', 'Tarikh tutup RSVP', '=IF(' + dash + 'C8="","",' + dash + 'C8-14)', 'Auto 14 hari sebelum majlis. Boleh tulis ganti.'],
      ['maxPax', 'Maksimum pax setiap jemputan', 5, 'Had 1–20'],
      ['slot', 'Slot masa (pilihan)', '', 'Asingkan dengan koma, cth: 11:00 AM - 1:00 PM, 1:00 PM - 4:00 PM'],
      ['paparUcapan', 'Papar ucapan tetamu di jemputan', 'Ya', 'Sorok ucapan tertentu di tab RSVP Online (kolum Papar Ucapan? = Tidak)', ['Ya', 'Tidak']],
      ['h', '⑥ HUBUNGI & SALAM KAUT'],
      ['wakil1', 'Wakil 1 — nama', '', 'cth. Pak Long Hassan'],
      ['tel1', 'Wakil 1 — no. WhatsApp', '', 'cth. 60123456789'],
      ['wakil2', 'Wakil 2 — nama', '', ''],
      ['tel2', 'Wakil 2 — no. WhatsApp', '', ''],
      ['bank', 'Salam kaut — nama bank', '', 'Kosongkan jika tidak mahu papar'],
      ['akaun', 'Salam kaut — no. akaun', '', ''],
      ['namaAkaun', 'Salam kaut — nama pemegang akaun', '', ''],
      ['h', '⑦ DOA & PENUTUP'],
      ['doaArab', 'Doa (Arab)', 'بَارَكَ اللهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ', ''],
      ['doaMaksud', 'Maksud doa', 'Semoga Allah memberkati kamu berdua, melimpahkan keberkatan ke atas kamu dan menghimpunkan kamu berdua dalam kebaikan.', ''],
      ['penutup', 'Mesej penutup', 'Kehadiran dan doa restu Tuan/Puan amatlah kami hargai.', '']
    ];
    var r = 4;
    rows.forEach(function (x) {
      if (x[0] === 'h') {
        sh.getRange(r, 1).setValue(x[1]).setFontWeight('bold').setFontSize(12).setFontColor(SAGE);
        sh.getRange(r, 1, 1, 3).setBorder(null, null, true, null, null, null, SAGE, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
        sh.setRowHeight(r, 28);
      } else {
        sh.getRange(r, 1).setValue(x[1]).setFontColor('#333333');
        var cell = sh.getRange(r, 2);
        if (typeof x[2] === 'string' && x[2].charAt(0) === '=') cell.setFormula(x[2]); else cell.setValue(x[2]);
        cell.setBackground(INPUT).setFontColor(BLUE).setFontWeight('bold').setWrap(true);
        sh.getRange(r, 3).setValue(x[3] || '').setFontColor(MUTED).setFontStyle('italic').setFontSize(9).setWrap(true);
        sh.getRange(r, 4).setValue(x[0]);
        if (x[4]) cell.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(x[4], true).setAllowInvalid(false).build());
        if (x[0] === 'tarikh' || x[0] === 'rsvpTutup') cell.setNumberFormat('dd/mm/yyyy');
        if (x[0] === 'tel1' || x[0] === 'tel2' || x[0] === 'akaun') cell.setNumberFormat('@');
        if (x[0] === 'doaArab') cell.setFontSize(13).setHorizontalAlignment('right');
      }
      r++;
    });
    sh.getRange(1, 1, r, 4).setFontFamily('Arial');
    sh.getRange('A1').setFontFamily('Arial');
    sh.setColumnWidth(1, 250); sh.setColumnWidth(2, 380); sh.setColumnWidth(3, 360); sh.hideColumns(4);
    sh.getRange(4, 1, r - 4, 3).setVerticalAlignment('middle');
  }

  // ---------- RSVP Online ----------
  if (!ss.getSheetByName(RSVP_SHEET)) {
    var rs = ss.insertSheet(RSVP_SHEET);
    rs.setTabColor(SAGE).setHiddenGridlines(true);
    rs.getRange('A1:I2').setBackground(ROSE_L);
    rs.getRange('A1').setValue('📩 RSVP Online').setFontSize(18).setFontWeight('bold').setFontColor(ROSE);
    rs.getRange('A2').setValue('Jawapan tetamu dari jemputan digital masuk ke sini secara automatik  ·  Created by Hizami Radzi')
      .setFontStyle('italic').setFontColor(MUTED);
    rs.setRowHeight(1, 34);
    var head = ['Masa', 'Nama', 'No. Telefon', 'Kehadiran', 'Bil. Pax', 'Slot Masa', 'Ucapan', 'Papar Ucapan?', 'Catatan'];
    rs.getRange(RSVP_HEAD_ROW, 1, 1, head.length).setValues([head]).setBackground(SAGE).setFontColor('#FFFFFF')
      .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    rs.setRowHeight(RSVP_HEAD_ROW, 34);
    rs.setFrozenRows(RSVP_HEAD_ROW);
    var n = 500;
    if (rs.getMaxRows() < RSVP_HEAD_ROW + n) rs.insertRowsAfter(rs.getMaxRows(), RSVP_HEAD_ROW + n - rs.getMaxRows());
    var body = rs.getRange(RSVP_HEAD_ROW + 1, 1, n, head.length);
    body.setBorder(true, true, true, true, true, true, '#E2DCD8', SpreadsheetApp.BorderStyle.SOLID).setVerticalAlignment('middle');
    rs.getRange(RSVP_HEAD_ROW + 1, 1, n, 1).setNumberFormat('@');
    rs.getRange(RSVP_HEAD_ROW + 1, 3, n, 1).setNumberFormat('@');
    rs.getRange(RSVP_HEAD_ROW + 1, 7, n, 1).setWrap(true);
    rs.getRange(RSVP_HEAD_ROW + 1, 4, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Hadir', 'Tidak Hadir'], true).build());
    rs.getRange(RSVP_HEAD_ROW + 1, 8, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Ya', 'Tidak'], true).build());
    [150, 200, 130, 110, 80, 170, 360, 110, 200].forEach(function (w, i) { rs.setColumnWidth(i + 1, w); });
    var rules = rs.getConditionalFormatRules();
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Hadir').setBackground('#DCEFE2').setRanges([rs.getRange(RSVP_HEAD_ROW + 1, 4, n, 1)]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Tidak Hadir').setBackground('#F9D9DC').setRanges([rs.getRange(RSVP_HEAD_ROW + 1, 4, n, 1)]).build());
    rs.setConditionalFormatRules(rules);
    var L = RSVP_HEAD_ROW + 1, E = RSVP_HEAD_ROW + n;
    var chips = [
      ['Jawapan', '=COUNTA(B' + L + ':B' + E + ')', '0'],
      ['Hadir (pax)', '=SUMIFS(E' + L + ':E' + E + ',D' + L + ':D' + E + ',"Hadir")', '0'],
      ['Hadir (keluarga)', '=COUNTIF(D' + L + ':D' + E + ',"Hadir")', '0'],
      ['Tidak hadir', '=COUNTIF(D' + L + ':D' + E + ',"Tidak Hadir")', '0']
    ];
    chips.forEach(function (c, i) {
      rs.getRange(4, 1 + i * 2).setValue(c[0]).setFontColor(MUTED).setFontWeight('bold').setFontSize(9).setHorizontalAlignment('right').setWrap(true);
      rs.getRange(4, 2 + i * 2).setFormula(c[1]).setFontColor(ROSE).setFontWeight('bold').setFontSize(12).setNumberFormat(c[2]);
    });
    rs.getRange(4, 1, 1, 8).setBackground('#FBF4E2');
    rs.setRowHeight(4, 30);
    rs.getRange(1, 1, E, head.length).setFontFamily('Arial');
    rs.getRange('A1').setFontSize(18);
  }

  // ---------- Ringkasan di tab Dashboard ----------
  var d = ss.getSheetByName('Dashboard');
  if (d && d.getRange('B37').getValue() === '') {
    d.getRange('B37').setValue('RSVP online: sah hadir (pax)').setFontFamily('Arial').setFontSize(10).setFontColor('#333333');
    d.getRange('C37').setFormula("=SUMIFS('" + RSVP_SHEET + "'!E7:E1000,'" + RSVP_SHEET + "'!D7:D1000,\"Hadir\")")
      .setNumberFormat('#,##0').setFontFamily('Arial').setFontWeight('bold').setFontSize(11).setFontColor(ROSE)
      .setBackground(CALC).setHorizontalAlignment('right');
  }

  // Susun tab: letak selepas "Duit Salam"
  var after = ss.getSheetByName('Duit Salam');
  if (after) {
    var pos = after.getIndex();
    ss.setActiveSheet(ss.getSheetByName(INVITE_SHEET)); ss.moveActiveSheet(pos + 1);
    try { ss.setActiveSheet(ss.getSheetByName(RSVP_SHEET)); ss.moveActiveSheet(ss.getSheetByName(INVITE_SHEET).getIndex() + 1); } catch (e) { /* susunan tab tidak kritikal */ }
  }
  ss.setActiveSheet(ss.getSheetByName(INVITE_SHEET));
}
