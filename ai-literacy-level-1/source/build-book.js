// Builds ../prototype/ai-literacy-level-1-build-book.html: one card per screen with a reference image,
// the exact text and voiceover, and the quickest Storyline steps to build it.
// Usage: node build-book.js <folder with s01.jpg … s68.jpg>
const fs = require('fs'), path = require('path');
const D = require('./design.js');
const SB = {}; require('./storyboard.json').forEach(r => { SB[r.n] = r; });
const sb = n => SB[n];
const imgDir = process.argv[2];

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
eval(app.match(/const MINOR[\s\S]*?\n  };\n/)[0].replace('const tc', 'global.tc').replace('const MINOR', 'global.MINOR').replace('const capWord', 'global.capWord'));
const T = n => n === 1 ? 'AI Literacy' : tc(sb(n).title);
const q = s => `<q>${esc(s)}</q>`;
const b = s => `<b>${esc(s)}</b>`;
const SEC = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const layoutOf = s => ({ title: 'Cover', aware: 'Chapter Dark', opener: 'Chapter Dark', assessIntro: 'Chapter Dark', awareClose: 'Chapter Dark', kc: 'Question', quiz: 'Question', results: 'Content S8', outcomes: 'Content S0', journey: 'Content S0', download: 'Content S0', levels: 'Content S0' }[s.layout] || 'Content ' + SEC[s.section]);
function parseQ(n) {
  const lines = sb(n).onscreen.split('\n').map(x => x.trim()).filter(Boolean), opts = [], stem = [];
  lines.forEach(l => { const m = l.match(/^([A-D])\s{2,}(.*)$/); if (m) opts.push(m[2]); else stem.push(l); });
  return { stem, opts };
}
function parseFb(n) {
  const t = sb(n).onscreen;
  return { c: ((t.match(/CORRECT\n([\s\S]*?)(\n\nINCORRECT|$)/) || [])[1] || '').trim(), w: ((t.match(/INCORRECT\n([\s\S]*)$/) || [])[1] || '').trim() };
}
const key = n => { const m = sb(n).build.match(/ANSWER KEY:\s*([A-D])/); return m ? m[1] : '?'; };
const cue = n => { const m = sb(n).build.match(/AWARE cue:\s*([AWRE])\s*\(([^)]+)\)/); return m ? { L: m[1], w: m[2] } : null; };

const S = D.SCREENS;
const idxOf = s => S.indexOf(s) + 1;
const firstOf = layout => S.findIndex(x => x.layout === layout) + 1;
// screen number that holds storyboard slide n (screens are renumbered when slides merge, so never hard-code them)
const scr = n => S.findIndex(x => x.n.map(String).includes(String(n))) + 1;
const titleOf = s => s.title || T(s.n[0]);
const COUNTER = (word, total, v) => `Counter: a small light-teal pill (fill <code>D9F5F6</code>, text dark teal <code>00787D</code>, Aptos bold 13 pt) next to the instruction. Create a number variable <code>${v}</code> and type ${q('%' + v + '% of ' + total + ' ' + word)} in the pill; Storyline fills in the number.`;

// ---------- step writers ----------
const NEW = l => `<b>Home &gt; New Slide &gt; Basic Layouts</b>, pick ${b(l)}, click <b>Insert</b>.`;
const DUP = n => `In Story View, right-click screen ${n} &gt; <b>Duplicate</b>, then drag the copy into place. Everything below is a change to that copy.`;
const TITLE = (n) => `Title: click the title area and type ${q(T(n))} (Aptos Display, bold, 44 pt, Pro Navy on light slides).`;
const END = (extra = '') => `${extra}Finish with <b>Routines V, T, N and H</b> (voice, timing, Next lock, hover).`;
const BADGE = n => { const c = cue(n); return c ? `AWARE badge: paste the badge group (from screen ${scr(6)}), set the letter to ${b(c.L)} and the word to ${q(c.w)}.` : ''; };

const W = {};
W.title = s => [
  NEW('Cover') + ' Delete Storyline\'s original blank slide (right-click it in Story View &gt; Delete).',
  `Type ${q('AI Literacy')} in the title area: Aptos Display, bold, 96 pt. Colour ${q('AI')} white and ${q('Literacy')} Pro Green <code>7EBD31</code>.`,
  `Above it, ${q('Level 1')} (Aptos 18 pt, Pro Teal <code>00BBC2</code>). Below it, ${q('Understand AI. Use It Responsibly.')} (Aptos 30 pt, white; make ${q('Use It Responsibly.')} bold).`,
  'Animations: title <b>Fade</b> 0.75 s; subtitle Fade starting 0.5 s later.',
  END()];
W.outcomes = s => [
  NEW('Content S0'), TITLE(2),
  `Text box: ${q(s.intro)} (Aptos 24 pt, navy).`,
  'Row 1: circle 52 × 52 px, Pro Teal fill, number "1" (Aptos Display bold 22 pt, navy, internal margins 0). Text box to its right with outcome 1 (Aptos 26 pt, navy). A thin grey line (<code>D8DBE2</code>, 1 pt) above the row.',
  'Select the row, <b>Ctrl+G</b>, then <b>Ctrl+D</b> three times. Set each copy 76 px lower (Size and Position &gt; Vertical). Change the numbers and text to outcomes 2–4: ' + s.items.map(q).join(' · ') + '.',
  `Under the last row: a thin grey line and the course information ${q(s.courseInfo)} (Aptos 15 pt, grey <code>5A5C61</code>).`,
  END('Give each row its own cue point; the course information line fades in last. ')];
W.journey = s => [
  NEW('Content S0'), TITLE(3),
  'Draw one straight line across the slide (Shift + drag), Pro Teal, 3 pt, at about Vertical 300.',
  'Stop 1: circle 70 × 70, white fill, 3 pt Pro Teal outline, number "1" (Aptos Display bold 26 pt, navy, margins 0). Text box underneath, width 140, centred, Aptos 17 pt: ' + q(s.steps[0]) + '. Group them.',
  'Ctrl+D the group seven times. Select all eight, <b>Format &gt; Align &gt; Distribute Horizontally</b> and <b>Align Top</b>. Edit numbers 2–8 and the labels. Give stop 8 a navy fill with a teal number.',
  END('The line fades in first, then each stop on its cue. ')];
W.aware = s => [
  NEW('Chapter Dark'),
  `Title ${q(T(4))} (Aptos Display bold 44 pt, Pro Green).`,
  'Tile 1: rounded rectangle 214 × 150, fill <code>0F2D74</code>, outline <code>2B3F73</code> 1 pt. Letter "A" (Aptos Display bold 96 pt, Pro Teal) top left; word "Appreciate AI" below it (Aptos 20 pt, white). Group.',
  'Ctrl+D four times, select all five, <b>Distribute Horizontally</b>. Change letters/words: W Weigh the Output · A Assess the Risk · R Respond with the Right Prompt · E Ensure Human Accountability.',
  END('Each tile fades on the cue where the narrator says its word. ')];
