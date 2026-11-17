// Lighthouse on the live site, for the weekly `Live site` workflow: the pages and assertions of
// lighthouserc.json, measured on https://abduroziq.uz instead of the local build, three runs per
// page (over a real network performance varies, and the median of three is steadier).
const base = require('./lighthouserc.json');

const origin = 'https://abduroziq.uz';
const collect = {
  ...base.ci.collect,
  url: base.ci.collect.url.map((path) => origin + path),
  numberOfRuns: 3,
};
delete collect.staticDistDir;

module.exports = {
  ci: {
    ...base.ci,
    collect,
  },
};
