import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldOff, Lock, Clock, Users, LogIn, PlusCircle, ArrowLeft,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Loader2, CheckCircle2, History, Copy, AlertTriangle,
  Send, ChevronRight, Info, Square
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabaseClient";

// ---------- Design tokens (ReSource Pro palette, consistent with the earlier 1:1 version) ----------
const C = {
  bg: "#F5F6F8", panel: "#FFFFFF", navy: "#1C2E4A", navySoft: "#EDF1F6",
  teal: "#1E7F8C", tealSoft: "#E5F2F3", green: "#3F8B5C", greenSoft: "#E7F3EC",
  amber: "#B45309", amberSoft: "#FDF3E7", red: "#B91C1C", redSoft: "#FBEAEA",
  border: "#E2E5EA", text: "#1F2937", muted: "#6B7280", mutedLight: "#9CA3AF",
};
const FONT = "'Segoe UI', ui-sans-serif, system-ui, -apple-system, Roboto, sans-serif";

const TARGET_MINUTES = 30;      // soft guide shown to coach and participants — not an auto cutoff
const SYNC_INTERVAL_MS = 4000;  // batched save, not per-keystroke — matters once ~20 people are typing at once
const ACTIVITY_LOG_GAP_MS = 60000;
const PAUSE_MIN_IDLE_MIN = 2;   // idle stretch long enough to be worth flagging
const PAUSE_MIN_BURST_WORDS = 25;
const LOW_REVISION_MIN_WORDS = 40;
const LOW_REVISION_RATE = 0.02;
// "Writing without stopping": a typing streak counts as unbroken while every gap between keys is
// shorter than STREAK_BREAK_SEC. Flag when one streak runs longer than NONSTOP_FLAG_MIN minutes.
const STREAK_BREAK_SEC = 5;
const NONSTOP_FLAG_MIN = 4;
const PASTE_FLAG_MIN_ATTEMPTS = 1; // flag on the first blocked paste/drop attempt

const ASSESSMENT_LABELS = { baseline: "Baseline Assessment", mid: "Mid Assessment", final: "Final Assessment" };
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function makeCode() {
  let c = "";
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}
function slugify(name, taken) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "participant";
  let slug = base, n = 2;
  while (taken.has(slug)) { slug = `${base}-${n}`; n++; }
  taken.add(slug);
  return slug;
}
function fmtMinSec(ms) {
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------- Storage (Supabase table "kv": one row per key, value stored as JSON) ----------
// Like getShared, but throws when the database can't be reached instead of pretending the key is empty.
async function getSharedStrict(key) {
  const { data, error } = await supabase.from("kv").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return data ? data.value : null;
}
async function getShared(key) {
  try { return await getSharedStrict(key); }
  catch (err) { console.error("getShared", key, err.message); return null; }
}
// Turns a database error into a message a coach can act on.
function dbErrorMessage(err) {
  const msg = (err && err.message) || String(err);
  if (/failed to fetch|networkerror|load failed|invalid url|missing/i.test(msg))
    return `Can't reach the database. The Supabase address or key on Render is probably wrong or missing. (${msg})`;
  if (/permission denied|row-level security|42501/i.test(msg))
    return `The database refused to save. The table permissions need fixing in Supabase. (${msg})`;
  if (/invalid api key|jwt|apikey|no api key/i.test(msg))
    return `The Supabase key on Render isn't accepted. Check VITE_SUPABASE_ANON_KEY. (${msg})`;
  if (/relation .* does not exist|could not find the table/i.test(msg))
    return `The "kv" table wasn't found. Run supabase/schema.sql in Supabase's SQL Editor. (${msg})`;
  return `Database error: ${msg}`;
}
async function setShared(key, value) {
  const { error } = await supabase.from("kv").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) { console.error("setShared", key, error.message); throw error; }
}
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const batchKey = (code) => `batch:${code}`;
const participantKey = (code, slug) => `batch:${code}:p:${slug}`;
async function listBatches() { return (await getShared("batches-index")) || []; }
async function addBatchToIndex(entry) {
  const idx = await listBatches();
  await setShared("batches-index", [entry, ...idx.filter((b) => b.code !== entry.code)]);
}
async function patchBatchIndex(code, patch) {
  const idx = await listBatches();
  await setShared("batches-index", idx.map((b) => (b.code === code ? { ...b, ...patch } : b)));
}

// ---------- Flag computation (shared by dashboard tiles and the detail view) ----------
function computeFlags(p) {
  const log = p.activityLog || [];
  let pauseBurst = null;
  for (let i = 1; i < log.length; i++) {
    const idleMin = (log[i].t - log[i - 1].t) / 60000;
    const dWords = log[i].words - log[i - 1].words;
    if (idleMin >= PAUSE_MIN_IDLE_MIN && dWords >= PAUSE_MIN_BURST_WORDS) {
      pauseBurst = { idleMin: Math.round(idleMin), words: dWords };
      break;
    }
  }
  const focus = p.focusLog || [];
  let awayMs = 0, switches = 0;
  for (let i = 0; i < focus.length; i++) {
    if (focus[i].type === "blur") {
      switches++;
      const next = focus[i + 1];
      if (next && next.type === "focus") awayMs += next.t - focus[i].t;
    }
  }
  const rate = p.keyCount > 20 ? (p.backspaceCount || 0) / p.keyCount : null;
  return {
    pauseBurst,
    tabSwitches: switches,
    tabAwayMin: Math.round((awayMs / 60000) * 10) / 10,
    lowRevision: rate !== null && (p.wordCount || 0) >= LOW_REVISION_MIN_WORDS && rate < LOW_REVISION_RATE,
    deviceSwitches: p.deviceSwitches || 0,
    pasteAttempts: (p.pasteAttempts || 0) >= PASTE_FLAG_MIN_ATTEMPTS ? p.pasteAttempts : 0,
    copyAttempts: p.copyAttempts || 0,
    nonStop: (p.longestStreakMs || 0) >= NONSTOP_FLAG_MIN * 60000
      ? { min: Math.round((p.longestStreakMs / 60000) * 10) / 10, words: p.longestStreakWords || 0 } : null,
  };
}

