export const LEAGUES = [
  {
    key: 'verbandsliga-baseball',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/verbandsliga-baseball/',
      statistics: 'https://hbsv.de/statistiken/verbandsliga-baseball/'
    }
  }
];

export function getLeagueByKey(key) {
  return LEAGUES.find((league) => league.key === key);
}
