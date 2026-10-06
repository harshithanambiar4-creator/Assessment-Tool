// Turning a participant's answer into downloadable files: Word (.docx), PDF, a print view, and a ZIP of
// a whole batch. Everything runs in the browser; the libraries are only loaded when someone downloads.
//
// Two versions of each file:
//   "participant" — name, batch, submission time and word count at the top, then the answer.
//   "coach"       — the same, plus the prompt, a flags summary, and the paste/copy log on its own page.
import DOMPurify from "dompurify";
import { FONTS } from "./fonts";

// ---------- Small helpers ----------
const pad = (n) => String(n).padStart(2, "0");

// "Ann Lee - 2026-10-06 14.32" (Windows doesn't allow ":" in file names, so the time uses a dot).
export function fileBaseName(record) {
  const d = new Date(record.submittedAt || Date.now());
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
  return `${record.name} - ${stamp}`.replace(/[\\/:*?"<>|]+/g, "-").trim();
}
export function formatWhen(ms) {
  if (!ms) return "Not submitted";
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}
const formatTime = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const ATTEMPT_LABELS = {
  paste: "Paste attempt", shortcut: "Paste attempt", drop: "Drag-and-drop attempt", "paste-keyboard": "Paste attempt (keyboard app)",
  "copy-answer": "Copy attempt — from their answer", "cut-answer": "Cut attempt — from their answer", "copy-prompt": "Copy attempt — from the prompt",
};
// Paste and copy attempts in time order, with readable labels.
export function attemptList(record) {
  return [...(record.pasteLog || []), ...(record.copyLog || [])]
    .map((a) => ({ ...a, label: ATTEMPT_LABELS[a.kind] || "Attempt" }))
    .sort((a, b) => a.t - b.t);
}
function attemptTextNote(a) {
  if (a.note) return a.note;
  if (a.text === undefined) return "(text not recorded — this attempt was made before text recording was added)";
  if (a.text === "") return "(no text)";
  return a.truncated ? `(showing the first 5,000 of ${a.length.toLocaleString()} characters)` : null;
}

// ---------- Reading the answer's formatting ----------
// The writing area produces simple HTML (bold, italics, underline, colours, fonts, sizes, alignment, lists).
// This turns it into a list of paragraphs made of styled text runs, which both Word and PDF builders use.
const SIZE_PT = { 1: 8, 2: 9, 3: 11, 4: 13, 5: 16, 6: 20, 7: 28 }; // <font size="n"> → points
const BASE_PT = 11;

function cssColorToHex(c) {
  if (!c) return null;
  c = c.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.slice(1).toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return c.slice(1).split("").map((x) => x + x).join("").toUpperCase();
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return m ? [m[1], m[2], m[3]].map((n) => pad(Number(n).toString(16))).join("").toUpperCase() : null;
}
const firstFamily = (face) => (face || "").split(",")[0].replace(/['"]/g, "").trim() || null;

export function htmlToBlocks(html) {
  const clean = DOMPurify.sanitize(html || "");
  const root = new DOMParser().parseFromString(`<div>${clean}</div>`, "text/html").body.firstChild;
  const blocks = [];
  let cur = null;
  let listCounter = 0;
  const open = (props) => { cur = { align: "left", list: null, listId: null, runs: [], ...props }; blocks.push(cur); };

  const walk = (node, style, blockProps) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.data.replace(/ /g, " ").replace(/[\r\n]+/g, " ");
      if (!text || (!cur && !text.trim())) return; // ignore stray whitespace between paragraphs/list items
      if (!cur) open(blockProps);
      cur.runs.push({ text, ...style });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      if (!cur || cur.runs.length) open(blockProps); else cur.blank = true;
      return;
    }
    // Inline styling carried down to the text inside.
    const s = { ...style };
    if (tag === "b" || tag === "strong") s.bold = true;
    if (tag === "i" || tag === "em") s.italics = true;
    if (tag === "u") s.underline = true;
    if (tag === "s" || tag === "strike") s.strike = true;
    if (tag === "font") {
      if (node.getAttribute("face")) s.font = firstFamily(node.getAttribute("face"));
      if (node.getAttribute("size")) s.size = SIZE_PT[node.getAttribute("size")] || s.size;
      if (node.getAttribute("color")) s.color = cssColorToHex(node.getAttribute("color")) || s.color;
    }
    const st = node.style || {};
    if (st.fontWeight === "bold" || Number(st.fontWeight) >= 600) s.bold = true;
    if (st.fontStyle === "italic") s.italics = true;
    if ((st.textDecoration || st.textDecorationLine || "").includes("underline")) s.underline = true;
    if (st.color) s.color = cssColorToHex(st.color) || s.color;
    if (st.fontFamily) s.font = firstFamily(st.fontFamily);
    if (st.fontSize && st.fontSize.endsWith("px")) s.size = Math.round(parseFloat(st.fontSize) * 0.75);

    const isList = tag === "ul" || tag === "ol";
    const isBlock = isList || ["div", "p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(tag);
    if (isBlock) {
      const props = { ...blockProps };
      const align = st.textAlign || node.getAttribute("align");
      if (align) props.align = align === "justify" ? "justify" : align;
      if (isList) { props.list = tag; props.listId = ++listCounter; }
      cur = null;
      if (!isList) open(props);
      node.childNodes.forEach((c) => walk(c, s, props));
      cur = null;
      return;
    }
    node.childNodes.forEach((c) => walk(c, s, blockProps));
  };
  root.childNodes.forEach((c) => walk(c, {}, { align: "left", list: null, listId: null }));
  // Drop trailing blank lines.
  const out = blocks.filter((b) => b.runs.length || b.blank); // empty wrappers (e.g. a <div> around a list) aren't lines
  while (out.length && !out[out.length - 1].runs.some((r) => r.text.trim())) out.pop();
  return out;
}

// ---------- Flags summary ----------
// `flags` comes from computeFlags() in App.jsx.
export function flagLines(flags, record) {
  const lines = [];
  if (flags.pasteAttempts) lines.push(`Paste attempt ×${flags.pasteAttempts} — tried to paste or drag text in (blocked).`);
  if (flags.copyAttempts) lines.push(`Copy attempt ×${flags.copyAttempts} — tried to copy text out of the prompt or their answer (blocked).`);
  if (flags.nonStop) lines.push(`Non-stop ${flags.nonStop.min} min — typed without a pause of more than a few seconds (${flags.nonStop.words} words).`);
  if (flags.pauseBurst) lines.push(`Idle → burst — ${flags.pauseBurst.idleMin} min idle, then ${flags.pauseBurst.words} words appeared.`);
  if (flags.tabSwitches) lines.push(`Left window ×${flags.tabSwitches} — ${flags.tabAwayMin} min away in total.`);
  if (flags.lowRevision) lines.push("Few corrections — very few backspaces for the length written.");
  if (flags.deviceSwitches) lines.push(`New device ×${flags.deviceSwitches} — this name was opened on another device or browser.`);
  if (record.reopenCount) lines.push(`Reopened by the coach ×${record.reopenCount}.`);
  return lines.length ? lines : ["No flags."];
}

// ---------- Word (.docx) ----------
export async function buildDocx(record, variant) {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, BorderStyle, ShadingType } = d;
  const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };
  const children = [];
  const p = (opts) => children.push(new Paragraph(opts));
  const heading = (text, extra = {}) => p({ children: [new TextRun({ text, bold: true, size: 26, color: "1C2E4A" })], spacing: { before: 240, after: 120 }, ...extra });
  const plainLines = (text, runOpts = {}) => String(text || "").split("\n").map((line, i) => new TextRun({ text: line, break: i ? 1 : 0, ...runOpts }));

  // Header block
  p({ children: [new TextRun({ text: record.name, bold: true, size: 36, color: "1C2E4A" })], spacing: { after: 80 } });
  for (const [label, value] of [["Batch", record.batchLabel], ["Submitted", formatWhen(record.submittedAt)], ["Word count", String(record.wordCount)]]) {
    p({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)], spacing: { after: 40 } });
  }
  p({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 4 } }, spacing: { after: 200 } });

  if (variant === "coach") {
    heading("Prompt", { spacing: { before: 0, after: 120 } });
    p({ children: plainLines(record.prompt), spacing: { after: 200 } });
    heading("Response");
  }

  // The answer, with its formatting
  let olInstance = 0, lastListId = null;
  for (const b of htmlToBlocks(record.contentHtml)) {
    const runs = b.runs.map((r) => new TextRun({
      text: r.text, bold: r.bold, italics: r.italics, strike: r.strike,
      underline: r.underline ? {} : undefined, color: r.color || undefined,
      font: r.font || undefined, size: r.size ? r.size * 2 : undefined,
    }));
    const opts = { children: runs, alignment: ALIGN[b.align] || AlignmentType.LEFT, spacing: { after: 120, line: 276 } };
    if (b.list === "ul") opts.bullet = { level: 0 };
    if (b.list === "ol") {
      if (b.listId !== lastListId) olInstance++;
      opts.numbering = { reference: "numbers", level: 0, instance: olInstance };
    }
    lastListId = b.listId;
    p(opts);
  }

  if (variant === "coach") {
    heading("Flags summary");
    p({ children: [new TextRun({ text: "Flags are signals worth a follow-up conversation, not proof of anything.", italics: true, color: "6B7280", size: 20 })], spacing: { after: 120 } });
    for (const line of record.flagLines) p({ children: [new TextRun(line)], bullet: { level: 0 } });

    heading("Paste and copy attempts", { pageBreakBefore: true });
    const attempts = attemptList(record);
    if (!attempts.length) p({ children: [new TextRun("None.")] });
    for (const a of attempts) {
      p({ children: [new TextRun({ text: `${formatTime(a.t)} — ${a.label}`, bold: true })], spacing: { before: 160, after: 60 } });
      const note = attemptTextNote(a);
      if (a.text) {
        p({ children: plainLines(a.text, { size: 20 }), shading: { type: ShadingType.CLEAR, fill: "F3F4F6" },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: "B91C1C", space: 6 } }, spacing: { after: 60 } });
      }
      if (note) p({ children: [new TextRun({ text: note, italics: true, color: "6B7280", size: 18 })] });
    }
  }

  const doc = new Document({
    creator: "Live Assessment Writer",
    title: fileBaseName(record),
    styles: { default: { document: { run: { font: "Calibri", size: BASE_PT * 2 } } } },
    numbering: { config: [{ reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
  return Packer.toBlob(doc);
}

// ---------- PDF ----------
// PDFs can only wrap lines at spaces, so give very long unbroken text (like a pasted link) invisible break points.
const wrapLong = (t) => String(t || "").replace(/(\S{40})(?=\S)/g, "$1\u200B");

// PDFs carry their own fonts, so each font in the answer is drawn with one of four free look-alikes:
// Arimo (Arial/Helvetica), Tinos (Times New Roman and other serif fonts), Cousine (Courier and other
// typewriter fonts) and Carlito (Calibri and every other font). They live in public/pdf-fonts.
const PDF_FAMILIES = ["Carlito", "Arimo", "Tinos", "Cousine"];
function pdfFamilyFor(fontName) {
  if (!fontName) return "Carlito";
  const f = FONTS.find((x) => x.name.toLowerCase() === fontName.toLowerCase());
  if (/^(arial|helvetica|arimo)/i.test(fontName)) return "Arimo";
  if (f && f.generic === "monospace") return "Cousine";
  if (f && f.generic === "serif") return "Tinos";
  if (/times|tinos|serif/i.test(fontName) && !/sans/i.test(fontName)) return "Tinos";
  return "Carlito";
}

// Exact sizes of the font files in public/pdf-fonts, so a damaged or half-finished download is caught.
const FONT_FILE_SIZES = {
  "Arimo-Bold.ttf": 318844, "Arimo-BoldItalic.ttf": 342368, "Arimo-Italic.ttf": 340984, "Arimo-Regular.ttf": 318320,
  "Carlito-Bold.ttf": 648128, "Carlito-BoldItalic.ttf": 745192, "Carlito-Italic.ttf": 580792, "Carlito-Regular.ttf": 593908,
  "Cousine-Bold.ttf": 290500, "Cousine-BoldItalic.ttf": 300160, "Cousine-Italic.ttf": 298680, "Cousine-Regular.ttf": 289556,
  "Tinos-Bold.ttf": 583484, "Tinos-BoldItalic.ttf": 563688, "Tinos-Italic.ttf": 549824, "Tinos-Regular.ttf": 508752,
};
const STYLES = [["normal", "Regular"], ["bold", "Bold"], ["italics", "Italic"], ["bolditalics", "BoldItalic"]];
// If one style of a font won't work, use the closest one that does.
const STYLE_FALLBACKS = { normal: ["bold", "italics"], bold: ["normal"], italics: ["normal", "bolditalics"], bolditalics: ["bold", "italics", "normal"] };
// Problems found while preparing the PDF fonts (shown in the error message if a PDF still can't be made).
export const pdfFontIssues = [];

let pdfMakePromise = null;
function loadPdfMake() {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const { default: pdfMake } = await import("pdfmake/build/pdfmake");
      pdfFontIssues.length = 0;
      const toB64 = (buf) => {
        const bytes = new Uint8Array(buf); let s = "";
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s);
      };
      // Download one font file and check it's complete and really a font; try once more if not.
      const fetchFont = async (file) => {
        let problem = "";
        for (const cache of ["default", "reload"]) {
          try {
            const res = await fetch(`/pdf-fonts/${file}`, { cache });
            if (!res.ok) { problem = `HTTP ${res.status}`; continue; }
            const buf = await res.arrayBuffer();
            const head = new Uint8Array(buf.slice(0, 4));
            const isFont = (head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0) || String.fromCharCode(...head) === "true";
            if (!isFont) { problem = `not a font file (starts with "${String.fromCharCode(...head).replace(/[^\x20-\x7e]/g, "?")}")`; continue; }
            if (buf.byteLength !== FONT_FILE_SIZES[file]) { problem = `incomplete (${buf.byteLength} of ${FONT_FILE_SIZES[file]} bytes)`; continue; }
            return buf;
          } catch (err) { problem = err.message || String(err); }
        }
        pdfFontIssues.push(`${file}: ${problem}`);
        return null;
      };

      const vfs = {};
      await Promise.all(PDF_FAMILIES.flatMap((fam) => STYLES.map(async ([, v]) => {
        const buf = await fetchFont(`${fam}-${v}.ttf`);
        if (buf) vfs[`${fam}-${v}.ttf`] = toB64(buf);
      })));
      pdfMake.addVirtualFileSystem(vfs);

      // Try each downloaded font on its own with a tiny test PDF, so one bad file can't break every PDF.
      const works = {};
      for (const fam of PDF_FAMILIES) {
        works[fam] = {};
        for (const [style, v] of STYLES) {
          const file = `${fam}-${v}.ttf`;
          if (!vfs[file]) continue;
          pdfMake.setFonts({ T: { normal: file, bold: file, italics: file, bolditalics: file } });
          try {
            await pdfMake.createPdf({ content: [{ text: "Aa Bb 0123456789 ×—·•’ éü" }], defaultStyle: { font: "T" } }).getBlob();
            works[fam][style] = file;
          } catch (err) { pdfFontIssues.push(`${file}: can't be used (${err.message || err})`); }
        }
      }
      const fonts = {};
      for (const fam of PDF_FAMILIES) {
        const w = works[fam];
        const pick = (style) => w[style] || STYLE_FALLBACKS[style].map((s) => w[s]).find(Boolean);
        if (STYLES.some(([style]) => pick(style))) fonts[fam] = Object.fromEntries(STYLES.map(([style]) => [style, pick(style) || Object.values(w)[0]]));
      }
      // A family with no working files borrows another family's fonts.
      const spare = fonts.Carlito || fonts.Arimo || fonts.Tinos || fonts.Cousine;
      if (!spare) throw new Error("none of the PDF fonts could be loaded");
      for (const fam of PDF_FAMILIES) if (!fonts[fam]) fonts[fam] = spare;
      pdfMake.setFonts(fonts);
      if (pdfFontIssues.length) console.warn("PDF font problems (worked around):", pdfFontIssues);
      return pdfMake;
    })();
    pdfMakePromise.catch(() => { pdfMakePromise = null; });
  }
  return pdfMakePromise;
}