// The link's hash alone decides which surface renders — a plain link opens straight to
// joining, nothing coach-related is ever reachable from it. Add #coach to the same link
// to reach the coach side (still behind the passphrase). Works with zero server involvement:
// the hash never leaves the browser, so this needs no hosting change at all — it's read
// client-side whether this is pasted into an artifact preview or opened from a shared link.
const isCoachLink = typeof window !== "undefined" && window.location.hash.replace(/^#/, "").toLowerCase() === "coach";

export default function App() {
  const [role, setRole] = useState(isCoachLink ? "coach-home" : "participant-join");
  const [coachMode, setCoachMode] = useState(isCoachLink);
  const [activeCode, setActiveCode] = useState(null);
  const [coachUnlocked, setCoachUnlocked] = useState(false); // verified once per session (and remembered on this device via localStorage)

  // ---- Participant surface (the plain link) — join and write only, nothing else exists here ----
  // Fallback way into the coach side that doesn't depend on the address bar: typing the word COACH
  // where the batch code goes. It only opens the passphrase gate — nothing is visible without it.
  if (!coachMode) {
    if (role === "participant-write") return <ParticipantWrite code={activeCode} onLeave={() => setRole("participant-join")} />;
    return <ParticipantJoin
      onJoined={(c) => { setActiveCode(c); setRole("participant-write"); }}
      onCoachKeyword={() => { setRole("coach-home"); setCoachMode(true); }} />;
  }

  // ---- Coach surface — only reached via the #coach link or the COACH keyword, and always behind the passphrase ----
  if (!coachUnlocked) {
    return <CoachGate
      onUnlocked={() => setCoachUnlocked(true)}
      onBack={isCoachLink ? null : () => { setCoachMode(false); setRole("participant-join"); }} />;
  }
  if (role === "coach-new")
    return <CoachNewBatch onCreated={(c) => { setActiveCode(c); setRole("coach-dashboard"); }} onBack={() => setRole("coach-home")} />;
  if (role === "coach-history")
    return <CoachHistory onOpen={(c) => { setActiveCode(c); setRole("coach-dashboard"); }} onBack={() => setRole("coach-home")} />;
  if (role === "coach-dashboard")
    return <CoachDashboard code={activeCode} onBack={() => setRole("coach-home")} />;
  return <CoachHome onPick={setRole} />;
}

// ---------- Coach passphrase gate — a light door lock, not real authentication.
// It keeps casual participants out of coach screens; it can't stop someone determined
// who inspects their own browser's storage, same limit as everything else in this tool.
function CoachGate({ onUnlocked, onBack }) {
  const [phase, setPhase] = useState("loading"); // loading | set | enter
  const [remoteHash, setRemoteHash] = useState(null);
  const [value, setValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      let h;
      try { h = await getSharedStrict("coach-passphrase-hash"); }
      catch (err) { setError(dbErrorMessage(err)); setPhase("broken"); return; }
      setRemoteHash(h);
      if (!h) { setPhase("set"); return; }
      let local = null;
      try { local = window.localStorage.getItem("law-coach-unlock"); } catch { /* ignore */ }
      if (local && local === h) { onUnlocked(); return; }
      setPhase("enter");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitSet = async () => {
    if (!value.trim()) return;
    if (value !== confirmValue) { setError("Those two don't match."); return; }
    setBusy(true); setError(null);
    const h = await sha256(value.trim());
    try { await setShared("coach-passphrase-hash", h); }
    catch (err) { setError(dbErrorMessage(err)); setBusy(false); return; }
    try { window.localStorage.setItem("law-coach-unlock", h); } catch { /* ignore */ }
    setBusy(false);
    onUnlocked();
  };

  const submitEnter = async () => {
    if (!value.trim()) return;
    setBusy(true); setError(null);
    const h = await sha256(value.trim());
    if (h === remoteHash) {
      try { window.localStorage.setItem("law-coach-unlock", h); } catch { /* ignore */ }
      onUnlocked();
    } else {
      setError("That passphrase doesn't match.");
    }
    setBusy(false);
  };

  if (phase === "loading") return <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}><Loader2 className="animate-spin" size={22} style={{ color: C.teal }} /></div>;
  if (phase === "broken") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: FONT }}>
        <div className="w-full max-w-md rounded-xl p-7" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-lg font-semibold mb-2" style={{ color: C.red }}>Can't connect to the database</div>
          <div className="text-sm break-words" style={{ color: C.text }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="w-full max-w-sm">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>
        )}
        <div className="rounded-xl p-7" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          {phase === "set" ? (
            <>
              <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Set a coach passphrase</div>
              <div className="text-sm mb-5" style={{ color: C.muted }}>No one's set one yet. Anyone who knows it can create batches and open live dashboards — share it only with other coaches, never in the group chat.</div>
              <input type="password" value={value} onChange={(e) => setValue(e.target.value)} className="w-full text-sm rounded-md px-3 py-2.5 outline-none mb-3" style={{ border: `1px solid ${C.border}` }} placeholder="New passphrase" />
              <input type="password" value={confirmValue} onChange={(e) => setConfirmValue(e.target.value)} className="w-full text-sm rounded-md px-3 py-2.5 outline-none mb-3" style={{ border: `1px solid ${C.border}` }} placeholder="Confirm passphrase" />
              {error && <div className="text-xs mb-3 break-words" style={{ color: C.red }}>{error}</div>}
              <button onClick={submitSet} disabled={busy || !value.trim()} className="w-full text-sm font-semibold rounded-md py-2.5" style={{ background: C.navy, color: "#fff", opacity: (busy || !value.trim()) ? 0.5 : 1 }}>
                {busy ? "Setting…" : "Set passphrase & continue"}
              </button>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Coach passphrase</div>
              <div className="text-sm mb-5" style={{ color: C.muted }}>This area is for coaches only.</div>
              <input type="password" value={value} onChange={(e) => setValue(e.target.value)} className="w-full text-sm rounded-md px-3 py-2.5 outline-none mb-3" style={{ border: `1px solid ${C.border}` }} placeholder="Passphrase" autoFocus />
              {error && <div className="text-xs mb-3" style={{ color: C.amber }}>{error}</div>}
              <button onClick={submitEnter} disabled={busy || !value.trim()} className="w-full text-sm font-semibold rounded-md py-2.5" style={{ background: C.navy, color: "#fff", opacity: (busy || !value.trim()) ? 0.5 : 1 }}>
                {busy ? "Checking…" : "Continue"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Coach home (menu shown after the #coach link + passphrase) ----------
function CoachHome({ onPick }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4" style={{ background: C.navySoft, color: C.navy }}>
            <ShieldOff size={14} />
            <span className="text-xs font-semibold">No-paste writing surface</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: C.navy }}>Live Assessment Writer</h1>
          <p className="text-sm mt-2" style={{ color: C.muted }}>Coach tools — set up a batch, or look back at one already run.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => onPick("coach-new")} className="rounded-xl p-6 text-left" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <Users size={22} style={{ color: C.teal }} />
            <div className="text-base font-semibold mt-3" style={{ color: C.navy }}>New batch</div>
            <div className="text-xs mt-1" style={{ color: C.muted }}>Set a prompt and roster, get a code for the group</div>
          </button>
          <button onClick={() => onPick("coach-history")} className="rounded-xl p-6 text-left" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <History size={22} style={{ color: C.green }} />
            <div className="text-base font-semibold mt-3" style={{ color: C.navy }}>Past batches</div>
            <div className="text-xs mt-1" style={{ color: C.muted }}>Open a live dashboard or review a finished one</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Coach: create a batch ----------
function parseRosterLine(line) {
  const parts = line.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2 && /^\d{3,8}$/.test(parts[1])) return { name: parts[0], pin: parts[1] };
  return { name: line.trim(), pin: null };
}
function genPin() { return String(Math.floor(1000 + Math.random() * 9000)); }

function CoachNewBatch({ onCreated, onBack }) {
  const [type, setType] = useState("baseline");
  const [prompt, setPrompt] = useState("");
  const [rosterText, setRosterText] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null); // { code, roster: [{name, slug, pin}] }
  const [copied, setCopied] = useState(false);

  const parsed = rosterText.split("\n").map((l) => l.trim()).filter(Boolean).map(parseRosterLine);

  const [createError, setCreateError] = useState(null);
  const create = async () => {
    if (!prompt.trim() || parsed.length === 0) return;
    setCreating(true); setCreateError(null);
    try { await createBatch(); }
    catch (err) { setCreateError(dbErrorMessage(err)); }
    setCreating(false);
  };
  const createBatch = async () => {
    const code = makeCode();
    const taken = new Set();
    const roster = parsed.map(({ name, pin }) => ({ name, slug: slugify(name, taken), pin: pin || genPin() }));
    const batch = {
      code, assessmentType: type, prompt: prompt.trim(),
      roster: roster.map(({ name, slug }) => ({ name, slug })), // no PINs here — this record is fetched in bulk by every joiner
      createdAt: Date.now(), status: "active", endedAt: null,
    };
    await setShared(batchKey(code), batch);
    // Each participant's PIN lives only on their own record, only fetched when someone attempts that one claim.
    await Promise.all(roster.map((r) => setShared(participantKey(code, r.slug), {
      name: r.name, slug: r.slug, pin: r.pin, status: "unjoined", claimedAt: null, submittedAt: null,
      content: "", wordCount: 0, activityLog: [], focusLog: [], backspaceCount: 0, keyCount: 0,
      reopened: false, reopenLog: [], activeDeviceToken: null, deviceSwitches: 0, deviceSwitchLog: [],
      pasteAttempts: 0, pasteLog: [], copyAttempts: 0, copyLog: [], longestStreakMs: 0, longestStreakWords: 0,
    })));
    await addBatchToIndex({ code, assessmentType: type, createdAt: batch.createdAt, status: "active", participantCount: roster.length });
    setCreated({ code, roster });
  };

  const copyList = () => {
    const text = created.roster.map((r) => `${r.name} — ${r.pin}`).join("\n");
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  if (created) {
    return (
      <div className="min-h-screen w-full p-6" style={{ background: C.bg, fontFamily: FONT }}>
        <div className="max-w-xl mx-auto">
          <div className="rounded-xl p-7" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Batch created</div>
            <div className="text-sm mb-5" style={{ color: C.muted }}>
              Each person needs their own PIN to join — this is the only place the full list is shown together. Send each one privately (a DM, not the group chat), or share it however you already reach this batch individually. You can also look up one PIN at a time later from that person's tile on the dashboard.
            </div>
            <div className="rounded-lg p-4 mb-3 max-h-72 overflow-y-auto" style={{ background: C.navySoft }}>
              {created.roster.map((r) => (
                <div key={r.slug} className="flex items-center justify-between text-sm py-1">
                  <span style={{ color: C.navy }}>{r.name}</span>
                  <span className="font-mono font-semibold tracking-wider" style={{ color: C.navy }}>{r.pin}</span>
                </div>
              ))}
            </div>
            <button onClick={copyList} className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-2.5 mb-3" style={{ border: `1px solid ${C.border}`, color: C.navy }}>
              <Copy size={14} /> {copied ? "Copied" : "Copy list"}
            </button>
            <button onClick={() => onCreated(created.code)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-2.5" style={{ background: C.navy, color: "#fff" }}>
              Continue to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="max-w-xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>
        <div className="rounded-xl p-7" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-lg font-semibold mb-5" style={{ color: C.navy }}>New assessment batch</div>

          <label className="text-sm font-medium block mb-1.5" style={{ color: C.navy }}>Assessment</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(ASSESSMENT_LABELS).map(([k, label]) => (
              <button key={k} onClick={() => setType(k)} className="text-sm font-medium rounded-md py-2"
                style={{ border: `1px solid ${type === k ? C.teal : C.border}`, background: type === k ? C.tealSoft : "transparent", color: type === k ? C.navy : C.muted }}>
                {label.split(" ")[0]}
              </button>
            ))}
          </div>

          <label className="text-sm font-medium block mb-1.5" style={{ color: C.navy }}>Prompt for this batch</label>
          <div className="text-xs mb-2" style={{ color: C.muted }}>Everyone in this batch sees the same prompt at the top of their screen.</div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} className="w-full text-sm rounded-md px-3 py-2.5 outline-none resize-none mb-5" style={{ border: `1px solid ${C.border}` }} placeholder="Paste the assessment prompt here…" />

          <label className="text-sm font-medium block mb-1.5" style={{ color: C.navy }}>Participant roster</label>
          <div className="text-xs mb-2" style={{ color: C.muted }}>One name per line. Add a PIN after a comma if you already have one for each person (e.g. the last 4 digits of their employee ID) — leave it off and one is generated for you, shown after you create the batch. Everyone needs their PIN to join, so it's worth deciding this before the session.</div>
          <textarea value={rosterText} onChange={(e) => setRosterText(e.target.value)} rows={8} className="w-full text-sm rounded-md px-3 py-2.5 outline-none resize-none mb-1" style={{ border: `1px solid ${C.border}` }} placeholder={"Ananya Nair, 4821\nRohith Maraiah\nShrinivas Chippada, 1190\n…"} />
          <div className="text-xs mb-5" style={{ color: C.mutedLight }}>{parsed.length} participant{parsed.length === 1 ? "" : "s"}</div>

          {createError && <div className="text-xs mb-3 break-words" style={{ color: C.red }}>{createError}</div>}
          <button onClick={create} disabled={creating || !prompt.trim() || parsed.length === 0}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-2.5"
            style={{ background: C.navy, color: "#fff", opacity: (creating || !prompt.trim() || parsed.length === 0) ? 0.5 : 1 }}>
            {creating ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />}
            {creating ? "Creating…" : "Create batch & get code"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Small shared bits ----------
function FlagBadges({ flags }) {
  if (!flags.pauseBurst && !flags.tabSwitches && !flags.lowRevision && !flags.deviceSwitches && !flags.pasteAttempts && !flags.copyAttempts && !flags.nonStop) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {flags.pasteAttempts > 0 && (
        <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: C.redSoft, color: C.red }} title="Tried to paste or drag text in (it was blocked)">
          Paste attempt ×{flags.pasteAttempts}
        </span>
      )}
      {flags.copyAttempts > 0 && (
        <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: C.redSoft, color: C.red }} title="Tried to copy or cut text from the prompt or their answer (it was blocked)">
          Copy attempt ×{flags.copyAttempts}
        </span>
      )}
      {flags.nonStop && (
        <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: C.amberSoft, color: C.amber }} title={`Typed for ${flags.nonStop.min} min without a pause longer than ${STREAK_BREAK_SEC}s (${flags.nonStop.words} words)`}>
          Non-stop {flags.nonStop.min} min
        </span>
      )}
      {flags.pauseBurst && (
        <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: C.amberSoft, color: C.amber }} title={`${flags.pauseBurst.idleMin} min idle, then ${flags.pauseBurst.words} words`}>
          Idle → burst
        </span>
      )}
      {flags.tabSwitches > 0 && (
        <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: C.amberSoft, color: C.amber }} title={`Left this window ${flags.tabSwitches} time(s), ${flags.tabAwayMin} min total`}>
          Left window ×{flags.tabSwitches}
        </span>
      )}
      {flags.lowRevision && (
        <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: C.navySoft, color: C.navy }} title="Very few corrections for the length written">
          Few corrections
        </span>
      )}
      {flags.deviceSwitches > 0 && (
        <span className="text-[11px] font-medium rounded-full px-2 py-0.5" style={{ background: C.redSoft, color: C.red }} title="Joined from a different device or browser than the one that first claimed this name">
          New device ×{flags.deviceSwitches}
        </span>
      )}
    </div>
  );
}

