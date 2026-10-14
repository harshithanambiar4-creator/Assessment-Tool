// Builds ../AI-Literacy-L1-Design-Changes.docx: every change to signed-off content and every piece of new content
// added by the designer, quoted from design.js and storyboard.json so the document always matches the build.
// Usage: node build-changes-doc.js
const fs = require('fs'), path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, LevelFormat, Footer, PageNumber, TableLayoutType,
} = require('docx');
const D = require('./design.js');
const SB = {}; require('./storyboard.json').forEach(r => { SB[r.n] = r; });
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
eval(app.match(/const MINOR[\s\S]*?\n  };\n/)[0].replace('const tc', 'global.tc').replace('const MINOR', 'global.MINOR').replace('const capWord', 'global.capWord'));

const S = D.SCREENS;
const scr = n => S.findIndex(x => x.n.map(String).includes(String(n))) + 1;
const find = pred => S.find(pred);
const T = n => tc(SB[n].title);
const C = { navy: '021F62', teal: '00BBC2', tealInk: '00787D', grey: '5A5C61', line: 'D8DBE2', snow: 'F6F6F9', tealSoft: 'D9F5F6', blueSoft: 'E8EEFB', coralSoft: 'FFE6EC', coralInk: 'C42A50' };
const FONT = 'Aptos';

// ---------- paragraph helpers ----------
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, ...o });
const P = (parts, o = {}) => new Paragraph({ spacing: { after: 100, line: 276 }, ...o, children: (Array.isArray(parts) ? parts : [parts]).map(x => typeof x === 'string' ? run(x) : x) });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 140 }, children: [run(t)] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 }, children: [run(t)] });
const bullet = parts => P(parts, { numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 } });
const quote = t => run(`“${t}”`);

// ---------- table helpers (A4 portrait, 2 cm margins → 9638 DXA of text width) ----------
const W = 9638;
const border = { style: BorderStyle.SINGLE, size: 4, color: C.line };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(content, width, o = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map(c => c instanceof Paragraph ? c : P(typeof c === 'string' ? [run(c, { size: 19, ...(o.run || {}) })] : c, { spacing: { after: 60 } }));
  return new TableCell({ width: { size: width, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 110, right: 110 },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined, children: paras });
}
function table(cols, header, rows) {
  const sum = cols.reduce((a, b) => a + b, 0);
  if (sum !== W) throw new Error('column widths ' + sum);
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: cols, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, cols[i], { fill: C.navy, run: { bold: true, color: 'FFFFFF' } })) })]
      .concat(rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, cols[i], i === 0 ? { fill: C.snow } : {})) }))),
  });
}
const box = '☐ Approve   ☐ Change';
const small = t => [run(t, { size: 19 })];
const lines = arr => arr.map(t => P([run(t, { size: 19 })], { spacing: { after: 40 } }));

// ---------- pull the exact text from the design layer ----------
const outcomes = find(s => s.layout === 'outcomes');
const define = find(s => s.layout === 'defineCards');
const flow = find(s => s.layout === 'flow');
const agent = find(s => s.layout === 'agentModel');
const [exp1, exp2] = S.filter(s => s.layout === 'explorer');
const reveals = S.filter(s => s.layout === 'reveal');
const checklist = find(s => s.layout === 'checklist');
const tryIt = find(s => s.layout === 'tryIt');
const atlas = find(s => s.layout === 'atlasVideo');
const asks = S.filter(s => s.meeraAsk);
const close = find(s => s.meeraClose);
const levels = find(s => s.commit);
const openers = S.filter(s => s.layout === 'opener');
const assessIntro = find(s => s.layout === 'assessIntro');
const scrOf = s => S.indexOf(s) + 1;
const ref = s => `Screen ${scrOf(s)} (storyboard ${s.n.join(' + ')})`;

