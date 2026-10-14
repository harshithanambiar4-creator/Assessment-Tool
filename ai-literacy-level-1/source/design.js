// Design layer for AI Literacy Level 1 (reviewed storyboard, all tracked changes accepted).
// Titles, on-screen copy, voiceover, answer keys and AWARE cues are read from storyboard.json by slide number.
// Everything marked `added: true` / NEW is design content that needs the course owner's approval.

const SECTIONS = [
  { key: 'understand', label: 'Understand AI' },
  { key: 'limits', label: 'Capabilities and limits' },
  { key: 'work', label: 'AI at work' },
  { key: 'responsible', label: 'Responsible AI' },
  { key: 'data', label: 'Protect information' },
  { key: 'prompting', label: 'Prompt with purpose' },
  { key: 'agents', label: 'AI agents and Atlas' },
  { key: 'assessment', label: 'Assessment' },
];

const CHARACTER = {
  name: 'Meera',
  role: 'Talent Partner',
  note: 'Fictional character. In Storyline, use one Content Library 360 illustrated character for every appearance.',
};

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
    'Describe what an AI agent is and why its work still needs human review',
  ],
  storyline: 'Four outcome rows. Add each row\'s Fade entrance at a cue point that matches the narration.' });

S.push({ n: [3], layout: 'journey', section: null,
  steps: ['Understand AI', 'Understand its capabilities and limits', 'See where AI supports work', 'Use AI responsibly',
    'Protect information', 'Prompt with purpose', 'Experience an AI agent', 'Demonstrate your judgment'],
  storyline: 'Horizontal path of 8 stops. Animate the path line with a Wipe (From Left), then each stop Fades in on a cue point. This same path becomes the progress bar at the top of every slide (it lives on the slide master).' });

S.push({ n: [4], layout: 'aware', section: null,
  letters: [['A', 'Appreciate AI'], ['W', 'Weigh the Output'], ['A', 'Assess the Risk'], ['R', 'Respond with the Right Prompt'], ['E', 'Ensure Human Accountability']],
  storyline: 'Five letter tiles. Each tile Fades + Grows in on the cue point where the narrator says that word. Later, the letter appears as a small badge (top right) only on the slides the storyboard names as AWARE cues.' });

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
  definition: 'AI is technology that enables systems to perform tasks that typically require some form of human intelligence.',
  caps: ['Recognize patterns', 'Interpret information', 'Generate content', 'Make predictions'],
  storyline: 'Central AI node with the definition dominant. Four capability cards Fade in around it on narration cues.' });

S.push({ n: [7], layout: 'umbrella', section: 0,
  statement: 'AI is not one single tool.', sub: 'Different systems can be designed for different capabilities.',
  tiles: 6,
  storyline: 'Six plain system tiles (no product names) Fly In from the bottom and join one "AI" umbrella shape. Use Fly In entrances with a 0.2s stagger.' });

S.push({ n: [8], layout: 'radial', section: 0,
  definition: 'Generative AI creates new content from instructions and context.',
  types: ['TEXT', 'IMAGES', 'AUDIO', 'VIDEO', 'CODE'],
  storyline: 'Definition stays on screen throughout. Five output chips Fly In from the centre, 0.25s apart.' });

S.push({ n: [9], layout: 'flow', section: 0,
  text: 'A large language model (LLM) learns patterns from large amounts of data and uses those patterns to generate language.',
  nodes: ['Data', 'Language model', 'Response'],
  storyline: 'Three-node flow: data patterns → language model → response. Animate the connecting arrows with Wipe. Do not add a "checked" or "verified" mark anywhere on the response.' });

S.push({ n: [10], layout: 'reveal', section: 0,
  cards: [['PROMPT', 'The instruction you give AI'], ['CONTEXT', 'Information that helps AI interpret the task']],
  instruction: 'Select each card.', instructionAdded: true,
  storyline: 'Two large cards. Each card has states: Normal (term only) and Selected (term + definition). Trigger: when user clicks card, change state to Selected. Next is enabled when both cards are Selected.' });