function FlagLegend() {
  return (
    <div className="rounded-lg px-3.5 py-2.5 flex items-start gap-2 text-xs" style={{ background: C.navySoft, color: C.navy }}>
      <Info size={14} className="mt-0.5 shrink-0" />
      <div>
        Flags are signals worth a follow-up conversation, not proof of anything. "Paste attempt" means they tried to paste or drag text in, and "Copy attempt" that they tried to copy the prompt or their answer out — both were blocked, but the attempts are recorded. "Non-stop" means a long stretch of typing with no pause over a few seconds, which can suggest copying from another source by hand. "Idle → burst" catches a long pause followed by a lot of text appearing at once. "Left window" catches switching away from this tab or app — it won't catch a second monitor that stays in view, and on a Zoom call it can just as easily mean they clicked over to Zoom itself. "Few corrections" is the softest signal; some people genuinely write clean. "New device" means this name was opened on a second device or browser mid-session — sometimes as simple as a laptop dying, sometimes worth a direct question. Ask before you conclude.
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    unjoined: { bg: C.bg, fg: C.mutedLight, label: "Not joined" },
    writing: { bg: C.tealSoft, fg: C.teal, label: "Writing" },
    submitted: { bg: C.greenSoft, fg: C.green, label: "Submitted" },
    locked: { bg: C.amberSoft, fg: C.amber, label: "Locked at end" },
  };
  const s = map[status] || map.unjoined;
  return <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
}

