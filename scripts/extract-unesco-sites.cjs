#!/usr/bin/env node
/**
 * Extract UNESCO World Heritage Sites from the official UNESCO dataset
 * and emit data/unesco-sites.json.
 *
 * Usage:
 *   node scripts/extract-unesco-sites.js
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
            Accept: 'text/csv',
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
              new Error(`UNESCO CSV returned ${res.statusCode} ${res.statusMessage}`)
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

async function main() {
  console.log('Fetching UNESCO World Heritage Sites CSV...');
  const csvText = await fetchText(CSV_URL);
  console.log(`Downloaded ${csvText.length} bytes`);

  const sites = parseCSV(csvText);
  console.log(`Parsed ${sites.length} sites`);

  sites.sort((a, b) => a.name.localeCompare(b.name));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sites, null, 2) + '\n');

  console.log(`Wrote ${sites.length} sites to ${OUTPUT_PATH}`);
  console.log('First entry:', JSON.stringify(sites[0], null, 2));
}

main().catch((err) => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
