// Planner Nikah A–Z — proksi selamat antara dashboard dan Google Sheet anda.
// URL Apps Script disimpan dalam Environment Variable Vercel (APPS_SCRIPT_URL),
// jadi ia tidak pernah dihantar ke pelayar. Pelawat hanya boleh baca data jika PIN betul.

const VALID_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const url = (process.env.APPS_SCRIPT_URL || '').trim();
  if (!url) return res.status(200).json({ ok: false, code: 'NOT_CONFIGURED' });
  if (!VALID_URL.test(url)) return res.status(200).json({ ok: false, code: 'BAD_URL' });

  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'METHOD' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const pin = String((body && body.pin) || '').trim().slice(0, 64);
  if (!pin) return res.status(200).json({ ok: false, code: 'NO_PIN' });

  try {
    const r = await fetch(`${url}?pin=${encodeURIComponent(pin)}`, { redirect: 'follow' });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch (e) {
      // Biasanya bermaksud Web App belum ditetapkan "Who has access: Anyone".
      return res.status(200).json({ ok: false, code: 'SCRIPT_NOT_PUBLIC' });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json({ ok: false, code: 'NETWORK' });
  }
};