S.push({ n: [11], layout: 'reveal', section: 0,
  cards: [['HALLUCINATION', 'An inaccurate or unsupported AI output'], ['BIAS', 'A pattern that can lead to unfair or distorted outcomes'], ['AGENT', 'An AI system configured to carry out a defined task across multiple steps']],
  icons: ['warn', 'balance', 'agent'],
  instruction: 'Select each card.', instructionAdded: true,
  storyline: 'Same card pattern as slide 10, one icon per term. Next is enabled when all three cards are Selected.' });

S.push({ n: [12, 13], layout: 'kc', section: 0,
  storyline: 'Freeform Pick One question (Insert > Convert to Freeform > Pick One). Four answer cards with Normal / Hover / Selected states. Submit button. Correct and Incorrect layers from slide 13. Unscored: in Form View set Score to None. Attempts: 2 (one retry, as the review recommends). The Incorrect layer shows Try Again on attempt 1; on attempt 2 it shows the correct answer and Continue.' });

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
  storyline: 'A long document shape shrinks into a short summary, then into a structured list.' });

S.push({ n: [17], layout: 'pattern', section: 1,
  card: ['IDENTIFY PATTERNS', 'Spot themes, similarities, differences, or recurring information'],
  storyline: 'Scattered dots move (motion paths) into three grouped clusters. One card beside them.' });

S.push({ n: [18], layout: 'limits', section: 1,
  intro: 'AI cannot guarantee:',
  items: ['Accuracy', 'Completeness', 'Current information', 'Fairness', 'Appropriate judgment'],
  storyline: 'Large, short list. Each item Fades in on its narration cue.' });

S.push({ n: [19], layout: 'notEqual', section: 1,
  left: 'CONFIDENT OUTPUT', right: 'CORRECT OUTPUT',
  storyline: 'The ≠ symbol is the visual focus: it draws in last with a Grow entrance. Save the ≠ group as a reusable asset; it reappears as a small marker on slide 30 and in question 6.' });

S.push({ n: [20, 21], layout: 'kc', section: 1, storyline: 'Same knowledge-check pattern as slide 12.' });

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
  cards: [['THINK', 'Brainstorm ideas and options'], ['CREATE', 'Draft or generate content']], icons: ['idea', 'draft'],
  storyline: 'Two large cards with light motion: an idea shape moves (motion path) from the THINK card into the CREATE card.' });

S.push({ n: [24], layout: 'pair', section: 2,
  cards: [['UNDERSTAND', 'Summarize, explain, or clarify information'], ['EXPLORE', 'Look across information for themes, patterns, or questions']], icons: ['doc', 'search'],
  storyline: 'Document and magnifying-glass icons (editable shapes or the supplied SVGs).' });

S.push({ n: [25], layout: 'twoCol', section: 2,
  left: ['AI', 'AI can suggest, generate, organize, and assist.'],
  right: ['HUMAN', 'The person still provides context, judgment, verification, and decisions.'],
  storyline: 'Merged with old slide 26. Two columns: AI side in Process blue (#4278BC) with a dashed outline; human side in Talent teal (#00B6BD) with a solid outline. Then an "output" card moves on a motion path from the AI column to the human column, where a "Review and decide" tick appears.' });