// ---------- Coach: dashboard (live monitoring + after-the-fact review, same screen) ----------
function CoachDashboard({ code, onBack }) {
  const [batch, setBatch] = useState(null);
  const [rows, setRows] = useState({});
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [openSlug, setOpenSlug] = useState(null);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const b = await getShared(batchKey(code));
      if (stop || !b) return;
      setBatch(b);
      const entries = await Promise.all(b.roster.map(async (r) => [r.slug, await getShared(participantKey(code, r.slug))]));
      const next = {};
      entries.forEach(([slug, p]) => { next[slug] = p; });
      setRows(next);
    };
    poll();
    const iv = setInterval(poll, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearInterval(iv); clearInterval(clock); };
  }, [code]);

  const copyCode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(code);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const endBatch = async () => {
    setEnding(true);
    const b = await getShared(batchKey(code));
    const updated = { ...b, status: "ended", endedAt: Date.now() };
    await setShared(batchKey(code), updated);
    await patchBatchIndex(code, { status: "ended" });
    setBatch(updated);
    setEnding(false);
    setConfirmEnd(false);
  };

  if (!batch) return <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}><Loader2 className="animate-spin" size={22} style={{ color: C.teal }} /></div>;

  if (openSlug) {
    const r = batch.roster.find((x) => x.slug === openSlug);
    return <ParticipantDetail code={code} rosterEntry={r} onBack={() => setOpenSlug(null)} />;
  }

  const elapsedMs = now - batch.createdAt;
  const joined = Object.values(rows).filter((p) => p && p.status !== "unjoined").length;
  const submitted = Object.values(rows).filter((p) => p && (p.status === "submitted" || p.status === "locked")).length;
  const words = Object.values(rows).filter(Boolean).map((p) => p.wordCount || 0);
  const avgWords = words.length ? Math.round(words.reduce((a, b) => a + b, 0) / words.length) : 0;

  return (
    <div className="min-h-screen w-full p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>

        <div className="rounded-xl p-6 mb-5" style={{ background: C.navy }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#9DB3D1" }}>Batch code — share with the group</div>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold tracking-widest" style={{ color: "#fff" }}>{code}</div>
                <button onClick={copyCode} className="flex items-center gap-1 text-xs rounded-md px-2 py-1" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                  <Copy size={12} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9DB3D1" }}>Elapsed</div>
              <div className="text-2xl font-bold mt-1" style={{ color: elapsedMs > TARGET_MINUTES * 60000 ? "#FBBF6A" : "#fff" }}>{fmtMinSec(elapsedMs)}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "#9DB3D1" }}>target {TARGET_MINUTES} min · you decide when it ends</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[["Roster", batch.roster.length], ["Joined", joined], ["Submitted", submitted], ["Avg. words", avgWords]].map(([label, val]) => (
            <div key={label} className="rounded-lg p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="text-xs font-medium" style={{ color: C.muted }}>{label}</div>
              <div className="text-xl font-bold mt-1" style={{ color: C.navy }}>{val}</div>
            </div>
          ))}
        </div>

        <div className="mb-5"><FlagLegend /></div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {batch.roster.map((r) => {
            const p = rows[r.slug];
            const status = p ? p.status : "unjoined";
            const flags = p ? computeFlags(p) : {};
            return (
              <button key={r.slug} onClick={() => setOpenSlug(r.slug)} className="text-left rounded-lg p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold" style={{ color: C.navy }}>{r.name}</div>
                  <ChevronRight size={14} style={{ color: C.mutedLight }} />
                </div>
                <div className="mt-1.5"><StatusPill status={status} /></div>
                <div className="text-xs mt-2" style={{ color: C.muted }}>{p ? `${p.wordCount || 0} words` : "—"}</div>
                <FlagBadges flags={flags} />
              </button>
            );
          })}
        </div>

        {batch.status === "active" ? (
          confirmEnd ? (
            <div className="rounded-lg p-4 flex items-center justify-between gap-4" style={{ background: C.amberSoft }}>
              <div className="text-sm" style={{ color: C.amber }}>End the batch now? Anyone still writing will be locked out and their current draft submitted.</div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirmEnd(false)} className="text-sm font-medium rounded-md px-3 py-2" style={{ color: C.muted }}>Cancel</button>
                <button onClick={endBatch} disabled={ending} className="text-sm font-semibold rounded-md px-3 py-2" style={{ background: C.amber, color: "#fff" }}>
                  {ending ? "Ending…" : "End batch"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmEnd(true)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-3" style={{ background: C.amber, color: "#fff" }}>
              <Square size={14} /> End batch now
            </button>
          )
        ) : (
          <div className="text-center text-sm rounded-lg py-3" style={{ background: C.greenSoft, color: C.green }}>Batch ended — this view is a record of the final submissions.</div>
        )}
      </div>
    </div>
  );
}