// Wraps buildPdfInner so any failure explains itself and points to the print option.
export async function buildPdf(record, variant) {
  try { return await buildPdfInner(record, variant); }
  catch (err) {
    console.error("PDF creation failed", err, pdfFontIssues);
    const extra = pdfFontIssues.length ? ` Font problems: ${pdfFontIssues.join("; ")}.` : "";
    throw new Error(`${err.message || err}.${extra} You can use "Print / save as PDF" instead.`);
  }
}

async function buildPdfInner(record, variant) {
  const pdfMake = await loadPdfMake();
  const content = [];
  const NAVY = "#1C2E4A", MUTED = "#6B7280";
  const heading = (text, extra = {}) => content.push({ text, bold: true, fontSize: 13, color: NAVY, margin: [0, 14, 0, 6], ...extra });

  content.push({ text: record.name, bold: true, fontSize: 18, color: NAVY, margin: [0, 0, 0, 6] });
  for (const [label, value] of [["Batch", record.batchLabel], ["Submitted", formatWhen(record.submittedAt)], ["Word count", String(record.wordCount)]]) {
    content.push({ text: [{ text: `${label}: `, bold: true }, value], margin: [0, 0, 0, 2] });
  }
  content.push({ canvas: [{ type: "line", x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 0.75, lineColor: "#BBBBBB" }], margin: [0, 4, 0, 12] });

  if (variant === "coach") {
    heading("Prompt", { margin: [0, 0, 0, 6] });
    content.push({ text: record.prompt || "", margin: [0, 0, 0, 6] });
    heading("Response");
  }

  // The answer: consecutive list items are grouped into one list.
  const runToPdf = (r) => ({
    text: wrapLong(r.text), bold: !!r.bold, italics: !!r.italics, color: r.color ? `#${r.color}` : undefined,
    decoration: r.underline ? "underline" : r.strike ? "lineThrough" : undefined,
    font: pdfFamilyFor(r.font), fontSize: r.size || undefined,
  });
  const blocks = htmlToBlocks(record.contentHtml);
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.list) {
      const items = [];
      while (i < blocks.length && blocks[i].listId === b.listId) {
        items.push({ text: blocks[i].runs.map(runToPdf), alignment: blocks[i].align, margin: [0, 0, 0, 3] });
        i++;
      }
      i--;
      content.push({ [b.list]: items, margin: [0, 0, 0, 6] });
    } else {
      content.push({ text: b.runs.length ? b.runs.map(runToPdf) : " ", alignment: b.align, margin: [0, 0, 0, 6] });
    }
  }

  if (variant === "coach") {
    heading("Flags summary");
    content.push({ text: "Flags are signals worth a follow-up conversation, not proof of anything.", italics: true, color: MUTED, fontSize: 9, margin: [0, 0, 0, 6] });
    content.push({ ul: record.flagLines });

    heading("Paste and copy attempts", { pageBreak: "before", margin: [0, 0, 0, 8] });
    const attempts = attemptList(record);
    if (!attempts.length) content.push({ text: "None." });
    for (const a of attempts) {
      content.push({ text: `${formatTime(a.t)} — ${a.label}`, bold: true, margin: [0, 10, 0, 4] });
      if (a.text) {
        content.push({
          table: { widths: ["*"], body: [[{ text: wrapLong(a.text), fontSize: 9.5 }]] },
          layout: { fillColor: "#F3F4F6", hLineWidth: () => 0, vLineWidth: (i) => (i === 0 ? 2 : 0), vLineColor: "#B91C1C", paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 5, paddingBottom: () => 5 },
          margin: [0, 0, 0, 3],
        });
      }
      const note = attemptTextNote(a);
      if (note) content.push({ text: note, italics: true, color: MUTED, fontSize: 8.5 });
    }
  }

  const doc = pdfMake.createPdf({
    info: { title: fileBaseName(record), creator: "Live Assessment Writer" },
    pageSize: "A4", pageMargins: [40, 40, 40, 48],
    defaultStyle: { font: "Carlito", fontSize: BASE_PT, lineHeight: 1.2 },
    footer: (page, pages) => ({ text: `${record.name} · page ${page} of ${pages}`, alignment: "center", fontSize: 8, color: MUTED, margin: [0, 16, 0, 0] }),
    content,
  });
  return doc.getBlob();
}