S.push({ n: [27, 28], layout: 'kc', section: 2, storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Responsible AI ----------
S.push({ n: [29], layout: 'opener', section: 3, sectionNo: 4,
  lines: ['Pause before you trust the output.', 'Check accuracy. Consider fairness. Respect intellectual property. Review use. Keep human accountability.'],
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
  warning: 'An output can be fluent and polished and still be wrong. If the consequence matters, verify.',
  storyline: 'Merged with old slide 31. Three-step horizontal process (each step Fades in with its arrow on cue). Below it, a polished answer card (text drawn as grey bars, no readable fake facts) with the small ≠ warning marker that Pulses once. No alarming imagery.' });

S.push({ n: ['30a'], layout: 'hotspot', section: 3,
  intro: 'An AI draft says (fictional example):',
  text: 'Our travel policy was updated in March 2022. It allows up to $75 per day for meals, as stated in Section 4.2 of the handbook.',
  claims: ['March 2022', '$75 per day', 'Section 4.2'],
  prompt: 'Select every claim you would verify.',
  storyline: 'New slide from the review. Put the sentence in one text box, then draw three transparent rectangles over the claims. Each rectangle has Normal and Selected states (Selected = teal underline + fill). Submit button: if all three are Selected, show layer Correct; otherwise show layer Incorrect. Number variable Attempts30a: on the second wrong attempt the Incorrect layer shows all three claims highlighted and a Continue button. Unscored.' });

S.push({ n: [32], layout: 'balance', section: 3,
  cards: [['ASK', 'Could this output disadvantage someone?'], ['REVIEW', 'Pay closer attention when people may be affected.']],
  storyline: 'Balance-scale icon above two cards. The scale tips gently (Spin emphasis, 5°) and settles.' });

S.push({ n: [33], layout: 'checks3', section: 3,
  intro: 'Before you use or share AI-generated content:',
  checks: [['CHECK', 'Does it copy or closely resemble protected material?'], ['REVIEW', 'Who owns it, and what permissions apply?'], ['CONFIRM', 'Does your organization allow this use?']],
  storyline: 'Three check cards, each with its question. Each gets a tick on its narration cue. Do not add legal claims (wording pending legal review).' });

S.push({ n: [34], layout: 'gate', section: 3,
  text: 'Do not delegate sensitive decisions or accountability to AI.', sub: 'Especially when decisions affect people or carry significant consequences.',
  closing: ['AI can assist.', 'Humans remain accountable.'],
  storyline: 'Merged with old slide 35. Decision-gate visual: the AI path stops at a gate; only the human path continues. Then a full-width navy band slides up with "AI can assist." (light blue) "Humans remain accountable." (teal). Reuse this band on slide 80.' });

S.push({ n: [36, 37], layout: 'kc', section: 3, storyline: 'Same knowledge-check pattern as slide 12.' });

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
  items: ['CONFIDENTIAL', 'SENSITIVE', 'EMPLOYEE', 'CANDIDATE', 'PERSONAL', 'CLIENT', 'PROPRIETARY', 'CREDENTIALS'],
  storyline: 'Eight category cards in two rows of four, each with a small lock. Recognition only, no policy detail. Categories pending your data-classification check.' });

S.push({ n: [41], layout: 'threeGate', section: 4,
  parts: ['APPROVED TOOL', 'PERMISSION', 'POLICY REQUIREMENTS'],
  storyline: 'Three-part gate: three bars that each turn to the "open" state on cue. Do not name internal tools.' });

S.push({ n: [42], layout: 'stages', section: 4,
  stages: ['Before input', 'During use', 'Before sharing output'], sub: 'Protect information at every stage.',
  storyline: 'Three-stage process with a lock icon on each stage. A lock travels along the path (motion path).' });

S.push({ n: ['42a'], layout: 'recover', section: 4,
  steps: [['STOP', 'Stop using that conversation'], ['REPORT', 'Tell [approved contact] right away'], ['LEARN', 'Reporting early helps limit harm']],
  storyline: 'New slide from the review. Three-step process reusing the lock motif from slide 42. Replace [approved contact] with the real contact from your policy before you build. Do not guess.' });

