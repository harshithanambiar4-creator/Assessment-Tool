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

export const supabase = createClient(url || "http://missing", anonKey || "missing");
