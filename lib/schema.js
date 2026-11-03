// Dr Mumbo Jumbo — schema.org structured data (JSON-LD) for the code library and code pages.
// Every value here mirrors text that is visible on the page; nothing is added for search engines only.

const BASE = 'https://dr-mumbo-jumbo.com';

const ORG = {
  '@type': 'Organization',
  '@id': `${BASE}/#org`,
  name: 'Dr Mumbo Jumbo',
  url: `${BASE}/`,
  logo: `${BASE}/og.png`,
  email: 'hello@dr-mumbo-jumbo.com',
  description: 'Plain-English medical translator and insurance-denial help, built by a practicing physician.'
};

const SITE = {
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  name: 'Dr Mumbo Jumbo',
  url: `${BASE}/`,
  publisher: { '@id': `${BASE}/#org` },
  inLanguage: 'en-US'
};

// One defined-term set per code system, so each code is tied to the system it comes from.
const SETS = {
  'CPT': { id: 'cpt', name: 'CPT procedure codes, in plain English' },
  'HCPCS': { id: 'hcpcs', name: 'HCPCS supply and service codes, in plain English' },
  'ICD-10': { id: 'icd10', name: 'ICD-10 diagnosis codes, in plain English' },
  'Denial code': { id: 'carc', name: 'Insurance denial and adjustment codes, in plain English' }
};

function setFor(system) {
  const s = SETS[system] || { id: 'other', name: `${system} codes, in plain English` };
  return { '@type': 'DefinedTermSet', '@id': `${BASE}/codes/#${s.id}`, name: s.name, url: `${BASE}/codes/` };
}

// JSON inside <script> must never contain "</script>" or an HTML comment opener.
function scriptTag(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>`;
}

function crumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url }))
  };
}

// The three questions answered on every code page; the page renders these same headings.
function questions(entry) {
  return [
    { q: `What does ${entry.code} mean?`, a: entry.what },
    { q: `Where will I see ${entry.code}?`, a: entry.seen },
    { q: `What is worth checking about ${entry.code}?`, a: entry.watch }
  ];
}

function codePage(entry, title, desc) {
  const url = `${BASE}/codes/${entry.slug}`;
  const term = {
    '@type': 'DefinedTerm',
    '@id': `${url}#term`,
    termCode: entry.code,
    name: entry.name,
    description: entry.what,
    url,
    inDefinedTermSet: setFor(entry.system)
  };
  return scriptTag({
    '@context': 'https://schema.org',
    '@graph': [
      ORG,
      SITE,
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description: desc,
        isPartOf: { '@id': `${BASE}/#website` },
        about: { '@id': `${url}#term` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        primaryImageOfPage: `${BASE}/og.png`,
        inLanguage: 'en-US'
      },
      Object.assign({ '@id': `${url}#breadcrumb` }, crumbs([
        { name: 'Home', url: `${BASE}/` },
        { name: 'Code library', url: `${BASE}/codes/` },
        { name: entry.code, url }
      ])),
      term,
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        url,
        isPartOf: { '@id': `${url}#webpage` },
        mainEntity: questions(entry).map((x) => ({
          '@type': 'Question',
          name: x.q,
          acceptedAnswer: { '@type': 'Answer', text: x.a }
        }))
      }
    ]
  });
}

function libraryPage(all, title, desc) {
  const url = `${BASE}/codes/`;
  return scriptTag({
    '@context': 'https://schema.org',
    '@graph': [
      ORG,
      SITE,
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description: desc,
        isPartOf: { '@id': `${BASE}/#website` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#list` },
        inLanguage: 'en-US'
      },
      Object.assign({ '@id': `${url}#breadcrumb` }, crumbs([
        { name: 'Home', url: `${BASE}/` },
        { name: 'Code library', url }
      ])),
      {
        '@type': 'ItemList',
        '@id': `${url}#list`,
        numberOfItems: all.length,
        itemListElement: all.map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${BASE}/codes/${e.slug}`,
          name: `${e.code}: ${e.name}`
        }))
      }
    ]
  });
}

module.exports = { codePage, libraryPage, questions, scriptTag };
