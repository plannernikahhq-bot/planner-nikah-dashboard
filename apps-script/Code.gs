/** @OnlyCurrentDoc */
/**
 * Planner Nikah A–Z — Sambungan Dashboard Web & Jemputan Digital (RSVP)
 * Created by Hizami Radzi
 *
 * Skrip ini:
 *  - Membenarkan DASHBOARD anda membaca ringkasan data (perlu PIN di tab Dashboard, sel C13).
 *  - Membenarkan JEMPUTAN DIGITAL membaca butiran majlis dari tab "Jemputan Digital" (tanpa PIN).
 *  - Menyimpan jawapan RSVP tetamu ke tab "RSVP Online".
 *  - Hanya fail ini sahaja yang boleh dibaca / ditulis (@OnlyCurrentDoc).
 *  - Nombor telefon tetamu TIDAK dihantar ke dashboard atau jemputan.
 *
 * JANGAN ubah kod ini. Ikut panduan "Cara Sambung Dashboard" & "Cara Guna Jemputan Digital".
 */

var VERSION = '2.0';
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
