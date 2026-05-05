#!/usr/bin/env node
/**
 * Extract the list of US National Parks from the Wikipedia article
 * "List of national parks of the United States" and emit
 * data/us-parks.json.
 *
 * This is a one-time / infrequent extraction — run at setup and re-run if
 * the Wikipedia list changes (new parks are added roughly every few years).
 * The emitted JSON is committed to the repo and read at runtime by the
 * client; Wikipedia is NOT a runtime dependency.
 *
 * Usage:
 *   node scripts/extract-us-parks.js
 *
 * No dependencies — vanilla Node (https + fs).
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const WIKIPEDIA_PAGE = 'List_of_national_parks_of_the_United_States';
const WIKIPEDIA_API = `https://en.wikipedia.org/w/api.php?action=parse&page=${WIKIPEDIA_PAGE}&prop=wikitext&format=json&formatversion=2`;
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'us-parks.json');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(
                url,
                {
                    headers: {
                        // Wikipedia asks for a descriptive User-Agent.
                        'User-Agent':
                            'explorer-us-parks-extractor/1.0 (https://github.com/prabhakar267/explorer)',
                    },
                },
                (res) => {
                    if (res.statusCode !== 200) {
                        reject(
                            new Error(
                                `Wikipedia API returned ${res.statusCode}`
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

/**
 * Extract the parks wikitable from the article wikitext.
 * The article has exactly one `wikitable sortable plainrowheaders` that
 * contains the 63 parks. Returns the rows between the header row and the
 * closing `|}`, split by row separators.
 */
function extractParkRows(wikitext) {
    const tableStart = wikitext.indexOf('{| class="wikitable sortable plainrowheaders"');
    if (tableStart === -1) {
        throw new Error('Could not find the parks wikitable in the article');
    }
    const tableEnd = wikitext.indexOf('\n|}', tableStart);
    if (tableEnd === -1) {
        throw new Error('Could not find the end of the parks wikitable');
    }
    const table = wikitext.slice(tableStart, tableEnd);

    // Rows are separated by lines that are exactly `|-` (possibly with
    // trailing whitespace). Split, then discard the first chunk which is
    // the header + column definitions.
    const chunks = table.split(/\n\|-+\s*\n/);
    // chunks[0] contains the table opening + header cells. Real rows start
    // at chunks[1].
    return chunks.slice(1).map((r) => r.trim()).filter((r) => r.length > 0);
}

/**
 * Parse one park row. Returns a park object or null if the row looks wrong.
 *
 * The row format (see the article source) is:
 *   !scope="row" | [[Acadia National Park|Acadia]]
 *   |[[File:...|200px|alt=...]]
 *   |[[Maine]]<br /><small>{{coord|44.35|-68.21|name=Acadia|type:landmark}}</small>
 *   |{{dts|February 26, 1919|nowrap=off}}
 *   |{{convert|49,071.40|acre|km2|1|sortable=on}}
 *   |4,079,318
 *   |Description text...
 */
