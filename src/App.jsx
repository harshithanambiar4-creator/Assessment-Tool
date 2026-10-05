import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldOff, Lock, Clock, Users, LogIn, PlusCircle, ArrowLeft,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Loader2, CheckCircle2, History, Copy, AlertTriangle,
  Send, ChevronRight, Info, Square, LogOut, KeyRound
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DOMPurify from "dompurify";
import { supabase, isCoachLink, needsNewPassword, authLinkError } from "./supabaseClient";
import { availableFonts, defaultFont, fontByName, COMMON_FONTS } from "./fonts";
import { autocorrectWord, SPELLING_MODES } from "./autocorrect";

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
const PIN_LOCKOUT = 10;            // wrong PINs before a name is locked (must match supabase/schema.sql)

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

// ---------- Database ----------
// Coaches read/write the "batches" and "participants" tables directly; row-level security in
// supabase/schema.sql limits each coach to their own batches. Participants never touch the tables —
// they go through three database functions (rpc) that check the code, PIN and private token.

// Turns a database or login error into a message a person can act on.
function dbErrorMessage(err) {
  const msg = (err && err.message) || String(err);
  if (/failed to fetch|networkerror|load failed|invalid url|missing/i.test(msg))
    return `Can't reach the database. The Supabase address or key on Render is probably wrong or missing. (${msg})`;
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match a coach account.";
  if (/email not confirmed/i.test(msg)) return "This coach account hasn't been confirmed yet. Ask whoever set it up to tick \"Auto Confirm User\".";
  if (/permission denied|row-level security|42501/i.test(msg))
    return `The database refused this. Check that supabase/schema.sql has been run. (${msg})`;
  if (/invalid api key|apikey|no api key/i.test(msg))
    return `The Supabase key on Render isn't accepted. Check VITE_SUPABASE_ANON_KEY. (${msg})`;
  if (/does not exist|could not find the (table|function)/i.test(msg))
    return `The database isn't set up yet. Run supabase/schema.sql in Supabase's SQL Editor. (${msg})`;
  return `Something went wrong: ${msg}`;
}
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}
const toMs = (t) => (t ? Date.parse(t) : null);

// Database row → the shape the screens and computeFlags use.
function participantFromRow(r) {
  return {
    id: r.id, name: r.name, slug: r.slug, pin: r.pin, status: r.status,
    claimedAt: toMs(r.claimed_at), submittedAt: toMs(r.submitted_at),
    content: r.content, wordCount: r.word_count,
    activityLog: r.activity_log, focusLog: r.focus_log,
    keyCount: r.key_count, backspaceCount: r.backspace_count,
    pasteAttempts: r.paste_attempts, copyAttempts: r.copy_attempts,
    longestStreakMs: Number(r.longest_streak_ms), longestStreakWords: r.longest_streak_words,
    deviceSwitches: r.device_switches, reopened: r.reopened, reopenLog: r.reopen_log,
    pinFailures: r.pin_failures,
    autocorrectCount: r.autocorrect_count || 0, autocorrectLog: r.autocorrect_log || [],
  };
}
function batchFromRow(r) {
  return { id: r.id, code: r.code, assessmentType: r.assessment_type, prompt: r.prompt, spellingMode: r.spelling_mode,
    status: r.status, createdAt: toMs(r.created_at), endedAt: toMs(r.ended_at) };
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
  // Autocorrected words count as corrections too, so spelling help never makes "Few corrections" more likely.
  const rate = p.keyCount > 20 ? ((p.backspaceCount || 0) + (p.autocorrectCount || 0)) / p.keyCount : null;
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

// A plain link opens straight to joining — nothing coach-related is reachable from it.
// Add #coach to the same link to reach the coach side, which needs a coach login.
export default function App() {
  const [role, setRole] = useState(isCoachLink ? "coach-home" : "participant-join");
  const [coachMode, setCoachMode] = useState(isCoachLink);
  const [activeCode, setActiveCode] = useState(null);

  // ---- Participant surface (the plain link) — join and write only, nothing else exists here ----
  // Typing the word COACH where the batch code goes opens the coach login, for anyone who
  // lost the #coach link. Nothing is visible without signing in.
  if (!coachMode) {
    if (role === "participant-write") return <ParticipantWrite code={activeCode} onLeave={() => setRole("participant-join")} />;
    return <ParticipantJoin
      onJoined={(c) => { setActiveCode(c); setRole("participant-write"); }}
      onCoachKeyword={() => { setRole("coach-home"); setCoachMode(true); }} />;
  }
  return <CoachArea role={role} setRole={setRole}
    onBack={isCoachLink ? null : () => { setCoachMode(false); setRole("participant-join"); }} />;
}

function Spinner() {
  return <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}><Loader2 className="animate-spin" size={22} style={{ color: C.teal }} /></div>;
}

