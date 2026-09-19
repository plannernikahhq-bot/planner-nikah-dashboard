// Planner Nikah A–Z — terima RSVP tetamu dan hantar ke Google Sheet (tab "RSVP Online").
const { callScript, readBody } = require('./_lib');

const hits = new Map(); // had ringkas per IP (per instance)

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'METHOD' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now();
  const h = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (h.length >= 8) return res.status(200).json({ ok: false, code: 'TOO_MANY' });
  h.push(now); hits.set(ip, h);
  if (hits.size > 5000) hits.clear();

  const b = readBody(req);
  // Perangkap bot: medan tersembunyi mesti kosong & borang tidak dihantar terlalu cepat.
  if (b.laman || (Number(b.t) && now - Number(b.t) < 2500)) return res.status(200).json({ ok: true });

  const nama = String(b.nama || '').trim().slice(0, 60);
  const hadir = b.hadir === 'Hadir' || b.hadir === 'Tidak Hadir' ? b.hadir : '';
  const pax = Math.floor(Number(b.pax) || 0);
  if (nama.length < 2 || !hadir || (hadir === 'Hadir' && (pax < 1 || pax > 20))) {
    return res.status(200).json({ ok: false, code: 'INVALID' });
  }
  const out = await callScript({
    action: 'rsvp', nama, hadir, pax: String(hadir === 'Hadir' ? pax : 0),
    tel: String(b.tel || '').replace(/[^\d+]/g, '').slice(0, 16),
    slot: String(b.slot || '').slice(0, 60),
    ucapan: String(b.ucapan || '').slice(0, 300)
  });
  return res.status(200).json(out);
};
