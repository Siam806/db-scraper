import { LEAGUES, getLeagueByKey } from './leagues.js';
import { createSupabaseFromEnv } from './supabase.js';

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function stripHtml(value) {
  return normalizeText(value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '));
}

function decodeCells(rowHtml) {
  const cells = [...rowHtml.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => stripHtml(match[2]));

  return cells;
}

function findTableSection(html, tableIndex) {
  let section = null;
  for (const match of html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (typeof match.index === 'number' && match.index < tableIndex) {
      section = stripHtml(match[2]);
    }
  }
  return section || undefined;
}

function isBlankRow(row) {
  return row.every((cell) => cell === '');
}

export function parseTables(html) {
  const tables = [];

  for (const tableMatch of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const tableHtml = tableMatch[1];
    const rows = [];

    for (const rowMatch of tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = decodeCells(rowMatch[1]);
      if (cells.length > 0 && !isBlankRow(cells)) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      const section = findTableSection(html, tableMatch.index ?? 0);

      tables.push({
        headers: rows[0],
        rows: rows.slice(1),
        ...(section ? { section } : {})
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

function parseScheduleTables(tables) {
  return tables
    .filter((table) => table.rows.some((row) => /\b\d{1,2}[:\-]\d{1,2}\b/.test(row.join(' '))))
    .map((table) => ({
      section: table.section,
      headers: table.headers,
      rows: table.rows.map((row) => ({
        cells: row,
        score: extractScoreTokens(row.join(' '))[0] || null
      }))
    }));
}

export function parseScorelinesPage(html) {
  const text = stripHtml(html);
  const tables = parseTables(html);

  return {
    scorelines: extractScoreTokens(text),
    tables,
    schedule: parseScheduleTables(tables)
  };
}

export function parseStatisticsPage(html) {
  const text = stripHtml(html);
  const tables = parseTables(html);

  return {
    tables,
    sections: [...new Set(tables.map((table) => table.section).filter(Boolean))],
    text_sample: text.slice(0, 2000)
  };
}

function tableForPageType(pageType) {
  if (pageType === 'scorelines') {
    return process.env.SUPABASE_SCORELINES_TABLE || 'scorelines';
  }

  return process.env.SUPABASE_STATISTICS_TABLE || 'statistics';
}

function snapshotTableForPageType(pageType) {
  if (pageType === 'statistics') {
    return process.env.SUPABASE_STATISTICS_SNAPSHOTS_TABLE || 'statistics_snapshots';
  }

  return null;
}

async function deleteExistingRecords(db, table, leagueKey, sourceUrl) {
  const { error } = await db
    .from(table)
    .delete()
    .eq('league_key', leagueKey)
    .eq('source_url', sourceUrl);

  if (error) {
    throw new Error(`Supabase delete failed for ${table} (league: ${leagueKey}, source: ${sourceUrl}): ${error.message}`);
  }
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
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`);
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
    await deleteExistingRecords(db, table, league.key, url);

    const { error } = await db.from(table).insert(record);
    if (error) {
      throw new Error(`Supabase insert failed for ${table} (league: ${league.key}, page: ${pageType}): ${error.message}`);
    }

    const pageResult = { pageType, table, sourceUrl: url };

    if (pageType === 'statistics') {
      const snapshotTable = snapshotTableForPageType(pageType);
      const { error: snapshotError } = await db.from(snapshotTable).insert(record);
      if (snapshotError) {
        throw new Error(`Supabase insert failed for ${snapshotTable} (league: ${league.key}, page: ${pageType}): ${snapshotError.message}`);
      }
      pageResult.snapshotTable = snapshotTable;
    }

    results.push(pageResult);
  }

  return {
    league: league.key,
    recordsInserted: results.length,
    pages: results
  };
}

export async function scrapeAllLeagues(options = {}) {
  const now = options.now ?? new Date();
  const output = [];

  for (const league of LEAGUES) {
    output.push(await scrapeLeague(league.key, { ...options, now }));
  }

  return output;
}
