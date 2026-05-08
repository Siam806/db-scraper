import 'dotenv/config';
import { scrapeAllLeagues } from '../lib/scraper.js';

const dryRun = process.env.DRY_RUN === 'true';

if (dryRun) {
  console.log('Dry run enabled. Set DRY_RUN=false to write to Supabase.');
  process.exit(0);
}

try {
  const results = await scrapeAllLeagues();
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
