// Planner Nikah A–Z — baca & kemas kini data Google Sheet dari dashboard (perlu PIN).
const { callScript, readBody } = require('./_lib');

const hits = new Map(); // had ringkas per IP (per instance)
const TABLES = /^[a-z]{2,20}$/;
const OPS = ['update', 'add', 'clear'];

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'METHOD' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now();
  const h = (hits.get(ip) || []).filter((t) => now - t < 60 * 1000);
  if (h.length >= 60) return res.status(200).json({ ok: false, code: 'TOO_MANY' });
  h.push(now); hits.set(ip, h);
  if (hits.size > 5000) hits.clear();

  const b = readBody(req);
  const pin = String(b.pin || '').slice(0, 64);
  const t = String(b.t || '');
  if (!pin || !TABLES.test(t)) return res.status(200).json({ ok: false, code: 'INVALID' });

  if (b.op === 'get') {
    return res.status(200).json(await callScript({ pin, action: 'edit', t }));
  }

  // Laman demo boleh ditetapkan "baca sahaja" (Vercel → Environment Variables → READ_ONLY = 1).
  if (process.env.READ_ONLY === '1') return res.status(200).json({ ok: false, code: 'READ_ONLY' });

  const op = String(b.op || '');
  const f = b.f && typeof b.f === 'object' && !Array.isArray(b.f) ? b.f : null;
  if (OPS.indexOf(op) < 0 || !f) return res.status(200).json({ ok: false, code: 'INVALID' });
  const fs = JSON.stringify(f);
  if (fs.length > 3000) return res.status(200).json({ ok: false, code: 'TOO_LONG' });

  const out = await callScript({
    pin, action: 'save', t, op,
    r: String(Math.floor(Number(b.r) || 0)),
    k: String(b.k || '').slice(0, 200),
    f: fs
  }, { retry: false });
  return res.status(200).json(out);
};
