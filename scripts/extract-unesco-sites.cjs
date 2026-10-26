#!/usr/bin/env node
/**
 * Extract UNESCO World Heritage Sites from the official UNESCO dataset,
 * enrich with Wikipedia data, and emit public/data/unesco-sites.json.
 *
 * Preserves existing Wikipedia data from a prior run — only fetches
 * Wikipedia for sites that don't already have it.
 *
 * Usage:
 *   node scripts/extract-unesco-sites.cjs
 *   node scripts/extract-unesco-sites.cjs --force-wiki   # re-fetch all Wikipedia data
 *
 * No dependencies — vanilla Node (https + fs).
 */

'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const CSV_URL =
  'https://ihp-wins.unesco.org/dataset/88c8eff6-b94d-4826-bb13-7107ac4c02a9/resource/2f46f6b2-45f9-402b-ace9-1e02c9c97a3d/download/whc-sites-2025.csv';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'unesco-sites.json');
const WIKI_PATH = path.join(__dirname, '..', 'public', 'data', 'unesco-wiki.json');

const FORCE_WIKI = process.argv.includes('--force-wiki');

// Sites inscribed at the 48th session of the World Heritage Committee
// (Busan, 19–29 July 2026). UNESCO has not published a whc-sites-2026.csv
// yet — the IHP-WINS dataset above still carries only the 2025 list — so
// they are carried here and merged in by UNESCO reference number. Each one
// drops out of this list automatically once the official CSV catches up.
//
// Coordinates come from Wikidata (P757 reference number → P625 coordinate
// location). For serial sites Wikidata holds a point per component, so the
// primary component is used and named in a trailing comment, which matches
// how the official CSV picks a single representative point.
//
// Getbol, Korean Tidal Flats (ref 1591) was also approved at this session,
// but as a Phase II extension of a site already in the CSV — so it is an
// updated boundary rather than a new entry, and is not listed here.
const SESSION_48_SITES = [
  { id: '1774', name: 'Amazonia Theaters', country: 'Brazil', lat: -3.130281, lng: -60.023397, criteria: 'C' }, // Amazon Theatre, Manaus
  { id: '1765', name: 'Jingdezhen Handicraft Porcelain Industry Sites', country: 'China', lat: 29.297222, lng: 117.201944, criteria: 'C' }, // Imperial kiln site
  { id: '1768', name: 'The Medinas of the Historic Sultanates of the Comoros', country: 'Comoros', lat: -11.744675, lng: 43.232583, criteria: 'C' }, // Moroni, Grande Comore
  { id: '1758', name: 'The Bony Fish Fossils of the Western Limfjord – Evolution and Climate Adaptation in the Earliest Eocene', country: 'Denmark', lat: 56.895649, lng: 8.751962, criteria: 'N' },
  { id: '1752', name: 'Aalto Works', country: 'Finland', lat: 60.465056, lng: 22.734770, criteria: 'C' }, // Paimio Sanatorium
  { id: '1581', name: 'Beaches of the D-Day Landings, Normandy, 1944', country: 'France', lat: 49.370850, lng: -0.879590, criteria: 'C' },
  { id: '1755', name: 'Royal Capetian Fortresses of Languedoc', country: 'France', lat: 43.207222, lng: 2.363083, criteria: 'C' }, // Château comtal, Carcassonne
  { id: '1719', name: 'The wider area of Mount Olympus', country: 'Greece', lat: 40.078300, lng: 22.348900, criteria: 'C/N' },
  { id: '927', name: 'Ancient Buddhist Site of Sarnath', country: 'India', lat: 25.381111, lng: 83.021389, criteria: 'C' },
  { id: '1770', name: 'Alamūt Castle and Related Fortifications', country: 'Iran (Islamic Republic of)', lat: 36.444722, lng: 50.586111, criteria: 'C' }, // Alamut Castle
  { id: '1762', name: 'The system of Italian-style condominio theatres of the 18th and 19th centuries in Central Italy', country: 'Italy', lat: 43.300198, lng: 13.453466, criteria: 'C' }, // Teatro Lauro Rossi, Macerata
  { id: '1757', name: 'Ancient Capitals of Asuka and Fujiwara', country: 'Japan', lat: 34.470278, lng: 135.823611, criteria: 'C' },
  { id: '1742', name: 'Aqaba Marine Reserve', country: 'Jordan', lat: 29.430702, lng: 34.971843, criteria: 'N' },
  { id: '1760', name: 'Rock Mosques and Associated Sacred Sites of Mangystau', country: 'Kazakhstan', lat: 44.433400, lng: 51.138800, criteria: 'C' }, // Shakpak-Ata mosque
  { id: '1810', name: 'Mount Amel Castles', country: 'Lebanon', lat: 33.324715, lng: 35.532148, criteria: 'C' }, // Beaufort Castle
  { id: '1759', name: 'The Cemetery Complexes of the Xiongnu Nobility', country: 'Mongolia', lat: 48.386222, lng: 106.754972, criteria: 'C' }, // Noin-Ula kurgans
  { id: '1809', name: 'Sebastia', country: 'State of Palestine', lat: 32.275620, lng: 35.198730, criteria: 'C' },
  { id: '1715', name: 'Gdynia Modernist City Centre', country: 'Poland', lat: 54.517500, lng: 18.540000, criteria: 'C' },
  { id: '1750', name: 'The Roças of Sao Tome and Principe: Colonial Agricultural System and Forced Migration', country: 'Sao Tome and Principe', lat: 0.140222, lng: 6.646222, criteria: 'C' }, // Roça on São Tomé island
  { id: '1808', name: 'Boma-Badingilo Migratory Landscape', country: 'South Sudan', lat: 6.513800, lng: 32.958600, criteria: 'N' },
  { id: '1761', name: 'Wat Phra Mahathat Woramahawihan, Nakhon Si Thammarat', country: 'Thailand', lat: 8.411389, lng: 99.966667, criteria: 'C' },
  { id: '1769', name: 'Village of Sidi Bou Saïd', country: 'Tunisia', lat: 36.869758, lng: 10.341014, criteria: 'C' },
  { id: '1724', name: 'Wadi Wurayah', country: 'United Arab Emirates', lat: 25.422600, lng: 56.363460, criteria: 'N' },
  { id: '1751', name: 'Okefenokee National Wildlife Refuge', country: 'United States of America', lat: 30.738115, lng: -82.139736, criteria: 'N' },
  { id: '1766', name: 'Tashkent Modernist Architecture. Modernity and Tradition in Central Asia', country: 'Uzbekistan', lat: 41.308600, lng: 69.241700, criteria: 'C' },
].map((site) => ({ ...site, year: 2026 }));

