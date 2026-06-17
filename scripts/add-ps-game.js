#!/usr/bin/env node
/**
 * Search the IGDB API for PlayStation games and add them to ps-games.json.
 *
 * Usage:
 *   node scripts/add-ps-game.js
 *
 * Requires Twitch developer credentials (IGDB uses Twitch OAuth).
 * Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env
 * Get them at https://dev.twitch.tv/console/apps
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { search, confirm } from '@inquirer/prompts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_PATH = join(ROOT, 'public', 'data', 'ps-games.json');

const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required in .env');
  console.error('Get them at https://dev.twitch.tv/console/apps');
  process.exit(1);
}

const PS_PLATFORMS = {
  167: 'PS5',
  48: 'PS4',
  9: 'PS3',
  8: 'PS2',
  7: 'PS1',
  38: 'PSP',
  46: 'PS Vita',
};
const PS_IDS = Object.keys(PS_PLATFORMS);

let accessToken = null;

async function authenticate() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`);
  const data = await res.json();
  accessToken = data.access_token;
}

async function igdbQuery(endpoint, body) {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    },
    body,
  });
  if (!res.ok) throw new Error(`IGDB error: ${res.status}`);
  return res.json();
}

async function searchGames(query) {
  const platformFilter = PS_IDS.join(',');
  const results = await igdbQuery('games', `
    search "${query}";
    fields name, platforms, genres.name, cover.image_id, first_release_date, rating, collection.name, themes.name, involved_companies.company.name, involved_companies.developer, url, websites.url, websites.category;
    where platforms = (${platformFilter});
    limit 10;
  `);
  return results;
}

function getPlatform(game) {
  if (!game.platforms) return 'PS4';
  for (const id of PS_IDS) {
    if (game.platforms.includes(Number(id))) {
      return PS_PLATFORMS[id];
    }
  }
  return 'PS4';
}

function getCoverUrl(game) {
  if (!game.cover || !game.cover.image_id) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`;
}

function getYear(game) {
  if (!game.first_release_date) return '?';
  return new Date(game.first_release_date * 1000).getFullYear().toString();
}

function loadGames() {
  try {
    return JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveGames(games) {
  writeFileSync(OUTPUT_PATH, JSON.stringify(games, null, 2) + '\n');
}

async function runPlatinum() {
  const games = loadGames();
  console.log(`\nToggle platinum trophies (Ctrl+C to exit).\n`);

  while (true) {
    const choice = await search({
      message: 'Search a game to toggle platinum:',
      source: (input) => {
        const filtered = games
          .map((g, i) => ({ ...g, index: i }))
          .filter((g) => !input || g.title.toLowerCase().includes(input.toLowerCase()));
        return filtered.map((g) => ({
          name: `${g.platinum ? '🏆' : '  '} ${g.title}`,
          value: g.index,
        }));
      },
    });

    games[choice].platinum = !games[choice].platinum;
    const status = games[choice].platinum ? 'earned' : 'removed';
    console.log(`  → Platinum ${status} for "${games[choice].title}"\n`);
    saveGames(games);
  }
}

async function run() {
  if (process.argv.includes('--platinum')) {
    return runPlatinum();
  }

  console.log('Authenticating with Twitch...');
  await authenticate();
  console.log('Authenticated.\n');

  const games = loadGames();
  const existing = new Set(games.map((g) => g.title));

  console.log(`Currently tracking ${games.length} games.`);
  console.log('Search for games to add (Ctrl+C to exit).\n');

  while (true) {
    const resultsById = new Map();

    const selected = await search({
      message: 'Search for a game:',
      source: async (input) => {
        if (!input || input.length < 3) return [];
        await new Promise((r) => setTimeout(r, 400));
        try {
          const results = await searchGames(input);
          for (const g of results) resultsById.set(g.id, g);
          return results.map((game) => {
            const platform = getPlatform(game);
            const year = getYear(game);
            const alreadyAdded = existing.has(game.name);
            const prefix = alreadyAdded ? '[✓]' : '   ';
            return {
              name: `${prefix} ${game.name} (${platform}, ${year})`,
              value: game.id,
            };
          });
        } catch (err) {
          return [{ name: `Error: ${err.message}`, value: null }];
        }
      },
    });

    if (!selected) continue;

    const game = resultsById.get(selected);
    if (!game) continue;

    if (existing.has(game.name)) {
      console.log(`  "${game.name}" is already in your list.\n`);
      continue;
    }

    const platform = getPlatform(game);
    const genre = game.genres?.[0]?.name || null;
    const cover = getCoverUrl(game);
    const rating = game.rating ? Math.round(game.rating) : null;
    const collection = game.collection?.name || null;
    const themes = game.themes?.map((t) => t.name) || [];
    const developer = game.involved_companies
      ?.find((c) => c.developer)?.company?.name || null;
    const psStoreUrl = game.websites?.find((w) => w.url?.includes('store.playstation.com'))?.url || null;
    const url = psStoreUrl || game.url || null;

    console.log(`\n  Title:      ${game.name}`);
    console.log(`  Platform:   ${platform}`);
    console.log(`  Genre:      ${genre || '—'}`);
    console.log(`  Year:       ${getYear(game)}`);
    console.log(`  Rating:     ${rating ? `${rating}/100` : '—'}`);
    console.log(`  Collection: ${collection || '—'}`);
    console.log(`  Themes:     ${themes.length ? themes.join(', ') : '—'}`);
    console.log(`  Developer:  ${developer || '—'}`);
    console.log(`  URL:        ${url || '—'}`);
    console.log(`  Cover:      ${cover ? 'yes' : 'no'}`);

    const ok = await confirm({ message: `Add "${game.name}" to your list?`, default: true });

    if (ok) {
      const platinum = await confirm({ message: 'Platinum trophy earned?', default: false });
      const entry = { title: game.name, platform, genre, cover, rating, collection, themes, developer, url, platinum };
      games.push(entry);
      existing.add(game.name);
      saveGames(games);
      console.log(`  → Added! (${games.length} games total)\n`);
    } else {
      console.log('  → Skipped.\n');
    }
  }
}

run().catch((err) => {
  if (err.name === 'ExitPromptError') process.exit(0);
  console.error(err);
  process.exit(1);
});
