#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { select, search, confirm } from '@inquirer/prompts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'data');

const COLLECTIONS = {
  unesco: {
    label: 'UNESCO World Heritage Sites',
    sitesFile: join(DATA_DIR, 'unesco-sites.json'),
    visitedFile: join(DATA_DIR, 'visited-unesco.json'),
    nameField: 'name',
    displayFn: (site) => `${site.name} (${site.country}, ${site.year})`,
  },
  parks: {
    label: 'US National Parks',
    sitesFile: join(DATA_DIR, 'us-parks.json'),
    visitedFile: join(DATA_DIR, 'visited-parks.json'),
    nameField: 'name',
    displayFn: (site) => `${site.name} (${site.state || site.states?.join(', ')})`,
  },
};

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveVisited(path, visited) {
  writeFileSync(path, JSON.stringify(visited.sort(), null, 2) + '\n');
}

async function run() {
  const collectionKey = await select({
    message: 'Which collection?',
    choices: [
      { name: 'UNESCO World Heritage Sites', value: 'unesco' },
      { name: 'US National Parks', value: 'parks' },
    ],
  });

  const collection = COLLECTIONS[collectionKey];
  const sites = loadJson(collection.sitesFile);
  const visited = new Set(loadJson(collection.visitedFile));
  saveVisited(collection.visitedFile, [...visited]);

  while (true) {
    const siteName = await search({
      message: `Search ${collection.label} (Ctrl+C to exit):`,
      source: (input) => {
        const term = (input || '').toLowerCase();
        return sites
          .filter((s) => s[collection.nameField].toLowerCase().includes(term))
          .map((s) => {
            const isVisited = visited.has(s[collection.nameField]);
            const prefix = isVisited ? '[✓]' : '[ ]';
            return {
              name: `${prefix} ${collection.displayFn(s)}`,
              value: s[collection.nameField],
            };
          });
      },
    });

    const isVisited = visited.has(siteName);
    const action = isVisited ? 'unvisit' : 'visit';

    const confirmed = await confirm({
      message: `Mark "${siteName}" as ${action === 'visit' ? 'visited' : 'not visited'}?`,
      default: true,
    });

    if (confirmed) {
      if (action === 'visit') {
        visited.add(siteName);
      } else {
        visited.delete(siteName);
      }
      saveVisited(collection.visitedFile, [...visited]);
      console.log(`  → ${siteName} marked as ${action === 'visit' ? 'visited' : 'not visited'}`);
    }

    console.log();
  }
}

run().catch((err) => {
  if (err.name === 'ExitPromptError') process.exit(0);
  console.error(err);
  process.exit(1);
});
