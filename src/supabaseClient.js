import { createClient } from "@supabase/supabase-js";

// These two values come from your Supabase project (Project Settings → API).
// Locally they live in a file called .env; on Render they are set as Environment Variables.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Shows up in the browser console if the keys are missing — the most common setup mistake.
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. See README.md, step 3.");
}

export const supabase = createClient(url || "http://missing", anonKey || "missing");
