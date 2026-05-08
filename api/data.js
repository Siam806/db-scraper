import { createSupabaseFromEnv } from '../lib/supabase.js';
import { aggregateScorelines, aggregateStatistics } from '../lib/data-aggregator.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const league = req.query?.league || 'verbandsliga-baseball';
  const kind = req.query?.kind || 'scorelines';
  const table = kind === 'statistics'
    ? (process.env.SUPABASE_STATISTICS_TABLE || 'statistics')
    : (process.env.SUPABASE_SCORELINES_TABLE || 'scorelines');

  const queryParams = {
    group: typeof req.query?.group === 'string' ? req.query.group : undefined,
    team: typeof req.query?.team === 'string' ? req.query.team : undefined,
    section: typeof req.query?.section === 'string' ? req.query.section : undefined,
    sort: typeof req.query?.sort === 'string' ? req.query.sort : undefined,
    order: typeof req.query?.order === 'string' ? req.query.order : undefined,
    leader: typeof req.query?.leader === 'string' ? req.query.leader : undefined
  };

  const hasAggregationQuery = Object.values(queryParams).some((value) => value != null);

  try {
    const db = createSupabaseFromEnv();
    const { data, error } = await db
      .from(table)
      .select('*')
      .eq('league_key', league)
      .order('scraped_at', { ascending: false })
      .limit(1);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const record = data?.[0] ?? null;
    if (!record) {
      return res.status(200).json({ ok: true, data: null, view: null });
    }

    let view = null;
    let responseData = record;

    if (hasAggregationQuery) {
      view = kind === 'statistics'
        ? aggregateStatistics(record.data, queryParams)
        : aggregateScorelines(record.data, queryParams);
      responseData = view;
    }

    const response = {
      ok: true,
      data: responseData
    };

    if (hasAggregationQuery) {
      response.raw = record;
      response.view = view;
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
