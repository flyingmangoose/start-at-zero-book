// Run: node readiness/scoring.test.js
const assert = require('assert');
const cfg = require('./config.json');
const { score } = require('./scoring.js');
// spread a total evenly so the weakest-link cap does not interfere
function even(total) { const a = Array(20).fill(0); for (let i = 0; i < total; i++) a[(i % 20)]++; return a; }
const edges = [[16,1],[17,2],[32,2],[33,3],[48,3],[49,4],[64,4],[65,5],[0,1],[80,5]];
for (const [t, s] of edges) { const r = score(cfg, even(t)); assert.strictEqual(r.total, t); assert.strictEqual(r.stage.n, s, `total ${t}`); }
// spec example: total 58 with Data = 5 -> Stage 4 provisional, capped to 3
const a = [2,1,1,1, 4,4,4,4, 4,4,4,4, 4,4,4,4, 2,1,1,1];
let r = score(cfg, a); assert.strictEqual(r.total, 58); assert.strictEqual(r.provisionalStage, 4);
assert.strictEqual(r.weakest.key, 'data'); assert.strictEqual(r.stage.n, 3); assert.ok(r.capped);
// domain band edges
for (const [v, s] of [[3,1],[4,2],[6,2],[7,3],[10,3],[11,4],[13,4],[14,5],[16,5]]) {
  const x = Array(20).fill(4); const parts=[0,0,0,0]; let left=v; for (let i=0;i<4;i++){parts[i]=Math.min(4,left);left-=parts[i];}
  parts.forEach((p,i)=>x[i]=p); assert.strictEqual(score(cfg,x).domains[0].stage, s, `domain ${v}`);
}
// a single empty domain caps a strong total at Stage 2
r = score(cfg, [0,0,0,0, ...Array(16).fill(4)]); assert.strictEqual(r.total, 64); assert.strictEqual(r.stage.n, 2);
console.log('All scoring tests passed');