W.opener = s => {
  const n = s.n[0], m = s.meera, first = idxOf(s) === firstOf('opener');
  const texts = `Section number ${q(String(s.sectionNo).padStart(2, '0'))}, title ${q(T(n))}, lines: ${s.lines.map(q).join(' · ')}${s.atlasLine ? `, plus the Atlas line ${q(s.atlasLine)} (team lead to confirm)` : ''}.`;
  const meeraTexts = `On the Meera layer: situation ${q(m.situation)}; question ${q(m.question)}; choices ${m.options.map((o, i) => `${i + 1}. ${q(o.label)}`).join(' ')}; replies ${m.options.map((o, i) => `${i + 1}. ${q(o.reply)}`).join(' ')}.`;
  if (!first) return [DUP(firstOf('opener')), 'Change the base layer: ' + texts, `Swap the section icon for <code>${s.icon}Teal.png</code> (right-click it &gt; Change Picture).`, meeraTexts, 'Re-do the voice on both layers (base layer = storyboard voiceover; Meera layer = Meera voiceover below). Timing and triggers come with the copy.'];
  return [
    NEW('Chapter Dark'),
    `Base layer: section number "01" (Aptos Display bold 160 pt, Pro Teal), title ${q(T(n))} (Aptos Display bold 56 pt, Pro Green), and the three questions as separate text boxes (Aptos 24 pt, white, width 770 so they stay clear of the icon) with a short green dash before each.`,
    'Section icon on the right: a 300 × 300 circle with no fill and a dashed 2 pt outline <code>2B3F73</code>; in its centre the teal line icon (150 × 150) from <code>assets/icons</code> (this section: <code>sysTeal.png</code>; the other sections use searchTeal, ideaTeal, balanceTeal, lockTeal, draftTeal and agentTeal). Fade it in with the title.',
    'Add Meera: <b>Insert &gt; Character &gt; Illustrated</b>, choose one woman and a friendly pose. You\'ll reuse this same character in all seven openers.',
    '<b>Slide Layers &gt; New Layer</b>, name it <code>Meera</code>. Click the layer\'s cog and tick <b>Prevent the user from clicking on the base layer</b>.',
    'On the Meera layer: a full-slide navy rectangle at 30% transparency; on top, a white rounded panel 1040 × 330. Put Meera on the left with "Meera" and "Talent Partner" under her.',
    meeraTexts.replace('On the Meera layer: ', 'Text on the panel: '),
    'Choice buttons: rounded rectangles 460 × 40, white with grey outline. <b>Edit States</b>: add Hover and Selected (Selected = fill <code>D9F5F6</code>, Pro Teal outline). Select all three, right-click &gt; <b>Button Set</b>.',
    'Three reply text boxes stacked in the same spot under the choices, each with Initial State <b>Hidden</b>. A <b>Continue</b> button (Pro Teal), Initial State Hidden.',
    'Triggers on the Meera layer: <b>Change state of</b> Reply 1 to Normal, Reply 2 and 3 to Hidden, Continue to Normal <b>when the user clicks</b> Choice 1 (same for choices 2 and 3). <b>Hide this layer</b> when the user clicks Continue. <b>Change state of</b> Next to Normal <b>when the state of any of</b> Choice 1–3 is Selected.',
    'Triggers on the base layer: <b>Show layer</b> Meera <b>when the timeline ends</b>. Add a small "Meet Meera\'s moment" button bottom left that shows the layer when clicked.',
    'Voice: base layer = storyboard voiceover; Meera layer = Meera voiceover (below). Next lock: only the "Disabled when the timeline starts" trigger (the Meera choice unlocks Next).'];
};
W.defineCards = s => [
  NEW('Content S1'), TITLE(6), BADGE(6),
  `Four capability cards, 466 × 150 each, two rows: fill <code>E8EEFB</code>, outline Pro Blue <code>497EDC</code> 2 pt <b>dashed</b>, text Aptos 22 pt semibold navy: ${s.caps.map(q).join(' · ')}. Left cards left-aligned, right cards right-aligned.`,
  `Centre card on top (370 × 200, navy fill, rounded): small label "AI" (Aptos Mono bold, Pro Teal) and the definition ${q(s.definition)} (Aptos 21 pt, white, centred).`,
  `Colour key, bottom left, Aptos 14 pt grey: ${q(s.colourKey[0])}, a small dashed Pro Blue swatch (36 × 20, fill <code>E8EEFB</code>) with ${q(s.colourKey[1])}, then a solid Pro Teal swatch (fill <code>D9F5F6</code>) with ${q(s.colourKey[2])}. Group it.`,
  END('The definition shows first; each card fades on its cue; the colour key fades in last. ')];
W.umbrella = s => [
  NEW('Content S1'), TITLE(7),
  'Umbrella: <b>Insert &gt; Shape &gt; Round Same Side Corner Rectangle</b>, 1152 × 110, navy, with "AI" (Aptos Display bold 46 pt, Pro Teal).',
  'Under it, 6 tiles 180 × 90, dashed Pro Blue outline, fill <code>E8EEFB</code>, each with a plain icon (Insert &gt; Icons, search "gear" or "circle"). No product names. Make one, Ctrl+D five times, Distribute Horizontally.',
  `Text below: ${b(s.statement)} ${esc(s.sub)} (Aptos 24 pt).`,
  END('Tiles fade 0.2 s apart; the umbrella and text follow. ')];
W.radial = s => [
  NEW('Content S1'), TITLE(8),
  `Definition text ${q(s.definition)} (Aptos 24 pt). It stays on screen the whole time.`,
  'Centre: navy circle 170 × 170 with "Gen AI" (Aptos Display bold 26 pt, Pro Teal).',
  `Five pill shapes (Rounded Rectangle, corners fully round), white fill, dashed Pro Blue outline, Aptos Mono bold 18 pt Pro Blue: ${s.types.join(' · ')}. Place them around the circle (two top, two sides, one bottom).`,
  END('Each chip fades in 0.25 s apart. ')];
W.flow = s => [
  NEW('Content S1'), TITLE(9),
  `Text ${q(s.text)} (Aptos 24 pt).`,
  'Three boxes 330 × 150 in a row: "Data" (white card with a small grid of blue dots or a grid icon), "Language model" (navy fill, white text), "Response" (dashed Pro Blue outline, light blue fill, three grey bars for text lines).',
  'Two arrows between them (Insert &gt; Shape &gt; Right Arrow or a line with an arrowhead), Pro Blue. <b>Don\'t</b> add any tick or "verified" mark on the response.',
  END('Data, arrow, model, arrow, response fade in order. ')];
