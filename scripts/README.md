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
