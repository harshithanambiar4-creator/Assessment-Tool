// Design layer for AI Literacy Level 1.
// Signed-off text (titles, on-screen copy, voiceover) is pulled from storyboard.json by slide number.
// Everything marked `added: true` is new design content that needs the course owner's approval.

const SECTIONS = [
  { key: 'understand', label: 'Understand AI', aware: 'A', awareWord: 'Appreciate AI' },
  { key: 'limits', label: 'Capabilities and limits', aware: 'W', awareWord: 'Weigh the Output' },
  { key: 'work', label: 'AI at work', aware: 'E', awareWord: 'Ensure Human Accountability' },
  { key: 'responsible', label: 'Responsible AI', aware: 'A', awareWord: 'Assess the Risk' },
  { key: 'data', label: 'Protect information', aware: 'A', awareWord: 'Assess the Risk' },
  { key: 'prompting', label: 'Prompt with purpose', aware: 'R', awareWord: 'Respond with the Right Prompt' },
  { key: 'agents', label: 'AI agents and Atlas', aware: 'E', awareWord: 'Ensure Human Accountability' },
  { key: 'assessment', label: 'Assessment', aware: null, awareWord: null },
];

const CHARACTER = {
  name: 'Meera',
  role: 'Talent Partner',
  note: 'Fictional character. In Storyline, use one Content Library 360 illustrated character for every appearance.',
};

// Knowledge-check answers: index of the correct option (0 = A).
const S = []; // screens

// ---------- Opening ----------
S.push({ n: [1], layout: 'title', section: null,
  storyline: 'Title slide. Entrance animation: title Fade + Grow (0.75s), subtitle Fade 0.5s later. Disable Next until timeline ends.' });

S.push({ n: [2], layout: 'outcomes', section: null,
  intro: 'By the end of this course, you will be able to:',
  items: [
    'Use AI effectively and understand its limitations',
    'Use AI responsibly and protect sensitive information',
    'Use basic prompting techniques to guide AI outputs',
  ],
  storyline: 'Three outcome rows. Add each row\'s Fade entrance at a cue point that matches the narration. One numbered icon per outcome.' });

S.push({ n: [3], layout: 'journey', section: null,
  steps: ['Understand AI', 'Understand its capabilities and limits', 'See where AI supports work', 'Use AI responsibly',
    'Protect information', 'Prompt with purpose', 'Experience an AI agent', 'Demonstrate your judgment'],
  storyline: 'Horizontal path of 8 stops. Animate the path line with a Wipe (From Left), then each stop Fades in on a cue point. This same path becomes the progress bar at the top of every slide (it lives on the slide master).' });

S.push({ n: [4], layout: 'aware', section: null,
  letters: [['A', 'Appreciate AI'], ['W', 'Weigh the Output'], ['A', 'Assess the Risk'], ['R', 'Respond with the Right Prompt'], ['E', 'Ensure Human Accountability']],
  storyline: 'Five letter tiles. Each tile Fades + Grows in on the cue point where the narrator says that word. After this slide, the relevant letter appears as a small badge in the top-right of each section (on the section\'s slide layout).' });

// ---------- Understanding AI ----------
S.push({ n: [5], layout: 'opener', section: 0, sectionNo: 1,
  lines: ['What is AI?', 'How does generative AI work at a high level?', 'What language will you hear when people talk about AI?'],
  meera: {
    added: true,
    situation: 'Meera\'s manager says, "Just ask the AI. It knows everything." Meera has used a chatbot twice and isn\'t sure what "the AI" actually is.',
    question: 'What would you want to understand first?',
    options: [
      { label: 'What AI actually is, and what it does', reply: 'A strong place to start. Knowing what a tool is helps you judge what to expect from it.' },
      { label: 'Which buttons to press', reply: 'Useful later. Tools change often, so this course starts with ideas that work across every AI tool.' },
      { label: 'Nothing. If it knows everything, just use it', reply: 'Hold that thought. By the end of this course you will see why "knows everything" is not quite true.' },
    ],
    vo: 'Meet Meera, a Talent Partner. Her manager has told her to just ask the AI, because it knows everything. What would you want to understand first? Choose an option.',
  },
  storyline: 'Section opener on the dark "Section" layout. Base layer: section number, title, three questions (Fade in on cues). Then show layer "Meera" automatically when the base timeline ends. Meera layer: character + speech panel + 3 choice buttons. Each button shows its own reply layer and changes variable MeeraDone = True. Next is disabled until MeeraDone = True.' });

