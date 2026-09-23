// Planner Nikah A–Z - data jemputan digital (awam, tiada data sensitif).
const { callScript } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, code: 'METHOD' });
  const data = await callScript({ action: 'invite' });
  // Cache sekejap di CDN Vercel supaya ramai tetamu buka serentak pun laju.
  res.setHeader('Cache-Control', data && data.ok ? 'public, s-maxage=60, stale-while-revalidate=604800' : 'no-store');
  return res.status(200).json(data);
};
