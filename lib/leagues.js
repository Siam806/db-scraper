export const LEAGUES = [
  {
    key: 'verbandsliga-baseball',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/verbandsliga-baseball/',
      statistics: 'https://hbsv.de/statistiken/verbandsliga-baseball/'
    }
  },
  {
    key: 'verbandsliga-softball',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/verbandsliga-softball/',
      statistics: 'https://hbsv.de/statistiken/verbandsliga-softball/'
    }
  },
  {
    key: 'landesliga-baseball',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/landesliga-baseball/',
      statistics: 'https://hbsv.de/statistiken/landesliga-baseball/'
    }
  },
  {
    key: 'junioren',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/junioren/',
      statistics: 'https://hbsv.de/statistiken/junioren/'
    }
  },
  {
    key: 'jugend-verbandsliga',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/jugend-verbandsliga/',
      statistics: 'https://hbsv.de/statistiken/jugend-verbandsliga/'
    }
  },
  {
    key: 'schueler-verbandsliga',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/schueler-verbandsliga/',
      statistics: 'https://hbsv.de/statistiken/schueler-verbandsliga/'
    }
  },
  {
    key: 'schueler-landesliga',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/schueler-landesliga/',
      statistics: 'https://hbsv.de/statistiken/schueler-landesliga/'
    }
  },
  {
    key: 't-ball',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/t-ball/',
      statistics: 'https://hbsv.de/statistiken/t-ball/'
    }
  },
  {
    key: 'coach-toss-baseball',
    pages: {
      scorelines: 'https://hbsv.de/spielbetrieb/coach-toss-baseball/',
      statistics: 'https://hbsv.de/statistiken/coach-toss-baseball/'
    }
  }
];

export function getLeagueByKey(key) {
  return LEAGUES.find((league) => league.key === key);
}