W.reveal = s => {
  const n = s.n[0], first = idxOf(s) === firstOf('reveal');
  const cards = s.cards.map(([t, d]) => `${q(t)} → ${q(d)}`).join('; ');
  if (!first) return [DUP(firstOf('reveal')), TITLE(n), `Add a third card (Ctrl+D one card) and resize so three fit in a row. Cards: ${cards}.`, 'Add a small icon at the top of each card (warn.png, balance.png, agent.png from <code>assets/icons</code>).', `Rename the counter variable to <code>Viewed${n}</code>, change the pill text to ${q('%Viewed' + n + '% of 3 viewed')}, and add the count and state triggers for Card 3. Update the Next trigger to watch all three cards.`, END()];
  return [
    NEW('Content S1'), TITLE(n),
    'Card 1: rounded rectangle 560 × 230, white fill, grey outline. Text: the term only, Aptos Mono bold 22 pt, Pro Blue. Add "Select to reveal" (13 pt grey) at the bottom.',
    'States panel &gt; <b>Edit States</b> &gt; <b>New State</b>, name it <code>Open</code>. In Open: dashed Pro Blue outline, fill <code>E8EEFB</code>, add the definition (Aptos 23 pt navy), remove "Select to reveal", and add a small Pro Teal circle with "✓" in the top-right corner. Click <b>Done Editing States</b>.',
    `Ctrl+D for card 2. Cards: ${cards}.`,
    `Text box under the cards: ${q(s.instruction)} (14 pt grey).`,
    COUNTER('viewed', s.cards.length, 'Viewed' + n),
    `Triggers: <b>Adjust variable</b> Viewed${n} <b>Add</b> 1 <b>when the user clicks</b> Card 1 <b>if</b> Card 1 <b>is not equal to</b> Open, then <b>Change state of</b> Card 1 <b>to</b> Open <b>when the user clicks</b> Card 1 (the order matters: count first). Same for Card 2. <b>Change state of</b> Next <b>to</b> Normal <b>when the state of all of</b> Card 1, Card 2 <b>is</b> Open.`,
    END('Next lock: only the "Disabled when the timeline starts" trigger. ')];
};
W.kc = s => {
  const [qn, ln] = s.n, Q = parseQ(qn), F = parseFb(ln), first = idxOf(s) === firstOf('kc');
  const content = `Form View: question ${q(Q.stem.join(' '))}; options ${Q.opts.map((o, i) => `${'ABCD'[i]}. ${q(o)}`).join(' ')}; tick ${b(key(qn))} as correct.`;
  const fb = `Feedback: Correct = ${q(F.c)}. Try Again and Incorrect = ${q(F.w)}. Incorrect layer also gets: ${q('The answer is ' + key(qn) + ': ' + Q.opts['ABCD'.indexOf(key(qn))] + '.')}`;
  const ask = s.meeraAsk ? `Meera asks this one: above the question, place <code>meera.png</code> at 60 × 60 and a light-teal rounded bubble (fill <code>D9F5F6</code>, 355 × 66) with ${q('Meera: ' + s.meeraAsk)} (Aptos 13 pt, "Meera:" bold). Move the question down under it and set it to 18 pt.` : '';
  if (!first) return [DUP(firstOf('kc')), content, ask, fb, 'Re-do the voice (question voiceover on the base layer; correct and incorrect lines on their layers).'];
  return [
    '<b>Home &gt; New Slide &gt; Quizzing &gt; Graded Question &gt; Multiple Choice</b> &gt; Insert. Apply the <code>Question</code> layout (right-click the slide in Story View &gt; Layout).',
    content,
    'Form View settings: <b>Feedback</b> By Question · <b>Attempts</b> 2 · <b>Shuffle</b> None · <b>Score</b> By Question (this slide won\'t be on the results slide, so it stays unscored).',
    fb,
    'Slide View: small tag "Knowledge check · not scored" top left; question left (Aptos Display semibold 26 pt); answers right as white rounded rows with a letter tile. Feedback layers: white panel 760 wide, green top band (Correct) or coral top band (Try Again / Incorrect).',
    'Submit: select the Submit button &gt; Initial State <b>Disabled</b>. Trigger: <b>Change state of</b> Submit <b>to</b> Normal <b>when the state of any of</b> Option A–D <b>is</b> Selected. Learners can then only submit once they have chosen.',
    'Next: Disabled when the timeline starts; Normal when the timeline starts on the Correct layer and on the Incorrect layer.',
    'Voice: question voiceover on the base layer; the correct line on Correct; the incorrect line on Try Again and Incorrect.'];
};
W.beforeAfter = s => [NEW('Content S2'), TITLE(15),
  'Two halves. Left: a blank page (white rectangle 100 × 132) → arrow → a "draft" page (dashed Pro Blue outline, blue bars for lines). Right: a page with grey bars → arrow → a page with re-arranged blue bars.',
  `Under each, a dashed Pro Blue card: ${s.cards.map(([t, d]) => `${q(t)} ${q(d)}`).join(' and ')} (term Aptos Mono bold Pro Blue; description Aptos 21 pt).`,
  END()];
W.condense = s => [DUP(14), TITLE(16),
  'Replace the pictures: a tall page (14 grey bars) → arrow → a short blue page (3 bars) → arrow → a list page (alternating short/long bars).',
  `Cards: ${s.cards.map(([t, d]) => `${q(t)} ${q(d)}`).join(' and ')}.`, END()];
W.pattern = s => [NEW('Content S2'), TITLE(17),
  'Left: three dashed Pro Blue circles (124 × 124, fill <code>E8EEFB</code>) with 3–4 small blue dots inside each. Optional: start the dots scattered and add short <b>motion paths</b> into the circles.',
  `Right: one dashed card ${q(s.card[0])} / ${q(s.card[1])}.`, END()];
W.limits = s => [NEW('Content S2'), TITLE(18),
  `Left: ${q(s.intro)} (Aptos Display bold 34 pt).`,
  `Right: five rows, each a small coral-outlined circle with "✕" and the word (Aptos Display semibold 30 pt), grey line under each: ${s.items.map(q).join(' · ')}. Build one row, Ctrl+D four times.`,
  END('Each row fades on its cue. ')];
W.notEqual = s => [NEW('Content S2'), TITLE(19), BADGE(19),
  `Left card ${q(s.left)} (dashed Pro Blue, light blue fill, Aptos Mono bold 30 pt Pro Blue). Right card ${q(s.right)} (solid Pro Green outline, fill <code>EEF5E1</code>, text <code>4F7A1C</code>).`,
  `Between them a big "≠" (Aptos Display 120 pt, Pro Coral <code>FB4671</code>). It appears last. Right-click the ≠ &gt; <b>Save as Picture</b> so you can reuse it on screen ${scr(30)}.`,
  END()];
