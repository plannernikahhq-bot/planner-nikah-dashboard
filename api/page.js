// Planner Nikah A–Z - hidang halaman jemputan dengan pautan gambar pratonton (WhatsApp) yang lengkap.
const fs = require('fs');
const path = require('path');

let cached = null;
function load() {
  if (cached) return cached;
  for (const p of [path.join(process.cwd(), 'jemputan.html'), path.join(__dirname, '..', 'jemputan.html')]) {
    try { cached = fs.readFileSync(p, 'utf8'); return cached; } catch (e) { /* cuba laluan lain */ }
  }
  return null;
}

module.exports = (req, res) => {
  const qs = (req.url || '').includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const html = load();
  if (!html) { res.statusCode = 302; res.setHeader('Location', '/jemputan.html' + qs); return res.end(); }
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').replace(/[^a-zA-Z0-9.:-]/g, '');
  const base = host ? 'https://' + host : '';
  const out = html
    .replace('content="/og-jemputan.png"', 'content="' + base + '/og-jemputan.png"')
    .replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:url" content="' + base + '/jemputan">');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end(out);
};
