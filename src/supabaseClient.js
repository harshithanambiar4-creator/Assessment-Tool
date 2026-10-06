import { createClient } from "@supabase/supabase-js";

// These two values come from your Supabase project (Project Settings → API).
// Locally they live in a file called .env; on Render they are set as Environment Variables.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

// Keep only "https://xxxx.supabase.co". Some Supabase pages show the address with "/rest/v1/"
// on the end; the library adds that itself, so leaving it in breaks every request.
function cleanUrl(value) {
  if (!value) return "";
  try { return new URL(value).origin; } catch { return value; }
}
const url = cleanUrl(rawUrl);

if (!url || !anonKey) {
  // Shows up in the browser console if the keys are missing — the most common setup mistake.
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. See README.md, step 3.");
}

// Read the address bar BEFORE the Supabase library tidies it up. Password-reset and invite emails
// bring coaches back with "#access_token=…&type=recovery" (or an error) on the end of the link.
const initialHash = typeof window !== "undefined" ? window.location.hash : "";
const initialSearch = typeof window !== "undefined" ? window.location.search : "";

export const isAuthRedirect = /access_token=|error_description=/.test(initialHash);
export const needsNewPassword = /type=(recovery|invite)/.test(initialHash);
export const authLinkError = (() => {
  const m = initialHash.match(/error_description=([^&]*)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
})();
// The coach side opens from "/#coach", "/?coach", or a login link coming back from an email.
export const isCoachLink =
  initialHash.replace(/^#/, "").toLowerCase() === "coach" || /(^\?|&)coach(=|&|$)/i.test(initialSearch) || isAuthRedirect;

// A coach's sign-in pass lasts an hour and renews itself shortly before it runs out. If the computer's
// clock is behind, or the laptop was asleep, it can expire before renewing; the database then answers
// "JWT expired". When that happens, renew the pass once and repeat the request, so the coach never sees it.
let renewing = null;
async function fetchWithRenewal(input, init = {}) {
  const res = await fetch(input, init);
  const target = typeof input === "string" ? input : input.url;
  if (res.status !== 401 || !target.includes("/rest/v1/")) return res;
  if (!/jwt expired/i.test(await res.clone().text())) return res;
  if (!renewing) renewing = supabase.auth.refreshSession().finally(() => setTimeout(() => { renewing = null; }, 1000));
  const { data, error } = await renewing;
  if (error || !data || !data.session) {
    // The pass can't be renewed (e.g. signed out elsewhere): go back to the sign-in page.
    await supabase.auth.signOut({ scope: "local" });
    return res;
  }
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}

export const supabase = createClient(url || "http://missing", anonKey || "missing", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  global: { fetch: fetchWithRenewal },
});