// ---------- Coach side: everything here needs a signed-in coach ----------
function CoachArea({ role, setRole, onBack }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [mustSetPassword, setMustSetPassword] = useState(needsNewPassword);
  const [changingPassword, setChangingPassword] = useState(false);
  const [batchId, setBatchId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setMustSetPassword(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Spinner />;
  if (!session) return <CoachLogin onBack={onBack} />;
  if (mustSetPassword || changingPassword) {
    return <SetPassword email={session.user.email} forced={mustSetPassword}
      onDone={() => { setMustSetPassword(false); setChangingPassword(false); }}
      onCancel={() => setChangingPassword(false)} />;
  }
  const open = (id) => { setBatchId(id); setRole("coach-dashboard"); };
  if (role === "coach-new") return <CoachNewBatch onCreated={open} onBack={() => setRole("coach-home")} />;
  if (role === "coach-history") return <CoachHistory onOpen={open} onBack={() => setRole("coach-home")} />;
  if (role === "coach-dashboard") return <CoachDashboard batchId={batchId} onBack={() => setRole("coach-home")} />;
  return <CoachHome email={session.user.email} onPick={setRole}
    onChangePassword={() => setChangingPassword(true)}
    onSignOut={() => supabase.auth.signOut()} />;
}

function Card({ children, onBack, width = "max-w-sm" }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className={`w-full ${width}`}>
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>
        )}
        <div className="rounded-xl p-7" style={{ background: C.panel, border: `1px solid ${C.border}` }}>{children}</div>
      </div>
    </div>
  );
}
const inputCls = "w-full text-sm rounded-md px-3 py-2.5 outline-none mb-3";
const inputStyle = { border: `1px solid ${C.border}` };
function PrimaryButton({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-full text-sm font-semibold rounded-md py-2.5"
      style={{ background: C.navy, color: "#fff", opacity: disabled ? 0.5 : 1 }}>{children}</button>
  );
}