W.pair = s => {
  const n = s.n[0], first = idxOf(s) === firstOf('pair');
  const cards = s.cards.map(([t, d]) => `${q(t)} / ${q(d)}`).join(' and ');
  if (!first) return [DUP(firstOf('pair')), TITLE(n), `Cards: ${cards}. Icons: document and magnifying glass (Insert &gt; Icons).`, END()];
  return [NEW('Content S3'), TITLE(n), `Two dashed Pro Blue cards 560 × 260 side by side, each with a line icon (Insert &gt; Icons: "lightbulb", "document"), the term (Aptos Mono bold Pro Blue) and description (Aptos 26 pt): ${cards}.`, 'Optional light motion: a small idea shape moves from the first card to the second on a short motion path.', END()];
};
W.explorer = s => {
  const n = s.n[0], first = idxOf(s) === firstOf('explorer'), v = 'Viewed' + n;
  const tabs = s.tabs.map((t, k) => `Tab ${k + 1} ${q(t.label)} = storyboard slide ${t.screen.n[0]}`).join(' · ');
  const layers = `One layer per tab, named after the tab. On each layer's cog tick <b>Hide other slide layers</b>. Into each layer, paste that tab's content from its LAYER slide in the import deck (or rebuild it: ${s.tabs.map(t => q(T(t.screen.n[0])) + ' ' + t.screen.layout).join(', ')}). Use that slide's own voiceover on its layer (Routine V on the layer).`;
  const trig = `Triggers on each tab: <b>Adjust variable</b> ${v} <b>Add</b> 1 <b>when the user clicks</b> the tab <b>if</b> the tab <b>is not equal to</b> Visited, then <b>Show layer</b> &lt;tab&gt; <b>when the user clicks</b> the tab. <b>Change state of</b> Next <b>to</b> Normal <b>when</b> ${v} <b>changes</b> <b>if</b> ${v} = ${s.tabs.length}.`;
  if (!first) return [DUP(firstOf('explorer')), `Title ${q(s.title)}. Delete the third tab; rename the tabs: ${tabs}.`, layers, `Rename the counter variable to <code>${v}</code> (pill text ${q('%' + v + '% of ' + s.tabs.length + ' viewed')}) and update the triggers to match.`, 'Base-layer voice: ' + q(s.introVo)];
  return [NEW('Content ' + SEC[s.section]), `Title: type ${q(s.title)} (new title: this screen combines storyboard slides ${s.tabs.map(t => t.screen.n[0]).join(', ')}).`,
    `Tab row under the title: rounded rectangles 44 px high, white, grey outline, Aptos bold 15 pt navy: ${tabs}. Edit States: <code>Selected</code> (Pro Blue outline, fill <code>E8EEFB</code>) and <code>Visited</code> (add a small green "✓"). Select all tabs, right-click &gt; <b>Button Set</b>.`,
    `Next to the tabs: ${q(s.instruction)} (14 pt grey) and the counter.`, COUNTER('viewed', s.tabs.length, v),
    'Below: a large dashed grey rounded rectangle with "Select a tab to begin." (18 pt grey). The tab layers cover it.',
    layers, trig,
    END('Base-layer voice (Routine V): ' + q(s.introVo) + '. Next lock: only "Disabled when the timeline starts". ')];
};
W.twoCol = s => [NEW('Content S3'), TITLE(25),
  `Left card (AI): dashed Pro Blue outline, fill <code>E8EEFB</code>, label "AI" (Aptos Mono bold Pro Blue), text ${q(s.left[1])} (27 pt).`,
  `Right card (HUMAN): solid Pro Teal outline, fill <code>D9F5F6</code>, label "HUMAN" (Aptos Mono bold, dark teal <code>00787D</code>), text ${q(s.right[1])}.`,
  'Under the cards: a small dashed "output" card (150 × 50, two grey bars). Add a <b>motion path</b> (Animations &gt; Add Motion Path &gt; Lines, right) so it slides from under the AI card to under the HUMAN card. At its end, a Pro Teal circle with "✓" fades in.',
  END()];
W.steps = s => [NEW('Content S4'), TITLE(30), BADGE(30),
  `Three white cards 330 × 180 in a row with "→" (Pro Teal) between them. Each: "STEP n" (13 pt grey), term (Aptos Mono bold Pro Blue), description (22 pt): ${s.steps.map(([t, d]) => `${q(t)} ${q(d)}`).join(' · ')}.`,
  `Below: a small polished-answer card (dashed Pro Blue, four grey bars) with the ≠ picture from screen ${scr(19)} as a small coral badge on its corner; next to it ${q(s.warning)} (Aptos Display semibold 26 pt).`,
  END('The ≠ badge gets a single <b>Pulse</b> emphasis, nothing else. ')];
W.hotspot = s => [NEW('Content S4'), TITLE('30a'), BADGE('30a'),
  `Text ${q(s.intro)}. Then a dashed Pro Blue box with label "AI DRAFT" and the draft in Aptos Mono 24 pt: ${q(s.text)}.`,
  `Three claim boxes: rectangles with no outline and 100% transparent fill, drawn exactly over ${s.claims.map(q).join(', ')}. Edit States: Hover (fill <code>D9F5F6</code>, 60% transparent) and Selected (same fill, 2 pt Pro Teal bottom line). Leave Selected as the built-in state, so a second click unselects.`,
  `Text ${q(s.prompt)} (semibold) and a <b>Submit</b> button.`,
  'Layers: <code>Correct</code> (white panel, green band, CORRECT text from the storyboard, Continue = jump to next slide) and <code>Incorrect</code> (coral band, INCORRECT text, Try Again = hide layer, Continue starting Hidden).',
  'Submit triggers, in order: <b>Adjust variable</b> Tries30a Add 1 · <b>Show layer</b> Correct <b>if</b> Claim 1 <i>and</i> Claim 2 <i>and</i> Claim 3 are Selected · <b>Show layer</b> Incorrect <b>if</b> Claim 1 <i>or</i> 2 <i>or</i> 3 is not Selected.',
  'Incorrect layer, when its timeline starts <b>if</b> Tries30a ≥ 2: change all three claims to Selected, Try Again to Hidden, Continue to Normal.',
  END('Next lock: Disabled at start; Normal when the timeline starts on Correct, or on Incorrect if Tries30a ≥ 2. ')];
W.balance = s => [NEW('Content S4'), TITLE(32), BADGE(32),
  'Left: a balance-scale icon (Insert &gt; Icons, search "scale"), Pro Blue, about 200 × 200.',
  `Right: two cards: ${q(s.cards[0][0])} ${q(s.cards[0][1])} (dashed Pro Blue) and ${q(s.cards[1][0])} ${q(s.cards[1][1])} (solid Pro Teal).`, END()];
W.checks3 = s => [DUP(scr(30)), TITLE(33),
  `Remove the bottom warning row and arrows. Intro text ${q(s.intro)}.`,
  `Three cards, each with a green circle "✓" (<code>4F7A1C</code>), term and question: ${s.checks.map(([t, d]) => `${q(t)} ${q(d)}`).join(' · ')}.`,
  END('⚑ Pending Legal sign-off: build it, but hold the voice. ')];
W.gate = s => [NEW('Content S4'), TITLE(34), BADGE(34),
  'Left (420 × 260): a dashed Pro Blue line labelled "AI" that stops at a short coral bar (the gate); below it a solid Pro Teal arrow labelled "HUMAN" that runs all the way through.',
  `Right: ${q(s.text)} (Aptos Display semibold 30 pt) and ${q(s.sub)} (24 pt).`,
  `Bottom band: navy rounded rectangle full width, ${q(s.closing[0])} in light blue <code>9DB8EE</code> + ${q(s.closing[1])} in Pro Teal (Aptos Display bold 38 pt). Copy this band for screen ${scr(80)}.`,
  END('⚑ Pending Legal/HR sign-off: build it, but hold the voice. ')];
W.checklist = s => [NEW('Content S5'), TITLE(39), BADGE(39),
  'Row 1: rounded rectangle 900 × 70, white, grey outline; inside, a 44 × 44 box on the left and "01" + the question (Aptos Display semibold 28 pt).',
  'Edit States &gt; New State <code>Ticked</code>: green outline, fill <code>EEF5E1</code>, the small box filled green with a white "✓".',
  `Ctrl+D three times, stack 84 px apart: ${s.items.map(q).join(' · ')}. Instruction text ${q(s.instruction)}.`,
  COUNTER('ticked', 4, 'Ticked39'),
  'Triggers: on each row, <b>Adjust variable</b> Ticked39 Add 1 <b>if</b> the row is not Ticked, then change the row to Ticked when the user clicks it; Next to Normal when the state of all of the four rows is Ticked.',
  END('Next lock: only "Disabled when the timeline starts". ')];
W.categories = s => [NEW('Content S5'), TITLE(40),
  `Eight navy cards 266 × 120 in two rows of four. Each: a small lock icon in Pro Teal and the word (Aptos Mono bold 17 pt, white): ${s.items.join(' · ')}. Build one, Ctrl+D, Distribute Horizontally per row.`,
  END('⚑ Pending Privacy check of Client, Proprietary, Credentials. ')];
