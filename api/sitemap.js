// Dr Mumbo Jumbo — sitemap.xml generated from the code data.
const cpt = [...require('../lib/codes-cpt-a.js'), ...require('../lib/codes-cpt-b.js'), ...require('../lib/codes-cpt-c.js')];
const icd = require('../lib/codes-icd.js');
const denial = require('../lib/codes-denial.js');

const BASE = 'https://dr-mumbo-jumbo.com';

module.exports = (req, res) => {
  const urls = [`${BASE}/`, `${BASE}/appeal`, `${BASE}/fightpack`, `${BASE}/denials`, `${BASE}/codes/`, ...[...cpt, ...icd, ...denial].map((e) => `${BASE}/codes/${e.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(xml);
};
