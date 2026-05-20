#!/usr/bin/env node
/**
 * Extract the list of US National Parks from the official National Park
 * Service (NPS) API and emit data/us-parks.json.
 *
 * Why NPS instead of Wikipedia: the NPS API is the authoritative source,
 * returns clean structured JSON, and includes official descriptions and
 * images. That lets the client render previews without any runtime
 * Wikipedia calls — the preview overlay reads everything from the static
 * JSON committed to the repo.
 *
 * Usage:
 *   node scripts/extract-us-parks.js
 *
 * Uses DEMO_KEY by default (the standard api.data.gov demo key; rate-
 * limited to ~30/hour per IP, but a single batch fetch is all we do).
 * Set NPS_API_KEY to use a personal key from https://developer.nps.gov
 * if DEMO_KEY gets throttled.
 *
 * No dependencies — vanilla Node (https + fs).
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_PATH)) {
    for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
        const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
}

const API_KEY = process.env.NPS_API_KEY || 'DEMO_KEY';
const API_URL = `https://developer.nps.gov/api/v1/parks?limit=500&api_key=${API_KEY}`;
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'us-parks.json');

// State / territory code → full name. Covers everything the NPS API can
// return in `states` (two-letter codes, comma-separated when a park spans
// multiple states).
const STATE_NAMES = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
    CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
    IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
    KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
    NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
    OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
    VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
    WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia',
    AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
    PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
};

// NPS `name` field has quirks we want to clean up for user display:
//   - "Black Canyon Of The Gunnison" → title-case fixup
//   - "Gates Of The Arctic" → title-case fixup
//   - "Wrangell - St Elias" → proper en-dash + abbreviation dot
//   - "National Park of American Samoa" → short display name
// Left side is the NPS `name` field; right side is what we emit.
const NAME_OVERRIDES = {
    'Black Canyon Of The Gunnison': 'Black Canyon of the Gunnison',
    'Gates Of The Arctic': 'Gates of the Arctic',
    'Wrangell - St Elias': 'Wrangell–St. Elias',
    'National Park of American Samoa': 'American Samoa',
};

// NPS administers Sequoia and Kings Canyon as a single unit (parkCode
// "seki") and returns one combined record. The 63-park canonical list
// counts them as two, so we split the seki record into two entries using
// each park's individual iconic center coords. Description, image, and
// URL are shared from the joint record.
const SEKI_SPLIT = [
    {
        name: 'Sequoia',
        // Giant Forest area — the iconic Sequoia location.
        lat: 36.4864,
        lng: -118.5658,
    },
    {
        name: 'Kings Canyon',
        // Grant Grove — Kings Canyon's main developed area.
        lat: 36.8879,
        lng: -118.5551,
    },
];

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(
                url,
                {
                    headers: {
                        'User-Agent':
                            'explorer-us-parks-extractor/2.0 (https://github.com/prabhakar267/explorer)',
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

// HEAD-probe an image URL to verify it exists. NPS occasionally returns
// image entries pointing at files that have since been removed from their
// CDN; we drop those at extraction time so the client never has to render
// a broken <img>. Returns true on 2xx, false on anything else (including
// network errors, redirects to error pages, etc.).
function probeImage(url) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            resolve(ok);
        };
        try {
            const req = https.request(
                url,
                {
                    method: 'HEAD',
                    headers: {
                        'User-Agent':
                            'explorer-us-parks-extractor/2.0 (https://github.com/prabhakar267/explorer)',
                    },
                    timeout: 8000,
                },
                (res) => {
                    res.resume();
                    finish(res.statusCode >= 200 && res.statusCode < 300);
                }
            );
            req.on('error', () => finish(false));
            req.on('timeout', () => {
                req.destroy();
                finish(false);
            });
            req.end();
        } catch {
            finish(false);
        }
    });
}

async function probeImagesParallel(images, concurrency = 8) {
    const results = new Array(images.length);
    let next = 0;
    async function worker() {
        while (true) {
            const i = next++;
            if (i >= images.length) return;
            results[i] = await probeImage(images[i].url);
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(concurrency, images.length) }, worker)
    );
    return images.filter((_, i) => results[i]);
}

/**
 * Does this NPS record represent one of the 63 canonical National Parks?
 *
 * Most parks have designation "National Park" or "National Park &
 * Preserve". Four special cases don't:
 *   - npsa  "National Park of American Samoa"    (designation: "")
 *   - redw  "Redwood National and State Parks"   (designation: "National and State Parks")
 *   - seki  "Sequoia & Kings Canyon National Parks"  (designation: "National Parks")
 * Each is opted in explicitly by parkCode. Other units that happen to
 * contain "National Park" in their name but are NOT canonical national
 * parks (e.g. Wolf Trap, National Parks of New York Harbor) are
 * implicitly excluded because they don't match any of these rules.
 */