function fetchText(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error('Too many redirects'));
      return;
    }
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    client
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'explorer-unesco-extractor/1.0 (https://github.com/prabhakar267/explorer)',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            resolve(fetchText(res.headers.location, maxRedirects - 1));
            return;
          }
          if (res.statusCode !== 200) {
            reject(
              new Error(`Fetch ${url} returned ${res.statusCode} ${res.statusMessage}`)
            );
            res.resume();
            return;
          }
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve(body));
        }
      )
      .on('error', reject);
  });
}

function fetchJson(url) {
  return fetchText(url).then(JSON.parse);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Split CSV text into rows of fields (RFC 4180).
 *
 * This walks the whole text rather than splitting on '\n' first: the
 * UNESCO export quotes `short_description_*` fields that contain literal
 * newlines, so a line-at-a-time parse shreds those records and silently
 * drops them — about 200 of the 1248 sites.
 */
function parseCSVRows(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (inQuotes) {
      if (char !== '"') {
        field += char;
      } else if (csvText[i + 1] === '"') {
        field += '"'; // escaped quote inside a quoted field
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseCSV(csvText) {
  // The export is UTF-8 with a BOM, which would otherwise end up glued to
  // the first header name.
  const rows = parseCSVRows(csvText.replace(/^﻿/, ''));
  const headers = rows[0].map((h) => h.trim());
  const sites = [];

  const idIndex = headers.indexOf('id_no');
  const nameIndex = headers.indexOf('name_en');
  const countryIndex = headers.indexOf('states_name_en');
  const latIndex = headers.indexOf('latitude');
  const lngIndex = headers.indexOf('longitude');
  const yearIndex = headers.indexOf('date_inscribed');
  const categoryIndex = headers.indexOf('category_short');
  const required = [idIndex, nameIndex, countryIndex, latIndex, lngIndex, yearIndex, categoryIndex];
  if (required.some((index) => index === -1)) {
    throw new Error(`CSV is missing expected columns (got: ${headers.join(', ')})`);
  }

  for (const fields of rows.slice(1)) {
    if (fields.length <= Math.max(...required)) continue;

    const lat = parseFloat(fields[latIndex]);
    const lng = parseFloat(fields[lngIndex]);
    if (isNaN(lat) || isNaN(lng)) continue;

    sites.push({
      id: fields[idIndex].trim(),
      name: fields[nameIndex].trim() || 'Unknown Site',
      country: fields[countryIndex].trim() || 'Unknown Country',
      lat,
      lng,
      year: parseInt(fields[yearIndex]) || null,
      criteria: fields[categoryIndex].trim() || 'Unknown',
    });
  }
  return sites;
}

async function fetchWikipedia(siteName) {
  const queries = [
    siteName + ' UNESCO World Heritage Site',
    siteName,
  ];

  for (const query of queries) {
    try {
      const encoded = encodeURIComponent(query);
      const data = await fetchJson(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
      );
      if (data.extract) {
        return {
          description: data.extract,
          image: data.thumbnail?.source || null,
          url: data.content_urls?.desktop?.page || null,
        };
      }
    } catch { /* try next */ }
  }

  // Fallback: use Wikipedia search API to find the article. Sites with no
  // article of their own tend to match an index page ("List of World
  // Heritage Sites in Italy"), whose summary describes the Convention
  // rather than the site — no description reads better than a wrong one.
  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(siteName)}&format=json&srlimit=1`;
    const searchResult = await fetchJson(searchUrl);
    const title = searchResult?.query?.search?.[0]?.title;
    if (title && !/^(List|Lists|Index|Outline|Timeline) of /i.test(title)) {
      const data = await fetchJson(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
      );
      if (data.extract) {
        return {
          description: data.extract,
          image: data.thumbnail?.source || null,
          url: data.content_urls?.desktop?.page || null,
        };
      }
    }
  } catch { /* give up */ }

  return null;
}

function loadExisting() {
  try {
    const sites = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    let wiki = {};
    try {
      wiki = JSON.parse(fs.readFileSync(WIKI_PATH, 'utf8'));
    } catch { /* no wiki file yet */ }
    // Re-attach wiki for cache lookup during this run.
    for (const s of sites) {
      if (wiki[s.name]) s.wikipedia = wiki[s.name];
    }
    return sites;
  } catch {
    return [];
  }
}

async function main() {
  console.log('Fetching UNESCO World Heritage Sites CSV...');
  const csvText = await fetchText(CSV_URL);
  console.log(`Downloaded ${csvText.length} bytes`);

  const sites = parseCSV(csvText);
  console.log(`Parsed ${sites.length} sites`);

  const fromCSV = new Set(sites.map((s) => s.id));
  const pending = SESSION_48_SITES.filter((s) => !fromCSV.has(s.id));
  sites.push(...pending);
  console.log(
    `48th session (2026): ${pending.length} site(s) merged from the local list, ` +
      `${SESSION_48_SITES.length - pending.length} already in the CSV`
  );

  // Load existing data to preserve Wikipedia info
  const existing = loadExisting();
  const existingByName = new Map(existing.map((s) => [s.name, s]));

  let fetched = 0;
  let skipped = 0;

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const prev = existingByName.get(site.name);

    if (!FORCE_WIKI && prev?.wikipedia) {
      site.wikipedia = prev.wikipedia;
      skipped++;
    } else {
      const wiki = await fetchWikipedia(site.name);
      if (wiki) {
        site.wikipedia = wiki;
      }
      fetched++;
      if (fetched % 50 === 0) {
        console.log(`  Wikipedia: ${fetched} fetched, ${skipped} cached (${i + 1}/${sites.length})`);
      }
      // Rate limit: ~50ms between requests
      await sleep(50);
    }
  }

  console.log(`Wikipedia: ${fetched} fetched, ${skipped} reused from cache`);

  sites.sort((a, b) => a.name.localeCompare(b.name));

  const wiki = {};
  const lite = sites.map((s) => {
    // `id` is the UNESCO reference number, used only to reconcile the CSV
    // with SESSION_48_SITES — the client keys everything off `name`.
    const { wikipedia, id, ...rest } = s;
    if (wikipedia) wiki[s.name] = wikipedia;
    return rest;
  });

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(lite) + '\n');
  fs.writeFileSync(WIKI_PATH, JSON.stringify(wiki) + '\n');

  console.log(`Wrote ${lite.length} sites to ${OUTPUT_PATH}`);
  console.log(`Wrote ${Object.keys(wiki).length} wiki entries to ${WIKI_PATH}`);
}

main().catch((err) => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
