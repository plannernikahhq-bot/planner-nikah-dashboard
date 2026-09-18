/** @OnlyCurrentDoc */
/**
 * Planner Nikah A–Z — Sambungan Dashboard Web
 * Created by Hizami Radzi
 *
 * Skrip ini membenarkan dashboard web anda MEMBACA ringkasan data dari fail ini.
 *  - Hanya fail ini sahaja yang boleh dibaca (@OnlyCurrentDoc).
 *  - Data hanya diberi jika PIN betul (tab Dashboard, sel C13).
 *  - Nombor telefon tetamu TIDAK dihantar ke dashboard.
 *  - 10 kali PIN salah = dikunci 15 minit.
 *
 * JANGAN ubah kod ini. Ikut panduan "Cara Sambung Dashboard".
 */

var VERSION = '1.0';
var PIN_SHEET = 'Dashboard';
var PIN_CELL = 'C13';
var MAX_FAILS = 10;
var LOCK_SECONDS = 900;

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return json_({ ok: true, app: 'planner-nikah', version: VERSION });

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
  Logger.log('OK! Pengantin: ' + d.info.lelaki + ' & ' + d.info.perempuan +
    ' | Item bajet: ' + d.bajet.length + ' | Tetamu: ' + d.tetamu.length +
    ' | Tugasan: ' + d.checklist.length);
}

// ---------------------------------------------------------------------------

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
