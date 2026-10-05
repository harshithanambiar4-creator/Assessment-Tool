# Live Assessment Writer

A writing assessment tool for groups who all write at the same time. Participants type their answers into a box that blocks pasting. The coach sees a live dashboard with flags for possible cheating.

- **Website**: hosted on **Render** (free). This is the part people open in their browser.
- **Database**: hosted on **Supabase** (free). This is where batches, answers and flags are saved.
- **Code**: kept on **GitHub**. When you change the code here, Render rebuilds the site automatically.

How it fits together:

```
Participants' browsers ─┐
                        ├──>  Render (serves the website)  ──>  Supabase (stores everything)
Coach's browser ────────┘
```

---

## Step-by-step setup (about 30 minutes, no coding needed)

### Step 1: Create a Supabase project (the database)

1. Go to <https://supabase.com> and sign up. Signing in with GitHub is easiest.
2. Click **New project**.
   - Name: `assessment-tool`
   - Database password: click **Generate**, then save the password somewhere safe. You won't need it for this app.
   - Region: pick the one closest to your participants.
3. Wait about 2 minutes while the project is created.

### Step 2: Create the table

1. In your Supabase project, open **SQL Editor** in the left sidebar and click **New query**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) in this repository. Copy everything in it and paste it into the query box.
3. Click **Run**. You should see "Success. No rows returned".
4. To check it worked, open **Table Editor** in the left sidebar. You should see a table called `kv`.

### Step 3: Copy your two Supabase keys