// ---------- Section A: changes to signed-off text ----------
const trims = [outcomes, define, flow, agent].map(s => [
  [P([run(`Screen ${scrOf(s)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small(`${T(s.n[0])} · storyboard slide ${s.n[0]}`), { spacing: { after: 20 } }), P(small(s.signedOff.field), { spacing: { after: 0 } })],
  lines(s.signedOff.was),
  lines(s === outcomes ? s.items : s === define ? [s.definition] : [s.text]),
  [P(small(s.signedOff.why), { spacing: { after: 60 } }), P(small(box))],
]);
const merges = [exp1, exp2].map(s => [
  [P([run(`Screen ${scrOf(s)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small(`Storyboard slides ${s.n.join(', ')}`), { spacing: { after: 0 } })],
  lines(s.tabs.map(t => `Slide ${t.screen.n[0]} title: ${T(t.screen.n[0])}`)),
  lines([`One screen titled “${s.title}”`, `Tabs: ${s.tabs.map(t => t.label).join(' · ')}`]),
  [P(small('Learners were clicking Next through slides with the same two-card pattern. One tab screen lets them explore instead. All cards, on-screen text and voiceover from each slide are kept unchanged, each on its own tab.'), { spacing: { after: 60 } }), P(small(box))],
]);
const labels = [[
  [P([run('Most content screens', { bold: true, size: 19 })], { spacing: { after: 20 } })],
  lines([`The section name above each title (for example “${SB[5].section}”)`, '“Your mental model” above the AWARE title', `“${SB[63].title}” above “Show What You Know.” (screen ${scrOf(assessIntro)})`, `“Prompt element 1 of 5” and so on (screens ${S.filter(x => x.layout === 'promptPart').map(scrOf).join(', ')})`, '“Practice · not scored”, “Opening”, “Close” labels']),
  lines(['Removed. Each screen starts with its heading.']),
  [P(small('Your decision (removing the small labels above headings). The section name is still shown under the progress bar.'), { spacing: { after: 60 } }), P(small('Already decided'))],
]];

// ---------- Section B: new content ----------
const counterRows = [...reveals, checklist, tryIt, atlas, exp1, exp2].map(s => {
  const total = s.layout === 'reveal' ? s.cards.length : s.layout === 'checklist' ? s.items.length : s.layout === 'explorer' ? s.tabs.length : 4;
  const word = s.layout === 'checklist' ? 'ticked' : s.layout === 'atlasVideo' ? 'played' : 'viewed';
  return `Screen ${scrOf(s)}: “0 of ${total} ${word}”, counting up as the learner goes`;
});
const newRows = [
  [[P([run(`Screen ${scrOf(outcomes)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small('What You Will Learn'))], small('Course information line, under the four outcomes'),
    lines([outcomes.courseInfo]), small('Sets expectations: how long it takes, that screens unlock in order, and that progress is saved (the player is set to “Prompt to resume”). 35 minutes is an estimate: about 20 minutes of narration plus the activities and the assessment. Adjust it after your first test run.'), small(box)],
  [[P([run(`Screen ${scrOf(define)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small(T(define.n[0])))], small('Colour key, bottom left'),
    lines([`${define.colourKey[0]} [dashed blue box] ${define.colourKey[1]}   [solid teal box] ${define.colourKey[2]}`]), small('Teaches the visual code used on every screen: AI is dashed blue, people are solid teal.'), small(box)],
  ...[exp1, exp2].map(s => [[P([run(`Screen ${scrOf(s)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small('Tab screen'))], small('Title, tab labels, instruction, empty-state text and opening voiceover'),
    lines([`Title: ${s.title}`, `Tabs: ${s.tabs.map(t => t.label).join(' · ')}`, `Instruction: ${s.instruction}`, 'Before a tab is chosen: Select a tab to begin.', `Opening voiceover: ${s.introVo}`]),
    small('Needed to turn the separate slides into one tab screen. Each tab then plays its original slide voiceover.'), small(box)]),
  [[P([run('Counters', { bold: true, size: 19 })], { spacing: { after: 20 } })], small('A small pill next to each instruction on screens where Next waits for the learner'),
    lines(counterRows), small('Learners always see why Next is locked and how much is left. Opened cards and visited tabs also get a small ✓.'), small(box)],
  ...asks.map(s => [[P([run(`Screen ${scrOf(s)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small('Knowledge check'))], small('Meera’s speech bubble above the question (question and answers unchanged)'),
    lines([`Meera: ${s.meeraAsk}`]), small('Varies the knowledge-check format: the learner advises Meera instead of answering a bare question.'), small(box)]),
  [[P([run(`Screen ${scrOf(atlas)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small(T(atlas.n[0])))], small('Instruction next to the four step buttons'),
    lines([atlas.clipInstruction]), small('The single Atlas recording becomes four short clips (Define, Configure, Test, Review), each under 90 seconds, so beginners are not lost in one long video.'), small(box)],
  [[P([run(`Screen ${scrOf(close)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small(T(close.n[0])))], small('“Meera’s last word” layer and button'),
    lines([`Button: Meera’s last word`, `On screen: ${close.meeraClose.recall}`, `On screen: ${close.meeraClose.line}`, `Voiceover: ${close.meeraClose.vo}`]),
    small(`Closes Meera’s story. On screen ${scrOf(openers[0])} her reply promises: “By the end of this course you will see why ‘knows everything’ is not quite true.” This is that payoff, and it follows the five AWARE steps.`), small(box)],
  [[P([run(`Screen ${scrOf(levels)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small(T(levels.n[0])))], small('Optional reflection box under the level cards'),
    lines([`Label: ${levels.commit.label}`, `Question: ${levels.commit.question}`, `Box text: ${levels.commit.placeholder}`]), small('Helps learners turn the course into one action. It is optional, not scored and not sent to the LMS.'), small(box)],
];

// ---------- Section C: design and behaviour (no new wording) ----------
const designRows = [
  ['Content placement', 'Content on light screens is centred in the space below the title, so screens no longer look half empty.'],
  ['Readable small text', 'Instructions, tags, progress labels and the AWARE badge word are now at least 12 pt, in the darker grey (#5A5C61).'],
  ['Hover and Submit', 'Every clickable card, option, tab and button has a Hover state. Submit stays disabled until an answer is chosen.'],
  ['Next unlocks', 'On interactive screens Next unlocks as soon as the interaction is complete (all cards opened, all tabs visited, all clips played), not when the voiceover ends.'],
  ['Section openers', `Each of the ${openers.length} section openers has a large teal line icon on the right (system, search, idea, balance, lock, draft, agent).`],
  ['Player', 'No slide counter (menu and seekbar off). Captions, volume and resources on. “Prompt to resume” when a learner returns.'],
  ['Atlas recording', 'Four clips, each under 90 seconds, with captions and zoom on each click, instead of one long recording. Callouts only point at real Atlas labels.'],
  ['Layout (earlier today)', 'Titles sit lower, the logo is aligned with the progress bar, and the section names under the progress bar are larger.'],
];

// ---------- Appendix: content added in earlier rounds (already in the build) ----------
const meeraRows = openers.map(s => [
  [P([run(`Screen ${scrOf(s)}`, { bold: true, size: 19 })], { spacing: { after: 20 } }), P(small(T(s.n[0])))],
  lines([s.meera.situation, s.meera.question].concat(s.meera.options.map((o, i) => `${i + 1}. ${o.label} → ${o.reply}`))),
  lines([s.meera.vo]),
]);
const earlier = [
  [`Screens ${reveals.map(scrOf).join(', ')}`, reveals[0].instruction],
  [`Screen ${scrOf(checklist)}`, checklist.instruction],
  [`Screen ${scrOf(assessIntro)}`, `Information chips: ${assessIntro.info.join(' · ')}`],
  [`Screen ${scr(55)}`, `Atlas description: ${find(s => s.atlasLine).atlasLine} (team lead to confirm)`],
  [`Screen ${scr(60)}`, `Voiceover rewrite (team lead to confirm): ${tryIt.voOverride}`],
  [`Screen ${scr(60)}`, 'Tab label “Sample meeting notes” (was “Fictional sample meeting notes (no real names or data)”) and one added action with no owner: “' + tryIt.noOwnerLine + '”'],
  [`Screen ${scr('52a')}`, 'Practice option cards written to match assessment question 5 (approved by you).'],
  [`Screen ${scr('30a')}`, 'Currency changed from $75 to ₹2,000 (approved by you).'],
  [`Screen ${scr('79a')}`, `Message after three failed attempts (your wording): ${find(s => s.outOfAttempts).outOfAttempts}`],
];

// ---------- document ----------
const children = [
  new Paragraph({ spacing: { after: 60 }, children: [run('AI LITERACY · LEVEL 1', { bold: true, size: 20, color: C.tealInk, characterSpacing: 40 })] }),
  new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 120 }, children: [run('Design Changes and Added Content')] }),
  P([run('For sign-off by the course owner and team lead · 14 October 2026', { color: C.grey })]),
  P([run('This document lists everything the designer has changed or added to the signed-off storyboard to improve the learning experience. '), run('“Signed off”', { bold: true }), run(' means the text approved by the team lead and the course owner in the reviewed storyboard. '), run('“Now”', { bold: true }), run(' means what the build uses after this round. Every quotation is taken directly from the build files, so it matches what learners will see and hear.')]),
  P([run('Screen numbers follow the new build order (65 screens; the storyboard has 68 because five slides now sit on two tab screens). The storyboard slide number is given next to each one.')]),

  H1('At a Glance'),
  table([3000, 4838, 1800], ['Area', 'What changed', 'New wording?'], [
    [small('Signed-off text shortened'), small(`On-screen text on screens ${[outcomes, define, flow, agent].map(scrOf).join(', ')}, where the voiceover read it word for word. Voiceover unchanged.`), small('Changed (section A)')],
    [small('Slides combined'), small('Storyboard slides 15–17 and 23–24 became two tab screens. Original text and voiceover kept.'), small('New titles and tab labels (A and B)')],
    [small('Labels above titles'), small('Removed (your earlier decision).'), small('Removed (A)')],
    [small('New learner-facing content'), small('Course information line, colour key, counters, Meera’s questions on two knowledge checks, Atlas clip instruction, Meera’s last word, reflection box.'), small('Yes (section B)')],
    [small('Design and behaviour'), small('Centred content, larger small text, hover states, Next rules, opener icons, player settings, four Atlas clips.'), small('No (section C)')],
  ]),

  H1('A. Changes to Signed-Off Text'),
  P('These screens now show different words from the signed-off storyboard. Unless a row says otherwise, the voiceover is exactly as signed off.'),
  table([1700, 2850, 2850, 2238], ['Screen', 'Signed off', 'Now', 'Why · decision'], [...trims, ...merges, ...labels]),

  H1('B. New Content Added by the Designer'),
  P('None of this text is in the signed-off storyboard. Each item needs approval before audio is recorded.'),
  table([1500, 1900, 3100, 2038, 1100], ['Screen', 'Where', 'Exact text', 'Why', 'Decision'], newRows),

  H1('C. Design and Behaviour Changes (No New Wording)'),
  P('These change how screens look or behave, not what they say. They are listed so the team lead knows what to expect in review.'),
  table([2600, 7038], ['Change', 'Detail'], designRows.map(([a, b]) => [small(a), small(b)])),

  H1('Appendix. Content Added in Earlier Rounds'),
  P('Already in the build and listed here so this document covers every addition in one place. Items marked “to confirm” are still open with the team lead.'),
  H2('Meera’s Moments on the Section Openers'),
  table([1700, 4938, 3000], ['Screen', 'On screen (situation, question, choices → replies)', 'Voiceover'], meeraRows),
  H2('Other Additions'),
  table([2000, 7638], ['Screen', 'Content'], earlier.map(([a, b]) => [small(a), small(b)])),

  H1('Sign-Off'),
  table([3200, 3200, 3238], ['Name and role', 'Decision', 'Date'], [
    [small('Course owner'), small(''), small('')],
    [small('Team lead'), small(''), small('')],
  ]),
];

const doc = new Document({
  creator: 'AI Literacy Level 1 build', title: 'AI Literacy Level 1: Design Changes and Added Content',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: '1D2433' } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: 'Aptos Display', size: 52, bold: true, color: C.navy } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Aptos Display', size: 32, bold: true, color: C.navy }, paragraph: { spacing: { before: 360, after: 140 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Aptos Display', size: 25, bold: true, color: C.tealInk }, paragraph: { spacing: { before: 260, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('AI Literacy Level 1 · Design changes · Page ', { size: 16, color: C.grey }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.grey })] })] }) },
    children,
  }],
});
const out = path.join(__dirname, '..', 'AI-Literacy-L1-Design-Changes.docx');
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('wrote', out); });
