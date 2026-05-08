function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseNumber(value) {
  const text = String(value ?? '').trim();
  if (text === '' || text === '-') {
    return null;
  }

  const normalized = text.replace(/,/g, '.').replace(/%$/, '');
  if (/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  return null;
}

function parseScore(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2})\s*[:\-]\s*(\d{1,2})$/);
  if (!match) {
    return null;
  }

  return {
    home: Number(match[1]),
    away: Number(match[2])
  };
}

function isDateToken(value) {
  return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(String(value ?? '').trim());
}

function isTimeToken(value) {
  return /^\d{1,2}:\d{2}$/.test(String(value ?? '').trim());
}

function normalizeRow(headers, row) {
  const record = {};
  const normalized = {};

  for (let i = 0; i < row.length; i += 1) {
    const header = String(headers[i] ?? `col_${i + 1}`).trim();
    const key = normalizeKey(header) || `col_${i + 1}`;
    const value = String(row[i] ?? '').trim();

    record[header] = value;
    const numeric = parseNumber(value);
    normalized[key] = numeric !== null ? numeric : value;
  }

  return {
    record,
    normalized,
    team: record[Object.keys(record)[0]] || null
  };
}

function toSectionKey(section) {
  const text = String(section || '').toLowerCase();
  if (text.includes('offense')) return 'offense';
  if (text.includes('defense')) return 'defense';
  if (text.includes('pitching')) return 'pitching';
  if (text.includes('tabelle') || text.includes('table') || text.includes('standings')) return 'standings';
  return text || 'other';
}

function extractTeamCodesFromTables(tables) {
  const codes = new Set();

  for (const table of tables) {
    for (const row of table.rows) {
      const first = String(row[0] ?? '').trim();
      if (/^[A-Z0-9]{2,5}$/.test(first)) {
        codes.add(first);
      }
    }
  }

  return [...codes];
}

function findTeams(cells, knownTeamCodes = []) {
  const found = new Set();
  const upperTokens = [];

  for (const cell of cells) {
    const token = String(cell ?? '').trim();
    if (!token) {
      continue;
    }

    if (knownTeamCodes.includes(token)) {
      found.add(token);
      continue;
    }

    if (/^[A-Z0-9]{2,5}$/.test(token)) {
      upperTokens.push(token);
    }
  }

  for (const token of upperTokens) {
    if (found.size >= 2) break;
    found.add(token);
  }

  return [...found].slice(0, 2);
}

function normalizeScheduleGames(scheduleTables = [], knownTeamCodes = []) {
  const games = [];

  for (const table of scheduleTables) {
    for (const row of table.rows) {
      const cells = Array.isArray(row.cells) ? row.cells : [];
      const score = String(row.score ?? '').trim();
      const date = cells.find(isDateToken) || null;
      const time = cells.find(isTimeToken) || null;
      const teams = findTeams(cells, knownTeamCodes);
      const result = parseScore(score);

      games.push({
        section: table.section,
        date,
        time,
        score,
        result,
        teams,
        homeTeam: teams[0] || null,
        awayTeam: teams[1] || null,
        cells,
        raw: row
      });
    }
  }

  return games;
}

function groupGamesByTeam(games) {
  const grouped = {};

  for (const game of games) {
    for (const team of game.teams) {
      if (!grouped[team]) {
        grouped[team] = {
          team,
          games: []
        };
      }
      grouped[team].games.push(game);
    }
  }

  return grouped;
}

function groupGamesByDate(games) {
  const grouped = {};

  for (const game of games) {
    const key = game.date || 'unknown';
    if (!grouped[key]) {
      grouped[key] = {
        date: game.date,
        games: []
      };
    }
    grouped[key].games.push(game);
  }

  return grouped;
}

function sortItems(items, sortField, order = 'desc') {
  if (!sortField) {
    return [...items];
  }

  const key = normalizeKey(sortField);
  const direction = order === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    const aValue = a.normalized?.[key] ?? a[key] ?? null;
    const bValue = b.normalized?.[key] ?? b[key] ?? null;

    if (aValue === bValue) {
      return 0;
    }

    if (aValue == null) {
      return 1;
    }
    if (bValue == null) {
      return -1;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction * (aValue - bValue);
    }

    return direction * String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
  });
}

function findStandingsTable(tables) {
  return tables.find((table) => {
    const keys = table.headers.map(normalizeKey);
    return keys.includes('pct') || keys.includes('gb') || keys.includes('w') || keys.includes('wins');
  });
}

function normalizeStandings(tables = []) {
  const table = findStandingsTable(tables);
  if (!table) {
    return [];
  }

  return table.rows.map((row) => ({
    ...normalizeRow(table.headers, row),
    section: table.section
  }));
}

function selectLeader(sortedStandings, leader) {
  if (!sortedStandings.length) {
    return null;
  }

  if (leader === 'bottom') {
    return sortedStandings[sortedStandings.length - 1];
  }

  return sortedStandings[0];
}

function buildStatisticsSections(tables = []) {
  const sections = {};

  for (const table of tables) {
    const sectionKey = toSectionKey(table.section);
    const rows = table.rows.map((row) => normalizeRow(table.headers, row));

    if (!sections[sectionKey]) {
      sections[sectionKey] = [];
    }

    sections[sectionKey].push(...rows);
  }

  return sections;
}

function groupStatisticsByTeam(sections) {
  const grouped = {};

  for (const [section, rows] of Object.entries(sections)) {
    for (const row of rows) {
      const team = row.team || row.record?.Team || row.record?.team;
      if (!team) {
        continue;
      }

      if (!grouped[team]) {
        grouped[team] = {};
      }

      if (!grouped[team][section]) {
        grouped[team][section] = [];
      }

      grouped[team][section].push(row);
    }
  }

  return grouped;
}

export function aggregateScorelines(data = {}, options = {}) {
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const knownTeamCodes = extractTeamCodesFromTables(tables);
  const games = normalizeScheduleGames(schedule, knownTeamCodes);
  const filteredGames = options.team
    ? games.filter((game) => game.teams.includes(options.team))
    : games;
  const byTeam = groupGamesByTeam(filteredGames);
  const byDate = groupGamesByDate(filteredGames);
  const standings = normalizeStandings(tables);
  const sortedStandings = sortItems(standings, options.sort || 'pct', options.order || 'desc');
  const leader = options.leader ? selectLeader(sortedStandings, options.leader) : null;

  return {
    games: filteredGames,
    byTeam,
    byDate,
    standings: sortedStandings,
    leader,
    group: options.group,
    team: options.team || null,
    sort: options.sort || null,
    order: options.order || null
  };
}

export function aggregateStatistics(data = {}, options = {}) {
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const sections = buildStatisticsSections(tables);
  const selectedSectionKey = options.section ? normalizeKey(options.section) : null;
  const sectionRows = selectedSectionKey ? sections[selectedSectionKey] || [] : Object.values(sections).flat();
  const filteredRows = options.team
    ? sectionRows.filter((row) => row.team === options.team)
    : sectionRows;
  const sortedRows = options.sort ? sortItems(filteredRows, options.sort, options.order || 'desc') : filteredRows;
  const groupedByTeam = groupStatisticsByTeam(sections);

  return {
    sections,
    section: selectedSectionKey,
    team: options.team || null,
    rows: sortedRows,
    groupedByTeam,
    sort: options.sort || null,
    order: options.order || null
  };
}
