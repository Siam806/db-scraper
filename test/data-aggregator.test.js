import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateScorelines, aggregateStatistics } from '../lib/data-aggregator.js';

test('aggregateScorelines groups by team and date', () => {
  const data = {
    schedule: [
      {
        section: 'Spielplan',
        headers: ['Date', 'Time', 'Game', '', 'Home', 'Away', 'Location', 'HomeCode', 'AwayCode', 'Result'],
        rows: [
          {
            cells: ['12.04.2026', '13:00', '0401016', '', 'RUS', 'HOM2', 'Field', 'FRA', 'RUS', '22:12'],
            score: '22:12'
          },
          {
            cells: ['18.04.2026', '14:00', '0401003', '', 'MTR', 'HOM2', 'Field', 'FRI', 'MTR', '19:1'],
            score: '19:1'
          }
        ]
      }
    ],
    tables: [
      {
        section: 'Tabelle',
        headers: ['Team', 'W', 'L', 'PCT', 'GB', 'Streak'],
        rows: [
          ['RUS', '3', '1', '.750', '0', 'W2'],
          ['HOM2', '2', '2', '.500', '1', 'L1']
        ]
      }
    ]
  };

  const result = aggregateScorelines(data, { group: 'team', sort: 'PCT', order: 'desc' });

  assert.ok(result.byTeam.RUS);
  assert.equal(result.byTeam.RUS.games.length, 1);
  assert.ok(result.byDate['12.04.2026']);
  assert.equal(result.byDate['12.04.2026'].games.length, 1);
  assert.equal(result.standings[0].team, 'RUS');
  assert.equal(result.standings[1].team, 'HOM2');
});

test('aggregateScorelines can filter by team and return leader data', () => {
  const data = {
    schedule: [
      {
        section: 'Spielplan',
        headers: ['Date', 'Time', 'Home', 'Away', 'Result'],
        rows: [
          { cells: ['12.04.2026', '13:00', 'RUS', 'HOM2', '22:12'], score: '22:12' },
          { cells: ['13.04.2026', '14:00', 'MTR', 'HOM2', '19:1'], score: '19:1' }
        ]
      }
    ],
    tables: [
      {
        section: 'Tabelle',
        headers: ['Team', 'W', 'L', 'PCT', 'GB', 'Streak'],
        rows: [
          ['RUS', '3', '1', '.750', '0', 'W2'],
          ['HOM2', '2', '2', '.500', '1', 'L1']
        ]
      }
    ]
  };

  const result = aggregateScorelines(data, { team: 'HOM2', leader: 'bottom', sort: 'PCT' });

  assert.ok(result.byTeam.HOM2);
  assert.equal(result.byTeam.HOM2.games.length, 2);
  assert.equal(result.leader.team, 'HOM2');
});

test('aggregateStatistics returns sectioned rows and team-filtered stats', () => {
  const data = {
    tables: [
      {
        section: 'Offense',
        headers: ['Team', 'AB', 'R'],
        rows: [['RUS', '10', '7'], ['HOM2', '12', '9']]
      },
      {
        section: 'Defense',
        headers: ['Team', 'PO', 'A'],
        rows: [['RUS', '15', '5'], ['HOM2', '12', '8']]
      }
    ]
  };

  const result = aggregateStatistics(data, { section: 'offense', team: 'RUS' });

  assert.equal(result.section, 'offense');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].team, 'RUS');
  assert.ok(result.groupedByTeam.RUS);
  assert.ok(result.groupedByTeam.HOM2);
});

test('aggregateStatistics sorts section rows by numeric metric', () => {
  const data = {
    tables: [
      {
        section: 'Pitching',
        headers: ['Team', 'IP', 'ERA'],
        rows: [['RUS', '10.0', '3.00'], ['HOM2', '12.0', '2.45']]
      }
    ]
  };

  const result = aggregateStatistics(data, { section: 'pitching', sort: 'ERA', order: 'asc' });

  assert.equal(result.rows[0].team, 'HOM2');
  assert.equal(result.rows[1].team, 'RUS');
});
