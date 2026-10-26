#!/usr/bin/env node
/**
 * Simplify the park boundary GeoJSON in public/data/park-boundaries/ in place.
 *
 * The NPS API returns survey-grade polygons: Grand Canyon alone is 8.6 MB with
 * 668k coordinates at 7-decimal (~1 cm) precision, and the browser fetches it
 * the moment the park's marker is unclustered. The map caps boundary fitting
 * at zoom 12, where one pixel is ~40 m, so almost none of that detail is ever
 * visible.
 *
 * This pass applies Visvalingam simplification with a 20 m tolerance (keeping
 * every ring so small islands survive), rounds coordinates to 5 decimals
 * (~1 m), and drops the NPS metadata the app never reads. Grand Canyon comes
 * out at ~300 KB; the whole directory goes from 22 MB to under 2 MB.
 *
 * Idempotent: re-running on already-simplified files is a no-op in practice.
 * extract-park-boundaries.cjs calls simplifyFile() on each file it writes, so
 * this only needs running by hand after changing the settings below.
 *
 *   node scripts/simplify-park-boundaries.cjs            # all files
 *   node scripts/simplify-park-boundaries.cjs grca kefj  # specific parks
 */
'use strict';

const fs = require('fs');
const path = require('path');
const mapshaper = require('mapshaper');

const ROOT = path.resolve(__dirname, '..');
const BOUNDARIES_DIR = path.join(ROOT, 'public', 'data', 'park-boundaries');

// Metres. Raise for smaller files, lower for more fidelity at high zoom.
const TOLERANCE_M = 20;
// Decimal places kept in output coordinates. 5 ≈ 1.1 m at the equator.
const PRECISION = 0.00001;
// The only property worth shipping; everything else (designation objects,
// alias arrays, NPS ids) is dead weight for the browser.
const KEEP_FIELDS = ['fullName'];

const COMMANDS = [
    '-i in.json',
    `-simplify interval=${TOLERANCE_M} keep-shapes`,
    `-filter-fields ${KEEP_FIELDS.join(',')}`,
    `-o out.json format=geojson precision=${PRECISION}`,
].join(' ');

/**
 * Simplify a GeoJSON string or Buffer. Returns the simplified GeoJSON string.
 */
async function simplifyGeoJson(input) {
    const out = await mapshaper.applyCommands(COMMANDS, { 'in.json': input });
    return out['out.json'].toString();
}

/**
 * Simplify one boundary file in place. Returns { before, after } byte sizes.
 */
async function simplifyFile(filePath) {
    const input = fs.readFileSync(filePath);
    const output = await simplifyGeoJson(input);
    fs.writeFileSync(filePath, output);
    return { before: input.length, after: Buffer.byteLength(output) };
}

async function main(argv) {
    const codes = argv.length > 0
        ? argv
        : fs.readdirSync(BOUNDARIES_DIR)
            .filter((f) => f.endsWith('.json') && f !== 'index.json')
            .map((f) => f.slice(0, -'.json'.length))
            .sort();

    let totalBefore = 0;
    let totalAfter = 0;
    for (const code of codes) {
        const filePath = path.join(BOUNDARIES_DIR, `${code}.json`);
        if (!fs.existsSync(filePath)) {
            console.warn(`  ${code}: missing, skipped`);
            continue;
        }
        const { before, after } = await simplifyFile(filePath);
        totalBefore += before;
        totalAfter += after;
        console.log(
            `  ${code.padEnd(6)} ${(before / 1024).toFixed(0).padStart(6)} KB -> ${(after / 1024).toFixed(0).padStart(5)} KB`
        );
    }
    console.log('');
    console.log(
        `Total ${(totalBefore / 1024 / 1024).toFixed(1)} MB -> ${(totalAfter / 1024 / 1024).toFixed(2)} MB ` +
        `(${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}% smaller)`
    );
}

module.exports = { simplifyGeoJson, simplifyFile };

if (require.main === module) {
    main(process.argv.slice(2)).catch((err) => {
        console.error('Simplification failed:', err);
        process.exit(1);
    });
}