S.push({ n: [6], layout: 'defineCards', section: 0,
  definition: 'AI is technology that enables systems to perform tasks that typically require human intelligence.',
  caps: ['Recognize patterns', 'Understand information', 'Generate content', 'Make predictions'],
  storyline: 'Central AI node with the definition dominant. Four capability cards Fade in around it on narration cues.' });

S.push({ n: [7], layout: 'umbrella', section: 0,
  statement: 'AI is not one single tool.', sub: 'Different systems can be designed for different capabilities.',
  tiles: 6,
  storyline: 'Six plain system tiles (no product names) Fly In from the bottom and join one "AI" umbrella shape. Use motion paths or Fly In entrance with a 0.2s stagger.' });

S.push({ n: [8], layout: 'radial', section: 0,
  definition: 'Generative AI creates new content from instructions and context.',
  types: ['TEXT', 'IMAGES', 'AUDIO', 'VIDEO', 'CODE'],
  storyline: 'Definition stays on screen throughout. Five output chips Fly In from the centre, 0.25s apart.' });

S.push({ n: [9], layout: 'flow', section: 0,
  text: 'A language model learns patterns from large amounts of data and uses those patterns to generate language.',
  nodes: ['Data', 'Language model', 'Response'],
  storyline: 'Three-node flow: data patterns → language model → response. Animate the connecting arrows with Wipe. Do not add a "checked" or "verified" mark anywhere on the response.' });

S.push({ n: [10], layout: 'reveal', section: 0,
  cards: [['PROMPT', 'The instruction you give AI'], ['CONTEXT', 'Information that helps AI understand the task']],
  instruction: 'Select each card.', instructionAdded: true,
  storyline: 'Two large cards. Each card has states: Normal (term only) and Selected (term + definition). Trigger: when user clicks card, change state to Selected. Next is enabled when both cards are Selected. Prompt card is revealed first by the narration.' });

S.push({ n: [11], layout: 'reveal', section: 0,
  cards: [['HALLUCINATION', 'An inaccurate or unsupported AI output'], ['BIAS', 'A pattern that can lead to unfair or distorted outcomes'], ['AGENT', 'An AI system configured to carry out a defined task']],
  icons: ['warn', 'balance', 'agent'],
  instruction: 'Select each card.', instructionAdded: true,
  storyline: 'Same card pattern as slide 10, one icon per term. Next is enabled when all three cards are Selected.' });

S.push({ n: [12, 13], layout: 'kc', section: 0, correct: 1,
  storyline: 'Freeform Pick One question (Insert > Convert to Freeform > Pick One). Four answer cards with Normal / Hover / Selected states. Submit button. Correct layer and Incorrect layer built from slide 13. Incorrect layer has a Try Again button. Unscored: in Form View set Score to None. Attempts: unlimited.' });

// ---------- Capabilities and limits ----------
S.push({ n: [14], layout: 'opener', section: 1, sectionNo: 2,
  lines: ['AI can support many kinds of work.', 'But capability does not equal reliability.'],
  meera: {
    added: true,
    situation: 'Meera asks AI to summarize 40 pages of survey comments. The summary is polished, and it includes a statistic she has not seen before.',
    question: 'What should Meera do with the summary?',
    options: [
      { label: 'Send it to leadership now', reply: 'Risky. A polished summary can still contain an error. This section shows why.' },
      { label: 'Check the statistic before using it', reply: 'Good call. Being useful and being reliable are two different things.' },
      { label: 'Ask the AI if it is sure', reply: 'AI can sound certain and still be wrong. You will see why in this section.' },
    ],
    vo: 'Meera has an AI-generated summary of forty pages of survey comments. It looks polished, and it includes a statistic she has not seen before. What should she do?',
  },
  storyline: 'Same opener pattern as slide 5.' });

S.push({ n: [15], layout: 'beforeAfter', section: 1,
  cards: [['GENERATE', 'Create a first draft or new content'], ['TRANSFORM', 'Rewrite, reformat, translate, or adapt existing content']],
  storyline: 'Before/after visual: a blank page becoming a draft (Generate), and a page becoming a reformatted page (Transform). Cards Fade in on cues.' });