function isCanonicalNationalPark(record) {
    if (
        record.designation === 'National Park' ||
        record.designation === 'National Park & Preserve'
    ) {
        return true;
    }
    return ['npsa', 'redw', 'seki'].includes(record.parkCode);
}

/** Convert NPS comma-separated state codes to an array of full state names. */
function expandStates(statesCsv) {
    if (!statesCsv) return [];
    return statesCsv
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean)
        .map((code) => STATE_NAMES[code] || code);
}

/** Pick up to MAX_IMAGES images with usable URLs. */
const MAX_IMAGES = 10;
function pickImages(images) {
    if (!Array.isArray(images)) return [];
    const picked = [];
    for (const img of images) {
        if (img && img.url) {
            picked.push({
                url: img.url,
                altText: img.altText || '',
                caption: img.caption || '',
                credit: img.credit || '',
                title: img.title || '',
            });
            if (picked.length >= MAX_IMAGES) break;
        }
    }
    return picked;
}

/** Convert one NPS record to our flat park object. */
function toPark(record, { nameOverride, latOverride, lngOverride } = {}) {
    const lat = latOverride ?? parseFloat(record.latitude);
    const lng = lngOverride ?? parseFloat(record.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const states = expandStates(record.states);
    const displayName =
        nameOverride || NAME_OVERRIDES[record.name] || record.name;

    const images = pickImages(record.images);
    return {
        name: displayName,
        fullName: record.fullName,
        parkCode: record.parkCode,
        designation: record.designation || 'National Park',
        states,
        state: states.length === 1 ? states[0] : states.join(', '),
        lat,
        lng,
        description: record.description || '',
        url: record.url || '',
        // `image` (singular) is kept for backwards compatibility with any
        // consumer that only reads the cover image; `images` is the full
        // gallery (up to MAX_IMAGES).
        image: images[0] || null,
        images,
    };
}

async function main() {
    if (API_KEY === 'DEMO_KEY') {
        console.warn(
            'Using DEMO_KEY (rate-limited to ~30 requests/hour). Set NPS_API_KEY for a personal key.'
        );
    }
    console.log(`Fetching parks from NPS API...`);
    const resp = await fetchJson(API_URL);
    const units = resp.data;
    if (!Array.isArray(units)) {
        throw new Error(
            `Unexpected NPS API response shape: no data array (total=${resp.total})`
        );
    }
    console.log(`Got ${units.length} NPS units total`);

    const canonical = units.filter(isCanonicalNationalPark);
    console.log(`${canonical.length} canonical national park records`);

    const parks = [];
    for (const record of canonical) {
        if (record.parkCode === 'seki') {
            // Split Sequoia & Kings Canyon into two entries.
            for (const split of SEKI_SPLIT) {
                const park = toPark(record, {
                    nameOverride: split.name,
                    latOverride: split.lat,
                    lngOverride: split.lng,
                });
                if (park) parks.push(park);
            }
        } else {
            const park = toPark(record);
            if (park) parks.push(park);
        }
    }

    if (parks.length !== 63) {
        throw new Error(
            `Expected 63 parks, got ${parks.length}. NPS API inventory may have drifted.`
        );
    }

    // Verify every image URL still resolves on the NPS CDN. NPS records
    // occasionally reference files that have been removed; we drop them
    // here so the client never has to render a broken <img>.
    console.log('Probing image URLs...');
    let totalBefore = 0;
    let totalAfter = 0;
    for (const park of parks) {
        totalBefore += park.images.length;
        const live = await probeImagesParallel(park.images);
        if (live.length !== park.images.length) {
            const dropped = park.images.length - live.length;
            console.log(`  ${park.name}: dropped ${dropped} broken image${dropped === 1 ? '' : 's'}`);
        }
        park.images = live;
        park.image = live[0] || null;
        totalAfter += live.length;
    }
    console.log(`Image probe done: kept ${totalAfter} / ${totalBefore} URLs`);

    parks.sort((a, b) => a.name.localeCompare(b.name));

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parks, null, 2) + '\n');

    console.log(`Wrote ${parks.length} parks to ${OUTPUT_PATH}`);
    console.log('First entry:', {
        name: parks[0].name,
        parkCode: parks[0].parkCode,
        state: parks[0].state,
        coord: `${parks[0].lat}, ${parks[0].lng}`,
        hasDescription: !!parks[0].description,
        imageCount: parks[0].images.length,
    });
}

main().catch((err) => {
    console.error('Extraction failed:', err);
    process.exit(1);
});