function parseParkRow(row) {
    const park = {};

    // --- Name and Wikipedia title ---
    // The name cell is a row-scope cell containing a wikilink. The article
    // uses two variants:
    //   `!scope="row" | [[...]]`  (plain rows)
    //   `|scope="row" bgcolor="#xxxxxx"| [[...]] {{dagger}}`  (UNESCO / BR rows)
    // Allow both, along with optional extra attributes. `{{dagger}}`,
    // `{{double dagger}}`, and `*` after the link mark UNESCO / Biosphere
    // Reserve status — we ignore them here.
    const nameMatch = row.match(
        /[!|]\s*scope\s*=\s*"row"[^|\n]*\|\s*\[\[([^\]]+)\]\]/
    );
    if (!nameMatch) return null;
    const nameLink = nameMatch[1];
    // Wikilink is either "Title" or "Title|Display". The title is what we
    // need to fetch the Wikipedia summary; the display is the short name
    // used on the map.
    let wikipediaTitle;
    let name;
    const pipeIdx = nameLink.indexOf('|');
    if (pipeIdx >= 0) {
        wikipediaTitle = nameLink.slice(0, pipeIdx).trim();
        name = nameLink.slice(pipeIdx + 1).trim();
    } else {
        wikipediaTitle = nameLink.trim();
        name = nameLink.trim();
    }
    // Decode the few HTML entities Wikipedia's wikitext uses in park
    // display names (`&nbsp;` between "St." and "Elias" in Wrangell–St.
    // Elias, occasional `&amp;`). Keeping this minimal rather than pulling
    // in a full HTML-entity library — the display names are a small,
    // known set.
    const decodeEntities = (s) =>
        s
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"');
    name = decodeEntities(name);
    wikipediaTitle = decodeEntities(wikipediaTitle);
    park.name = name;
    park.wikipediaTitle = wikipediaTitle;

    // --- Coordinates ---
    // `{{coord|LAT|LNG|...}}` — LAT and LNG are decimal degrees.
    const coordMatch = row.match(/\{\{coord\s*\|\s*(-?[\d.]+)\s*\|\s*(-?[\d.]+)/i);
    if (!coordMatch) return null;
    park.lat = parseFloat(coordMatch[1]);
    park.lng = parseFloat(coordMatch[2]);
    if (Number.isNaN(park.lat) || Number.isNaN(park.lng)) return null;

    // --- States ---
    // The Location cell is the third pipe-prefixed cell. It contains one
    // or more `[[State]]` wikilinks (with optional display) before the
    // `<br />` that precedes the coord template. Grab all wikilinks up to
    // the `<br`.
    //
    // Note: a few multi-state parks are written as
    //   [[California]], [[Nevada]]<br /> ...
    // or with a comma-separated "Location" cell.
    let states = [];
    const locCellMatch = row.match(/\n\|([^\n]*?)<br\s*\/?>/);
    if (locCellMatch) {
        const locCell = locCellMatch[1];
        // Extract all wikilinks; keep the display text (after `|` if present).
        const linkRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        let m;
        while ((m = linkRe.exec(locCell)) !== null) {
            const display = (m[2] || m[1]).trim();
            if (display) states.push(display);
        }
    }
    // Fallback: if we found no states, record an empty string rather than
    // failing — the park is still usable.
    park.states = states;
    park.state = states.length === 1 ? states[0] : states.join(', ');

    // --- Year established ---
    // `{{dts|Month Day, Year|...}}` — extract the 4-digit year.
    const dtsMatch = row.match(/\{\{dts\|[^|}]*?(\d{4})/);
    if (dtsMatch) {
        park.yearEstablished = parseInt(dtsMatch[1], 10);
    } else {
        // Some rows might use a plain date string — scan for any 4-digit
        // year between 1800 and 2099 in the date cell (fourth cell).
        const yearFallback = row.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
        park.yearEstablished = yearFallback ? parseInt(yearFallback[1], 10) : null;
    }

    // --- Area in acres ---
    // `{{convert|NUMBER|acre|...}}` — NUMBER may contain commas.
    const areaMatch = row.match(/\{\{convert\s*\|\s*([\d,.]+)\s*\|\s*acre/i);
    if (areaMatch) {
        park.areaAcres = parseFloat(areaMatch[1].replace(/,/g, ''));
    } else {
        park.areaAcres = null;
    }

    return park;
}

async function main() {
    console.log(`Fetching wikitext from ${WIKIPEDIA_API}...`);
    const resp = await fetchJson(WIKIPEDIA_API);
    // formatversion=2 returns wikitext as a string; v1 returned { '*': '...' }
    const wikitext =
        typeof resp?.parse?.wikitext === 'string'
            ? resp.parse.wikitext
            : resp?.parse?.wikitext?.['*'];
    if (!wikitext) {
        throw new Error('Wikipedia API response did not contain wikitext');
    }
    console.log(`Got ${wikitext.length} chars of wikitext`);

    const rows = extractParkRows(wikitext);
    console.log(`Found ${rows.length} candidate rows`);

    const parks = [];
    const failed = [];
    for (const row of rows) {
        const park = parseParkRow(row);
        if (park) {
            parks.push(park);
        } else {
            // Keep a short preview for debugging.
            failed.push(row.slice(0, 120).replace(/\n/g, ' '));
        }
    }

    if (failed.length > 0) {
        console.warn(`Failed to parse ${failed.length} rows:`);
        failed.forEach((f, i) => console.warn(`  [${i}] ${f}...`));
    }

    if (parks.length < 60 || parks.length > 70) {
        throw new Error(
            `Expected ~63 parks; got ${parks.length}. Wikipedia table format may have drifted.`
        );
    }

    // Sort by name for stable output.
    parks.sort((a, b) => a.name.localeCompare(b.name));

    // Make sure the target directory exists.
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(parks, null, 2) + '\n');

    console.log(`Wrote ${parks.length} parks to ${OUTPUT_PATH}`);
    console.log('Sample:', parks[0]);
}

main().catch((err) => {
    console.error('Extraction failed:', err);
    process.exit(1);
});