1. In Supabase, go to **Project Settings**, then **API** (on some versions it's called **Data API** or **API Keys**).
2. Copy these two values into a note. You'll need them in Step 5:
   - **Project URL**. It looks like `https://abcdefgh.supabase.co`.
   - **anon public** key. It's a long string starting with `eyJ...`, or `sb_publishable_...` on newer projects.

   ⚠️ Never use the **service_role** or **secret** key. That key is an admin password for your database.

### Step 4: Create a `main` branch on GitHub

The code is on the branch `claude/multiuser-assessment-deployment-0z6pgo`. It's convenient to have a simply named `main` branch that the live site follows:

1. Open your repository on GitHub. Click the branch dropdown near the top left (it shows the `claude/...` name).
2. Type `main` in the box, then click **Create branch: main from 'claude/...'**.
3. Go to **Settings**, then **General**, then **Default branch**. Switch it to `main` and confirm.

From now on, new work arrives on other branches as **pull requests**. Clicking **Merge** on a pull request puts the changes into `main`, and Render updates the live site automatically.

### Step 5: Put the website on Render

1. Go to <https://render.com> and sign up with your **GitHub** account.
2. Click **New +**, then **Static Site**.
3. Connect GitHub if Render asks, then pick the **Assessment-Tool** repository.
4. Fill in the form:
   | Field | Value |
   |---|---|
   | Name | `live-assessment-writer` (this becomes part of your web address) |
   | Branch | `main` |
   | Build Command | `npm install && npm run build` |
   | Publish Directory | `dist` |
5. Scroll to **Environment Variables**, click **Add Environment Variable**, and add both of these:
   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | the Project URL from Step 3 |
   | `VITE_SUPABASE_ANON_KEY` | the anon public key from Step 3 |
6. Click **Create Static Site**. The build takes 1–3 minutes. When it says **Live**, your site is at an address like `https://live-assessment-writer.onrender.com`.

> If you add or change environment variables later, click **Manual Deploy → Deploy latest commit**. The keys are built into the site at deploy time, so changes only take effect after a new deploy.

### Step 6: Try it yourself before using it with a group

1. **Coach side**: open `https://YOUR-SITE.onrender.com/#coach`. Note the `#coach` at the end.
   - The first time, it asks you to **set a coach passphrase**. Choose one and don't share it with participants.
   - Click **New batch**. Enter a prompt and a few test names, one per line. Click **Create batch**.
   - You'll see each person's **PIN** and a 6-letter **batch code**.
2. **Participant side**: open `https://YOUR-SITE.onrender.com` (no `#coach`) in a **different browser or a private window**, ideally on your phone too.
   - Enter the batch code, pick a name, enter that person's PIN, and start writing.
   - Try pasting (Ctrl+V). It's blocked, and a **Paste attempt** flag appears on the coach dashboard within about 5 seconds.
   - Switch to another tab and come back. A **Left window** flag appears.
3. On the coach dashboard, click a person's tile to see their writing, a words-over-time chart and their flags.
4. Click **End batch now** to lock everyone's answers.

### Step 7: Use it with a real group

- Send everyone the plain link and the batch code (the group chat is fine for these).
- Send each person their **PIN privately**.
- Keep the dashboard open while they write.

---

## The flags (and how to change them)

| Flag | What it means |
|---|---|
| **Paste attempt ×N** | Tried to paste or drag text in. The paste was blocked, but the attempt was recorded. |
| **Non-stop N min** | Typed for N minutes without pausing more than 5 seconds. This can suggest copying from another source by hand. |
| **Idle → burst** | Paused for 2+ minutes, then added 25+ words very quickly. |
| **Left window ×N** | Switched to another tab or app. Being on a Zoom call can also trigger this. |
| **Few corrections** | Wrote 40+ words with almost no backspaces. This is the weakest signal. |
| **New device ×N** | The same name was opened on a second device or browser. |

Flags are reasons to ask a follow-up question, not proof of cheating.

You can change the thresholds at the top of [`src/App.jsx`](src/App.jsx). You can edit the file directly on GitHub: open it, click the ✏️ pencil icon, change a number, then click **Commit changes**. Render redeploys automatically within a couple of minutes.

```js
const PAUSE_MIN_IDLE_MIN = 2;      // idle → burst: minutes idle
const PAUSE_MIN_BURST_WORDS = 25;  // idle → burst: words that appeared
const LOW_REVISION_MIN_WORDS = 40;
const LOW_REVISION_RATE = 0.02;    // fewer than 2% backspaces = "few corrections"
const STREAK_BREAK_SEC = 5;        // a pause this long ends a "non-stop" streak
const NONSTOP_FLAG_MIN = 4;        // flag a streak longer than this many minutes
const PASTE_FLAG_MIN_ATTEMPTS = 1; // flag on the first paste attempt
const TARGET_MINUTES = 30;         // the soft time target shown to everyone
```

---

## Security: please read

This version keeps the security level of the original prototype, which suits **low-stakes internal assessments** only.

- The passphrase keeps casual participants out of the coach screens. It is **not** real security.
- A participant with technical skills could use their browser's developer tools to query the database directly. They could read other people's PINs and answers, or change records.

**Before using this for anything high-stakes or with outside people**, the next step is to add:
1. a proper coach login using Supabase Auth, and
2. database rules so participants can only read and write their own record and PINs are checked on the server.

---

## Running it on your own computer (optional)

You only need this if you want to make changes and preview them before they go live.

1. Install **Node.js** (the LTS version) from <https://nodejs.org>.
2. Download this repository. On GitHub, click **Code**, then **Download ZIP**, and unzip it. If you use git, run `git clone` instead.
3. In the project folder, make a copy of `.env.example` named `.env` and put your two Supabase values in it.
4. Open a terminal in that folder and run:
   ```
   npm install
   npm run dev
   ```
5. Open the address it prints, usually <http://localhost:5173>.

## Files

| File | What it is |
|---|---|
| `src/App.jsx` | The whole app (participant screens, coach screens, flags) |
| `src/supabaseClient.js` | Connects the app to Supabase |
| `supabase/schema.sql` | Creates the database table (run once in Supabase) |
| `render.yaml` | Optional automatic Render setup ("New → Blueprint") |
| `index.html`, `src/main.jsx`, `vite.config.js`, `package.json` | Standard setup files; you won't need to touch these |

## Troubleshooting

- **The coach page spins forever, or "That code wasn't found"**: the Supabase keys are probably missing or wrong. Check both environment variables in Render (Step 5), redeploy, and confirm you ran `schema.sql` (Step 2).
- **Nothing happens after a while on Supabase's free plan**: Supabase pauses free projects after about a week with no activity. Open your Supabase dashboard and click **Restore project** before a session.
- **To see actual errors**: in Chrome, press F12 and open the **Console** tab. Errors mentioning `getShared` or `setShared` are database problems.
