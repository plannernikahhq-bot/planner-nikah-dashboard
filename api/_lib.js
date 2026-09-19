// Fungsi kongsi untuk API Vercel (fail bermula "_" bukan endpoint).
const VALID_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

function scriptUrl() {
  const url = (process.env.APPS_SCRIPT_URL || '').trim();
  if (!url) return { error: 'NOT_CONFIGURED' };
  if (!VALID_URL.test(url)) return { error: 'BAD_URL' };
  return { url };
}

async function callScript(params) {
  const s = scriptUrl();
  if (s.error) return { ok: false, code: s.error };
  const qs = new URLSearchParams(params).toString();
  try {
    const r = await fetch(`${s.url}?${qs}`, { redirect: 'follow' });
    const text = await r.text();
    try { return JSON.parse(text); } catch (e) { return { ok: false, code: 'SCRIPT_NOT_PUBLIC' }; }
  } catch (e) {
    return { ok: false, code: 'NETWORK' };
  }
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  return body || {};
}

module.exports = { callScript, readBody };
