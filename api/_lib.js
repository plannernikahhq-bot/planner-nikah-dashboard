// Fungsi kongsi untuk API Vercel (fail bermula "_" bukan endpoint).
const crypto = require('crypto');

const VALID_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

function scriptUrl() {
  const url = (process.env.APPS_SCRIPT_URL || '').trim();
  if (!url) return { error: 'NOT_CONFIGURED' };
  if (!VALID_URL.test(url)) return { error: 'BAD_URL' };
  return { url };
}

// Respons sah skrip Planner Nikah: { ok:false, code } atau { ok:true, version, ... } ({ ok:true } untuk RSVP).
function looksValid(j, params) {
  if (!j || typeof j !== 'object' || typeof j.ok !== 'boolean') return false;
  if (!j.ok) return typeof j.code === 'string';
  return params.action === 'rsvp' || typeof j.version === 'string';
}

// Halaman log masuk Google = Web App belum "Who has access: Anyone". HTML lain = Google sibuk / ralat sementara.
function isLoginPage(r, text) {
  return /accounts\.google\.com/i.test(String(r.url || '')) || /ServiceLogin|accounts\.google\.com\/v3\/signin/i.test(text.slice(0, 20000));
}

async function callScript(params, opts) {
  const s = scriptUrl();
  if (s.error) return { ok: false, code: s.error };
  const qs = new URLSearchParams(params).toString();
  let last = { ok: false, code: 'NETWORK' };
  // Google kadang-kadang membalas halaman HTML sekali-sekala; cuba semula sekali.
  // (Tidak untuk operasi simpan / RSVP, supaya rekod tidak tertambah dua kali.)
  const tries = opts && opts.retry === false ? 1 : 2;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${s.url}?${qs}`, { redirect: 'follow' });
      const text = await r.text();
      let j = null;
      try { j = JSON.parse(text); } catch (e) {}
      if (looksValid(j, params)) return j;
      if (isLoginPage(r, text)) return { ok: false, code: 'SCRIPT_NOT_PUBLIC' };
      last = { ok: false, code: 'GOOGLE_BUSY' };
    } catch (e) {
      last = { ok: false, code: 'GOOGLE_BUSY' };
    }
    if (i + 1 < tries) await new Promise((res) => setTimeout(res, 700));
  }
  return last;
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  return body || {};
}

function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
}

// Id peranti tanpa nama (hash IP) - skrip mengira PIN salah per peranti, bukan untuk semua orang.
function clientId(req) {
  return crypto.createHash('sha256').update(clientIp(req) + '|' + (process.env.APPS_SCRIPT_URL || '')).digest('base64url').slice(0, 16);
}

// Had ringkas per IP (per instance Vercel). Pulang true jika melebihi had.
function limited(map, req, max, windowMs) {
  const ip = clientIp(req), now = Date.now();
  const h = (map.get(ip) || []).filter((t) => now - t < windowMs);
  if (h.length >= max) return true;
  h.push(now); map.set(ip, h);
  if (map.size > 5000) map.clear();
  return false;
}

module.exports = { callScript, readBody, clientId, limited };
