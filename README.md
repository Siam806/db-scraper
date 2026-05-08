# db-scraper

Scraper service for baseball leagues that stores scorelines and statistics in Supabase and exposes Vercel API endpoints.

## Current league support

The scraper supports multiple baseball and softball leagues from the HBSV site.
Leagues are configured in `lib/leagues.js` with separate scorelines and statistics page URLs, so additional leagues can be added by adding new league entries.

## API endpoints (Vercel)

- `POST /api/scrape`
  - Triggers scraping for all configured leagues.
  - Optional: `league` query/body parameter to scrape one league.
  - Optional auth via `SCRAPER_API_TOKEN` and `Authorization: Bearer <token>`.
- `GET /api/data?league=verbandsliga-baseball&kind=scorelines`
  - Returns latest stored record (`kind=scorelines|statistics`).
  - Optional query parameters:
    - `group=team|date`
    - `team=<team-code>`
    - `section=offense|defense|pitching`
    - `sort=<metric>`
    - `order=asc|desc`
    - `leader=top|bottom`

## Supabase requirements

Set these environment variables in Vercel/GitHub Actions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCORELINES_TABLE` (optional, default `scorelines`)
- `SUPABASE_STATISTICS_TABLE` (optional, default `statistics`)
- `SUPABASE_STATISTICS_SNAPSHOTS_TABLE` (optional, default `statistics_snapshots`)

Expected table shape for both tables:

- `league_key` (`text`)
- `source_url` (`text`)
- `scraped_at` (`timestamptz`)
- `data` (`jsonb`)

## Schedule

GitHub Actions workflow `.github/workflows/scraper.yml` runs at midnight UTC on:

- Monday
- Wednesday
- Friday
- Saturday
- Sunday

You can also trigger it manually via `workflow_dispatch`.

## Local usage

```bash
npm install
npm test
npm run scrape
```
