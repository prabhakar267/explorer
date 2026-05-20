#!/usr/bin/env node
/**
 * Fetch park boundary polygons from the NPS API and emit per-park GeoJSON
 * files under public/data/park-boundaries/.
 *
 * Endpoint: https://developer.nps.gov/api/v1/mapdata/parkboundaries/{parkCode}
 * Each response is a GeoJSON FeatureCollection containing one or more
 * MultiPolygon features. We persist the raw FeatureCollection as-is so the
 * client can hand it directly to Leaflet's L.geoJSON.
 *
 * The endpoint is rate-limited to ~10 requests per second per key, so we
 * pace requests with a small delay between calls. NPS_API_KEY is required
 * (DEMO_KEY runs out long before 63 calls finish).
 *
 * Output:
 *   public/data/park-boundaries/{parkCode}.json   one file per park
 *   public/data/park-boundaries/index.json        ["acad", "arch", ...]
 *
 * Usage:
 *   node scripts/extract-park-boundaries.cjs
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const PARKS_PATH = path.join(ROOT, 'public', 'data', 'us-parks.json');
const OUTPUT_DIR = path.join(ROOT, 'public', 'data', 'park-boundaries');

// Lightweight .env loader, same shape as scripts/add-ps-game.js.
if (fs.existsSync(ENV_PATH)) {
    for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
        const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
}

const API_KEY = process.env.NPS_API_KEY;
if (!API_KEY) {
    console.error(
        'Error: NPS_API_KEY is required in .env. Get a key at https://developer.nps.gov.'
    );
    console.error(
        '(DEMO_KEY is too rate-limited to fetch all 63 park boundaries.)'
    );
    process.exit(1);
}

// Sequoia & Kings Canyon share parkCode "seki" in the NPS API. Our parks
// JSON splits them into two records but the boundaries endpoint only
// knows the joint code, so we de-duplicate before fetching.
function fetchableParkCodes(parks) {
    return Array.from(new Set(parks.map((p) => p.parkCode))).sort();
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(
                url,
                {
                    headers: {
                        'User-Agent':
                            'explorer-park-boundaries-extractor/1.0 (https://github.com/prabhakar267/explorer)',
                        Accept: 'application/json',
                    },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        reject(
                            new Error(
                                `NPS API returned ${res.statusCode} ${res.statusMessage}`
                            )
                        );
                        res.resume();
                        return;
                    }
                    let body = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => (body += chunk));
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(body));
                        } catch (err) {
                            reject(err);
                        }
                    });
                }
            )
            .on('error', reject);
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    if (!fs.existsSync(PARKS_PATH)) {
        throw new Error(
            `Missing ${PARKS_PATH}. Run extract-us-parks.cjs first.`
        );
    }
    const parks = JSON.parse(fs.readFileSync(PARKS_PATH, 'utf8'));
    const codes = fetchableParkCodes(parks);
    console.log(
        `Fetching boundaries for ${codes.length} parks (deduped from ${parks.length} entries)...`
    );

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const succeeded = [];
    const failed = [];
    let totalBytes = 0;

    for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        const url = `https://developer.nps.gov/api/v1/mapdata/parkboundaries/${code}?api_key=${API_KEY}`;
        try {
            const data = await fetchJson(url);
            if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) {
                throw new Error(
                    `unexpected response shape (type=${data?.type}, features=${data?.features?.length})`
                );
            }
            const outPath = path.join(OUTPUT_DIR, `${code}.json`);
            // Compact JSON — these files are static assets served to the
            // browser, so size matters more than human readability.
            const serialized = JSON.stringify(data);
            fs.writeFileSync(outPath, serialized);
            totalBytes += serialized.length;
            succeeded.push(code);
            console.log(
                `  [${i + 1}/${codes.length}] ${code}  ${(serialized.length / 1024).toFixed(0)} KB`
            );
        } catch (err) {
            failed.push({ code, error: err.message });
            console.warn(
                `  [${i + 1}/${codes.length}] ${code}  FAILED: ${err.message}`
            );
        }
        // Pace requests so we stay under the per-second quota.
        await sleep(150);
    }

    const indexPath = path.join(OUTPUT_DIR, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(succeeded) + '\n');

    console.log('');
    console.log(
        `Wrote ${succeeded.length} boundary files (${(totalBytes / 1024 / 1024).toFixed(1)} MB total) to ${OUTPUT_DIR}`
    );
    console.log(`Wrote index to ${indexPath}`);
    if (failed.length > 0) {
        console.warn(`${failed.length} parks failed:`);
        for (const f of failed) console.warn(`  ${f.code}: ${f.error}`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Extraction failed:', err);
    process.exit(1);
});