S.push({ n: [16], layout: 'condense', section: 1,
  cards: [['SUMMARIZE', 'Condense information into key points'], ['ORGANIZE', 'Group, structure, or extract information']],
  storyline: 'A long document shape shrinks (Grow/Shrink emphasis or motion path) into a short summary, then into a structured list.' });

S.push({ n: [17], layout: 'pattern', section: 1,
  card: ['IDENTIFY PATTERNS', 'Spot themes, similarities, differences, or recurring information'],
  storyline: 'Scattered dots move (motion paths) into three grouped clusters. One card below.' });

S.push({ n: [18], layout: 'limits', section: 1,
  intro: 'AI cannot guarantee:',
  items: ['Accuracy', 'Completeness', 'Current information', 'Fairness', 'Appropriate judgment'],
  storyline: 'Large, short list. Each item Fades in on its narration cue.' });

S.push({ n: [19], layout: 'notEqual', section: 1,
  left: 'CONFIDENT OUTPUT', right: 'CORRECT OUTPUT',
  storyline: 'The ≠ symbol is the visual focus: it draws in last with a Grow entrance. Save the ≠ group as a reusable asset; it reappears as a small marker on slide 31.' });

S.push({ n: [20, 21], layout: 'kc', section: 1, correct: 2,
  storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- AI at work ----------
S.push({ n: [22], layout: 'opener', section: 2, sectionNo: 3,
  lines: ['Think  •  Create  •  Understand  •  Explore', 'AI supports the work. People own the work.'],
  meera: {
    added: true,
    situation: 'Meera needs ideas for a learning campaign by Friday. A colleague suggests letting AI choose the campaign.',
    question: 'How should Meera use AI here?',
    options: [
      { label: 'Let AI choose the campaign', reply: 'AI can suggest, but the choice is Meera\'s to own. This section explains the difference.' },
      { label: 'Use AI to brainstorm, then choose herself', reply: 'Exactly. AI supports the work. Meera owns it.' },
      { label: 'Avoid AI completely', reply: 'That is an option, but AI can save time on early ideas. This section shows where it helps.' },
    ],
    vo: 'Meera needs learning campaign ideas by Friday. A colleague suggests letting AI choose the campaign. How should she use AI here?',
  },
  storyline: 'Same opener pattern as slide 5.' });

S.push({ n: [23], layout: 'pair', section: 2,
  cards: [['THINK', 'Explore ideas and possibilities'], ['CREATE', 'Draft or generate content']], icons: ['idea', 'draft'],
  storyline: 'Two large cards with light motion: an idea shape moves (motion path) from the THINK card into the CREATE card.' });

S.push({ n: [24], layout: 'pair', section: 2,
  cards: [['UNDERSTAND', 'Summarize, explain, or clarify information'], ['EXPLORE', 'Surface possibilities, themes, or questions']], icons: ['doc', 'search'],
  storyline: 'Document and magnifying-glass icons (editable shapes or the supplied SVGs).' });

S.push({ n: [25], layout: 'twoCol', section: 2,
  left: ['AI', 'AI can suggest, generate, organize, and assist.'],
  right: ['HUMAN', 'The person still provides context, judgment, verification, and decisions.'],
  storyline: 'Two columns. AI side uses Process blue (#4278BC) with a dashed outline; human side uses Talent teal (#00B6BD) with a solid outline. This colour rule is used across the whole course.' });

S.push({ n: [26], layout: 'handoff', section: 2,
  ai: ['Generate', 'Suggest', 'Organize'], human: ['Judge', 'Verify', 'Decide', 'Own'],
  storyline: 'An "output" card moves from the AI lane to the HUMAN lane on a motion path, then each human verb lights up (state change) in turn.' });

S.push({ n: [27, 28], layout: 'kc', section: 2, correct: 1,
  storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Responsible AI ----------
S.push({ n: [29], layout: 'opener', section: 3, sectionNo: 4,
  lines: ['Pause before you trust the output.', 'Check accuracy. Consider fairness. Review use. Keep human accountability.'],
  meera: {
    added: true,
    situation: 'An AI tool recommends which three employees should join a leadership programme. Meera\'s manager wants the list today.',
    question: 'What is Meera\'s next step?',
    options: [
      { label: 'Forward the list as it is', reply: 'This decision affects people, so it needs more than a forward. Let\'s look at why.' },
      { label: 'Review the list for accuracy and fairness first', reply: 'Right. When people are affected, review and accountability come first.' },
      { label: 'Ask the AI for a longer list', reply: 'A longer list still needs a person to review it and own the decision.' },
    ],
    vo: 'An AI tool has recommended three employees for a leadership programme, and Meera\'s manager wants the list today. What is her next step?',
  },
  storyline: 'Same opener pattern as slide 5.' });

S.push({ n: [30], layout: 'steps', section: 3,
  steps: [['PAUSE', 'Do not accept the output automatically'], ['CHECK', 'Identify claims that matter'], ['VERIFY', 'Use an appropriate reliable source']],
  storyline: 'Three-step horizontal process. Each step Fades in with its connector arrow on cue.' });

S.push({ n: [31], layout: 'warning', section: 3,
  text: 'An AI output can be fluent, polished, and still be wrong.', sub: 'If the consequence matters, verify.',
  storyline: 'A polished answer card (text lines drawn as grey bars, no readable fake facts) with a small ≠ warning marker that Pulses once. No alarming imagery.' });

S.push({ n: [32], layout: 'balance', section: 3,
  cards: [['ASK', 'Could this output disadvantage someone?'], ['REVIEW', 'Pay closer attention when people may be affected.']],
  storyline: 'Balance-scale icon above two cards. The scale tips gently (Spin emphasis, 5°) and settles.' });

S.push({ n: [33], layout: 'checks3', section: 3,
  intro: 'Before you use or share AI-generated content:', checks: ['CHECK', 'REVIEW', 'CONFIRM'],
  storyline: 'Three check cards. Each gets a tick on its narration cue. Do not add legal claims.' });

S.push({ n: [34], layout: 'gate', section: 3,
  text: 'Do not delegate sensitive decisions or accountability to AI.', sub: 'Especially when decisions affect people or carry significant consequences.',
  storyline: 'Decision-gate visual: the AI path stops at a gate; only the human path continues through.' });

S.push({ n: [35], layout: 'statement', section: 3,
  lines: ['AI can assist.', 'Humans remain accountable.'],
  storyline: 'Strong statement slide on the dark layout. Line 1 in the AI colour, line 2 in the human colour. Reused at the very end of the course.' });

S.push({ n: [36, 37], layout: 'kc', section: 3, correct: 1,
  storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Data, privacy and security ----------
S.push({ n: [38], layout: 'opener', section: 4, sectionNo: 5,
  lines: ['Before you share information with an AI tool, stop and assess the information, the tool, and your permission to use it.'],
  meera: {
    added: true,
    situation: 'Meera wants AI to help her draft feedback for a team member. The full performance review is open on her screen.',
    question: 'What should Meera do before pasting anything?',
    options: [
      { label: 'Paste the whole review in', reply: 'Being able to paste it doesn\'t mean she is allowed to. This section shows what to check.' },
      { label: 'Check what she may share and whether the tool is approved', reply: 'Yes. Information, tool and permission come before the prompt.' },
      { label: 'Remove the name, then paste the rest', reply: 'Better, but other details can still identify the person. She should check permission and the tool first.' },
    ],
    vo: 'Meera wants AI to help draft feedback for a team member, and the full performance review is open on her screen. What should she do before pasting anything?',
  },
  storyline: 'Same opener pattern as slide 5.' });

S.push({ n: [39], layout: 'checklist', section: 4,
  items: ['What information is it?', 'Who owns it?', 'Is the tool approved?', 'Am I permitted to use it?'],
  instruction: 'Select each question to tick it off.', instructionAdded: true,
  storyline: 'Four checklist rows, each a button with Normal and Selected (ticked) states. Next is enabled when all four are Selected. Make the list feel like a reusable mental checklist.' });

S.push({ n: [40], layout: 'categories', section: 4,
  items: ['CONFIDENTIAL', 'SENSITIVE', 'EMPLOYEE', 'CANDIDATE', 'PERSONAL'],
  storyline: 'Five simple category cards with a small lock motif. Recognition only, no policy detail.' });

S.push({ n: [41], layout: 'threeGate', section: 4,
  parts: ['APPROVED TOOL', 'PERMISSION', 'POLICY REQUIREMENTS'],
  storyline: 'Three-part gate: three bars that each turn to the "open" state on cue. Do not name internal tools.' });

S.push({ n: [42], layout: 'stages', section: 4,
  stages: ['Before input', 'During use', 'Before sharing output'], sub: 'Protect information at every stage.',
  storyline: 'Three-stage process with a lock icon on each stage. A lock travels along the path (motion path).' });

S.push({ n: [43, 44], layout: 'kc', section: 4, correct: 1,
  storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Prompting ----------
S.push({ n: [45], layout: 'opener', section: 5, sectionNo: 6,
  lines: ['A useful prompt gives AI enough information to understand what you need.'],
  meera: {
    added: true,
    situation: 'Meera typed "Write an email" and got something generic that she can\'t use.',
    question: 'What should she try next?',
    options: [
      { label: 'Run the same prompt again', reply: 'The same unclear request usually gives a similarly unclear result.' },
      { label: 'Say who it is for, what it is about, and how long it should be', reply: 'That\'s it. A clearer instruction gives AI a clearer target.' },
      { label: 'Give up and write it herself', reply: 'Sometimes that\'s fine. But a few extra details can make AI much more useful.' },
    ],
    vo: 'Meera typed "Write an email" and got something generic that she can\'t use. What should she try next?',
  },
  storyline: 'Same opener pattern as slide 5.' });

const PROMPT_PARTS = ['CONTEXT', 'TASK', 'AUDIENCE', 'OUTPUT', 'CONSTRAINTS'];
[46, 47, 48, 49, 50].forEach((n, i) => S.push({ n: [n], layout: 'promptPart', section: 5, part: i, parts: PROMPT_PARTS,
  storyline: i === 0
    ? 'Prompt-builder pattern (slides 46–50): one big element card in the centre, and a five-slot builder bar at the bottom. On each slide one more slot fills in. Build slide 46 completely, then duplicate it four times and change only the text and which slot is filled.'
    : 'Duplicate of slide 46 with the next builder slot filled.' }));

S.push({ n: [51], layout: 'assemble', section: 5, parts: PROMPT_PARTS, sub: 'A clearer instruction gives AI a clearer target.',
  storyline: 'The five builder slots fly up (motion paths) and lock together into one prompt bar. Then the subline Fades in.' });

S.push({ n: [52], layout: 'compare', section: 5,
  vague: 'Write an email.',
  clear: 'Draft a 100-word professional reminder to employees to complete mandatory training by Friday.',
  highlights: [['100-word', 'length'], ['professional', 'tone'], ['reminder', 'what to create'], ['employees', 'who it is for'], ['by Friday', 'deadline']],
  storyline: 'Side-by-side. On the CLEARER card, each added detail gets a highlight shape + small label on its narration cue (what to create, who it is for, length, tone, deadline).' });

S.push({ n: [53, 54], layout: 'kc', section: 5, correct: 2,
  storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Agents ----------
S.push({ n: [55], layout: 'opener', section: 6, sectionNo: 7,
  lines: ['From a single response to a defined task'],
  meera: {
    added: true,
    situation: 'Every week, Meera turns her team\'s meeting notes into a summary using the same template.',
    question: 'What could help most?',
    options: [
      { label: 'Ask a chatbot from scratch each week', reply: 'It works, but she would repeat the same instructions every time.' },
      { label: 'Set up an agent for this task, and review each output', reply: 'Yes. An agent can carry out a defined task, and Meera still reviews the result.' },
      { label: 'Set up an agent that sends summaries without review', reply: 'An agent can complete a task without the result being correct. Review stays with Meera.' },
    ],
    vo: 'Every week, Meera turns her team\'s meeting notes into a summary using the same template. What could help most?',
  },
  storyline: 'Same opener pattern as slide 5.' });

S.push({ n: [56], layout: 'agentModel', section: 6,
  text: 'An AI agent is an AI system configured to carry out a defined task using:',
  inputs: ['INSTRUCTIONS', 'CONTEXT', 'AVAILABLE CAPABILITIES'],
  storyline: 'Three inputs flow (Wipe arrows) into one "defined task" block. Keep it conceptual.' });

S.push({ n: [57], layout: 'lanes', section: 6,
  chatbot: 'You ask → AI responds', agent: 'You define a task → Agent works through it',
  storyline: 'Two lanes. Chatbot lane animates as one step; agent lane animates as a short sequence of 3–4 small steps.' });

S.push({ n: [58], layout: 'atlasVideo', section: 6,
  process: ['CREATE', 'CONFIGURE', 'TEST', 'REVIEW'], note: 'Use the approved Atlas environment for the demonstration.',
  storyline: 'Insert > Video > From File: your Atlas screen recording. Add callouts (rounded rectangles) that point to the real Atlas interface labels. Do not invent labels. Show the four-step process bar above the video.' });

S.push({ n: [59], layout: 'atlasSteps', section: 6,
  steps: ['Define the task', 'Add instructions and context', 'Test with a sample situation', 'Review the output'],
  storyline: 'Four step cards. If you record one video per step, put each on its own layer and open it from the matching card.' });

S.push({ n: [60], layout: 'tryIt', section: 6,
  tabs: [['SCENARIO', 'Talent meeting summary'], ['INPUT', 'Sample meeting notes'], ['TASK', 'Create a meeting summary using the Talent meeting-summary template'], ['OUTPUT', 'Completed meeting summary']],
  notesTitle: 'Sample meeting notes',
  notes: [
    'Purpose: Business Writing Team Connect',
    'The team reviewed the October Tip 3 content and finalized the version for sharing.',
    'The finalized Tip 3 should be shared with the team. Owner: Team. Deadline: October 2.',
    'Neha demonstrated the AI Agent Builder feature in Atlas and walked the team through an R&R Auditor Agent she created.',
    'Neha will share the R&R Auditor Agent prompt and demonstration details with the team. Deadline: October 2.',
    'Neha walked the team through the AI presentation prepared for Talent Development.',
    'No announcements or minority views were recorded.',
  ],
  renamed: 'Karthika → Neha (fictional name, as you requested)',
  prompt: 'Create a meeting summary using the Talent meeting-summary template. Review the meeting notes provided below and populate the relevant fields in the template. Capture meeting details, agenda items, descriptions, action items or next steps, responsible persons, deadlines, announcements, minority views and alternate opinions, outcomes of minority-view consideration, and additional notes when the information is provided. Use only information explicitly stated in the meeting notes. Do not infer or invent owners, deadlines, decisions, viewpoints, or other details. If a field is not supported by the notes, leave it blank or mark it as Not specified, according to the template requirement. Keep the wording concise and professional while preserving the meaning of the original notes.',
  check: 'The completed summary should follow the Talent template structure and accurately reflect the source notes. The learner must review the output before using or sharing it.',
  actions: [
    'Share the finalized October Tip 3 — Responsible Person: Team — Deadline: October 2',
    'Share the R&R Auditor Agent prompt and demonstration details — Responsible Person: Neha — Deadline: October 2',
  ],
  review: [
    'Did the agent capture the information that was actually provided?',
    'Did it place the information in the correct sections of the Talent template?',
    'Did it invent any owner, deadline, decision, or viewpoint?',
    'Is the wording accurate and appropriate for a meeting summary?',
    'What would you correct before sharing the summary?',
  ],
  storyline: 'Base layer: four tab buttons (Scenario, Input, Task, Output). Each tab opens its own layer. Extra layers: "Sample notes", "Right prompt for Atlas", "Expected output check". Track visited tabs with True/False variables; enable Next when all four are visited. Optional: attach the Talent template and sample notes as Resources in the player.' });

S.push({ n: [61, 62], layout: 'kc', section: 6, correct: 1,
  storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Assessment ----------
S.push({ n: [63], layout: 'assessIntro', section: 7,
  lines: ['Show what you know.', 'The assessment tests understanding and judgment, not simple recall.'],
  info: ['8 questions', 'Pass mark 80% (7 of 8)', 'Unlimited attempts'], infoAdded: true,
  storyline: 'Clean transition into the assessment. The three info chips are new: they tell learners the rules before they start.' });

[[64, 65, 1], [66, 67, 1], [68, 69, 1], [70, 71, 1], [72, 73, 2], [74, 75, 1], [76, 77, 1], [78, 79, 1]].forEach(([q, l, c], i) =>
  S.push({ n: [q, l], layout: 'quiz', section: 7, qNo: i + 1, correct: c,
    storyline: i === 0
      ? 'Graded Pick One question (Insert > New Slide > Quizzing > Graded Question > Pick One). Points: 10 each. Attempts: 1. Feedback: By Question, using the slide ' + l + ' text on the Correct and Incorrect layers. The Continue button on each layer goes to the next question. Do not shuffle answers.'
      : 'Same graded pattern as question 1.' }));

S.push({ n: [], layout: 'results', section: 7, added: true,
  pass: { title: 'You passed', text: 'You have completed the AI Literacy Level 1 assessment.' },
  fail: { title: 'Not yet', text: 'You need 80% to pass. Review AWARE and try the assessment again.' },
  storyline: 'NEW. Insert > New Slide > Quizzing > Result Slide > Graded Results Slide. Include all 8 questions. Passing score 80%. Success layer: Continue to slide 80. Failure layer: Retry Quiz button (resets results and jumps to question 1). The LMS reads pass/fail from this slide.' });

// ---------- Close ----------
S.push({ n: [80], layout: 'awareClose', section: null,
  letters: [['A', 'Appreciate AI'], ['W', 'Weigh the Output'], ['A', 'Assess the Risk'], ['R', 'Respond with the Right Prompt'], ['E', 'Ensure Human Accountability']],
  closing: 'AI can assist. Humans remain accountable.',
  storyline: 'AWARE recap: the five tiles from slide 4 animate in again, then the closing line from slide 35.' });

S.push({ n: [81], layout: 'levels', section: null,
  levels: [['LEVEL 1', 'Understand', 'Build the foundation'], ['LEVEL 2', 'Use', 'Apply AI to everyday work'], ['LEVEL 3', 'Apply', 'Use AI within your function'], ['LEVEL 4', 'Improve and Transform', 'Redesign and scale AI-enabled work']],
  storyline: 'Four connected level cards. Level 1 shows a "Complete" tick. Add an Exit Course button (trigger: Exit course) if your LMS needs one.' });

const FLAGS = [
  { slides: [10], text: 'Title says "Three terms you will use often" but the slide shows two terms (Prompt, Context).', fix: 'Change the title to "Two terms you will use often".' },
  { slides: [2], text: 'The learning outcomes do not mention AI agents, but a whole section and one assessment question cover them.', fix: 'Add a fourth outcome, for example "Describe what an AI agent is".' },
  { slides: [63, 'results'], text: 'Pass mark 80% with 8 questions means learners need 7 of 8 correct (6 of 8 is 75%, a fail).', fix: 'Confirm that 7 of 8 is intended.' },
  { slides: [64, 76, 78], text: 'Three assessment questions repeat earlier knowledge checks almost word for word (Q1 ≈ slide 12, Q7 ≈ slide 27, Q8 ≈ slide 61). This tests recall, which slide 63 says the assessment avoids.', fix: 'Rewrite Q1, Q7 and Q8 as new workplace scenarios.' },
  { slides: [64, 66, 68, 70, 72, 74, 76, 78], text: 'Several wrong options are obviously wrong (for example "Password management", "File compression", "A static report"), so learners can answer without understanding.', fix: 'Replace them with believable mistakes people actually make.' },
  { slides: [65, 67, 69, 71, 73, 75, 77, 79], text: 'All 8 assessment feedback layers use identical text. The correct-answer text ("keeps the appropriate human role") does not fit Q1, Q5 or Q8.', fix: 'Write one specific sentence of feedback per question.' },
  { slides: [63], text: 'Slide 63 says "Eight scenario-based questions follow", but Q5 and Q8 are not scenarios.', fix: 'Reword the build note, or turn Q5 and Q8 into scenarios.' },
  { slides: [58, 59], text: 'Slide 58 names the steps Create → Configure → Test → Review; slide 59 calls them Define → Add instructions and context → Test → Review.', fix: 'Use one set of step names on both slides.' },
  { slides: [27, 76], text: 'Grammar: "a candidate suitability" should be "a candidate\'s suitability".', fix: 'Add the apostrophe.' },
  { slides: [33], text: 'Grammar in voiceover: "your organization expectations" should be "your organization\'s expectations". Also check: the AI voice will read "R&R" literally.', fix: 'Add the apostrophe.' },
  { slides: [60], text: 'Slide 60 holds more content than one screen can show (scenario, notes, prompt, expected output).', fix: 'Already handled in this design with tabs and layers. No wording changed.' },
  { slides: [12, 20, 27, 36, 43, 53, 61], text: 'The storyboard does not say whether a wrong knowledge-check answer can be retried.', fix: 'This design uses Try Again until correct. Confirm.' },
];

module.exports = { SECTIONS, CHARACTER, SCREENS: S, FLAGS };
