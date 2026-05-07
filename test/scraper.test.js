import test from 'node:test';
import assert from 'node:assert/strict';
import { extractScoreTokens, parseScorelinesPage, parseStatisticsPage, parseTables } from '../lib/scraper.js';

test('extractScoreTokens finds unique scorelines', () => {
  const text = 'Team A 3:2 Team B, Team C 10-1 Team D, Team A 3:2 Team B';
  assert.deepEqual(extractScoreTokens(text), ['3:2', '10:1']);
});

test('parseTables extracts headers and data rows', () => {
  const html = `
    <table>
      <tr><th>Team</th><th>W</th></tr>
      <tr><td>Hawks</td><td>8</td></tr>
      <tr><td>Bats</td><td>7</td></tr>
    </table>
  `;

  assert.deepEqual(parseTables(html), [
    {
      headers: ['Team', 'W'],
      rows: [['Hawks', '8'], ['Bats', '7']]
    }
  ]);
});

test('parseScorelinesPage combines score token and table extraction', () => {
  const html = `
    <p>Hawks 5:4 Bats</p>
    <table><tr><th>Game</th><th>Result</th></tr><tr><td>1</td><td>5:4</td></tr></table>
  `;

  const result = parseScorelinesPage(html);
  assert.deepEqual(result.scorelines, ['5:4']);
  assert.equal(result.tables.length, 1);
});

test('parseStatisticsPage returns table data and text sample', () => {
  const html = '<h1>Stats</h1><table><tr><th>Player</th></tr><tr><td>Alex</td></tr></table>';
  const result = parseStatisticsPage(html);

  assert.equal(result.tables.length, 1);
  assert.match(result.text_sample, /Stats/);
});