S.push({ n: [43, 44], layout: 'kc', section: 4, storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Prompting ----------
S.push({ n: [45], layout: 'opener', section: 5, sectionNo: 6,
  lines: ['A useful prompt gives AI enough information to interpret what you need.'],
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

S.push({ n: [51], layout: 'assemble', section: 5, parts: PROMPT_PARTS, sub: 'A clearer instruction gives AI a clearer target. Review the result, then refine.',
  storyline: 'The five builder slots fly up (motion paths) and lock together into one prompt bar. Then the subline Fades in, with a small circular "refine" arrow after "Review the result, then refine."' });

S.push({ n: [52], layout: 'compare', section: 5,
  vague: 'Write an email.',
  clear: 'Our annual compliance training takes 20 minutes and is in the learning portal. Draft a 100-word professional reminder to employees to complete it by Friday.',
  highlights: [['Our annual compliance training takes 20 minutes and is in the learning portal.', 'background'], ['100-word', 'length'], ['professional', 'tone'], ['reminder', 'what to create'], ['employees', 'who it is for'], ['by Friday', 'deadline']],
  storyline: 'Side-by-side. On the CLEARER card, each added detail gets a highlight shape + small label on its narration cue (background, what to create, who it is for, length, tone, deadline).' });

S.push({ n: ['52a'], layout: 'dragPrompt', section: 5,
  base: 'Summarize this document.',
  slots: [
    { part: 'CONTEXT', right: 'This is our 12-page quarterly employee engagement survey report.', wrong: 'Here is a file.' },
    { part: 'AUDIENCE', right: 'Write it for the leadership team.', wrong: 'Write it for anyone.' },
    { part: 'OUTPUT', right: 'Use five bullet points.', wrong: 'Use whatever format works.' },
    { part: 'CONSTRAINTS', right: 'Keep it under 120 words, in a neutral tone, with no employee names.', wrong: 'Make it good.' },
  ],
  added: true,
  storyline: 'New slide from the review. Insert > Convert to Freeform > Drag and Drop. Drag items: the 8 option cards (fictional, drafted by the designer, needs approval). Drop targets: 4 slots labelled CONTEXT, AUDIENCE, OUTPUT, CONSTRAINTS. In Form View, match each correct card to its slot; distractors have no target. Options: "Snap dropped items to drop target", "Allow only one item in each drop target". Attempts: 2. Correct/Incorrect layers use the slide 52a feedback; the Correct layer also shows the full stronger prompt. Unscored.' });

S.push({ n: [53, 54], layout: 'kc', section: 5, storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Agents ----------
S.push({ n: [55], layout: 'opener', section: 6, sectionNo: 7,
  lines: ['From a single response to a defined task'],
  meera: {
    added: true,
    situation: 'After every team meeting, Meera pulls out the action items and emails each owner a reminder.',
    question: 'What could help most?',
    options: [
      { label: 'Ask a chatbot from scratch after each meeting', reply: 'It works, but she would repeat the same instructions every time.' },
      { label: 'Set up an agent for this task, and review each output', reply: 'Yes. An agent can work through the steps, and Meera still reviews the result.' },
      { label: 'Set up an agent that sends reminders without review', reply: 'An agent can complete a task without the result being correct. Review stays with Meera.' },
    ],
    vo: 'After every team meeting, Meera pulls out the action items and emails each owner a reminder. What could help most?',
  },
  storyline: 'Same opener pattern as slide 5.' });

S.push({ n: [56], layout: 'agentModel', section: 6,
  text: 'An AI agent is an AI system configured to carry out a defined task across multiple steps using:',
  inputs: ['INSTRUCTIONS', 'CONTEXT', 'AVAILABLE CAPABILITIES'],
  storyline: 'Three inputs flow (Wipe arrows) into one "defined task" block. Keep it conceptual.' });

S.push({ n: [57], layout: 'lanes', section: 6,
  chatbot: 'You ask → AI responds', agent: 'You define a task → Agent works through it',
  storyline: 'Two lanes. Chatbot lane animates as one step; agent lane animates as a short sequence of 3–4 small steps.' });

S.push({ n: [58], layout: 'atlasVideo', section: 6,
  process: ['DEFINE', 'CONFIGURE', 'TEST', 'REVIEW'], note: 'Use the approved Atlas environment for the demonstration.',
  storyline: 'Insert > Video > From File: your Atlas screen recording. Add callouts (rounded rectangles) that point to the real Atlas interface labels. Do not invent labels. Show the four-step process bar above the video.' });

S.push({ n: [59], layout: 'atlasSteps', section: 6,
  steps: ['Define the task', 'Add instructions and context', 'Test with a sample situation', 'Review the output'],
  storyline: 'Four step cards. If you record one video per step, put each on its own layer and open it from the matching card.' });

S.push({ n: [60], layout: 'tryIt', section: 6,
  tabs: [['SCENARIO', 'Meeting action tracker'], ['INPUT', 'Fictional sample meeting notes (no real names or data)'], ['TASK', 'Identify action, owner, and due date, then draft a reminder for each owner'], ['OUTPUT', 'Action-item table and draft reminders for human review']],
  added: true,
  notesTitle: 'Learning Team Weekly Sync (fictional)',
  notes: [
    'Ravi will update the onboarding checklist. Due: 18 November.',
    'Anjali will book the room for the December workshop. Due: 22 November.',
    'The team agreed to move the quarterly survey to January.',
    'Someone needs to send the survey link to managers. No owner or date was agreed.',
  ],
  prompt: 'Review the meeting notes below. Create a table with three columns: Action, Owner, Due date. Use only information stated in the notes. If an owner or due date is not stated, write "Not specified". Then draft a short, friendly reminder email for each owner that has a due date.',
  check: [
    'Did the agent list only actions that are in the notes?',
    'Did it write "Not specified" for the survey-link action instead of inventing an owner?',
    'Are the owners and dates correct?',
    'Are the reminders accurate and appropriate to send?',
  ],
  storyline: 'Base layer: four tab buttons (Scenario, Input, Task, Output), each opening its own layer. Track visited tabs with True/False variables; enable Next when all four are visited. The sample notes, prompt and review questions are designer drafts (needs approval) because the review removed the old Talent meeting-summary example. Confirm Atlas can run this two-step task.' });

S.push({ n: [61, 62], layout: 'kc', section: 6, storyline: 'Same knowledge-check pattern as slide 12.' });

// ---------- Assessment ----------
S.push({ n: [63], layout: 'assessIntro', section: 7,
  lines: ['Show what you know.', 'The assessment tests understanding and judgment, not simple recall.'],
  info: ['8 questions', 'Pass mark 80% (7 of 8)', 'Unlimited attempts'], infoAdded: true,
  storyline: 'Clean transition into the assessment. The three info chips are new: they tell learners the rules before they start.' });

const QSECTION = [0, 1, 3, 4, 5, 3, 2, 6]; // section each question checks, for "review this section" routing
[[64, 65], [66, 67], [68, 69], [70, 71], [72, 73], [74, 75], [76, 77], [78, 79]].forEach(([q, l], i) =>
  S.push({ n: [q, l], layout: 'quiz', section: 7, qNo: i + 1, reviewSection: QSECTION[i],
    storyline: i === 0
      ? 'Graded Pick One question (Insert > New Slide > Quizzing > Graded Question > Pick One). Points: 10 each. Attempts: 1. Feedback by question, using the slide ' + l + ' text on the Correct and Incorrect layers (record the two feedback clips separately, without reading the labels). The Continue button on each layer goes to the next question. Do not shuffle answers.'
      : 'Same graded pattern as question 1.' }));

S.push({ n: ['79a'], layout: 'results', section: 7,
  storyline: 'Insert > New Slide > Quizzing > Result Slide > Graded Results Slide (all 8 questions, passing score 80%). Success layer: Continue to slide 80; the LMS records completion. Failure layer: seven "Review" buttons, one per section, each jumping to that section opener, plus Retry Quiz (resets the results). Show each Review button only if the matching question was answered wrong: use the question\'s "Show when" condition on the built-in question result, or set a True/False variable on each Incorrect layer.' });

// ---------- Close ----------
S.push({ n: [80], layout: 'awareClose', section: null,
  letters: [['A', 'Appreciate AI'], ['W', 'Weigh the Output'], ['A', 'Assess the Risk'], ['R', 'Respond with the Right Prompt'], ['E', 'Ensure Human Accountability']],
  closing: 'AI can assist. Humans remain accountable.',
  storyline: 'AWARE recap: the five tiles from slide 4 animate in again, then the closing band from slide 34.' });

S.push({ n: ['80a'], layout: 'download', section: null,
  items: [['AWARE', 'The five-part mental model'], ['BEFORE YOU SHARE', 'The four questions'], ['PROMPT', 'The five elements']],
  storyline: 'New slide from the review. Add the job-aid PDF under Player > Resources AND as a button: Trigger "Jump to URL/file" > File > attach the PDF. The asset pack will include a draft of the one-page PDF.' });

S.push({ n: [81], layout: 'levels', section: null,
  levels: [['LEVEL 1', 'Understand', 'Build the foundation'], ['LEVEL 2', 'Use', 'Use AI in everyday work'], ['LEVEL 3', 'Apply', 'Apply AI within your function'], ['LEVEL 4', 'Improve and Transform', 'Redesign and scale AI-enabled work']],
  storyline: 'Four connected level cards. Level 1 shows a "Complete" tick. Add an Exit Course button (trigger: Exit course) if your LMS needs one.' });

// Open questions on the reviewed storyboard. `who` says who has to answer.
const FLAGS = [
  { slides: [60], who: 'Team lead', text: 'The slide 60 voiceover is written to the course builder, not the learner ("For the learner experience, use a simple meeting action tracker. Give the agent…"). Read aloud by the AI voice, it will sound wrong.', fix: 'Rewrite it for learners, for example: "Now try a simple agent: give it meeting notes, let it build an action-item table and draft reminders, then review what it produced."' },
  { slides: ['42a'], who: 'Team lead / Privacy', text: 'Slide 42a has a placeholder: "[approved contact]". The slide cannot be built until the real contact and process are named.', fix: 'Get the contact and process from your privacy or security policy.' },
  { slides: [33, 34], who: 'Legal / HR', text: 'The review asks for legal review of the intellectual-property wording (slide 33) and the new sentences about laws on employee decisions and being open about AI use (slide 34).', fix: 'Send slides 33 and 34 to Legal and HR before recording audio.' },
  { slides: [40], who: 'Privacy', text: 'Three information categories were added (Client, Proprietary, Credentials).', fix: 'Confirm they match your data-classification policy.' },
  { slides: [55], who: 'Team lead', text: 'The review notes that Atlas is never described for learners.', fix: 'Add one line, for example "Atlas is our approved AI platform for building agents."' },
  { slides: [60], who: 'You', text: 'The review replaced the Talent meeting-summary example with a meeting action tracker but gave no sample notes or prompt. The prototype shows designer drafts.', fix: 'Approve or edit the drafted notes and prompt, and confirm Atlas can run the two-step task.' },
  { slides: ['52a'], who: 'You', text: 'The drag-and-drop practice needs its option cards, which the review did not write. The prototype shows designer drafts.', fix: 'Approve or edit the eight option cards.' },
  { slides: ['30a'], who: 'You', text: 'The practice example uses dollars ("$75 per day"). Learners are in India.', fix: 'Use rupees, for example "₹2,000 per day".' },
  { slides: [63, '79a'], who: 'You', text: 'The review suggests 2 attempts and shuffled answer order, which differs from your decision (unlimited attempts, no shuffling). The prototype follows your decision. 80% of 8 still means 7 correct.', fix: 'Confirm which rules apply.' },
  { slides: [66, 68, 70, 74], who: 'Team lead', text: 'The review itself notes that questions 2, 3, 4 and 6 still mirror earlier knowledge checks, and the correct answer is often the longest option.', fix: 'Optional: rewrite these four as new scenarios.' },
  { slides: ['79a'], who: 'You', text: 'The results voiceover holds both outcomes in one script ("[Pass layer] … [Not yet layer] …").', fix: 'Record it as two clips, one per layer. Already set up this way in the prototype.' },
  { slides: [32, 33], who: 'Team lead', text: 'The review notes that bias/fairness and intellectual property have no assessment question.', fix: 'Optional: add one question for each.' },
];

module.exports = { SECTIONS, CHARACTER, SCREENS: S, FLAGS };