W.threeGate = s => [NEW('Content S5'), TITLE(41),
  `Three white cards with a solid Pro Green outline, each with an open-lock icon and the text ${s.parts.map(q).join(' + ')} (Aptos Mono bold 22 pt), with big grey "+" signs between them.`, END()];
W.stages = s => [NEW('Content S5'), TITLE(42),
  `Three navy circles 96 × 96 with a Pro Teal lock icon, labels ${s.stages.map(q).join(' → ')} (Aptos Display bold 24 pt), joined by Pro Teal lines.`,
  `Under them: ${q(s.sub)} (semibold, centred).`, END()];
W.recover = s => [DUP(scr(42)), TITLE('42a'), BADGE('42a'),
  `Change to three white cards with "→" between, each with a small navy lock circle: ${s.steps.map(([t, d]) => `${q(t)} ${q(d)}`).join(' · ')}.`,
  'Format <code>[approved contact]</code> in coral so it stands out until it\'s replaced.',
  END('⚑ Pending: the real contact. Hold the voice. ')];
W.promptPart = s => {
  const n = s.n[0], first = idxOf(s) === firstOf('promptPart');
  const [t, d] = sb(n).onscreen.split('\n');
  if (!first) return [DUP(idxOf(s) - 1), TITLE(n), `Card text: term ${q(t)}, question ${q(d.trim())}.`, `Set slot ${s.part + 1} (${s.parts[s.part]}) to its <code>Filled</code> state.`, 'Re-do the voice.'];
  return [NEW('Content S6'), TITLE(n),
    `Centre card 820 × 200, white: ${q(t)} (Aptos Mono bold 30 pt Pro Blue) and ${q(d.trim())} (Aptos Display semibold 36 pt).`,
    'Bottom: "Your prompt so far" (13 pt grey), then five slots 220 × 58: CONTEXT · TASK · AUDIENCE · OUTPUT · CONSTRAINTS. Edit States: <code>Empty</code> (dashed grey outline, grey mono text) and <code>Filled</code> (Pro Blue fill, white text). Set slot 1 to Filled.',
    END()];
};
W.assemble = s => [DUP(scr(50)), TITLE(51), BADGE(51),
  'Delete the centre card. Set all five slots to Filled, then drag them up to the middle and butt them together into one long bar.',
  'Optional: give each slot a short motion path from the bottom position to the middle (slow, 1 s).',
  `Under the bar: ${q(s.sub)} (Aptos Display bold 34 pt, centred).`, END()];
W.compare = s => [NEW('Content S6'), TITLE(52),
  `Left card "VAGUE": ${q(s.vague)} (Aptos Mono 30 pt, grey). Right card "CLEARER" (dashed Pro Blue): ${q(s.clear)} (Aptos Mono 30 pt).`,
  `Highlights: for each added detail, draw a light-teal rectangle (60% transparent) behind the words with a tiny label above: ${s.highlights.map(([w, l]) => `${q(w)} = ${l}`).join(' · ')}.`,
  END('Each highlight fades on its cue. ')];
W.dragPrompt = s => [NEW('Content S6'), TITLE('52a'), BADGE('52a'),
  `Left: card "START WITH" ${q(s.base)}; under it four drop slots 540 × 66 (dashed grey) labelled ${s.slots.map(x => x.part).join(', ')}.`,
  `Right: eight option cards (white, grey outline, Aptos Mono 15 pt). Correct: ${s.slots.map(x => q(x.right)).join(' · ')}. Distractors: ${s.slots.map(x => q(x.wrong)).join(' · ')}.`,
  '<b>Insert &gt; Convert to Freeform &gt; Drag and Drop</b>. Form View: pair each correct card with its slot; leave the four distractors with no drop target.',
  '<b>Drag and Drop Options</b>: Snap dropped items to drop target · Allow only one item in each drop target · Return item to start point if dropped outside a drop target. Attempts 2. Feedback By Question.',
  `Correct layer: storyboard CORRECT text + ${q('Stronger prompt: ' + s.slots[0].right + ' ' + s.base + ' ' + s.slots.slice(1).map(x => x.right).join(' '))}. Incorrect layer: INCORRECT text + the same stronger prompt.`,
  'Leave this slide out of the results slide.', END()];
W.agentModel = s => [NEW('Content S7'), TITLE(56),
  `Text ${q(s.text)}.`,
  `Left: three dashed Pro Blue boxes ${s.inputs.map(q).join(', ')} (Aptos Mono bold). Middle: three Pro Blue connectors (Insert &gt; Shape &gt; Elbow Connector) joining into one arrow. Right: navy box "A defined task" (Aptos Display bold 30 pt, white).`, END()];
W.lanes = s => [NEW('Content S7'), TITLE(57),
  `Two white rows. Row 1 "CHATBOT": pills "You ask" → "AI responds" and caption ${q(s.chatbot)}. Row 2 "AGENT": pills "You define a task" → "Step 1" → "Step 2" → "Step 3" and caption ${q(s.agent)}.`,
  'Pills: rounded, dashed Pro Blue; result pills filled Pro Blue with white text.', END('Chatbot pills fade together; agent pills fade one by one. ')];
W.atlasVideo = s => [NEW('Content S7'), TITLE(58),
  'Record four short clips in Atlas, one per step (Define, Configure, Test, Review). Keep each under 90 seconds, zoom in on each click, and let Storyline add captions.',
  `Clip buttons: four small rounded tags ${s.process.join(' → ')} (white, grey outline, Aptos Mono bold 12 pt). Edit States: <code>Selected</code> (navy fill, white text) and <code>Visited</code> (add "✓"). Make them a Button Set. To the right: ${q(s.clipInstruction)} (13 pt grey) and the counter.`,
  COUNTER('played', 4, 'Played58'),
  'Four layers <code>Clip 1</code>–<code>Clip 4</code>, each with <b>Hide other slide layers</b> ticked. On each: <b>Insert &gt; Video &gt; Video from File</b> &gt; that clip, sized to the area under the buttons; Video Tools &gt; Options &gt; Show Video Controls below video. Callouts point only at real Atlas labels.',
  'Triggers: each clip button shows its layer. On each layer: <b>Adjust variable</b> Played58 Add 1 <b>when media completes</b> (that clip; add the condition that its button was not Visited before, or use one True/False variable per clip). Next to Normal when Played58 = 4.',
  'Voice: storyboard voiceover on the base layer, before the learner picks a clip.'];
W.atlasSteps = s => [NEW('Content S7'), TITLE(59),
  `Four white cards in a row: "STEP 1–4" and ${s.steps.map(q).join(' · ')} (Aptos Display bold 26 pt). Card 4 gets a Pro Teal outline and light-teal fill. Each card has "▶ Screen recording n" at the bottom.`,
  'If you recorded a clip per step: one layer per step with its video; each card shows its layer when clicked.', END()];
