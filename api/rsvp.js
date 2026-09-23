// Planner Nikah A–Z - terima RSVP tetamu dan hantar ke Google Sheet (tab "RSVP Online").
const { callScript, readBody, limited } = require('./_lib');

const hits = new Map(); // had ringkas per IP (per instance)

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'METHOD' });

  // Laman demo "baca sahaja": RSVP tidak disimpan.
  if (process.env.READ_ONLY === '1') return res.status(200).json({ ok: false, code: 'READ_ONLY' });
  // Had per IP agak longgar kerana ramai pengguna telefon berkongsi IP yang sama.
  if (limited(hits, req, 20, 10 * 60 * 1000)) return res.status(200).json({ ok: false, code: 'TOO_MANY' });

  const b = readBody(req);
  // Perangkap bot: medan tersembunyi mesti kosong & borang tidak dihantar terlalu cepat.
  // "ms" = tempoh borang dibuka, dikira pada telefon tetamu (tidak terjejas jika jam telefon salah).
  const ms = Number(b.ms);
  if (b.laman || (b.ms !== undefined && (!Number.isFinite(ms) || ms < 2500))) return res.status(200).json({ ok: true });

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
    ucapan: String(b.ucapan || '').slice(0, 300),
    rid: String(b.rid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 32)
  }, { retry: false });
  return res.status(200).json(out);
};
