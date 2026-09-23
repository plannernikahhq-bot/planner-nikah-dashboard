// Planner Nikah A–Z - proksi selamat antara dashboard dan Google Sheet anda.
// URL Apps Script disimpan dalam Environment Variable Vercel (APPS_SCRIPT_URL),
// jadi ia tidak pernah dihantar ke pelayar. Pelawat hanya boleh baca data jika PIN betul.
const { callScript, readBody, clientId, limited } = require('./_lib');

const hits = new Map();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'METHOD' });
  if (limited(hits, req, 30, 60 * 1000)) return res.status(200).json({ ok: false, code: 'TOO_MANY' });

  const b = readBody(req);
  const pin = String(b.pin || '').trim().slice(0, 64);
  if (!pin) {
    // Semak konfigurasi dahulu supaya laman yang belum disambung terus buka Mod Demo.
    const url = (process.env.APPS_SCRIPT_URL || '').trim();
    return res.status(200).json({ ok: false, code: url ? 'NO_PIN' : 'NOT_CONFIGURED' });
  }
  // Domain utama laman (bukan link deployment panjang yang minta log masuk Vercel): untuk link jemputan,
  // dan disimpan dalam Google Sheet supaya menu "Link dashboard & jemputan" boleh memaparkannya.
  const site = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  const params = { pin, cid: clientId(req) };
  if (site) params.site = site;
  const out = await callScript(params);
  if (out && out.ok && site) out.site = site;
  if (out && out.ok && process.env.READ_ONLY === '1') out.readOnly = true;
  return res.status(200).json(out);
};
