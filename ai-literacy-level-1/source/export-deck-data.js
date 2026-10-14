// Exports everything the PowerPoint generator needs (one record per screen) to deck-data.json
const fs = require('fs'), path = require('path');
const D = require('./design.js');
const SB = {}; require('./storyboard.json').forEach(r => { SB[r.n] = r; });
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
eval(app.match(/const MINOR[\s\S]*?\n  };\n/)[0].replace('const tc', 'global.tc').replace('const MINOR', 'global.MINOR').replace('const capWord', 'global.capWord'));
const parseQ = n => { const lines = SB[n].onscreen.split('\n').map(x => x.trim()).filter(Boolean), opts = [], stem = [];
  lines.forEach(l => { const m = l.match(/^([A-D])\s{2,}(.*)$/); if (m) opts.push(m[2]); else stem.push(l); }); return { stem, opts }; };
const parseFb = n => { const t = SB[n].onscreen; return { c: ((t.match(/CORRECT\n([\s\S]*?)(\n\nINCORRECT|$)/) || [])[1] || '').trim(), w: ((t.match(/INCORRECT\n([\s\S]*)$/) || [])[1] || '').trim() }; };
const out = D.SCREENS.map((s, i) => {
  const n = s.n[0], r = SB[n];
  const cue = (r.build.match(/AWARE cue:\s*([AWRE])\s*\(([^)]+)\)/) || []);
  const key = (r.build.match(/ANSWER KEY:\s*([A-D])/) || [])[1];
  const bd = r.build;
  return Object.assign({}, s, {
    screen: i + 1, title: n === 1 ? 'AI Literacy' : tc(r.title), section_name: r.section, onscreen: r.onscreen,
    vo: s.voOverride || r.vo, cue: cue[1] ? { L: cue[1], w: cue[2] } : null, key,
    q: (s.layout === 'kc' || s.layout === 'quiz') ? parseQ(n) : null,
    fb: (s.layout === 'kc' || s.layout === 'quiz') ? parseFb(s.n[1]) : null,
    fbVo: (s.layout === 'kc' || s.layout === 'quiz') ? SB[s.n[1]].vo : null,
    pfb: (s.layout === 'hotspot' || s.layout === 'dragPrompt') ? { c: (bd.match(/CORRECT:\s*(.*?)\s*INCORRECT:/) || [])[1], w: (bd.match(/INCORRECT:\s*(.*?)\s*Allow one retry/) || [])[1] } : null,
    results: s.layout === 'results' ? r.onscreen : null,
  });
});
fs.writeFileSync(process.argv[2], JSON.stringify({ sections: D.SECTIONS, screens: out }, null, 1));
console.log('exported', out.length);