// ---------- Coach: one participant's detail (live or after the fact) ----------
function ParticipantDetail({ code, rosterEntry, onBack }) {
  const [p, setP] = useState(null);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    let stop = false;
    const poll = async () => { const v = await getShared(participantKey(code, rosterEntry.slug)); if (!stop) setP(v); };
    poll();
    const iv = setInterval(poll, 5000);
    return () => { stop = true; clearInterval(iv); };
  }, [code, rosterEntry.slug]);

  const flags = p ? computeFlags(p) : {};
  const chartData = p ? (p.activityLog || []).map((e) => ({ min: Math.round((e.t - (p.claimedAt || e.t)) / 60000), words: e.words })) : [];
  const canReopen = p && (p.status === "submitted" || p.status === "locked");

  const reopen = async () => {
    setReopening(true);
    const existing = await getShared(participantKey(code, rosterEntry.slug));
    if (existing) {
      const log = existing.reopenLog || [];
      const updated = {
        ...existing, status: "writing", submittedAt: null, reopened: true,
        reopenLog: [...log, { reopenedAt: Date.now(), fromStatus: existing.status, previousSubmittedAt: existing.submittedAt }],
      };
      await setShared(participantKey(code, rosterEntry.slug), updated);
      setP(updated);
    }
    setReopening(false);
    setConfirmReopen(false);
  };

  return (
    <div className="min-h-screen w-full p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back to batch</button>

        <div className="rounded-xl p-7 mb-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xl font-semibold" style={{ color: C.navy }}>{rosterEntry.name}</div>
          {!p ? (
            <div className="text-sm mt-2" style={{ color: C.mutedLight }}>Loading…</div>
          ) : p.status === "unjoined" ? (
            <>
              <div className="mt-2"><StatusPill status="unjoined" /></div>
              <div className="text-sm mt-3" style={{ color: C.muted }}>Hasn't joined yet. Their PIN, if you need to resend it:</div>
              <div className="text-lg font-mono font-semibold tracking-wider mt-1" style={{ color: C.navy }}>{p.pin}</div>
            </>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2"><StatusPill status={p.status} />{p.reopened && p.status === "writing" && (
                <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: C.navySoft, color: C.navy }}>Reopened by you</span>
              )}</div>
              <div className="flex gap-6 mt-4">
                <div><div className="text-xs" style={{ color: C.muted }}>Word count</div><div className="text-lg font-semibold" style={{ color: C.navy }}>{p.wordCount || 0}</div></div>
                <div><div className="text-xs" style={{ color: C.muted }}>Submitted</div><div className="text-lg font-semibold" style={{ color: C.navy }}>{p.submittedAt ? new Date(p.submittedAt).toLocaleTimeString() : "—"}</div></div>
              </div>
              <FlagBadges flags={flags} />
              {p.reopenLog && p.reopenLog.length > 0 && (
                <div className="text-xs mt-3" style={{ color: C.mutedLight }}>
                  Reopened {p.reopenLog.length} time{p.reopenLog.length === 1 ? "" : "s"} — last at {new Date(p.reopenLog[p.reopenLog.length - 1].reopenedAt).toLocaleTimeString()}
                </div>
              )}
              {canReopen && (
                confirmReopen ? (
                  <div className="rounded-lg p-3.5 mt-4 flex items-center justify-between gap-3" style={{ background: C.navySoft }}>
                    <div className="text-xs" style={{ color: C.navy }}>Let {rosterEntry.name} keep editing? Their status goes back to "Writing" and they'll see the change on their own screen within a few seconds.</div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setConfirmReopen(false)} className="text-xs font-medium rounded-md px-2.5 py-1.5" style={{ color: C.muted }}>Cancel</button>
                      <button onClick={reopen} disabled={reopening} className="text-xs font-semibold rounded-md px-2.5 py-1.5" style={{ background: C.navy, color: "#fff" }}>{reopening ? "Reopening…" : "Reopen"}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmReopen(true)} className="text-sm font-medium mt-4" style={{ color: C.teal }}>Reopen for editing</button>
                )
              )}
            </>
          )}
        </div>

        {p && chartData.length > 1 && (
          <div className="rounded-xl p-6 mb-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.muted }}>Writing pace (words over time)</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="min" tick={{ fontSize: 11, fill: C.muted }} label={{ value: "minutes", position: "insideBottom", offset: -3, fontSize: 10, fill: C.mutedLight }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="words" stroke={C.teal} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-xl p-6" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: C.muted }}>Submitted writing</div>
          {p && p.content
            ? <div className="text-sm leading-relaxed" style={{ color: C.text }} dangerouslySetInnerHTML={{ __html: p.content }} />
            : <div className="text-sm" style={{ color: C.mutedLight }}>Nothing written yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- Coach: history ----------
function CoachHistory({ onOpen, onBack }) {
  const [items, setItems] = useState(null);
  const [changing, setChanging] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [nextConfirm, setNextConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => setItems(await listBatches()))(); }, []);

  const changePassphrase = async () => {
    setError(null);
    if (!current.trim() || !next.trim()) return;
    if (next !== nextConfirm) { setError("The new passphrase doesn't match its confirmation."); return; }
    setBusy(true);
    const remoteHash = await getShared("coach-passphrase-hash");
    const currentHash = await sha256(current.trim());
    if (currentHash !== remoteHash) { setError("Current passphrase is wrong."); setBusy(false); return; }
    const newHash = await sha256(next.trim());
    await setShared("coach-passphrase-hash", newHash);
    try { window.localStorage.setItem("law-coach-unlock", newHash); } catch { /* ignore */ }
    setBusy(false); setChanging(false); setCurrent(""); setNext(""); setNextConfirm("");
  };

  return (
    <div className="min-h-screen w-full p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="max-w-xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold" style={{ color: C.navy }}>Past batches</div>
          <button onClick={() => setChanging((v) => !v)} className="text-xs font-medium" style={{ color: C.muted }}>Change coach passphrase</button>
        </div>
        {changing && (
          <div className="rounded-lg p-4 mb-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full text-sm rounded-md px-3 py-2 outline-none mb-2" style={{ border: `1px solid ${C.border}` }} placeholder="Current passphrase" />
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="w-full text-sm rounded-md px-3 py-2 outline-none mb-2" style={{ border: `1px solid ${C.border}` }} placeholder="New passphrase" />
            <input type="password" value={nextConfirm} onChange={(e) => setNextConfirm(e.target.value)} className="w-full text-sm rounded-md px-3 py-2 outline-none mb-2" style={{ border: `1px solid ${C.border}` }} placeholder="Confirm new passphrase" />
            {error && <div className="text-xs mb-2" style={{ color: C.amber }}>{error}</div>}
            <button onClick={changePassphrase} disabled={busy} className="w-full text-sm font-semibold rounded-md py-2" style={{ background: C.navy, color: "#fff" }}>{busy ? "Updating…" : "Update passphrase"}</button>
          </div>
        )}
        {items === null && <Loader2 className="animate-spin" size={20} style={{ color: C.teal }} />}
        {items && items.length === 0 && <div className="text-sm" style={{ color: C.muted }}>No batches yet.</div>}
        <div className="space-y-2">
          {items && items.map((b) => (
            <button key={b.code} onClick={() => onOpen(b.code)} className="w-full flex items-center justify-between text-left rounded-lg p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: C.navy }}>{ASSESSMENT_LABELS[b.assessmentType]}</div>
                <div className="text-xs mt-0.5" style={{ color: C.muted }}>{b.participantCount} participants · {new Date(b.createdAt).toLocaleDateString()}</div>
              </div>
              <span className="text-xs font-medium rounded-full px-2.5 py-1" style={{ background: b.status === "ended" ? C.greenSoft : C.amberSoft, color: b.status === "ended" ? C.green : C.amber }}>
                {b.status === "ended" ? "Completed" : "In progress"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Participant: join ----------
function ParticipantJoin({ onJoined, onBack = null, onCoachKeyword = null }) {
  const [code, setCode] = useState("");
  const [batch, setBatch] = useState(null);
  const [taken, setTaken] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // { slug, name } — chosen name, awaiting PIN
  const [pin, setPin] = useState("");
  const [claiming, setClaiming] = useState(false);

  const lookup = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (c === "COACH" && onCoachKeyword) { onCoachKeyword(); return; }
    setLoading(true); setError(null);
    const b = await getShared(batchKey(c));
    if (!b) { setError("That code wasn't found. Double-check with your coach."); setLoading(false); return; }
    if (b.status === "ended") { setError("This batch has already ended."); setLoading(false); return; }
    const entries = await Promise.all(b.roster.map(async (r) => [r.slug, await getShared(participantKey(c, r.slug))]));
    const t = {};
    entries.forEach(([slug, p]) => { t[slug] = p ? p.status : "unjoined"; });
    setBatch({ ...b, code: c });
    setTaken(t);
    setLoading(false);
  };

  const pickName = (slug, name) => { setSelected({ slug, name }); setPin(""); setError(null); };

  const claim = async () => {
    setClaiming(true); setError(null);
    try { await doClaim(); }
    catch (err) { setError(dbErrorMessage(err)); setClaiming(false); }
  };
  const doClaim = async () => {
    const { slug, name } = selected;
    const existing = await getShared(participantKey(batch.code, slug));
    if (!existing) { setError("Something's off with that name — check with your coach."); setClaiming(false); return; }
    if (existing.status === "submitted" || existing.status === "locked") {
      setError(`${name} has already submitted for this batch. If that's not you, check with your coach.`);
      setClaiming(false);
      return;
    }
    if (pin.trim() !== String(existing.pin)) {
      setError("That PIN doesn't match. Check with your coach if you're not sure of it.");
      setClaiming(false);
      return;
    }
    // Each device gets its own private token for this (batch, name) pair, so a refresh on the SAME
    // device is a quiet resume, but a claim from a DIFFERENT device is detectable and logged.
    const storageKey = `law-device-${batch.code}-${slug}`;
    let myToken = null;
    try { myToken = window.localStorage.getItem(storageKey); } catch { /* private-browsing etc. — fall through */ }
    if (existing.status === "unjoined") {
      myToken = myToken || Math.random().toString(36).slice(2, 10);
      try { window.localStorage.setItem(storageKey, myToken); } catch { /* ignore */ }
      await setShared(participantKey(batch.code, slug), { ...existing, status: "writing", claimedAt: Date.now(), activeDeviceToken: myToken });
    } else if (!myToken || myToken !== existing.activeDeviceToken) {
      myToken = Math.random().toString(36).slice(2, 10);
      try { window.localStorage.setItem(storageKey, myToken); } catch { /* ignore */ }
      await setShared(participantKey(batch.code, slug), {
        ...existing, activeDeviceToken: myToken,
        deviceSwitches: (existing.deviceSwitches || 0) + 1,
        deviceSwitchLog: [...(existing.deviceSwitchLog || []), { at: Date.now() }],
      });
    }
    window.__lawSlug = slug;
    window.__lawDeviceToken = myToken;
    onJoined(batch.code);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="w-full max-w-sm">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>
        )}
        <div className="rounded-xl p-7" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          {!batch ? (
            <>
              <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Join your batch</div>
              <div className="text-sm mb-5" style={{ color: C.muted }}>Enter the code your coach gave the group.</div>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6}
                className="w-full text-center text-2xl font-bold tracking-widest rounded-md px-3 py-3 outline-none mb-3"
                style={{ border: `1px solid ${C.border}`, letterSpacing: "0.2em" }} placeholder="CODE" />
              {error && <div className="text-xs mb-3" style={{ color: C.amber }}>{error}</div>}
              <button onClick={lookup} disabled={loading || !code.trim()} className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-2.5"
                style={{ background: C.navy, color: "#fff", opacity: (loading || !code.trim()) ? 0.5 : 1 }}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={14} />} Continue
              </button>
            </>
          ) : !selected ? (
            <>
              <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Which name is yours?</div>
              <div className="text-sm mb-4" style={{ color: C.muted }}>{ASSESSMENT_LABELS[batch.assessmentType]}</div>
              {error && <div className="text-xs mb-3" style={{ color: C.amber }}>{error}</div>}
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {batch.roster.map((r) => {
                  const status = taken[r.slug];
                  const blocked = status === "submitted" || status === "locked";
                  return (
                    <button key={r.slug} onClick={() => !blocked && pickName(r.slug, r.name)} disabled={blocked}
                      className="w-full flex items-center justify-between text-left rounded-md px-3 py-2.5 text-sm font-medium"
                      style={{ border: `1px solid ${C.border}`, color: blocked ? C.mutedLight : C.navy, opacity: blocked ? 0.6 : 1 }}>
                      {r.name}
                      {status === "writing" && <span className="text-[11px] font-normal" style={{ color: C.teal }}>already joined — tap to resume</span>}
                      {blocked && <span className="text-[11px] font-normal" style={{ color: C.mutedLight }}>submitted</span>}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setSelected(null)} className="text-xs font-medium mb-4" style={{ color: C.muted }}>← Not {selected.name}?</button>
              <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Enter your PIN</div>
              <div className="text-sm mb-5" style={{ color: C.muted }}>Joining as {selected.name}.</div>
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={8} inputMode="numeric"
                className="w-full text-center text-2xl font-bold tracking-widest rounded-md px-3 py-3 outline-none mb-3"
                style={{ border: `1px solid ${C.border}`, letterSpacing: "0.2em" }} placeholder="PIN" autoFocus />
              {error && <div className="text-xs mb-3" style={{ color: C.amber }}>{error}</div>}
              <button onClick={claim} disabled={claiming || !pin.trim()} className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-2.5"
                style={{ background: C.navy, color: "#fff", opacity: (claiming || !pin.trim()) ? 0.5 : 1 }}>
                {claiming ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={14} />} Join session
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Participant: write ----------
const FONT_FAMILIES = ["Calibri", "Arial", "Times New Roman", "Georgia", "Verdana"];
const FONT_SIZES = [{ v: "2", l: "Small" }, { v: "3", l: "Normal" }, { v: "4", l: "Medium" }, { v: "5", l: "Large" }, { v: "6", l: "X-Large" }];
const COLORS = ["#1F2937", "#B91C1C", "#1D4ED8", "#15803D", "#B45309"];
const LINE_SPACINGS = [{ v: "1.15", l: "Single" }, { v: "1.5", l: "1.5 lines" }, { v: "2", l: "Double" }];

function ParticipantWrite({ code, onLeave }) {
  const slug = window.__lawSlug;
  const myDeviceToken = window.__lawDeviceToken;
  const [batch, setBatch] = useState(null);
  const [locked, setLocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [superseded, setSuperseded] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [lineSpacing, setLineSpacing] = useState("1.5");
  const [paraSpaced, setParaSpaced] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [banner, setBanner] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const editorRef = useRef(null);
  const shownNotices = useRef(new Set());
  const dirty = useRef(false);
  const focusLogRef = useRef([]);
  const backspaceCountRef = useRef(0);
  const keyCountRef = useRef(0);
  const lastActivityLogAt = useRef(0);
  const activityLogRef = useRef([]);
  const claimedAtRef = useRef(Date.now());
  const pasteAttemptsRef = useRef(0);
  const pasteLogRef = useRef([]);
  const copyAttemptsRef = useRef(0);
  const copyLogRef = useRef([]);
  const logCopy = (kind) => {
    copyAttemptsRef.current += 1;
    copyLogRef.current = [...copyLogRef.current, { t: Date.now(), kind }];
    dirty.current = true;
  };
  const longestStreakMsRef = useRef(0);
  const longestStreakWordsRef = useRef(0);
  const streakRef = useRef({ start: 0, last: 0, startWords: 0 });

  useEffect(() => {
    (async () => {
      const b = await getShared(batchKey(code));
      const p = await getShared(participantKey(code, slug));
      if (p) {
        claimedAtRef.current = p.claimedAt || Date.now();
        activityLogRef.current = p.activityLog || [];
        focusLogRef.current = p.focusLog || [];
        backspaceCountRef.current = p.backspaceCount || 0;
        keyCountRef.current = p.keyCount || 0;
        pasteAttemptsRef.current = p.pasteAttempts || 0;
        pasteLogRef.current = p.pasteLog || [];
        copyAttemptsRef.current = p.copyAttempts || 0;
        copyLogRef.current = p.copyLog || [];
        longestStreakMsRef.current = p.longestStreakMs || 0;
        longestStreakWordsRef.current = p.longestStreakWords || 0;
        if (p.status === "submitted" || p.status === "locked") setSubmitted(true);
        initialContentRef.current = p.content || "";
        setWordCount(p.wordCount || 0);
      }
      setBatch(b); // only now does the editor appear on screen
    })();
  }, [code, slug]);

  // Put any saved draft back into the editor once it exists (e.g. after a refresh or rejoining).
  const initialContentRef = useRef(null);
  useEffect(() => {
    if (batch && editorRef.current && initialContentRef.current !== null) {
      editorRef.current.innerHTML = initialContentRef.current;
      initialContentRef.current = null;
    }
  }, [batch, submitted]);

  const flashBanner = (msg) => { setBanner(msg); setTimeout(() => setBanner((cur) => (cur === msg ? null : cur)), 4000); };

  // Block paste / drop / copy / cut / paste-shortcuts / context menu; track backspaces and keystroke count.
  // Copy/cut still allow normal selection for formatting or deleting a chunk — only the clipboard write is blocked.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || submitted) return;
    const currentWords = () => ((el.innerText || "").trim().match(/\S+/g) || []).length;
    const logPaste = (kind) => {
      pasteAttemptsRef.current += 1;
      pasteLogRef.current = [...pasteLogRef.current, { t: Date.now(), kind }];
      dirty.current = true;
    };
    const blockPaste = (e) => { e.preventDefault(); logPaste("paste"); flashBanner("Pasting isn't allowed here — please type your answer."); };
    const blockDrop = (e) => { e.preventDefault(); logPaste("drop"); flashBanner("Dragging text in isn't allowed here."); };
    const blockCopy = (e) => { e.preventDefault(); logCopy(e.type === "cut" ? "cut-answer" : "copy-answer"); flashBanner("Copying out of this isn't allowed here."); };
    const blockContext = (e) => e.preventDefault();
    // Safety net for paste routes that skip the "paste" event (some mobile keyboards' clipboard buttons).
    const onBeforeInput = (e) => {
      if (e.inputType === "insertFromPaste" || e.inputType === "insertFromPasteAsQuotation") {
        e.preventDefault(); logPaste("paste"); flashBanner("Pasting isn't allowed here — please type your answer.");
      } else if (e.inputType === "insertFromDrop") {
        e.preventDefault(); logPaste("drop"); flashBanner("Dragging text in isn't allowed here.");
      }
    };
    const onKeydown = (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "v") { e.preventDefault(); logPaste("shortcut"); flashBanner("Pasting isn't allowed here — please type your answer."); return; }
      if (e.shiftKey && k === "insert") { e.preventDefault(); logPaste("shortcut"); flashBanner("Pasting isn't allowed here — please type your answer."); return; }
      if (k.length === 1 || k === "backspace" || k === "delete" || k === "enter" || k === " ") {
        // Track the current unbroken typing streak; a gap of STREAK_BREAK_SEC or more starts a new one.
        const now = Date.now();
        const st = streakRef.current;
        if (!st.start || now - st.last >= STREAK_BREAK_SEC * 1000) {
          streakRef.current = { start: now, last: now, startWords: currentWords() };
        } else {
          st.last = now;
          const len = now - st.start;
          if (len > longestStreakMsRef.current) {
            longestStreakMsRef.current = len;
            longestStreakWordsRef.current = Math.max(0, currentWords() - st.startWords);
          }
        }
        keyCountRef.current += 1;
        if (k === "backspace" || k === "delete") backspaceCountRef.current += 1;
        dirty.current = true;
      }
    };
    el.addEventListener("paste", blockPaste);
    el.addEventListener("drop", blockDrop);
    el.addEventListener("copy", blockCopy);
    el.addEventListener("cut", blockCopy);
    el.addEventListener("contextmenu", blockContext);
    el.addEventListener("keydown", onKeydown);
    el.addEventListener("beforeinput", onBeforeInput);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("paste", blockPaste);
      el.removeEventListener("drop", blockDrop);
      el.removeEventListener("copy", blockCopy);
      el.removeEventListener("cut", blockCopy);
      el.removeEventListener("contextmenu", blockContext);
      el.removeEventListener("keydown", onKeydown);
    };
    // `batch` matters: the editor only exists once the batch has loaded, so the listeners must attach then.
  }, [submitted, batch]);

  // Focus/away tracking — window blur/focus catches switching to a separate app or window;
  // document.visibilitychange additionally catches switching to a NEW TAB in the same browser
  // (window blur alone misses this, since the browser window itself never loses OS focus).
  // Both feed one "away" state so a single real-world switch isn't logged twice.
  useEffect(() => {
    if (submitted) return;
    let away = false;
    const markAway = () => { if (!away) { away = true; focusLogRef.current.push({ t: Date.now(), type: "blur" }); dirty.current = true; } };
    const markBack = () => { if (away) { away = false; focusLogRef.current.push({ t: Date.now(), type: "focus" }); dirty.current = true; } };
    const onVisibility = () => { document.hidden ? markAway() : markBack(); };
    window.addEventListener("blur", markAway);
    window.addEventListener("focus", markBack);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", markAway);
      window.removeEventListener("focus", markBack);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [submitted]);

  const doSync = useCallback(async (finalStatus) => {
    if (!dirty.current && !finalStatus) return;
    setSaveState("saving");
    const html = editorRef.current ? editorRef.current.innerHTML : "";
    const text = editorRef.current ? (editorRef.current.innerText || "") : "";
    const words = (text.trim().match(/\S+/g) || []).length;
    const now = Date.now();
    if (now - lastActivityLogAt.current > ACTIVITY_LOG_GAP_MS) {
      lastActivityLogAt.current = now;
      activityLogRef.current = [...activityLogRef.current, { t: now, words }];
    }
    const payload = {
      slug, content: html, wordCount: words,
      activityLog: activityLogRef.current, focusLog: focusLogRef.current,
      backspaceCount: backspaceCountRef.current, keyCount: keyCountRef.current,
      claimedAt: claimedAtRef.current,
      pasteAttempts: pasteAttemptsRef.current, pasteLog: pasteLogRef.current,
      copyAttempts: copyAttemptsRef.current, copyLog: copyLogRef.current,
      longestStreakMs: longestStreakMsRef.current, longestStreakWords: longestStreakWordsRef.current,
    };
    const existing = await getShared(participantKey(code, slug));
    // If another device has since claimed this name, it's now authoritative — stop overwriting its work.
    if (existing && existing.activeDeviceToken && myDeviceToken && existing.activeDeviceToken !== myDeviceToken) {
      setSuperseded(true);
      return;
    }
    const merged = { ...existing, ...payload };
    if (finalStatus) { merged.status = finalStatus; merged.submittedAt = now; merged.reopened = false; }
    try { await setShared(participantKey(code, slug), merged); }
    catch { setSaveState("error"); return; }
    setWordCount(words);
    dirty.current = false;
    setSaveState("saved");
  }, [code, slug, myDeviceToken]);

  const onInput = () => { dirty.current = true; };

  // Periodic sync + poll for batch end (skips the auto-lock if the coach has explicitly reopened this person)
  useEffect(() => {
    if (submitted || superseded) return;
    const iv = setInterval(async () => {
      await doSync();
      const b = await getShared(batchKey(code));
      if (b && b.status === "ended") {
        const mine = await getShared(participantKey(code, slug));
        if (!(mine && mine.reopened)) {
          await doSync("locked");
          setLocked(true); setSubmitted(true);
        }
      }
      if (b) {
        const elapsedMin = Math.floor((Date.now() - b.createdAt) / 60000);
        [10, 20].forEach((m) => {
          if (elapsedMin >= m && !shownNotices.current.has(m)) {
            shownNotices.current.add(m);
            flashBanner(`${m} minutes elapsed — ${TARGET_MINUTES - m} left to the usual target.`);
          }
        });
        if (elapsedMin >= TARGET_MINUTES && !shownNotices.current.has("target")) {
          shownNotices.current.add("target");
          flashBanner(`You're at the ${TARGET_MINUTES}-minute mark — wrap up when ready.`);
        }
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [code, doSync, submitted, superseded, slug]);

  // While on the "submitted/locked" screen, watch for the coach reopening this document
  const pendingContentRef = useRef(null);
  useEffect(() => {
    if (!submitted) return;
    const iv = setInterval(async () => {
      const mine = await getShared(participantKey(code, slug));
      if (mine && mine.status === "writing") {
        claimedAtRef.current = mine.claimedAt || claimedAtRef.current;
        activityLogRef.current = mine.activityLog || [];
        focusLogRef.current = mine.focusLog || [];
        backspaceCountRef.current = mine.backspaceCount || 0;
        keyCountRef.current = mine.keyCount || 0;
        pasteAttemptsRef.current = mine.pasteAttempts || 0;
        pasteLogRef.current = mine.pasteLog || [];
        copyAttemptsRef.current = mine.copyAttempts || 0;
        copyLogRef.current = mine.copyLog || [];
        longestStreakMsRef.current = mine.longestStreakMs || 0;
        longestStreakWordsRef.current = mine.longestStreakWords || 0;
        pendingContentRef.current = mine.content || "";
        setWordCount(mine.wordCount || 0);
        setLocked(false);
        setSubmitted(false);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [submitted, code, slug]);

  // Restore the document content once the editor reappears after a reopen
  useEffect(() => {
    if (!submitted && pendingContentRef.current !== null && editorRef.current) {
      editorRef.current.innerHTML = pendingContentRef.current;
      pendingContentRef.current = null;
      flashBanner("Your coach reopened this for editing.");
    }
  }, [submitted]);

  const submitNow = async () => {
    await doSync("submitted");
    setSubmitted(true);
    setConfirmSubmit(false);
  };

  const exec = (cmd, val = null) => {
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    onInput();
  };

  if (!batch) return <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}><Loader2 className="animate-spin" size={22} style={{ color: C.teal }} /></div>;

  if (superseded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: FONT }}>
        <div className="text-center max-w-sm">
          <AlertTriangle size={28} style={{ color: C.amber }} className="mx-auto mb-3" />
          <div className="text-lg font-semibold" style={{ color: C.navy }}>This name is now active elsewhere</div>
          <div className="text-sm mt-2" style={{ color: C.muted }}>
            This name was just opened on a different device or tab, so that one is now the version being saved — nothing further you type here will be kept. If this was you switching devices, continue there. If it wasn't, tell your coach.
          </div>
          <button onClick={onLeave} className="text-sm font-medium mt-5" style={{ color: C.teal }}>Done</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: FONT }}>
        <div className="text-center max-w-sm">
          <Lock size={28} style={{ color: C.navy }} className="mx-auto mb-3" />
          <div className="text-lg font-semibold" style={{ color: C.navy }}>{locked ? "Batch ended" : "Submitted"}</div>
          <div className="text-sm mt-2" style={{ color: C.muted }}>
            {locked ? "The coach ended this batch. Your last saved draft was submitted." : "Your response has been submitted and can't be edited. You can close this window."}
          </div>
          <button onClick={onLeave} className="text-sm font-medium mt-5" style={{ color: C.teal }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="px-6 py-4" style={{ background: C.navy }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: "#fff" }}>{ASSESSMENT_LABELS[batch.assessmentType]}</div>
          <div className="text-xs" style={{ color: "#9DB3D1" }}>{wordCount} words</div>
        </div>
      </div>

      {banner && (
        <div className="px-6 py-2.5 text-center text-sm font-medium" style={{ background: C.amberSoft, color: C.amber }}>
          <Clock size={13} className="inline mr-1.5 -mt-0.5" />{banner}
        </div>
      )}

      <div className="max-w-3xl mx-auto w-full px-6 pt-6">
        <div className="rounded-xl p-5 mb-5" style={{ background: C.tealSoft, border: `1px solid ${C.teal}` }}
          onCopy={(e) => { e.preventDefault(); logCopy("copy-prompt"); flashBanner("Copying the prompt out isn't allowed here."); }}
          onContextMenu={(e) => e.preventDefault()}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.teal }}>Prompt</div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.text }}>{batch.prompt}</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-6 flex-1 flex flex-col pb-6">
        <div className="rounded-t-xl px-3 py-2 flex flex-wrap items-center gap-1.5" style={{ background: C.panel, border: `1px solid ${C.border}`, borderBottom: "none" }}>
          <select onChange={(e) => exec("fontName", e.target.value)} defaultValue="Calibri" className="text-xs rounded px-2 py-1.5 outline-none" style={{ border: `1px solid ${C.border}` }}>
            {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select onChange={(e) => exec("fontSize", e.target.value)} defaultValue="3" className="text-xs rounded px-2 py-1.5 outline-none" style={{ border: `1px solid ${C.border}` }}>
            {FONT_SIZES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <div className="w-px h-5 mx-1" style={{ background: C.border }} />
          <ToolbarBtn onClick={() => exec("bold")}><Bold size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec("italic")}><Italic size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec("underline")}><Underline size={14} /></ToolbarBtn>
          <div className="w-px h-5 mx-1" style={{ background: C.border }} />
          {COLORS.map((c) => (
            <button key={c} onClick={() => exec("foreColor", c)} className="w-5 h-5 rounded-full" style={{ background: c, border: "1px solid rgba(0,0,0,0.1)" }} />
          ))}
          <div className="w-px h-5 mx-1" style={{ background: C.border }} />
          <ToolbarBtn onClick={() => exec("justifyLeft")}><AlignLeft size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec("justifyCenter")}><AlignCenter size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec("justifyRight")}><AlignRight size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec("justifyFull")}><AlignJustify size={14} /></ToolbarBtn>
          <div className="w-px h-5 mx-1" style={{ background: C.border }} />
          <ToolbarBtn onClick={() => exec("insertUnorderedList")}><List size={14} /></ToolbarBtn>
          <ToolbarBtn onClick={() => exec("insertOrderedList")}><ListOrdered size={14} /></ToolbarBtn>
          <div className="w-px h-5 mx-1" style={{ background: C.border }} />
          <select value={lineSpacing} onChange={(e) => setLineSpacing(e.target.value)} className="text-xs rounded px-2 py-1.5 outline-none" style={{ border: `1px solid ${C.border}` }}>
            {LINE_SPACINGS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs ml-1" style={{ color: C.muted }}>
            <input type="checkbox" checked={paraSpaced} onChange={(e) => setParaSpaced(e.target.checked)} /> Para spacing
          </label>
          <div className="ml-auto text-xs flex items-center gap-1" style={{ color: C.mutedLight }}>
            {saveState === "saving" ? <><Loader2 size={11} className="animate-spin" /> Saving</>
              : saveState === "error" ? <span style={{ color: C.red }}><AlertTriangle size={11} className="inline -mt-0.5" /> Not saved — retrying</span>
              : <><CheckCircle2 size={11} /> Saved</>}
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          className="flex-1 rounded-b-xl px-5 py-4 text-sm outline-none overflow-y-auto"
          style={{ background: "#fff", border: `1px solid ${C.border}`, minHeight: 280, lineHeight: lineSpacing, color: C.text }}
        />
        <style>{`
          [contenteditable] div, [contenteditable] p { margin-bottom: ${paraSpaced ? "10px" : "0px"}; }
        `}</style>

        {confirmSubmit ? (
          <div className="rounded-lg p-4 mt-3 flex items-center justify-between gap-4" style={{ background: C.amberSoft }}>
            <div className="text-sm" style={{ color: C.amber }}><AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />Once you submit, you can't go back and edit. Ready?</div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirmSubmit(false)} className="text-sm font-medium rounded-md px-3 py-2" style={{ color: C.muted }}>Keep writing</button>
              <button onClick={submitNow} className="text-sm font-semibold rounded-md px-3 py-2" style={{ background: C.amber, color: "#fff" }}>Submit</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmSubmit(true)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-3 mt-3" style={{ background: C.navy, color: "#fff" }}>
            <Send size={14} /> Submit now
          </button>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ onClick, children }) {
  return (
    <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="rounded p-1.5" style={{ color: C.navy }}
      onMouseOver={(e) => e.currentTarget.style.background = C.navySoft} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
      {children}
    </button>
  );
}