W.tryIt = s => [NEW('Content S7'), TITLE(60),
  `Left: four tab buttons stacked (white, grey outline): ${s.tabs.map(([t, d]) => `${q(t)} ${q(d)}`).join(' · ')}. Edit States: Selected (light blue fill, Pro Blue outline) and Visited (small green ✓). Make them a Button Set.`,
  COUNTER('viewed', 4, 'Viewed60') + ' Put it under the instruction "Open all four tabs, then try it in Atlas." and add +1 to Viewed60 on each tab the first time it is clicked.',
  'Right: a white panel 860 × 480. Create four layers (Scenario, Input, Task, Output), each with <b>Hide other slide layers</b> ticked, containing the text from <code>Slide-60-Atlas-Activity-Text.docx</code>.',
  `Scenario layer: ${q(s.scenario)}. Input layer: the eight note lines (bold the Tip 4 line) + "Names have been changed." Task layer: the Atlas prompt in a dashed blue box (Aptos Mono 15 pt). Output layer: the expected table + the five review questions.`,
  'Triggers: <b>Show layer</b> Scenario when the user clicks the Scenario tab (same for the others). Next to Normal when the state of all of the four tabs is Visited.',
  'Voice: use the designer rewrite (below), not the reviewed text.', END('Next lock: only "Disabled when the timeline starts". ')];
W.assessIntro = s => [DUP(4),
  'Delete the AWARE tiles and the title.',
  `Big heading ${q('Show What You Know.')} (Aptos Display bold 72 pt, Pro Green) and ${q(s.lines[1])} (24 pt, white).`,
  `Three outlined pills (white text): ${s.info.map(q).join(' · ')}.`, END()];
W.quiz = s => {
  const [qn, ln] = s.n, Q = parseQ(qn), F = parseFb(ln), first = idxOf(s) === firstOf('quiz');
  const vars = ['Missed_S1', 'Missed_S2', 'Missed_S4', 'Missed_S5', 'Missed_S6', 'Missed_S4', 'Missed_S3', 'Missed_S7'][s.qNo - 1];
  const content = `Form View: question ${q(Q.stem.join(' '))}; options ${Q.opts.map((o, i) => `${'ABCD'[i]}. ${q(o)}`).join(' ')}; tick ${b(key(qn))} as correct.`;
  const fb = `Correct layer: ${q(F.c)}. Incorrect layer: ${q(F.w)}.`;
  const miss = `Incorrect layer trigger: <b>Adjust variable</b> ${vars} = True <b>when the timeline starts on this layer</b>.`;
  if (!first) return [DUP(firstOf('quiz')), `Header: ${q('Question ' + s.qNo + ' of 8')}.`, content, fb, miss, 'Re-do the voice on the three layers.'];
  return [
    `${DUP(firstOf('kc'))} (a knowledge check is the quickest start).`,
    `Form View: <b>Score</b> By Question, 10 points · <b>Attempts</b> 1 · <b>Shuffle</b> Answers · Feedback By Question.`,
    content, fb, miss,
    `Header: tags ${q('Question 1 of 8')} and ${q('Attempt %QuizAttempts% of 3')} (Storyline fills in the number), plus 8 small progress bars.`,
    'Continue on each feedback layer goes to the next slide (built in).'];
};
W.results = s => {
  const lines = sb('79a').onscreen.split('\n');
  return [
    `<b>Home &gt; New Slide &gt; Quizzing &gt; Result Slides &gt; Graded Result Slide</b>. Calculate results for: <b>Selected Questions</b>, tick only screens ${scr(64)}–${scr(78)}. Passing score 80%. Review quiz: off. Retry quiz: on. Apply the <code>Content S8</code> layout.`,
    'Base layer: big score text <code>%Results.ScorePercent%%</code> and "Your score: … · Passing score: 80%".',
    `Success layer: ${q('Pass')}, ${q(lines.find(l => /^PASS/.test(l)).replace(/^PASS\s+/, ''))}, Continue = jump to next slide.`,
    `Failure layer: ${q('Not Yet')}, ${q(lines.find(l => /^NOT YET/.test(l)).replace(/^NOT YET\s+/, ''))}; seven Review buttons (coral outline pills, Initial State Hidden): "Review: Understand AI", "Review: Capabilities and limits", "Review: AI at work", "Review: Use AI responsibly", "Review: Protect information", "Review: Prompt with purpose", "Review: AI agents and Atlas"; a Retry assessment button; and the message ${q(s.outOfAttempts)} (Hidden).`,
    'Failure layer triggers, when its timeline starts: Review S1 to Normal if Missed_S1 = True (repeat S2–S7) · Retry to Hidden if QuizAttempts ≥ 3 · Message to Normal if QuizAttempts ≥ 3.',
    `Retry triggers in order: QuizAttempts Add 1 · Missed_S1–S7 = False · ReviewMode = False · <b>Reset results</b> (this results slide) · Jump to screen ${scr(64)}.`,
    `Each Review button: ReviewMode = True, then Jump to that section's opener (screens ${S.filter(x => x.layout === 'opener').map(idxOf).join(', ')}).`,
    `On screens ${S.filter(x => x.layout === 'kc').map(idxOf).join(', ')}: add the condition ReviewMode = False to the player Next trigger, and a second Next trigger: Jump to screen ${scr('79a')} if ReviewMode = True.`,
    'Voice: two clips, one on Success, one on Failure (split the storyboard script at [Pass layer] / [Not yet layer]).'];
};
W.awareClose = s => [DUP(4), 'Change the title to "Carry AWARE Forward" (16 pt, Pro Green) and move it up so the five tiles sit higher.',
  `Paste the closing band from screen ${scr(34)} under the tiles (AI can assist. Humans remain accountable.).`,
  `Meera's last word: copy the <code>Meera</code> layer from screen ${scr(5)} (Slide Layers &gt; right-click &gt; Duplicate is not available across slides, so copy the layer's objects and paste them into a new layer named <code>Meera</code>). Delete the three choices and replies. Text: ${q(s.meeraClose.recall)} (16 pt grey) and ${q(s.meeraClose.line)} (Aptos Display bold 22 pt navy). Keep Continue visible from the start.`,
  `Meera layer voice (Routine V): ${q(s.meeraClose.vo)}`,
  'Triggers: base layer <b>Show layer</b> Meera <b>when the timeline ends</b>; a "Meera\'s last word" button (bottom left, Pro Teal) also shows it. On the layer: Continue <b>Hide this layer</b> and <b>Change state of</b> Next <b>to</b> Normal.',
  END('Tiles fade in turn, then the band. Next lock: only "Disabled when the timeline starts". ')];
W.download = s => [NEW('Content S0'), TITLE('80a'),
  'Left: navy card 380 × 230: "DOWNLOAD" (Pro Teal mono), "One-page Level 1 quick reference" (Aptos Display bold 30 pt, white), and a Pro Teal "Download PDF" button.',
  `Right: three white rows: ${s.items.map(([t, d]) => `${q(t)} ${q(d)}`).join(' · ')}.`,
  'Download button trigger: <b>Jump to URL/file</b> &gt; browse to the quick-reference PDF (exported from AI-Literacy-L1-Quick-Reference.pptx). Also add it under Player &gt; Resources.', END()];
W.levels = s => [NEW('Content S0'), TITLE(81),
  `Four joined cards: ${s.levels.map(([a, n, d]) => `${q(a)} ${q(n)} ${q(d)}`).join(' · ')}. Card 1 navy with white text and a Pro Teal "Complete" pill; the rest white.`,
  `Reflection under the cards: label ${q(s.commit.label.toUpperCase())} (Aptos Mono bold 12 pt, dark teal), question ${q(s.commit.question)} (Aptos Display bold 20 pt). <b>Insert &gt; Input &gt; Text Entry</b> under it (760 × 56, white, grey outline); right-click &gt; Change Variable &gt; new text variable <code>Commitment</code>; set its default text to ${q(s.commit.placeholder)}. It is optional: no trigger depends on it.`,
  'Optional: an Exit Course button (trigger <b>Exit course</b>) if your LMS needs one.', END()];