function CoachLogin({ onBack }) {
  const [mode, setMode] = useState("login"); // login | forgot | sent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authLinkError
    ? "That email link didn't work — it may have expired or already been used. Use \"Forgot password?\" to get a new one." : null);
  const [busy, setBusy] = useState(false);

  const signIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(dbErrorMessage(err));
    setBusy(false);
  };
  const sendReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/?coach` });
    setBusy(false);
    if (err) setError(dbErrorMessage(err)); else setMode("sent");
  };

  if (mode === "sent") {
    return (
      <Card onBack={onBack}>
        <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Check your email</div>
        <div className="text-sm mb-5" style={{ color: C.muted }}>If {email.trim()} is a coach account, a link to choose a new password is on its way. Open it on this device. It can take a few minutes, so check your spam folder too.</div>
        <button onClick={() => setMode("login")} className="text-sm font-medium" style={{ color: C.teal }}>Back to sign in</button>
      </Card>
    );
  }
  return (
    <Card onBack={onBack}>
      <form onSubmit={mode === "login" ? signIn : sendReset}>
        <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>{mode === "login" ? "Coach sign in" : "Reset your password"}</div>
        <div className="text-sm mb-5" style={{ color: C.muted }}>
          {mode === "login" ? "This area is for coaches only." : "Enter your coach email and we'll send you a link to choose a new password."}
        </div>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={inputStyle} placeholder="Email" autoFocus />
        {mode === "login" && (
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} style={inputStyle} placeholder="Password" />
        )}
        {error && <div className="text-xs mb-3 break-words" style={{ color: C.red }}>{error}</div>}
        <PrimaryButton disabled={busy || !email.trim() || (mode === "login" && !password)}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Send reset link"}
        </PrimaryButton>
      </form>
      <button onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(null); }} className="text-xs font-medium mt-4" style={{ color: C.muted }}>
        {mode === "login" ? "Forgot password?" : "Back to sign in"}
      </button>
    </Card>
  );
}

function SetPassword({ email, forced, onDone, onCancel }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (pw.length < 8) { setError("Use at least 8 characters."); return; }
    if (pw !== pw2) { setError("Those two don't match."); return; }
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) setError(dbErrorMessage(err)); else onDone();
  };
  return (
    <Card onBack={forced ? null : onCancel}>
      <form onSubmit={save}>
        <div className="text-lg font-semibold mb-1" style={{ color: C.navy }}>Choose a new password</div>
        <div className="text-sm mb-5" style={{ color: C.muted }}>For {email}. At least 8 characters.</div>
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} style={inputStyle} placeholder="New password" autoFocus />
        <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} style={inputStyle} placeholder="Confirm new password" />
        {error && <div className="text-xs mb-3 break-words" style={{ color: C.red }}>{error}</div>}
        <PrimaryButton disabled={busy || !pw}>{busy ? "Saving…" : "Save password"}</PrimaryButton>
      </form>
    </Card>
  );
}

// ---------- Coach home ----------
function CoachHome({ email, onPick, onChangePassword, onSignOut }) {
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
            <div className="text-base font-semibold mt-3" style={{ color: C.navy }}>My batches</div>
            <div className="text-xs mt-1" style={{ color: C.muted }}>Open a live dashboard or review a finished one</div>
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 mt-8 text-xs" style={{ color: C.muted }}>
          <span>Signed in as <strong style={{ color: C.navy }}>{email}</strong></span>
          <button onClick={onChangePassword} className="flex items-center gap-1 font-medium"><KeyRound size={12} /> Change password</button>
          <button onClick={onSignOut} className="flex items-center gap-1 font-medium"><LogOut size={12} /> Sign out</button>
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
  const [spelling, setSpelling] = useState("autocorrect");
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
    const taken = new Set();
    const roster = parsed.map(({ name, pin }) => ({ name, slug: slugify(name, taken), pin: pin || genPin() }));
    // Codes are random; on the rare clash with an existing batch, just try another.
    let batch = null;
    for (let attempt = 0; attempt < 5 && !batch; attempt++) {
      const { data, error } = await supabase.from("batches")
        .insert({ code: makeCode(), assessment_type: type, prompt: prompt.trim(), spelling_mode: spelling })
        .select().single();
      if (error && error.code !== "23505") throw error;
      batch = data;
    }
    if (!batch) throw new Error("Couldn't find a free batch code — please try again.");
    const { error } = await supabase.from("participants").insert(
      roster.map((r, i) => ({ batch_id: batch.id, position: i, name: r.name, slug: r.slug, pin: r.pin })));
    if (error) throw error;
    setCreated({ id: batch.id, code: batch.code, roster });
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
            <button onClick={() => onCreated(created.id)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-md py-2.5" style={{ background: C.navy, color: "#fff" }}>
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

          <label className="text-sm font-medium block mb-1.5" style={{ color: C.navy }}>Spelling help</label>
          <SpellingPicker value={spelling} onChange={setSpelling} />

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
function SpellingPicker({ value, onChange, compact = false }) {
  return (
    <div className={compact ? "" : "mb-4"}>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(SPELLING_MODES).map(([k, m]) => (
          <button key={k} type="button" onClick={() => onChange(k)} className="text-xs font-medium rounded-md py-2 px-1"
            style={{ border: `1px solid ${value === k ? C.teal : C.border}`, background: value === k ? C.tealSoft : C.panel, color: value === k ? C.navy : C.muted }}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="text-xs mt-1.5" style={{ color: C.muted }}>{SPELLING_MODES[value].help}</div>
    </div>
  );
}

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
function CoachDashboard({ batchId, onBack }) {
  const [batch, setBatch] = useState(null);
  const [rows, setRows] = useState({});
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [openSlug, setOpenSlug] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const [b, ps] = await Promise.all([
        supabase.from("batches").select("*").eq("id", batchId).single(),
        supabase.from("participants").select("*").eq("batch_id", batchId).order("position"),
      ]);
      if (stop) return;
      if (b.error || ps.error) { setLoadError(dbErrorMessage(b.error || ps.error)); return; }
      setLoadError(null);
      const participants = ps.data.map(participantFromRow);
      setBatch({ ...batchFromRow(b.data), roster: participants.map(({ name, slug }) => ({ name, slug })) });
      const next = {};
      participants.forEach((p) => { next[p.slug] = p; });
      setRows(next);
    };
    poll();
    const iv = setInterval(poll, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearInterval(iv); clearInterval(clock); };
  }, [batchId, openSlug]);

  const code = batch ? batch.code : "";
  const copyCode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(code);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const endBatch = async () => {
    setEnding(true);
    const { data, error } = await supabase.from("batches")
      .update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", batchId).select().single();
    if (error) setLoadError(dbErrorMessage(error));
    else setBatch((cur) => ({ ...cur, ...batchFromRow(data) }));
    setEnding(false);
    setConfirmEnd(false);
  };

  const changeSpelling = async (mode) => {
    setBatch((cur) => ({ ...cur, spellingMode: mode }));
    const { error } = await supabase.from("batches").update({ spelling_mode: mode }).eq("id", batchId);
    if (error) setLoadError(dbErrorMessage(error));
  };

  if (!batch) {
    if (loadError) return <Card onBack={onBack} width="max-w-md"><div className="text-sm" style={{ color: C.red }}>{loadError}</div></Card>;
    return <Spinner />;
  }

  if (openSlug) {
    const r = batch.roster.find((x) => x.slug === openSlug);
    return <ParticipantDetail batchId={batchId} batchStatus={batch.status} rosterEntry={r} onBack={() => setOpenSlug(null)} />;
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

        {loadError && <div className="text-xs mb-3 break-words" style={{ color: C.red }}>{loadError}</div>}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[["Roster", batch.roster.length], ["Joined", joined], ["Submitted", submitted], ["Avg. words", avgWords]].map(([label, val]) => (
            <div key={label} className="rounded-lg p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="text-xs font-medium" style={{ color: C.muted }}>{label}</div>
              <div className="text-xl font-bold mt-1" style={{ color: C.navy }}>{val}</div>
            </div>
          ))}
        </div>

        {batch.status === "active" && (
          <div className="rounded-lg p-4 mb-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-xs font-semibold mb-2" style={{ color: C.navy }}>Spelling help for this batch <span className="font-normal" style={{ color: C.muted }}>· changes reach participants within a few seconds</span></div>
            <SpellingPicker compact value={batch.spellingMode || "autocorrect"} onChange={changeSpelling} />
          </div>
        )}

        <div className="mb-5"><FlagLegend /></div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {batch.roster.map((r) => {
            const p = rows[r.slug];
            // Someone who closed their browser before the batch ended never gets locked by their own
            // device, so show them as locked here; their last autosave is what's kept.
            const status = !p ? "unjoined"
              : (batch.status === "ended" && p.status === "writing" && !p.reopened) ? "locked" : p.status;
            const flags = p ? computeFlags(p) : {};
            return (
              <button key={r.slug} onClick={() => setOpenSlug(r.slug)} className="text-left rounded-lg p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold" style={{ color: C.navy }}>{r.name}</div>
                  <ChevronRight size={14} style={{ color: C.mutedLight }} />
                </div>
                <div className="mt-1.5"><StatusPill status={status} /></div>
                <div className="text-xs mt-2" style={{ color: C.muted }}>{p ? `${p.wordCount || 0} words` : "—"}</div>
                {p && p.pinFailures >= PIN_LOCKOUT && (
                  <div className="text-[11px] font-medium mt-1.5" style={{ color: C.red }}>Locked out: too many wrong PINs</div>
                )}
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
function ParticipantDetail({ batchId, batchStatus, rosterEntry, onBack }) {
  const [p, setP] = useState(null);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from("participants").select("*")
      .eq("batch_id", batchId).eq("slug", rosterEntry.slug).single();
    if (err) { setError(dbErrorMessage(err)); return null; }
    const v = participantFromRow(data);
    setP(v);
    return v;
  }, [batchId, rosterEntry.slug]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const flags = p ? computeFlags(p) : {};
  const chartData = p ? (p.activityLog || []).map((e) => ({ min: Math.round((e.t - (p.claimedAt || e.t)) / 60000), words: e.words })) : [];
  const shownStatus = p && batchStatus === "ended" && p.status === "writing" && !p.reopened ? "locked" : p && p.status;
  const canReopen = p && (shownStatus === "submitted" || shownStatus === "locked");
  // Participant writing is shown as formatted text; DOMPurify strips anything that could run code in the coach's browser.
  const safeHtml = p && p.content ? DOMPurify.sanitize(p.content) : "";

  const update = async (patch) => {
    setError(null);
    const { error: err } = await supabase.from("participants").update(patch).eq("id", p.id);
    if (err) setError(dbErrorMessage(err));
    await load();
  };
  const reopen = async () => {
    setReopening(true);
    const existing = await load();
    if (existing) {
      await update({
        status: "writing", submitted_at: null, reopened: true,
        reopen_log: [...(existing.reopenLog || []), { reopenedAt: Date.now(), fromStatus: existing.status, previousSubmittedAt: existing.submittedAt }],
      });
    }
    setReopening(false);
    setConfirmReopen(false);
  };
  const unlockPin = () => update({ pin_failures: 0 });

  return (
    <div className="min-h-screen w-full p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back to batch</button>

        <div className="rounded-xl p-7 mb-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xl font-semibold" style={{ color: C.navy }}>{rosterEntry.name}</div>
          {error && <div className="text-xs mt-2 break-words" style={{ color: C.red }}>{error}</div>}
          {p && p.pinFailures >= PIN_LOCKOUT && (
            <div className="rounded-lg p-3.5 mt-3 flex items-center justify-between gap-3" style={{ background: C.redSoft }}>
              <div className="text-xs" style={{ color: C.red }}>Locked out after {p.pinFailures} wrong PINs in a row. If it was them mistyping, unlock and they can try again.</div>
              <button onClick={unlockPin} className="text-xs font-semibold rounded-md px-2.5 py-1.5 shrink-0" style={{ background: C.red, color: "#fff" }}>Unlock</button>
            </div>
          )}
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
              <div className="mt-2 flex items-center gap-2"><StatusPill status={shownStatus} />{p.reopened && p.status === "writing" && (
                <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: C.navySoft, color: C.navy }}>Reopened by you</span>
              )}</div>
              <div className="flex gap-6 mt-4">
                <div><div className="text-xs" style={{ color: C.muted }}>Word count</div><div className="text-lg font-semibold" style={{ color: C.navy }}>{p.wordCount || 0}</div></div>
                <div><div className="text-xs" style={{ color: C.muted }}>Submitted</div><div className="text-lg font-semibold" style={{ color: C.navy }}>{p.submittedAt ? new Date(p.submittedAt).toLocaleTimeString() : "—"}</div></div>
              </div>
              <FlagBadges flags={flags} />
              {p.autocorrectCount > 0 && (
                <div className="text-xs mt-3" style={{ color: C.muted }} title="Spelling help, not a flag">
                  Autocorrected {p.autocorrectCount} word{p.autocorrectCount === 1 ? "" : "s"}
                  {p.autocorrectLog.length > 0 && `: ${p.autocorrectLog.slice(-8).map((a) => `${a.from} → ${a.to}`).join(", ")}${p.autocorrectLog.length > 8 ? ", …" : ""}`}
                </div>
              )}
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
            ? <div className="text-sm leading-relaxed" style={{ color: C.text }} dangerouslySetInnerHTML={{ __html: safeHtml }} />
            : <div className="text-sm" style={{ color: C.mutedLight }}>Nothing written yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- Coach: history (only this coach's own batches — enforced by the database) ----------
function CoachHistory({ onOpen, onBack }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.from("batches")
        .select("id, code, assessment_type, prompt, status, created_at, participants(count)")
        .order("created_at", { ascending: false });
      if (err) { setError(dbErrorMessage(err)); setItems([]); return; }
      setItems(data);
    })();
  }, []);

  return (
    <div className="min-h-screen w-full p-6" style={{ background: C.bg, fontFamily: FONT }}>
      <div className="max-w-xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>
        <div className="text-lg font-semibold mb-4" style={{ color: C.navy }}>My batches</div>
        {error && <div className="text-xs mb-3 break-words" style={{ color: C.red }}>{error}</div>}
        {items === null && <Loader2 className="animate-spin" size={20} style={{ color: C.teal }} />}
        {items && items.length === 0 && !error && <div className="text-sm" style={{ color: C.muted }}>No batches yet.</div>}
        <div className="space-y-2">
          {items && items.map((b) => {
            const count = b.participants && b.participants[0] ? b.participants[0].count : 0;
            return (
              <button key={b.id} onClick={() => onOpen(b.id)} className="w-full flex items-center justify-between gap-3 text-left rounded-lg p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: C.navy }}>{ASSESSMENT_LABELS[b.assessment_type]} · <span className="font-mono">{b.code}</span></div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{b.prompt}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.mutedLight }}>{count} participants · {new Date(b.created_at).toLocaleDateString()}</div>
                </div>
                <span className="text-xs font-medium rounded-full px-2.5 py-1 shrink-0" style={{ background: b.status === "ended" ? C.greenSoft : C.amberSoft, color: b.status === "ended" ? C.green : C.amber }}>
                  {b.status === "ended" ? "Completed" : "In progress"}
                </span>
              </button>
            );
          })}
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
    try {
      const r = await rpc("join_lookup", { p_code: c });
      if (r.error === "not_found") setError("That code wasn't found. Double-check with your coach.");
      else if (r.error === "ended") setError("This batch has already ended.");
      else {
        const t = {};
        r.roster.forEach((x) => { t[x.slug] = x.status; });
        setBatch({ code: c, assessmentType: r.assessment_type, roster: r.roster });
        setTaken(t);
      }
    } catch (err) { setError(dbErrorMessage(err)); }
    setLoading(false);
  };

  const pickName = (slug, name) => { setSelected({ slug, name }); setPin(""); setError(null); };

  const CLAIM_ERRORS = {
    not_found: "Something's off with that name — check with your coach.",
    already_submitted: (name) => `${name} has already submitted for this batch. If that's not you, check with your coach.`,
    ended: "This batch has already ended.",
    bad_pin: "That PIN doesn't match. Check with your coach if you're not sure of it.",
    locked_out: "Too many wrong PINs for this name, so it's been locked. Ask your coach to unlock it.",
  };
  const claim = async () => {
    const { slug, name } = selected;
    setClaiming(true); setError(null);
    // This device's private token for this (batch, name), if it joined before. Sending it back lets a
    // refresh on the SAME device resume quietly; a DIFFERENT device gets a new token and it's logged.
    const storageKey = `law-device-${batch.code}-${slug}`;
    let myToken = null;
    try { myToken = window.localStorage.getItem(storageKey); } catch { /* private browsing etc. */ }
    try {
      const r = await rpc("participant_claim", { p_code: batch.code, p_slug: slug, p_pin: pin.trim(), p_device_token: myToken });
      if (r.error) {
        const msg = CLAIM_ERRORS[r.error] || "Couldn't join — check with your coach.";
        setError(typeof msg === "function" ? msg(name) : msg);
        setClaiming(false);
        return;
      }
      try { window.localStorage.setItem(storageKey, r.token); } catch { /* ignore */ }
      window.__lawSlug = slug;
      window.__lawDeviceToken = r.token;
      onJoined(batch.code);
    } catch (err) { setError(dbErrorMessage(err)); setClaiming(false); }
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
const FONT_SIZES = [{ v: "2", l: "Small" }, { v: "3", l: "Normal" }, { v: "4", l: "Medium" }, { v: "5", l: "Large" }, { v: "6", l: "X-Large" }];
const COLORS = ["#1F2937", "#B91C1C", "#1D4ED8", "#15803D", "#B45309"];
const LINE_SPACINGS = [{ v: "1.15", l: "Single" }, { v: "1.5", l: "1.5 lines" }, { v: "2", l: "Double" }];

function ParticipantWrite({ code, onLeave }) {
  const slug = window.__lawSlug;
  const myDeviceToken = window.__lawDeviceToken;
  const [batch, setBatch] = useState(null);
  const spellingMode = (batch && batch.spelling_mode) || "autocorrect";
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
  const autocorrectCountRef = useRef(0);
  const autocorrectLogRef = useRef([]);
  const streakRef = useRef({ start: 0, last: 0, startWords: 0 });

  // Load this participant's saved state from the server into the trackers above.
  const applyServerState = (me) => {
    claimedAtRef.current = me.claimed_at || Date.now();
    activityLogRef.current = me.activity_log || [];
    focusLogRef.current = me.focus_log || [];
    backspaceCountRef.current = me.backspace_count || 0;
    keyCountRef.current = me.key_count || 0;
    pasteAttemptsRef.current = me.paste_attempts || 0;
    pasteLogRef.current = me.paste_log || [];
    copyAttemptsRef.current = me.copy_attempts || 0;
    copyLogRef.current = me.copy_log || [];
    longestStreakMsRef.current = Number(me.longest_streak_ms) || 0;
    longestStreakWordsRef.current = me.longest_streak_words || 0;
    autocorrectCountRef.current = me.autocorrect_count || 0;
    autocorrectLogRef.current = me.autocorrect_log || [];
    setWordCount(me.word_count || 0);
  };
  const sync = (data, final, full) => rpc("participant_sync", {
    p_code: code, p_slug: slug, p_token: myDeviceToken, p_data: data, p_final: final, p_full: full,
  });
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    (async () => {
      let r;
      try { r = await sync(null, null, true); }
      catch (err) { setLoadError(dbErrorMessage(err)); return; }
      if (r.superseded) { setSuperseded(true); setBatch({}); return; }
      if (r.error) { setLoadError("This batch couldn't be found. Check with your coach."); return; }
      applyServerState(r.me);
      initialContentRef.current = r.me.content || "";
      if (r.me.status === "submitted" || r.me.status === "locked") { setLocked(r.me.status === "locked"); setSubmitted(true); }
      setBatch(r.batch); // only now does the editor appear on screen
    })();
  }, [code, slug]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // With spelling help on, right-click stays available for spelling suggestions. Paste/Copy/Cut
    // chosen from that menu still fire the events above, so they're still blocked and counted.
    const blockContext = (e) => { if (spellingMode === "off") e.preventDefault(); };
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
  }, [submitted, batch, spellingMode]);

  // Word-style autocorrect: when a space or punctuation mark is typed, fix the word just before it if it's
  // on the list in src/autocorrect.js. Uses the browser's own text insertion, so Ctrl+Z undoes it like in Word.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || submitted || spellingMode !== "autocorrect") return;
    const onTyped = (e) => {
      if (e.inputType !== "insertText" || !e.data || !/^[\s.,;:!?)"\]]$/.test(e.data)) return;
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeType !== Node.TEXT_NODE) return;
      const node = sel.anchorNode;
      const before = node.data.slice(0, sel.anchorOffset - e.data.length);
      const m = before.match(/(^|[^A-Za-z'])([A-Za-z']+)$/);
      if (!m) return;
      const word = m[2];
      const fix = autocorrectWord(word);
      if (!fix) return;
      const start = before.length - word.length;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + word.length);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("insertText", false, fix);
      for (let i = 0; i < e.data.length; i++) sel.modify("move", "forward", "character"); // back past the space
      autocorrectCountRef.current += 1;
      autocorrectLogRef.current = [...autocorrectLogRef.current, { t: Date.now(), from: word, to: fix }];
      dirty.current = true;
    };
    el.addEventListener("input", onTyped);
    return () => el.removeEventListener("input", onTyped);
  }, [submitted, batch, spellingMode]);

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

  // Save (if anything changed) and read back status. The server decides whether this answer is now
  // submitted or locked (e.g. the coach ended the batch). Returns false if the save didn't go through.
  const doSync = useCallback(async (finalStatus) => {
    let payload = null;
    if (dirty.current || finalStatus) {
      const html = editorRef.current ? editorRef.current.innerHTML : "";
      const text = editorRef.current ? (editorRef.current.innerText || "") : "";
      const words = (text.trim().match(/\S+/g) || []).length;
      const now = Date.now();
      if (now - lastActivityLogAt.current > ACTIVITY_LOG_GAP_MS) {
        lastActivityLogAt.current = now;
        activityLogRef.current = [...activityLogRef.current, { t: now, words }];
      }
      payload = {
        content: html, wordCount: words,
        activityLog: activityLogRef.current, focusLog: focusLogRef.current,
        backspaceCount: backspaceCountRef.current, keyCount: keyCountRef.current,
        pasteAttempts: pasteAttemptsRef.current, pasteLog: pasteLogRef.current,
        copyAttempts: copyAttemptsRef.current, copyLog: copyLogRef.current,
        longestStreakMs: longestStreakMsRef.current, longestStreakWords: longestStreakWordsRef.current,
        autocorrectCount: autocorrectCountRef.current, autocorrectLog: autocorrectLogRef.current,
      };
      setWordCount(words);
      setSaveState("saving");
      dirty.current = false; // anything typed while this save is in flight marks it dirty again
    }
    let r;
    try { r = await sync(payload, finalStatus || null, false); }
    catch {
      if (payload) { dirty.current = true; setSaveState("error"); }
      return false;
    }
    // Another device has since joined as this name — it's now the one being saved.
    if (r.superseded) { setSuperseded(true); return false; }
    if (r.error) { if (payload) { dirty.current = true; setSaveState("error"); } return false; }
    if (payload) setSaveState("saved");
    if (r.batch) {
      // Pick up the coach changing the spelling setting mid-batch.
      if (batchRef.current && r.batch.spelling_mode !== batchRef.current.spelling_mode) setBatch(r.batch);
      batchRef.current = r.batch;
    }
    if (r.me.status === "submitted" || r.me.status === "locked") { setLocked(r.me.status === "locked"); setSubmitted(true); }
    return true;
  }, [code, slug, myDeviceToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const onInput = () => { dirty.current = true; };

  // Periodic save + status check (the server locks the answer once the coach ends the batch,
  // unless the coach has explicitly reopened this person), plus the gentle time reminders.
  const batchRef = useRef(null);
  useEffect(() => { if (batch && batch.created_at) batchRef.current = batch; }, [batch]);
  useEffect(() => {
    if (submitted || superseded || !batch) return;
    const iv = setInterval(async () => {
      await doSync();
      const b = batchRef.current;
      if (b) {
        const elapsedMin = Math.floor((Date.now() - b.created_at) / 60000);
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
  }, [doSync, submitted, superseded, batch]);

  // While on the "submitted/locked" screen, watch for the coach reopening this document
  const pendingContentRef = useRef(null);
  useEffect(() => {
    if (!submitted || superseded) return;
    const iv = setInterval(async () => {
      let r;
      try { r = await sync(null, null, true); } catch { return; }
      if (r.superseded) { setSuperseded(true); return; }
      if (r.me && r.me.status === "writing") {
        applyServerState(r.me);
        pendingContentRef.current = r.me.content || "";
        setLocked(false);
        setSubmitted(false);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [submitted, superseded, code, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore the document content once the editor reappears after a reopen
  useEffect(() => {
    if (!submitted && pendingContentRef.current !== null && editorRef.current) {
      editorRef.current.innerHTML = pendingContentRef.current;
      pendingContentRef.current = null;
      flashBanner("Your coach reopened this for editing.");
    }
  }, [submitted]);

  const [submitError, setSubmitError] = useState(null);
  const submitNow = async () => {
    setSubmitError(null);
    const ok = await doSync("submitted");
    if (ok) setSubmitted(true);
    else setSubmitError("Couldn't submit — check your internet connection and try again. Your writing is still here.");
    setConfirmSubmit(false);
  };

  // Remember where the cursor/selection was in the editor, so picking from a dropdown (which moves
  // focus away) still applies the formatting to the text the writer had selected.
  const savedRange = useRef(null);
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);
  // Fonts on this device (worked out once), split like Word's menu into common fonts and all fonts.
  const [fonts] = useState(() => availableFonts());
  const [startFont] = useState(() => defaultFont());
  const [font, setFont] = useState(() => startFont.name);
  const commonFonts = COMMON_FONTS.map((n) => fonts.find((f) => f.name === n)).filter(Boolean);

  const exec = (cmd, val = null) => {
    editorRef.current.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    document.execCommand(cmd, false, val);
    onInput();
  };

  if (loadError) return <Card onBack={onLeave}><div className="text-sm break-words" style={{ color: C.red }}>{loadError}</div></Card>;
  if (!batch) return <Spinner />;

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
          <div className="text-sm font-semibold" style={{ color: "#fff" }}>{ASSESSMENT_LABELS[batch.assessment_type]}</div>
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
          <select value={font} onChange={(e) => { setFont(e.target.value); exec("fontName", fontByName(e.target.value).stack); }}
            aria-label="Font" className="text-xs rounded px-2 py-1.5 outline-none" style={{ border: `1px solid ${C.border}`, maxWidth: 170 }}>
            <optgroup label="Common fonts">
              {commonFonts.map((f) => <option key={"c-" + f.name} value={f.name} style={{ fontFamily: f.stack }}>{f.name}</option>)}
            </optgroup>
            <optgroup label="All fonts">
              {fonts.map((f) => <option key={f.name} value={f.name} style={{ fontFamily: f.stack }}>{f.name}</option>)}
            </optgroup>
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
          spellCheck={spellingMode !== "off"}
          autoCorrect={spellingMode === "off" ? "off" : "on"}
          autoCapitalize={spellingMode === "off" ? "off" : "sentences"}
          data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"
          className="flex-1 rounded-b-xl px-5 py-4 text-sm outline-none overflow-y-auto"
          style={{ background: "#fff", border: `1px solid ${C.border}`, minHeight: 280, lineHeight: lineSpacing, color: C.text, fontFamily: startFont.stack, fontSize: 15 }}
        />
        <style>{`
          [contenteditable] div, [contenteditable] p { margin-bottom: ${paraSpaced ? "10px" : "0px"}; }
        `}</style>

        {submitError && <div className="text-xs mt-3" style={{ color: C.red }}>{submitError}</div>}
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