// ---------- Print view (exact on-screen look; "Save as PDF" from the print window) ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function openPrintView(record, variant) {
  const w = window.open("", "_blank");
  if (!w) { alert("Your browser blocked the print window. Allow pop-ups for this site and try again."); return; }
  const header = `<h1>${esc(record.name)}</h1>
    <p><b>Batch:</b> ${esc(record.batchLabel)}<br><b>Submitted:</b> ${esc(formatWhen(record.submittedAt))}<br><b>Word count:</b> ${record.wordCount}</p><hr>`;
  let body = header;
  if (variant === "coach") body += `<h2>Prompt</h2><p class="pre">${esc(record.prompt)}</p><h2>Response</h2>`;
  body += `<div class="answer">${DOMPurify.sanitize(record.contentHtml || "")}</div>`;
  if (variant === "coach") {
    body += `<h2>Flags summary</h2><p class="muted">Flags are signals worth a follow-up conversation, not proof of anything.</p><ul>${record.flagLines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
    const attempts = attemptList(record);
    body += `<h2 class="newpage">Paste and copy attempts</h2>` + (attempts.length ? attempts.map((a) => {
      const note = attemptTextNote(a);
      return `<p class="att"><b>${esc(formatTime(a.t))} — ${esc(a.label)}</b></p>${a.text ? `<div class="quote">${esc(a.text)}</div>` : ""}${note ? `<p class="muted">${esc(note)}</p>` : ""}`;
    }).join("") : "<p>None.</p>");
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(fileBaseName(record))}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Arimo:ital,wght@0,400;0,700;1,400;1,700&family=Carlito:ital,wght@0,400;0,700;1,400;1,700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&family=Cousine&family=EB+Garamond&family=Gelasio&family=Caladea&family=Comic+Neue&display=swap">
    <style>
      body { font-family: Aptos, Calibri, Carlito, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #1F2937; max-width: 720px; margin: 24px auto; padding: 0 16px; }
      h1 { font-size: 18pt; color: #1C2E4A; margin: 0 0 6px; } h2 { font-size: 13pt; color: #1C2E4A; margin: 18px 0 6px; }
      hr { border: 0; border-top: 1px solid #BBB; margin: 12px 0 16px; } .pre, .quote { white-space: pre-wrap; }
      .answer div, .answer p { margin: 0 0 8px; } .muted { color: #6B7280; font-size: 9pt; font-style: italic; }
      .quote { background: #F3F4F6; border-left: 3px solid #B91C1C; padding: 6px 10px; font-size: 10pt; } .att { margin: 12px 0 4px; }
      .newpage { break-before: page; }
      @media print { body { margin: 0; } }
    </style></head><body>${body}</body></html>`);
  w.document.close();
  const go = () => { w.focus(); w.print(); };
  if (w.document.fonts && w.document.fonts.ready) w.document.fonts.ready.then(() => setTimeout(go, 300)); else setTimeout(go, 800);
}

