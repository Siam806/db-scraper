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

test('parseTables attaches section labels from surrounding headings', () => {
  const html = `
    <h2>Offense</h2>
    <table>
      <tr><th>Team</th><th>R</th></tr>
      <tr><td>Hawks</td><td>79</td></tr>
    </table>
  `;

  const [table] = parseTables(html);
  assert.equal(table.section, 'Offense');
  assert.deepEqual(table.rows, [['Hawks', '79']]);
});

test('parseScorelinesPage combines score token, tables, and schedule rows', () => {
  const html = `
    <h2>Spielplan</h2>
    <p>RUS 22:12 HOM2</p>
    <table>
      <tr><th>Date</th><th>Result</th></tr>
      <tr><td>12.04.2026</td><td>22:12</td></tr>
    </table>
  `;

  const result = parseScorelinesPage(html);
  assert.deepEqual(result.scorelines, ['22:12']);
  assert.equal(result.tables.length, 1);
  assert.equal(result.schedule.length, 1);
  assert.equal(result.schedule[0].rows[0].score, '22:12');
});

test('parseStatisticsPage returns table data, section metadata, and text sample', () => {
  const html = `
    <h1>Stats</h1>
    <h2>Offense</h2>
    <table><tr><th>Team</th></tr><tr><td>Alex</td></tr></table>
  `;
  const result = parseStatisticsPage(html);

  assert.equal(result.tables.length, 1);
  assert.deepEqual(result.sections, ['Offense']);
  assert.match(result.text_sample, /Stats/);
});
