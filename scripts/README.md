# Scripts

## manage-visited.js

Interactive CLI to mark/unmark UNESCO World Heritage Sites and US National Parks as visited. Provides a fuzzy search interface to find sites and toggle their visited status. Data is saved to `public/data/visited-unesco.json` and `public/data/visited-parks.json`.

```bash
npm run visited
```

## add-ps-game.js

Search the IGDB API for PlayStation games (PS1–PS5) and add them to the tracker. Fetches cover art, rating, developer, themes, and collection/series info. Data is saved to `public/data/ps-games.json`.

Requires Twitch developer credentials in `.env`:

```
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
```

Get credentials at https://dev.twitch.tv/console/apps

```bash
npm run games
```

## extract-us-parks.cjs

Fetches the canonical 63 US National Parks from the NPS API and writes `public/data/us-parks.json`.

```bash
node scripts/extract-us-parks.cjs
```

Optionally set `NPS_API_KEY` in `.env` to avoid the `DEMO_KEY` rate limit. Get a key at https://developer.nps.gov.

## extract-park-boundaries.cjs

Fetches park boundary polygons (GeoJSON `MultiPolygon`) from `/mapdata/parkboundaries/{parkCode}` for every park in `us-parks.json`. Writes one file per park to `public/data/park-boundaries/{parkCode}.json` and an index at `public/data/park-boundaries/index.json`.

```bash
node scripts/extract-park-boundaries.cjs
```

Requires `NPS_API_KEY` in `.env` (the boundaries endpoint is rate-limited and `DEMO_KEY` runs out quickly across 63 calls).
