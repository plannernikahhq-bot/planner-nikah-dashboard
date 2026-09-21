// Fungsi kongsi untuk API Vercel (fail bermula "_" bukan endpoint).
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

async function callScript(params) {
  const s = scriptUrl();
  if (s.error) return { ok: false, code: s.error };
  const qs = new URLSearchParams(params).toString();
  let last = { ok: false, code: 'NETWORK' };
  // Google kadang-kadang membalas halaman HTML sekali-sekala; cuba semula sekali.
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(`${s.url}?${qs}`, { redirect: 'follow' });
      const text = await r.text();
      let j = null;
      try { j = JSON.parse(text); } catch (e) {}
      if (looksValid(j, params)) return j;
      last = { ok: false, code: 'SCRIPT_NOT_PUBLIC' };
    } catch (e) {
      last = { ok: false, code: 'NETWORK' };
    }
    if (i === 0) await new Promise((res) => setTimeout(res, 700));
  }
  return last;
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  return body || {};
}

module.exports = { callScript, readBody };
