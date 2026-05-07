import { LEAGUES, getLeagueByKey } from './leagues.js';
import { createSupabaseFromEnv } from './supabase.js';

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeCells(rowHtml) {
  const cells = [...rowHtml.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => stripHtml(match[2]))
    .filter(Boolean);

  return cells;
}

export function parseTables(html) {
  const tables = [];

  for (const tableMatch of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const tableHtml = tableMatch[1];
    const rows = [];

    for (const rowMatch of tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = decodeCells(rowMatch[1]);
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      tables.push({
        headers: rows[0],
        rows: rows.slice(1)
      });
    }
  }

  return tables;
}

export function extractScoreTokens(text) {
  const seen = new Set();
  const scorelines = [];

  for (const match of text.matchAll(/\b(\d{1,2})\s*[:\-]\s*(\d{1,2})\b/g)) {
    const token = `${match[1]}:${match[2]}`;
    if (!seen.has(token)) {
      seen.add(token);
      scorelines.push(token);
    }
  }

  return scorelines;
}

export function parseScorelinesPage(html) {
  const text = stripHtml(html);

  return {
    scorelines: extractScoreTokens(text),
    tables: parseTables(html)
  };
}

export function parseStatisticsPage(html) {
  const text = stripHtml(html);

  return {
    tables: parseTables(html),
    text_sample: text.slice(0, 2000)
  };
}

function tableForPageType(pageType) {
  if (pageType === 'scorelines') {
    return process.env.SUPABASE_SCORELINES_TABLE || 'scorelines';
  }

  return process.env.SUPABASE_STATISTICS_TABLE || 'statistics';
}

export async function scrapeLeague(leagueKey, { fetchImpl = fetch, supabase, now = new Date() } = {}) {
  const league = getLeagueByKey(leagueKey);
  if (!league) {
    throw new Error(`Unknown league: ${leagueKey}`);
  }

  const db = supabase ?? createSupabaseFromEnv();
  const results = [];

  for (const [pageType, url] of Object.entries(league.pages)) {
    const response = await fetchImpl(url, {
      headers: {
        'user-agent': 'db-scraper/1.0 (+https://github.com/Siam806/db-scraper)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }

    const html = await response.text();
    const parsed = pageType === 'scorelines' ? parseScorelinesPage(html) : parseStatisticsPage(html);

    const record = {
      league_key: league.key,
      source_url: url,
      scraped_at: now.toISOString(),
      data: parsed
    };

    const table = tableForPageType(pageType);
    const { error } = await db.from(table).insert(record);
    if (error) {
      throw new Error(`Supabase insert failed for ${table}: ${error.message}`);
    }

    results.push({ pageType, table, sourceUrl: url });
  }

  return {
    league: league.key,
    recordsInserted: results.length,
    pages: results
  };
}

export async function scrapeAllLeagues(options = {}) {
  const output = [];

  for (const league of LEAGUES) {
    output.push(await scrapeLeague(league.key, options));
  }

  return output;
}
