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

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  const sites = [];

  const nameIndex = headers.indexOf('name_en');
  const countryIndex = headers.indexOf('states_name_en');
  const latIndex = headers.indexOf('latitude');
  const lngIndex = headers.indexOf('longitude');
  const yearIndex = headers.indexOf('date_inscribed');
  const categoryIndex = headers.indexOf('category_short');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);

    if (
      fields.length >
      Math.max(nameIndex, countryIndex, latIndex, lngIndex, yearIndex, categoryIndex)
    ) {
      const lat = parseFloat(fields[latIndex]);
      const lng = parseFloat(fields[lngIndex]);
      if (isNaN(lat) || isNaN(lng)) continue;

      sites.push({
        name: fields[nameIndex] || 'Unknown Site',
        country: fields[countryIndex] || 'Unknown Country',
        lat,
        lng,
        year: parseInt(fields[yearIndex]) || null,
        criteria: fields[categoryIndex] || 'Unknown',
      });
    }
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

  // Fallback: use Wikipedia search API to find the article
  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(siteName)}&format=json&srlimit=1`;
    const searchResult = await fetchJson(searchUrl);
    const title = searchResult?.query?.search?.[0]?.title;
    if (title) {
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
    const { wikipedia, ...rest } = s;
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