// ---------- text for each screen ----------
function onscreenFor(s) {
  const n = s.n[0];
  if (s.layout === 'outcomes') return [s.intro].concat(s.items.map(t => '• ' + t), ['', s.courseInfo]).join('\n');
  if (s.layout === 'defineCards') return `${s.definition}\n\n${s.caps.join('  •  ')}\n\n${s.colourKey.join(' ')}`;
  if (s.layout === 'flow') return s.text;
  if (s.layout === 'agentModel') return `${s.text}\n\n${s.inputs.join('  +  ')}`;
  if (s.layout === 'explorer') return [`${s.title}`, `Tabs: ${s.tabs.map(t => t.label).join(' · ')}`, `${s.instruction}  [0 of ${s.tabs.length} viewed]`].concat(s.tabs.map(t => `\n[${t.label}]\n${sb(t.screen.n[0]).onscreen}`)).join('\n');
  if (s.layout === 'hotspot') return `${s.intro}\n\n${s.text}\n\n${s.prompt}`;
  if (s.layout === 'tryIt') return s.tabs.map(([t, d]) => `${t}\n${d}`).join('\n\n');
  if (s.layout === 'kc' || s.layout === 'quiz') return sb(n).onscreen;
  return sb(n).onscreen;
}
function layersFor(s) {
  const out = [];
  if (s.meera) out.push(['Meera layer', `${s.meera.situation}\n\n${s.meera.question}\n${s.meera.options.map((o, i) => `${i + 1}. ${o.label}\n   Reply: ${o.reply}`).join('\n')}\n\nMeera voiceover: ${s.meera.vo}`]);
  if (s.layout === 'kc' || s.layout === 'quiz') { const F = parseFb(s.n[1]); out.push(['Feedback', `Correct: ${F.c}\n\nIncorrect: ${F.w}\n\nAnswer key: ${key(s.n[0])}`]); }
  if (s.layout === 'hotspot' || s.layout === 'dragPrompt') { const bd = sb(s.n[0]).build; out.push(['Feedback', `Correct: ${(bd.match(/CORRECT:\s*(.*?)\s*INCORRECT:/) || [])[1]}\n\nIncorrect: ${(bd.match(/INCORRECT:\s*(.*?)\s*Allow one retry/) || [])[1]}`]); }
  if (s.layout === 'results') out.push(['After three failed attempts', s.outOfAttempts]);
  if (s.atlasLine) out.push(['Added line (team lead to confirm)', s.atlasLine]);
  if (s.meeraAsk) out.push(['Meera asks (new)', s.meeraAsk]);
  if (s.meeraClose) out.push(["Meera's last word layer (new)", `${s.meeraClose.recall}\n\n${s.meeraClose.line}\n\nVoiceover: ${s.meeraClose.vo}`]);
  if (s.commit) out.push(['Reflection (new)', `${s.commit.label.toUpperCase()}\n${s.commit.question}\n[${s.commit.placeholder}]`]);
  if (s.signedOff) out.push(['Signed-off text this replaces', s.signedOff.was.join('\n')]);
  return out;
}

// ---------- page ----------
const secName = s => s.section == null ? (idxOf(s) < 5 ? 'Opening' : 'Close') : ['Understand AI', 'Capabilities and Limits', 'AI at Work', 'Use AI Responsibly', 'Protect Information', 'Prompt with Purpose', 'AI Agents and Atlas', 'Assessment'][s.section];
const cards = S.map((s, i) => {
  const no = i + 1, n = s.n[0];
  const img = fs.readFileSync(path.join(imgDir, `s${String(no).padStart(2, '0')}.jpg`)).toString('base64');
  const vo = s.layout === 'explorer' ? [s.introVo].concat(s.tabs.map(t => `[${t.label} layer] ${sb(t.screen.n[0]).vo}`)).join('\n\n') : s.voOverride || sb(n).vo;
  const steps = (W[s.layout] ? W[s.layout](s) : []).filter(Boolean);
  const c = cue(n);
  const layers = layersFor(s);
  return `<article class="card" id="s${no}" data-sec="${esc(secName(s))}">
  <header><label class="done"><input type="checkbox" data-no="${no}" aria-label="Screen ${no} built"><span></span></label>
    <div><div class="meta">Screen ${no} · Storyboard slide ${s.n.join(' + ')} · Layout <code>${esc(layoutOf(s))}</code>${c ? ` · AWARE badge ${c.L}` : ''}</div>
    <h2>${esc(s.layout === 'quiz' ? `Question ${s.qNo} of 8` : titleOf(s))}${s.pending ? ' <span class="flag">⚑ Pending sign-off</span>' : ''}</h2></div></header>
  <img loading="lazy" src="data:image/jpeg;base64,${img}" alt="Reference picture of screen ${no}">
  <div class="cols">
    <section class="steps"><h3>Build it</h3><ol>${steps.map(t => `<li>${t}</li>`).join('')}</ol></section>
    <section class="text"><h3>On-screen text</h3><pre>${esc(onscreenFor(s))}</pre>
      ${layers.map(([h, t]) => `<h3>${esc(h)}</h3><pre>${esc(t)}</pre>`).join('')}
      <h3>Voiceover${s.voOverride ? ' (designer rewrite)' : ''}</h3><pre class="vo">${esc(vo)}</pre></section>
  </div></article>`;
}).join('\n');

const nav = (() => {
  let cur = '', h = '';
  S.forEach((s, i) => {
    const sec = secName(s);
    if (sec !== cur) { if (cur) h += '</ol>'; h += `<h4>${esc(sec)}</h4><ol>`; cur = sec; }
    h += `<li><a href="#s${i + 1}" data-no="${i + 1}"><span class="n">${i + 1}</span>${esc(s.layout === 'quiz' ? `Question ${s.qNo}` : titleOf(s))}</a></li>`;
  });
  return h + '</ol>';
})();

