/* Avero readiness scoring. Shared by the page and the unit tests. */
(function (root) {
  function bandFor(list, v) {
    for (var i = 0; i < list.length; i++) if (v >= list[i].min && v <= list[i].max) return list[i];
    return list[list.length - 1];
  }
  function score(cfg, answers) {
    var domains = cfg.domains.map(function (d, di) {
      var sum = 0;
      for (var q = 0; q < 4; q++) sum += Number(answers[di * 4 + q] || 0);
      return { key: d.key, name: d.name, score: sum, stage: bandFor(cfg.domainBands, sum).stage };
    });
    var total = domains.reduce(function (s, d) { return s + d.score; }, 0);
    var provisional = bandFor(cfg.stages, total).n;
    var lowest = domains.reduce(function (a, b) { return b.score < a.score ? b : a; });
    var cap = lowest.stage + 1;
    var finalN = Math.min(provisional, cap);
    var stage = cfg.stages.filter(function (s) { return s.n === finalN; })[0];
    return { total: total, provisionalStage: provisional, capped: finalN < provisional,
      stage: stage, domains: domains, weakest: lowest };
  }
  var api = { score: score, bandFor: bandFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AveroReadiness = api;
})(this);
