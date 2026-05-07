import { createSupabaseFromEnv } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const league = req.query?.league || 'verbandsliga-baseball';
  const kind = req.query?.kind || 'scorelines';
  const table = kind === 'statistics'
    ? (process.env.SUPABASE_STATISTICS_TABLE || 'statistics')
    : (process.env.SUPABASE_SCORELINES_TABLE || 'scorelines');

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

    return res.status(200).json({ ok: true, data: data?.[0] ?? null });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
