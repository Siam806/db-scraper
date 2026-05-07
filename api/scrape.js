import { scrapeAllLeagues, scrapeLeague } from '../lib/scraper.js';
import { timingSafeEqual } from 'node:crypto';

function isAuthorized(providedToken, configuredToken) {
  if (!providedToken || !configuredToken) {
    return false;
  }

  const providedBuffer = Buffer.from(providedToken);
  const configuredBuffer = Buffer.from(configuredToken);

  if (providedBuffer.length !== configuredBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, configuredBuffer);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configuredToken = process.env.SCRAPER_API_TOKEN;
  if (configuredToken) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!isAuthorized(token, configuredToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const queryLeague = typeof req.query?.league === 'string' ? req.query.league : undefined;
    const bodyLeague = typeof req.body?.league === 'string' ? req.body.league : undefined;
    const league = queryLeague ?? bodyLeague;
    const result = league ? await scrapeLeague(league) : await scrapeAllLeagues();
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
