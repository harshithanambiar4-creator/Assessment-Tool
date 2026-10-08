/* AI Literacy Level 1 — clickable prototype. Data: window.SB (signed-off storyboard), window.D (design layer). */
(function () {
  const SB = {}; window.SB.forEach(r => { SB[r.n] = r; });
  const { SECTIONS, CHARACTER, SCREENS, FLAGS } = window.D;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sb = n => SB[n] || { title: '', onscreen: '', vo: '', build: '' };

  // ---------- icons (same shapes ship in the asset pack) ----------
  const I = {
    warn: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3" stroke-linejoin="round"><path d="M24 6 44 41H4Z"/><path d="M24 19v11M24 35v1" stroke-linecap="round"/></svg>',
    balance: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v36M12 42h24M8 14h32"/><path d="M8 14 3 28h10ZM40 14l-5 14h10Z"/></svg>',
    agent: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="14" width="32" height="24" rx="6"/><path d="M24 6v8M18 26h.01M30 26h.01M4 24v6M44 24v6"/></svg>',
    idea: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 30a12 12 0 1 1 14 0v6H17Z"/><path d="M19 42h10"/></svg>',
    draft: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h20l8 8v28H10Z"/><path d="M16 22h16M16 29h16M16 36h9"/></svg>',
    doc: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h20l8 8v28H10Z"/><path d="M30 6v8h8M16 24h16M16 31h12"/></svg>',
    search: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3" stroke-linecap="round"><circle cx="21" cy="21" r="12"/><path d="m30 30 12 12"/></svg>',
    lock: c => `<svg viewBox="0 0 48 48" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="21" width="30" height="21" rx="4"/><path d="M15 21v-6a9 9 0 0 1 18 0v6M24 30v4"/></svg>`,
    open: '<svg viewBox="0 0 48 48" fill="none" stroke="#2f8a5b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="21" width="30" height="21" rx="4"/><path d="M15 21v-6a9 9 0 0 1 17-4"/><path d="m18 31 4 4 8-8"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7Z" fill="#172036"/></svg>',
    sys: '<svg viewBox="0 0 48 48" fill="none" stroke="#2a6f97" stroke-width="3"><rect x="8" y="8" width="32" height="32" rx="8"/><circle cx="24" cy="24" r="6"/></svg>',
  };
  const MEERA = `<svg viewBox="0 0 160 160" width="150" height="150" role="img" aria-label="Meera">
    <circle cx="80" cy="80" r="78" fill="#fbf0dc"/>
    <path d="M30 150c4-30 24-46 50-46s46 16 50 46Z" fill="#2a6f97"/>
    <path d="M66 100h28v14c-4 6-24 6-28 0Z" fill="#9c6b4a"/>
    <circle cx="80" cy="70" r="30" fill="#b07a55"/>
    <path d="M48 70c0-24 14-38 33-38s31 14 31 34c-10-2-22-10-28-20-6 12-20 22-36 24Z" fill="#1e1a22"/>
    <circle cx="104" cy="42" r="12" fill="#1e1a22"/>
    <circle cx="70" cy="74" r="2.6" fill="#1e1a22"/><circle cx="91" cy="74" r="2.6" fill="#1e1a22"/>
    <path d="M72 86c5 4 11 4 16 0" stroke="#5a3826" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="80.5" cy="60" r="2" fill="#c4523b"/>
  </svg>`;

  // ---------- parsing helpers for signed-off text ----------
  function parseQ(n) {
    const lines = sb(n).onscreen.split('\n').map(s => s.trim()).filter(Boolean);
    const opts = [], stem = [];
    lines.forEach(l => { const m = l.match(/^([A-D])\s{2,}(.*)$/); if (m) opts.push(m[2]); else stem.push(l); });
    return { stem, opts };
  }
  function parseFb(n) {
    const t = sb(n).onscreen;
    const c = (t.match(/CORRECT\n([\s\S]*?)(\n\nINCORRECT|$)/) || [])[1] || '';
    const w = (t.match(/INCORRECT\n([\s\S]*)$/) || [])[1] || '';
    const v = sb(n).vo;
    const vc = (v.match(/Correct feedback:\s*([\s\S]*?)(\n?Incorrect feedback:|$)/) || [])[1] || c;
    const vw = (v.match(/Incorrect feedback:\s*([\s\S]*)$/) || [])[1] || w;
    return { c: c.trim(), w: w.trim(), vc: vc.trim(), vw: vw.trim() };
  }
  function cardLines(n) { // "TERM\ndesc"
    const t = sb(n).onscreen.split('\n');
    return [t[0], t.slice(1).join(' ').trim()];
  }

  // ---------- state ----------
  const state = { i: 0, review: true, cc: true, narr: false, notes: true, added: true, gate: {}, quiz: {}, kcDone: {}, meera: {} };
  const qScreens = SCREENS.map((s, i) => s.layout === 'quiz' ? i : -1).filter(i => i >= 0);

  // ---------- chrome ----------
  function pathHTML(sec) {
    let h = '<div class="path" aria-hidden="true">';
    SECTIONS.forEach((s, k) => {
      const cls = sec == null ? (state.i > 3 ? 'done' : '') : k < sec ? 'done' : k === sec ? 'now' : '';
      h += `<span class="dot ${cls}">${k === sec ? `<span class="now-label">${esc(s.label)}</span>` : ''}</span>`;
      if (k < SECTIONS.length - 1) h += `<span class="seg ${sec != null && k < sec ? 'done' : (sec == null && state.i > 3 ? 'done' : '')}"></span>`;
    });
    return h + '</div>';
  }
  function badgeHTML(sec) {
    if (sec == null || !SECTIONS[sec].aware) return '';
    return `<div class="badge"><span>${esc(SECTIONS[sec].awareWord)}</span><b>${SECTIONS[sec].aware}</b></div>`;
  }
  const head = (n, eyebrow) => `<div class="eyebrow">${esc(eyebrow || sb(n).section)}</div><h2 class="h in">${esc(sb(n).title)}</h2>`;
  // entrance delay (stand-in for Storyline cue points); applied after render so it never clashes with inline styles
  const st = (i, base = 0.15, step = 0.35) => `data-d="${(base + i * step).toFixed(2)}"`;

  // ---------- layouts ----------
  const L = {};
  L.title = s => ({ dark: true, chrome: false, html: `
    <svg class="title-art" viewBox="0 0 560 560" aria-hidden="true">
      <circle cx="300" cy="280" r="220" fill="none" stroke="#2a6f97" stroke-width="2" stroke-dasharray="6 10"/>
      <circle cx="300" cy="280" r="150" fill="none" stroke="#2a6f97" stroke-width="2" stroke-dasharray="6 10"/>
      <circle cx="300" cy="280" r="80" fill="#d9952b"/>
      <circle cx="520" cy="280" r="10" fill="#7fb6d8"/><circle cx="150" cy="170" r="10" fill="#7fb6d8"/><circle cx="300" cy="430" r="10" fill="#7fb6d8"/>
    </svg>
    <div class="content title-slide" style="justify-content:center">
      <div class="level in">${esc(sb(1).onscreen.split('\n')[0].toUpperCase())}</div>
      <h2 class="big in" ${st(1, .1, .2)}>AI<br><span>LITERACY</span></h2>
      <div class="tag in" ${st(2, .1, .3)}>${esc(sb(1).onscreen.split('\n')[1]).replace('Use It Responsibly.', '<b>Use It Responsibly.</b>')}</div>
    </div>` });

  L.outcomes = s => ({ html: `<div class="content">${head(2, 'Before we begin')}
    <p class="lead in" style="margin-bottom:18px">${esc(s.intro)}</p>
    <div>${s.items.map((t, k) => `<div class="outcome in" ${st(k, .5, .6)}><span class="num">${k + 1}</span><span>${esc(t)}</span></div>`).join('')}</div></div>` });

  L.journey = s => ({ html: `<div class="content">${head(3, 'Your route')}
    <div class="jpath">${s.steps.map((t, k) => `<div class="jstop in" ${st(k, .3, .25)}><div class="n">${k + 1}</div><div class="t">${esc(t)}</div></div>`).join('')}</div></div>` });

  L.aware = s => ({ dark: true, html: `<div class="content"><div class="eyebrow">Your mental model</div><h2 class="h in" style="color:#fff">${esc(sb(4).title)}</h2>
    <div class="aware">${s.letters.map(([l, w], k) => `<div class="aw" ${st(k, .4, .5)}><div class="L">${l}</div><div class="w" style="color:#e6ebf3">${esc(w)}</div></div>`).join('')}</div></div>` });

  L.opener = (s, idx) => {
    const n = s.n[0];
    const done = state.meera[idx] != null;
    return { dark: true, gate: done, html: `<div class="content opener">
      <div class="secno in">${String(s.sectionNo).padStart(2, '0')}</div>
      <h2 class="h in" ${st(1, .1, .2)}>${esc(sb(n).title)}</h2>
      <ul>${s.lines.map((t, k) => `<li class="in" ${st(k, .5, .4)}>${esc(t)}</li>`).join('')}</ul>
      ${s.meera ? `<button class="navbtn next meera-cta in" ${st(0, 1.6)} data-act="meera">${done ? 'Revisit' : 'Meet'} ${CHARACTER.name}'s moment</button>` : ''}
    </div>${s.meera && state.layer === 'meera' ? meeraLayer(s, idx) : ''}`, after: el => {
      if (s.meera && !done && state.layer !== 'meera' && !state.autoMeera[idx]) { state.autoMeera[idx] = true; setTimeout(() => { if (state.i === idx) { state.layer = 'meera'; render(); speak(s.meera.vo); } }, 2600); }
    } };
  };
  function meeraLayer(s, idx) {
    const m = s.meera, pick = state.meera[idx];
    return `<div class="layer"><span class="added-tag" style="left:24px;top:64px">NEW · NEEDS APPROVAL</span><div class="panel">
      <div class="meera-fig">${MEERA}<div class="nm">${CHARACTER.name}</div><div class="rl">${CHARACTER.role}</div></div>
      <div><p class="sit">${esc(m.situation)}</p><p class="q">${esc(m.question)}</p>
        <div class="choices">${m.options.map((o, k) => `<button class="choice ${pick === k ? 'sel' : ''}" data-act="mpick" data-k="${k}">${esc(o.label)}</button>`).join('')}</div>
        ${pick != null ? `<div class="reply">${esc(m.options[pick].reply)}</div><button class="navbtn next" style="margin-top:16px" data-act="mclose">Continue</button>` : ''}
      </div></div></div>`;
  }

  L.defineCards = s => ({ html: `<div class="content">${head(6)}
    <div class="define">${s.caps.map((c, k) => `<div class="capc in" ${st(k, .8, .5)}>${esc(c)}</div>`).join('')}
      <div class="core in"><span class="term">AI</span>${esc(s.definition)}</div></div></div>` });

  L.umbrella = s => ({ html: `<div class="content">${head(7)}
    <div class="umb-top" style="animation-delay:1.6s">AI</div>
    <div class="umb">${Array.from({ length: s.tiles }, (_, k) => `<div class="tile in" ${st(k, .2, .15)}>${I.sys}</div>`).join('')}</div>
    <p class="lead in" ${st(0, 2)} style="margin-top:22px"><b>${esc(s.statement)}</b> ${esc(s.sub)}</p></div>` });

  L.radial = s => {
    const pos = [[18, 25], [82, 25], [10, 78], [90, 78], [50, 96]];
    return { html: `<div class="content">${head(8)}<p class="lead in">${esc(s.definition)}</p>
      <div class="radial"><div class="hub">Gen<br>AI</div>${s.types.map((t, k) => `<span class="chip" style="left:${pos[k][0]}%;top:${pos[k][1]}%;animation-delay:${.6 + k * .3}s">${t}</span>`).join('')}</div></div>` };
  };

  L.flow = s => ({ html: `<div class="content">${head(9)}<p class="lead in">${esc(s.text)}</p>
    <div class="flow">
      <div class="node data in" ${st(0, .4)}><div class="dots">${'<i></i>'.repeat(24)}</div>${esc(s.nodes[0])}</div>
      <div class="arrow" style="animation-delay:.9s"></div>
      <div class="node model in" ${st(0, 1.2)}>${esc(s.nodes[1])}</div>
      <div class="arrow" style="animation-delay:1.7s"></div>
      <div class="node resp in" ${st(0, 2)}><div class="lines-skel"><i></i><i></i><i style="width:60%"></i></div>${esc(s.nodes[2])}</div>
    </div></div>` });

  L.reveal = (s, idx) => {
    const open = state.gate[idx] || [];
    const all = open.length === s.cards.length;
    return { gate: all, html: `<div class="content">${head(s.n[0])}
      <div class="reveal-row" style="grid-template-columns:repeat(${s.cards.length},1fr)">${s.cards.map(([t, d], k) => {
        const o = open.includes(k);
        return `<button class="rcard in ${o ? 'open' : ''}" ${st(k, .3, .2)} data-act="rev" data-k="${k}" aria-expanded="${o}">
          ${s.icons ? I[s.icons[k]] : ''}<span class="term">${esc(t)}</span>${o ? `<span class="def">${esc(d)}</span>` : '<span class="hint">Select to reveal</span>'}</button>`;
      }).join('')}</div>
      <div class="instr">${esc(s.instruction)} <span class="added-tag" style="position:static">NEW</span></div></div>` };
  };

  L.beforeAfter = s => ({ html: `<div class="content">${head(15)}<div class="ba">
    <div><div class="vis"><div class="page blank in"><i></i></div><span class="arr">→</span><div class="page ai in" ${st(0, .9)}><i></i><i></i><i></i><i style="width:70%"></i><i></i><i style="width:50%"></i></div></div>
      <div class="card ai in" ${st(0, 1)}><span class="term">${esc(s.cards[0][0])}</span><p>${esc(s.cards[0][1])}</p></div></div>
    <div><div class="vis"><div class="page in" ${st(0, 1.6)}><i></i><i></i><i></i><i></i><i></i></div><span class="arr">→</span><div class="page ai in" ${st(0, 2)}><i style="width:40%"></i><i></i><i style="width:40%"></i><i></i><i style="width:40%"></i></div></div>
      <div class="card ai in" ${st(0, 2.2)}><span class="term">${esc(s.cards[1][0])}</span><p>${esc(s.cards[1][1])}</p></div></div></div></div>` });

  L.condense = s => ({ html: `<div class="content">${head(16)}
    <div class="condense-vis"><div class="page long in">${'<i></i>'.repeat(14)}</div><span class="arr">→</span>
      <div class="page ai short in" ${st(0, .9)}><i></i><i></i><i style="width:60%"></i></div><span class="arr in" ${st(0, 1.4)}>→</span>
      <div class="page ai list in" ${st(0, 1.6)}><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    <div class="ba">${s.cards.map(([t, d], k) => `<div class="card ai in" ${st(k, .8, .9)}><span class="term">${esc(t)}</span><p>${esc(d)}</p></div>`).join('')}</div></div>` });

  L.pattern = s => {
    const pts = [[60, 60], [90, 110], [130, 70], [210, 220], [250, 260], [190, 270], [330, 90], [370, 130], [350, 60], [80, 260], [300, 250], [150, 150]];
    const grp = [0, 0, 0, 1, 1, 1, 2, 2, 2, 1, 1, 0];
    const cen = [[110, 90], [250, 240], [360, 100]];
    return { html: `<div class="content">${head(17)}<div class="pattern">
      <svg viewBox="0 0 440 330" aria-hidden="true">${cen.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="62" fill="#e3eef5" stroke="#2a6f97" stroke-width="2" stroke-dasharray="5 6" class="in" style="animation-delay:1.4s"/>`).join('')}
        ${pts.map(([x, y], k) => { const [cx, cy] = cen[grp[k]]; const tx = cx + ((k * 37) % 50) - 25, ty = cy + ((k * 23) % 50) - 25; return `<circle r="9" fill="#2a6f97" cx="${tx}" cy="${ty}"><animate attributeName="cx" from="${x}" to="${tx}" dur="1.2s" begin="0.2s" fill="freeze"/><animate attributeName="cy" from="${y}" to="${ty}" dur="1.2s" begin="0.2s" fill="freeze"/></circle>`; }).join('')}
      </svg>
      <div class="card ai in" ${st(0, 1.6)}><span class="term" style="font-size:20px">${esc(s.card[0])}</span><p style="font-size:26px">${esc(s.card[1])}</p></div></div></div>` };
  };

  L.limits = s => ({ html: `<div class="content">${head(18)}<div class="limits"><p class="lead">${esc(s.intro)}</p>
    <ul>${s.items.map((t, k) => `<li class="in" ${st(k, .5, .5)}><span class="x">✕</span>${esc(t)}</li>`).join('')}</ul></div></div>` });

  L.notEqual = s => ({ html: `<div class="content">${head(19)}<div class="neq">
    <div class="side l in">${esc(s.left)}</div><div class="sym">≠</div><div class="side r in" ${st(0, .5)}>${esc(s.right)}</div></div></div>` });

  function optsHTML(q, sel, locked) {
    return `<div class="opts">${q.opts.map((o, k) => `<button class="opt ${sel === k ? 'sel' : ''}" data-act="opt" data-k="${k}" ${locked ? 'disabled' : ''} aria-pressed="${sel === k}"><span class="k">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}
      <button class="navbtn next submit" data-act="submit" ${sel == null || locked ? 'disabled' : ''}>Submit</button></div>`;
  }
  L.kc = (s, idx) => {
    const q = parseQ(s.n[0]), fb = parseFb(s.n[1]);
    const k = state.kc[idx] || {};
    const res = k.result;
    return { gate: !!state.kcDone[idx], html: `<div class="content"><div class="kc">
      <div><div class="kc-tag">Knowledge check · not scored</div><p class="stem">${q.stem.map(esc).join('<br><br>')}</p><p class="sub">Select one answer.</p></div>
      ${optsHTML(q, k.sel, !!res)}</div></div>
      ${res ? `<div class="fb"><div class="box ${res === 'ok' ? '' : 'bad'}"><p class="ttl">${res === 'ok' ? 'Correct' : 'Not quite'}</p><p>${esc(res === 'ok' ? fb.c : fb.w)}</p>
        ${res === 'ok' ? '<button class="navbtn next" data-act="next">Continue</button>' : '<button class="navbtn next" data-act="retry">Try again</button>'}</div></div>` : ''}`,
      onSubmit: () => { const ok = k.sel === s.correct; k.result = ok ? 'ok' : 'bad'; state.kc[idx] = k; if (ok) state.kcDone[idx] = true; render(); speak(ok ? fb.vc : fb.vw); } };
  };

  L.quiz = (s, idx) => {
    const q = parseQ(s.n[0]), fb = parseFb(s.n[1]);
    const a = state.quiz[idx] || {};
    const res = a.result;
    const label = sb(s.n[0]).title.split('—')[1] || '';
    return { gate: !!res, html: `<div class="content">
      <div class="qhead"><span class="kc-tag" style="margin:0">Question ${s.qNo} of 8 · ${esc(label.trim())}</span><span class="qprog">${qScreens.map((qi, k) => `<i class="${k + 1 === s.qNo ? 'cur' : state.quiz[qi] && state.quiz[qi].result ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="kc"><div><p class="stem">${q.stem.map(esc).join('<br><br>')}</p><p class="sub">Read the scenario and select the response that best reflects the principles from this course.</p></div>
      ${optsHTML(q, a.sel, !!res)}</div></div>
      ${res && state.layer !== 'closed' ? `<div class="fb"><div class="box ${res === 'ok' ? '' : 'bad'}"><p class="ttl">${res === 'ok' ? 'Correct' : 'Incorrect'}</p><p>${esc(res === 'ok' ? fb.c.replace(/^Correct\.\s*/, '') : fb.w)}</p><button class="navbtn next" data-act="next">Continue</button></div></div>` : ''}`,
      onSubmit: () => { a.result = a.sel === s.correct ? 'ok' : 'bad'; state.quiz[idx] = a; render(); speak(a.result === 'ok' ? fb.vc : fb.vw); } };
  };

  L.twoCol = s => ({ html: `<div class="content">${head(25)}<div class="twocol">
    <div class="card ai in" ${st(0, .4)}><span class="term">${esc(s.left[0])}</span><p>${esc(s.left[1])}</p></div>
    <div class="card human in" ${st(0, 1.4)}><span class="term">${esc(s.right[0])}</span><p>${esc(s.right[1])}</p></div></div></div>` });

  L.handoff = s => ({ html: `<div class="content">${head(26)}<div class="lanes2">
    <div class="lane ai"><span class="who">AI</span><div class="verbs">${s.ai.map((v, k) => `<span class="verb" ${st(k, .3, .3)}>${esc(v)}</span>`).join('')}</div></div>
    <div class="handarrow in" ${st(0, 1.4)}>↓ output handed to a person ↓</div>
    <div class="lane hu"><span class="who">HUMAN</span><div class="verbs">${s.human.map((v, k) => `<span class="verb" ${st(k, 1.8, .35)}>${esc(v)}</span>`).join('')}</div></div></div></div>` });

  L.pair = s => ({ html: `<div class="content">${head(s.n[0])}<div class="twocol">${s.cards.map(([t, d], k) =>
    `<div class="card ai in" ${st(k, .4, 1)}>${I[s.icons[k]].replace('<svg', '<svg width="48" height="48"')}<span class="term" style="margin-top:14px;font-size:20px">${esc(t)}</span><p style="font-size:26px">${esc(d)}</p></div>`).join('')}</div></div>` });

  L.steps = s => ({ html: `<div class="content">${head(30)}<div class="steps" style="grid-template-columns:1fr 60px 1fr 60px 1fr">
    ${s.steps.map(([t, d], k) => `${k ? `<div class="conn in" ${st(k, .2, .8)}>→</div>` : ''}<div class="step" ${st(k, .4, .8)}><span class="no">STEP ${k + 1}</span><span class="term">${esc(t)}</span><p>${esc(d)}</p></div>`).join('')}</div></div>` });

  L.warning = s => ({ html: `<div class="content">${head(31)}<div class="row" style="align-items:center;gap:60px;margin-top:10px">
    <div class="warncard in"><div class="lines-skel"><i></i><i></i><i style="width:85%"></i><i></i><i style="width:60%"></i><i></i><i style="width:75%"></i></div><span class="mark">≠</span></div>
    <div><p class="lead in" ${st(0, .6)} style="font-size:30px;font-weight:600">${esc(s.text)}</p><p class="lead in" ${st(0, 1.4)} style="margin-top:20px;color:#c4523b;font-weight:600">${esc(s.sub)}</p></div></div></div>` });

  L.balance = s => ({ html: `<div class="content">${head(32)}<div class="row" style="align-items:center;gap:40px">
    <div class="in" style="width:200px;flex:none">${I.balance.replace('<svg', '<svg width="200" height="200"')}</div>
    <div class="twocol" style="flex:1;margin:0">${s.cards.map(([t, d], k) => `<div class="card ${k ? 'human' : 'ai'} in" ${st(k, .5, .9)}><span class="term">${esc(t)}</span><p>${esc(d)}</p></div>`).join('')}</div></div></div>` });

  L.checks3 = s => ({ html: `<div class="content">${head(33)}<p class="lead in">${esc(s.intro)}</p>
    <div class="steps" style="grid-template-columns:repeat(3,1fr);gap:20px">${s.checks.map((c, k) => `<div class="step" ${st(k, .6, .6)} style="text-align:center;padding:40px 20px"><div style="width:64px;height:64px;border-radius:50%;background:#2f8a5b;color:#fff;display:grid;place-items:center;margin:0 auto 18px;font:800 30px var(--f-body)">✓</div><span class="term" style="font-size:24px">${c}</span></div>`).join('')}</div></div>` });

  L.gate = s => ({ html: `<div class="content">${head(34)}<div class="row" style="align-items:center;gap:50px">
    <svg viewBox="0 0 420 260" width="420" height="260" aria-hidden="true">
      <path d="M10 70h250" stroke="#2a6f97" stroke-width="4" stroke-dasharray="10 8"/><text x="10" y="50" font-family="IBM Plex Mono" font-weight="700" font-size="16" fill="#2a6f97">AI</text>
      <rect x="262" y="40" width="16" height="60" rx="3" fill="#c4523b"/>
      <path d="M10 190h400" stroke="#d9952b" stroke-width="6"/><text x="10" y="172" font-family="IBM Plex Mono" font-weight="700" font-size="16" fill="#9a6514">HUMAN</text>
      <path d="M396 178l14 12-14 12" fill="none" stroke="#d9952b" stroke-width="6"/>
    </svg>
    <div><p class="lead in" style="font-size:30px;font-weight:600">${esc(s.text)}</p><p class="lead in" ${st(0, 1)} style="margin-top:16px">${esc(s.sub)}</p></div></div></div>` });

  L.statement = s => ({ dark: true, html: `<div class="content" style="justify-content:center"><div class="eyebrow">${esc(sb(35).title)}</div>
    <p class="statement"><span class="a in">${esc(s.lines[0])}</span><span class="h2 in" ${st(0, 1.2)}>${esc(s.lines[1])}</span></p></div>` });

  L.checklist = (s, idx) => {
    const on = state.gate[idx] || [];
    return { gate: on.length === s.items.length, html: `<div class="content">${head(39)}<div class="check-list">${s.items.map((t, k) =>
      `<button class="chk in ${on.includes(k) ? 'on' : ''}" ${st(k, .3, .3)} data-act="rev" data-k="${k}" aria-pressed="${on.includes(k)}"><span class="box">✓</span><span><span class="n">0${k + 1}</span>${esc(t)}</span></button>`).join('')}</div>
      <div class="instr">${esc(s.instruction)} <span class="added-tag" style="position:static">NEW</span></div></div>` };
  };

  L.categories = s => ({ html: `<div class="content">${head(40)}<div class="cats">${s.items.map((t, k) => `<div class="cat" ${st(k, .4, .35)}>${I.lock('#d9952b')}${t}</div>`).join('')}</div></div>` });

  L.threeGate = s => ({ html: `<div class="content">${head(41)}<div class="gate3">${s.parts.map((p, k) => `${k ? '<div class="plus">+</div>' : ''}<div class="gpart" ${st(k, .4, .8)}>${I.open}${esc(p)}</div>`).join('')}</div></div>` });

  L.stages = s => ({ html: `<div class="content">${head(42)}<div class="stages">${s.stages.map((t, k) => `${k ? `<div class="ln" style="animation-delay:${(k * .8).toFixed(1)}s"></div>` : ''}<div class="stg" ${st(k, .3, .8)}><div class="lock">${I.lock('#d9952b')}</div><div class="t">${esc(t)}</div></div>`).join('')}</div>
    <p class="lead in" ${st(0, 2.6)} style="margin-top:44px;text-align:center;max-width:none;font-weight:600">${esc(s.sub)}</p></div>` });

  L.promptPart = s => {
    const n = s.n[0], [t, d] = cardLines(n);
    return { html: `<div class="content">${head(n, `Prompt element ${s.part + 1} of 5`)}
      <div class="pp-card"><span class="term">${esc(t)}</span><p>${esc(d)}</p></div>
      <div class="builder-label">Your prompt so far</div>
      <div class="builder" style="margin-top:0">${s.parts.map((p, k) => `<div class="slot ${k <= s.part ? 'on' : ''} ${k === s.part ? 'now' : ''}">${p}</div>`).join('')}</div></div>` };
  };

  L.assemble = s => ({ html: `<div class="content">${head(51)}
    <div class="assembled">${s.parts.map((p, k) => `<span ${st(k, .3, .35)}>${p}</span>`).join('')}</div>
    <p class="lead in" ${st(0, 2.3)} style="margin-top:44px;text-align:center;max-width:none;font:700 34px var(--f-display)">${esc(s.sub)}</p></div>` });

  L.compare = (s, idx) => {
    let clear = esc(s.clear);
    s.highlights.forEach(([w, lab]) => { clear = clear.replace(esc(w), `<span class="hl">${esc(w)}<small>${esc(lab)}</small></span>`); });
    const show = !!state.gate[idx];
    return { gate: show, html: `<div class="content">${head(52)}<div class="cmp ${show ? 'show' : ''}">
      <div class="card vague in"><span class="term" style="color:#5b6577">VAGUE</span><p>${esc(s.vague)}</p></div>
      <div class="card ai clear in" ${st(0, .8)}><span class="term">CLEARER</span><p>${show ? clear : esc(s.clear)}</p></div></div>
      <button class="navbtn toggle" data-act="hl" ${show ? 'disabled' : ''}>${show ? 'Details highlighted' : 'Show what was added'}</button></div>` };
  };

  L.agentModel = s => ({ html: `<div class="content">${head(56)}<p class="lead in">${esc(s.text)}</p>
    <div class="agent"><div class="inputs">${s.inputs.map((t, k) => `<div class="inp" ${st(k, .5, .5)}>${esc(t)}</div>`).join('')}</div>
      <div class="funnel"><svg viewBox="0 0 120 260" aria-hidden="true"><path d="M0 40 C60 40 60 130 110 130 M0 130 H110 M0 220 C60 220 60 130 110 130" fill="none" stroke="#2a6f97" stroke-width="3" class="in" style="animation-delay:1.8s"/><path d="M104 122l12 8-12 8" fill="#2a6f97"/></svg></div>
      <div class="task in" ${st(0, 2.1)}>A defined task</div></div></div>` });

  L.lanes = s => ({ html: `<div class="content">${head(57)}<div class="lanes">
    <div class="lanerow"><span class="who">CHATBOT</span><div class="seq"><span class="pill">You ask</span>→<span class="pill solid" style="animation-delay:.6s">AI responds</span></div><span class="cap">${esc(s.chatbot)}</span></div>
    <div class="lanerow"><span class="who">AGENT</span><div class="seq"><span class="pill" style="animation-delay:1.2s">You define a task</span>→${['Step 1', 'Step 2', 'Step 3'].map((p, k) => `<span class="pill solid" style="animation-delay:${1.6 + k * .4}s">${p}</span>`).join('→')}</div><span class="cap">${esc(s.agent)}</span></div></div></div>` });

  L.atlasVideo = s => ({ html: `<div class="content">${head(58)}
    <div class="proc">${s.process.map(p => `<span>${p}</span>`).join('<b>→</b>')}</div>
    <div class="video"><div><div class="play">${I.play}</div>Your Atlas screen recording goes here<small>${esc(s.note)}</small><small>Callouts point to real Atlas labels only.</small></div></div></div>` });

  L.atlasSteps = s => ({ html: `<div class="content">${head(59)}<div class="stepcards">${s.steps.map((t, k) =>
    `<div class="step" ${st(k, .3, .5)}><span class="no">STEP ${k + 1}</span><p style="font:700 26px/1.2 var(--f-display)">${esc(t)}</p><span class="vid">▶ Screen recording ${k + 1}</span></div>`).join('')}</div></div>` });

  L.tryIt = (s, idx) => {
    const g = state.gate[idx] || { seen: [], cur: null, sub: null };
    state.gate[idx] = g;
    const panes = [
      `<h3>Talent meeting summary</h3><p>We will create an agent that turns meeting notes into a completed meeting summary using the approved Talent meeting-summary template.</p><p><b>The rule:</b> the agent must use only the information in the meeting notes. If an owner, deadline, decision, minority view, or other detail is not provided, it must not invent one.</p>`,
      `<h3>${esc(s.notesTitle)}</h3><ul>${s.notes.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="src" style="color:#5b6577;font-size:14px;margin-top:12px">Names are fictional.</p>`,
      `<h3>Right prompt for Atlas</h3><div class="mono-box" id="prompt-box">${esc(s.prompt)}</div><button class="minibtn" data-act="copy">Copy prompt</button>`,
      `<h3>Expected output check</h3><p>${esc(s.check)}</p><p><b>Example action items</b></p><ol>${s.actions.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
       <p style="margin-top:14px"><b>Before you accept the output, ask:</b></p><ol>${s.review.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`,
    ];
    return { gate: g.seen.length === 4, html: `<div class="content">${head(60, 'Hands-on · Guided Atlas activity')}
      <div class="tryit"><div class="tabs">${s.tabs.map(([t, d], k) => `<button class="tab ${g.cur === k ? 'cur' : ''} ${g.seen.includes(k) ? 'seen' : ''}" data-act="tab" data-k="${k}"><span class="term">${t}</span><span>${esc(d)}</span></button>`).join('')}
        <p style="font-size:14px;color:#5b6577;margin:6px 2px">Open all four tabs, then try it in Atlas.</p></div>
      <div class="tpane">${g.cur == null ? '<h3>Select a tab to begin</h3><p>Each tab shows one part of the activity: the scenario, the sample notes, the prompt to use in Atlas, and how to check the output.</p>' : panes[g.cur]}</div></div></div>` };
  };

  L.assessIntro = s => ({ dark: true, html: `<div class="content opener" style="justify-content:center">
    <div class="eyebrow">${esc(sb(63).title)}</div><h2 class="h in" style="font-size:72px">${esc(s.lines[0])}</h2>
    <p class="lead in" ${st(0, .6)}>${esc(s.lines[1])}</p>
    <div class="chips in" ${st(0, 1.2)}>${s.info.map(t => `<span>${esc(t)}</span>`).join('')}<span class="added-tag" style="position:static;align-self:center">NEW</span></div></div>` });

  L.results = (s, idx) => {
    const answered = qScreens.filter(i => state.quiz[i] && state.quiz[i].result);
    const right = qScreens.filter(i => state.quiz[i] && state.quiz[i].result === 'ok').length;
    const pct = Math.round(right / 8 * 100), pass = pct >= 80;
    return { gate: pass || state.review, html: `<span class="added-tag" style="right:24px;top:70px">NEW · NEEDS APPROVAL</span><div class="content">
      <div class="eyebrow">Assessment result</div>
      ${answered.length < 8 ? `<h2 class="h">Answer all 8 questions to see your result</h2><p class="lead">You have answered ${answered.length} of 8.</p>` : `
      <div class="row" style="align-items:center;gap:60px;margin-top:20px"><div class="score ${pass ? 'pass' : 'fail'}">${pct}%</div>
      <div><h2 class="h" style="margin-bottom:12px">${esc(pass ? s.pass.title : s.fail.title)}</h2><p class="lead">${esc(pass ? s.pass.text : s.fail.text)}</p>
      <p class="lead" style="font-size:18px;margin-top:10px;color:#5b6577">${right} of 8 correct · pass mark 80%</p>
      ${pass ? '<button class="navbtn next" style="margin-top:22px" data-act="next">Continue</button>' : '<button class="navbtn next" style="margin-top:22px" data-act="retake">Retry assessment</button>'}</div></div>`}</div>` };
  };

  L.awareClose = s => ({ dark: true, html: `<div class="content"><div class="eyebrow">${esc(sb(80).title)}</div>
    <div class="aware" style="margin-top:10px">${s.letters.map(([l, w], k) => `<div class="aw" ${st(k, .3, .45)}><div class="L">${l}</div><div class="w" style="color:#e6ebf3">${esc(w)}</div></div>`).join('')}</div>
    <p class="statement in" ${st(0, 2.8)} style="font-size:56px;margin-top:44px"><span class="a" style="display:inline">AI can assist.</span> <span class="h2" style="display:inline">Humans remain accountable.</span></p></div>` });

  L.levels = s => ({ html: `<div class="content">${head(81, 'Close')}<div class="levels">${s.levels.map(([a, b, c], k) =>
    `<div class="lvl" ${st(k, .3, .45)}><span class="term">${a}</span><span class="nm">${esc(b)}</span><p>${esc(c)}</p>${k === 0 ? '<span class="done-tag">Complete</span>' : ''}</div>`).join('')}</div></div>` });

  // ---------- narration + captions ----------
  let ccTimer = null, voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const pickVoice = () => voices.find(v => v.lang === 'en-IN') || voices.find(v => /India/i.test(v.name)) || voices.find(v => /^en/.test(v.lang));
  function speak(text) {
    clearTimeout(ccTimer);
    try { speechSynthesis.cancel(); } catch (e) { /* no speech */ }
    const cc = $('#cc');
    const sents = String(text || '').replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+["”]?|\S[^.!?]*$/g) || [];
    if (!sents.length) { if (cc) cc.hidden = true; return; }
    let k = 0;
    const show = t => { const c = $('#cc'); if (c) { c.textContent = t.trim(); c.hidden = !state.cc; } };
    if (state.narr && 'speechSynthesis' in window) {
      const v = pickVoice();
      sents.forEach(t => {
        const u = new SpeechSynthesisUtterance(t.trim()); if (v) u.voice = v; u.lang = v ? v.lang : 'en-IN'; u.rate = 0.98;
        u.onstart = () => show(t);
        speechSynthesis.speak(u);
      });
    } else {
      const step = () => { if (k >= sents.length) { const c = $('#cc'); if (c) c.hidden = true; return; } show(sents[k]); ccTimer = setTimeout(step, Math.max(1800, sents[k].split(' ').length * 380)); k++; };
      step();
    }
  }
  function screenVO(s) {
    if (s.layout === 'results') return '';
    return s.n.length ? sb(s.n[0]).vo : '';
  }

  // ---------- notes drawer ----------
  function notesHTML(s, idx) {
    const ns = s.n;
    const flags = FLAGS.filter(f => f.slides.some(x => ns.includes(x) || (x === 'results' && s.layout === 'results')));
    const original = ns.length ? ns.map(n => `<b>${n}</b> ${esc(sb(n).title)}`).join('<br>') : '<b>New slide</b> (not in storyboard)';
    const vo = ns.length ? sb(ns[0]).vo : '';
    const added = [];
    if (s.meera) added.push(`<b>${CHARACTER.name}'s moment</b> (layer). Voiceover: “${esc(s.meera.vo)}”`);
    if (s.instructionAdded) added.push(`Instruction line: “${esc(s.instruction)}”`);
    if (s.infoAdded) added.push(`Info chips: ${s.info.map(esc).join(' · ')}`);
    if (s.added) added.push('The whole slide is new: Storyline needs a results slide to pass the 80% score to your LMS.');
    if (s.renamed) added.push(esc(s.renamed));
    return `<h2>Screen ${idx + 1} of ${SCREENS.length}</h2><p class="src">Storyboard slide${ns.length > 1 ? 's' : ''}:<br>${original}</p>
      ${added.length ? `<h3>Added — needs your approval</h3>${added.map(a => `<div class="new">${a}</div>`).join('')}` : ''}
      ${flags.length ? `<h3>Flag for your decision</h3>${flags.map(f => `<div class="flag"><b>${esc(f.text)}</b>Suggestion: ${esc(f.fix)}</div>`).join('')}` : ''}
      <h3>How to build it in Storyline</h3><p>${esc(s.storyline || '')}</p>
      ${ns.length ? `<h3>Storyboard build note</h3><p class="src">${esc(sb(ns[0]).build.split('\n\n')[0])}</p>` : ''}
      ${vo ? `<h3>Voiceover (signed off)</h3><p class="vo">${esc(vo)}</p>` : ''}`;
  }

  // ---------- render ----------
  state.kc = {}; state.autoMeera = {}; state.layer = null;
  let cur = null;
  function render() {
    const s = SCREENS[state.i];
    const out = L[s.layout](s, state.i);
    cur = out;
    const stage = $('#stage');
    stage.className = 'stage' + (out.dark ? ' dark' : '') + (state.shown === state.i ? ' static' : '');
    state.shown = state.i;
    const canNext = state.review || out.gate === undefined || out.gate;
    stage.innerHTML = `${out.chrome === false ? '' : pathHTML(s.section) + badgeHTML(s.section)}${out.html}
      <div class="footer"><span class="brand">AI Literacy · Level 1</span><span>${state.i + 1} / ${SCREENS.length}</span><span class="sp"></span>
        <button class="iconbtn" data-act="cc" aria-pressed="${state.cc}" title="Closed captions">CC</button>
        <button class="navbtn" data-act="prev" ${state.i === 0 ? 'disabled' : ''}>Previous</button>
        <button class="navbtn next" data-act="next" ${!canNext || state.i === SCREENS.length - 1 ? 'disabled' : ''}>Next</button></div>`;
    stage.querySelectorAll('[data-d]').forEach(el => { el.style.animationDelay = el.dataset.d + 's'; });
    $('#notes').innerHTML = notesHTML(s, state.i);
    $('#jump').value = state.i;
    document.body.classList.toggle('hide-added', !state.added);
    out.after && out.after($('#stage'));
  }
  function go(i) {
    state.i = Math.max(0, Math.min(SCREENS.length - 1, i)); state.layer = null; state.shown = null;
    render(); speak(screenVO(SCREENS[state.i]));
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const s = SCREENS[state.i], act = b.dataset.act, k = +b.dataset.k;
    if (act === 'next') { const nx = state.i + 1; go(nx); }
    else if (act === 'prev') go(state.i - 1);
    else if (act === 'cc') { state.cc = !state.cc; render(); }
    else if (act === 'meera') { state.layer = 'meera'; render(); speak(s.meera.vo); }
    else if (act === 'mpick') { state.meera[state.i] = k; render(); speak(s.meera.options[k].reply); }
    else if (act === 'mclose') { state.layer = null; render(); }
    else if (act === 'rev') { const g = state.gate[state.i] || []; if (!g.includes(k)) g.push(k); state.gate[state.i] = g; render(); }
    else if (act === 'hl') { state.gate[state.i] = true; render(); }
    else if (act === 'tab') { const g = state.gate[state.i]; g.cur = k; if (!g.seen.includes(k)) g.seen.push(k); render(); }
    else if (act === 'copy') { const t = s.prompt; navigator.clipboard && navigator.clipboard.writeText(t).then(() => { b.textContent = 'Copied'; }).catch(() => { const r = document.createRange(); r.selectNodeContents($('#prompt-box')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = 'Selected: press Ctrl+C'; }); }
    else if (act === 'opt') { const store = s.layout === 'quiz' ? state.quiz : state.kc; const a = store[state.i] || {}; a.sel = k; store[state.i] = a; render(); }
    else if (act === 'submit') cur.onSubmit();
    else if (act === 'retry') { state.kc[state.i] = {}; render(); }
    else if (act === 'retake') { qScreens.forEach(i => delete state.quiz[i]); go(qScreens[0]); }
  });
  document.addEventListener('keydown', e => {
    if (e.target.closest('select')) return;
    if (e.key === 'ArrowRight' && !$('[data-act="next"]').disabled) go(state.i + 1);
    if (e.key === 'ArrowLeft' && state.i > 0) go(state.i - 1);
  });

  // ---------- toolbar ----------
  const jump = $('#jump');
  jump.innerHTML = SCREENS.map((s, i) => `<option value="${i}">${i + 1}. ${esc(s.n.length ? sb(s.n[0]).title : 'Assessment results (new)')}${s.n.length > 1 ? ' + feedback' : ''}</option>`).join('');
  jump.addEventListener('change', () => go(+jump.value));
  const tog = (id, key, fn) => { const b = $(id); b.setAttribute('aria-pressed', state[key]); b.addEventListener('click', () => { state[key] = !state[key]; b.setAttribute('aria-pressed', state[key]); fn && fn(); render(); }); };
  tog('#t-review', 'review', () => { jump.disabled = !state.review; });
  tog('#t-notes', 'notes', () => $('.main').classList.toggle('no-notes', !state.notes));
  tog('#t-added', 'added');
  tog('#t-narr', 'narr', () => { if (state.narr) speak(screenVO(SCREENS[state.i])); else { try { speechSynthesis.cancel(); } catch (e) { /* none */ } } });

  // scale stage to its wrapper
  const wrap = $('.stage-wrap');
  const fit = () => { $('#stage').style.transform = `scale(${wrap.clientWidth / 1280})`; };
  new ResizeObserver(fit).observe(wrap); fit();

  const start = Math.max(0, SCREENS.findIndex((s, i) => location.hash === '#s' + (i + 1)));
  go(start);
})();