// ---------- One participant: Word or PDF ----------
// nameSuffix lets the coach's download of a clean copy be told apart, e.g. "Ann Lee - … (participant copy).docx".
export async function downloadRecord(record, variant, format, nameSuffix = "") {
  const base = fileBaseName(record) + nameSuffix;
  const blob = format === "docx" ? await buildDocx(record, variant) : await buildPdf(record, variant);
  downloadBlob(blob, `${base}.${format}`);
}

// ---------- A whole batch as one ZIP of coach copies ----------
export async function downloadBatchZip(records, zipName, onProgress) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set();
  const pdfFailures = [];
  let done = 0;
  for (const r of records) {
    let base = fileBaseName(r), n = 2;
    while (used.has(base)) base = `${fileBaseName(r)} (${n++})`;
    used.add(base);
    zip.file(`${base}.docx`, await buildDocx(r, "coach"));
    try { zip.file(`${base}.pdf`, await buildPdf(r, "coach")); }
    catch (err) { pdfFailures.push(`${base}: ${err.message || err}`); }
    done++;
    if (onProgress) onProgress(done, records.length);
  }
  // If some PDFs couldn't be made, the Word files are still there, plus a note saying which PDFs are missing.
  if (pdfFailures.length) zip.file("PDFs that could not be created.txt", pdfFailures.join("\r\n\r\n"));
  downloadBlob(await zip.generateAsync({ type: "blob" }), `${zipName.replace(/[\\/:*?"<>|]+/g, "-")}.zip`);
  return pdfFailures.length;
}