const html = `<title>AI Literacy L1 Build Book</title>
<style>
/* Layout: sticky screen list on the left, one card per screen on the right. */
:root { --bg:#f6f6f9; --panel:#ffffff; --ink:#021f62; --text:#1d2433; --muted:#5a5c61; --line:#dfe2ea; --teal:#00bbc2; --teal-ink:#00787d; --blue:#497edc; --green:#4f7a1c; --coral:#c42a50; --code:#eef1f7;
  --f-head:"Aptos Display","Aptos","Segoe UI",system-ui,sans-serif; --f-body:"Aptos","Segoe UI",system-ui,sans-serif; --f-mono:"Aptos Mono",Consolas,ui-monospace,monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0d1424; --panel:#151e33; --ink:#dfe7ff; --text:#d9deea; --muted:#9aa3b8; --line:#26314d; --teal:#2fd0d6; --teal-ink:#5fd8dc; --blue:#8fb0f0; --green:#9bd25e; --coral:#ff8aa6; --code:#1d2740; color-scheme:dark; } }
:root[data-theme="dark"] { --bg:#0d1424; --panel:#151e33; --ink:#dfe7ff; --text:#d9deea; --muted:#9aa3b8; --line:#26314d; --teal:#2fd0d6; --teal-ink:#5fd8dc; --blue:#8fb0f0; --green:#9bd25e; --coral:#ff8aa6; --code:#1d2740; color-scheme:dark; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:15px/1.55 var(--f-body); }
.wrap { display:grid; grid-template-columns:280px minmax(0,1fr); gap:28px; padding-inline:16px; padding-block:20px; max-width:1500px; margin:0 auto; }
@media (max-width: 900px) { .wrap { grid-template-columns:minmax(0,1fr); } nav.list { position:static !important; max-height:none !important; } }
nav.list { position:sticky; top:12px; align-self:start; max-height:calc(100vh - 24px); overflow:auto; background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px 12px; }
nav.list h4 { font:600 12px var(--f-body); letter-spacing:.06em; color:var(--muted); margin:14px 6px 4px; text-transform:uppercase; }
nav.list ol { list-style:none; margin:0; padding:0; }
nav.list a { display:flex; gap:8px; padding:4px 6px; border-radius:6px; color:var(--text); text-decoration:none; font-size:13.5px; line-height:1.3; }
nav.list a:hover { background:var(--code); }
nav.list a .n { font:600 12px var(--f-mono); color:var(--muted); min-width:22px; }
nav.list a.is-done { color:var(--muted); text-decoration:line-through; }
.top h1 { font:700 30px/1.15 var(--f-head); color:var(--ink); margin:0 0 6px; text-wrap:balance; }
.top p { margin:0 0 10px; max-width:75ch; }
.progress { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--muted); margin:6px 0 16px; }
.bar { flex:0 1 260px; height:8px; background:var(--line); border-radius:4px; overflow:hidden; } .bar i { display:block; height:100%; background:var(--teal); width:0; }
.routines { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:16px 20px; margin-bottom:24px; }
.routines h2 { font:700 18px var(--f-head); color:var(--ink); margin:0 0 8px; }
.routines dl { display:grid; grid-template-columns:auto minmax(0,1fr); gap:6px 14px; margin:0; }
.routines dt { font-weight:700; color:var(--ink); } .routines dd { margin:0; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px 20px 20px; margin-bottom:22px; scroll-margin-top:12px; }
.card header { display:flex; gap:14px; align-items:flex-start; margin-bottom:12px; }
.card h2 { font:700 22px/1.2 var(--f-head); color:var(--ink); margin:2px 0 0; }
.meta { font-size:13px; color:var(--muted); }
code { font:13px var(--f-mono); background:var(--code); padding:1px 5px; border-radius:4px; }
.flag { font:600 12px var(--f-body); color:#fff; background:#e07a1f; border-radius:4px; padding:2px 7px; vertical-align:middle; margin-left:6px; }
.card img { width:100%; max-width:100%; height:auto; border-radius:8px; border:1px solid var(--line); display:block; aspect-ratio:16/9; object-fit:cover; background:var(--code); }
.cols { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:24px; margin-top:16px; }
@media (max-width: 1100px) { .cols { grid-template-columns:minmax(0,1fr); } }
h3 { font:700 13px var(--f-body); letter-spacing:.05em; text-transform:uppercase; color:var(--teal-ink); margin:0 0 6px; }
.text h3 { margin-top:14px; } .text h3:first-child { margin-top:0; }
.steps ol { margin:0; padding-left:22px; display:grid; gap:8px; }
.steps li { padding-left:2px; } .steps li::marker { color:var(--teal-ink); font-weight:700; }
q { quotes:"\\201C" "\\201D"; color:var(--ink); font-weight:600; }
pre { white-space:pre-wrap; word-wrap:break-word; font:14px/1.5 var(--f-body); margin:0; background:var(--code); border-radius:8px; padding:10px 12px; }
pre.vo { font-style:italic; }
.done { position:relative; flex:none; margin-top:4px; cursor:pointer; }
.done input { position:absolute; opacity:0; width:26px; height:26px; margin:0; cursor:pointer; }
.done span { display:block; width:26px; height:26px; border:2px solid var(--line); border-radius:7px; }
.done input:checked + span { background:var(--teal); border-color:var(--teal); }
.done input:checked + span::after { content:"✓"; color:#fff; font-weight:800; display:grid; place-items:center; height:100%; }
.done input:focus-visible + span { outline:3px solid var(--blue); outline-offset:2px; }
</style>
<div class="wrap">
<nav class="list" aria-label="Screens">${nav}</nav>
<main>
<div class="top"><h1>AI Literacy Level 1: Build Book</h1>
<p>One card per screen, in build order. Each card shows what the screen should look like, the exact text and voiceover, and the quickest way to build it in Storyline. Tick a screen off when it's done; ticks are saved in this browser only.</p>
<div class="progress"><div class="bar"><i id="bar"></i></div><span id="count">0 of ${S.length} built</span></div></div>
<section class="routines"><h2>Routines used on every screen</h2><dl>
<dt>Routine V</dt><dd>Voice. <b>Insert &gt; Audio &gt; Text-to-Speech</b>, paste the voiceover shown on the card, Language English (India), the same Neural voice every time, tick <b>Create closed captions</b>, Insert.</dd>
<dt>Routine T</dt><dd>Timing. Play the timeline and press <b>C</b> where each item should appear. Right-click each object in the Timeline &gt; <b>Align to Cue Point</b>. Animations &gt; Entrance &gt; <b>Fade</b>, 0.5 s. Drag every bar to the end of the timeline.</dd>
<dt>Routine N</dt><dd>Next lock. Copy the two triggers from screen 2 (Disabled when the timeline starts; Normal when the timeline ends) and paste them. Set <b>When revisiting: Resume saved state</b>.</dd>
<dt>Routine H</dt><dd>Hover. Every object a learner can click (cards, options, tabs, buttons) gets a <b>Hover</b> state: select it &gt; Edit States &gt; New State "Hover" (Pro Blue outline, or fill <code>D9F5F6</code> on teal buttons). Hand cursor is on by default.</dd>
<dt>Player</dt><dd><b>Home &gt; Player</b>. Features: tick Captions, Volume and Resources (for the quick-reference PDF); untick Menu, Seekbar, Glossary and Notes, so there is no slide counter. Other: <b>Resume on restart: Prompt to resume</b> (the course information on screen 2 promises learners can pick up where they left off). Navigation: Restricted.</dd>
<dt>Quickest start</dt><dd>When a card says "Duplicate screen N", always do that rather than building from scratch: the layout, styles, triggers and timing come with the copy.</dd>
</dl></section>
${cards}
</main></div>
<script>
(function () {
  const KEY = 'ai-lit-l1-built';
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { done = {}; }
  const boxes = document.querySelectorAll('.done input');
  function paint() {
    let c = 0;
    boxes.forEach(b => { b.checked = !!done[b.dataset.no]; if (b.checked) c++; });
    document.querySelectorAll('nav.list a').forEach(a => a.classList.toggle('is-done', !!done[a.dataset.no]));
    document.getElementById('count').textContent = c + ' of ' + boxes.length + ' built';
    document.getElementById('bar').style.width = (c / boxes.length * 100) + '%';
  }
  boxes.forEach(b => b.addEventListener('change', () => { done[b.dataset.no] = b.checked; try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* storage blocked */ } paint(); }));
  paint();
})();
</script>
`;
const out = path.join(__dirname, '..', 'prototype', 'ai-literacy-level-1-build-book.html');
fs.writeFileSync(out, html);
console.log('wrote', out, Math.round(html.length / 1024), 'KB');
