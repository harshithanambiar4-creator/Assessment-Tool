// Builds ../prototype/ai-literacy-level-1-prototype.html from storyboard.json + design.js + app.css + app.js
const fs = require('fs'), path = require('path');
const D = require('./design.js');
const sb = JSON.parse(fs.readFileSync(path.join(__dirname, 'storyboard.json'), 'utf8'));
const css = fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const safe = o => JSON.stringify(o).replace(/</g, '\\u003c');
const html = `<title>AI Literacy Level 1 Prototype</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
${css}
</style>
<div class="shell">
  <div class="toolbar">
    <h1>AI Literacy · Level 1 — prototype</h1>
    <select id="jump" aria-label="Jump to screen"></select>
    <span class="sp"></span>
    <button id="t-narr" title="Reads the voiceover with your browser's voice. The final course uses Storyline's AI voice.">Narration</button>
    <button id="t-review" title="On: move freely. Off: experience the learner restrictions.">Free navigation</button>
    <button id="t-added" title="Show purple tags on content that is new and needs your approval">Show NEW tags</button>
    <button id="t-notes">Designer notes</button>
  </div>
  <div class="main">
    <div><div class="stage-wrap"><div class="stage" id="stage"></div></div>
      <div class="ccbar"><div class="cc" id="cc" hidden></div></div>
      <div class="legend" style="margin-top:10px">
        <span><i style="background:#4278bc"></i>AI: Process blue, dashed outline, mono type</span>
        <span><i style="background:#00b6bd"></i>People: Talent teal, solid</span>
        <span><i style="background:#7a3cc8"></i>NEW: needs your approval</span>
        <span>Arrow keys move between screens.</span>
      </div></div>
    <aside class="notes" id="notes" aria-live="polite"></aside>
  </div>
</div>
<script>window.SB = ${safe(sb)}; window.D = ${safe(D)};</script>
<script>
${js}
</script>
`;
const out = path.join(__dirname, '..', 'prototype', 'ai-literacy-level-1-prototype.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, html.length, 'bytes;', D.SCREENS.length, 'screens');
