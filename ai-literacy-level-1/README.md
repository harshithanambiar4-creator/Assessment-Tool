# AI Literacy Level 1 — Storyline design pack

Design files for building the AI Literacy Level 1 course in Articulate Storyline 360.

- `prototype/ai-literacy-level-1-prototype.html` — clickable prototype (open in a browser). Includes designer notes, flags and Storyline build steps per screen.
- `source/storyboard.json` — the team lead's reviewed storyboard (all tracked changes accepted), extracted word for word.
- `source/storyboard-v1-original.json` — the first signed-off storyboard, kept for reference.
- `source/review-comments.txt` — the 35 review comments, with the slide each one is attached to.
- `source/design.js` — the design layer: layouts, interactions, Meera scenarios (new, needs approval) and flags.
- `source/app.js`, `source/app.css`, `source/build-prototype.js` — prototype source. Rebuild with `node source/build-prototype.js`.

- `prototype/ai-literacy-level-1-build-book.html` — one card per screen: reference picture, exact text, voiceover and quickest Storyline steps. Rebuild with `node source/build-book.js <screenshot folder>`.
- `AI-Literacy-L1-Design-Changes.docx` — every change to signed-off text and every piece of designer-added content, for sign-off. Rebuild with `node source/build-changes-doc.js`.
- `source/build-deck.py` — builds the Storyline import PowerPoint on the Resource Pro template: `node source/export-deck-data.js deck-data.json`, then `python3 source/build-deck.py PPt_template.pptx deck-data.json out.pptx`. The template is confidential, so it and the generated deck are not stored here.
- `source/render-icons.cjs` — renders the prototype's line icons and Meera to `assets/icons/` for the deck.
- `assets/` — quick-reference slide, slide 60 activity text, icons.
- `open-items.md` — sign-offs and decisions still open.
