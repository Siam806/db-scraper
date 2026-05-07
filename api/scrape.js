import { scrapeAllLeagues, scrapeLeague } from '../lib/scraper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configuredToken = process.env.SCRAPER_API_TOKEN;
  if (configuredToken) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (token !== configuredToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const league = req.query?.league || req.body?.league;
    const result = league ? await scrapeLeague(league) : await scrapeAllLeagues();
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
