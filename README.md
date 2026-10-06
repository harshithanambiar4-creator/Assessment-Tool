# Live Assessment Writer

A writing assessment tool for groups who all write at the same time. Participants type their answers into a box that blocks pasting. Each coach signs in with their own account and sees a live dashboard of their own batches, with flags for possible cheating.

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

### Step 2: Create the database tables

1. In your Supabase project, open **SQL Editor** in the left sidebar and click **New query**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) in this repository. Copy everything in it and paste it into the query box.
3. Click **Run**. If Supabase warns about a "destructive operation", click **Run this query**. You should see "Success. No rows returned".
4. To check it worked, open **Table Editor** in the left sidebar. You should see two tables, `batches` and `participants`.

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

### Step 6: Set up coach logins (in Supabase)

**A) Stop strangers from signing up**
1. In Supabase, open **Authentication** in the left sidebar, then **Sign In / Providers**. On some versions it's under **Settings**.
2. Turn **off** "Allow new users to sign up", then click **Save**.

**B) Tell Supabase your website's address.** Password-reset emails link back to this address.
1. In **Authentication**, open **URL Configuration**.
2. Set **Site URL** to your Render address, for example `https://assessment-tool-hn.onrender.com`. Click **Save**.
3. Under **Redirect URLs**, click **Add URL** and enter the same address with `/**` on the end, for example `https://assessment-tool-hn.onrender.com/**`. Click **Save**.

**C) Add each coach.** Repeat this for every coach.
1. In **Authentication**, open **Users**, then click **Add user** and **Create new user**.
2. Enter the coach's **email** and a **temporary password**. Tick **Auto Confirm User**, then click **Create user**.
3. Send the coach the link `https://YOUR-SITE.onrender.com/#coach`, their email and the temporary password. They should click **Change password** after their first sign-in.

To remove a coach later, find them in **Users**, click **⋯** and choose **Delete user**. Their batches are deleted with them.

### Step 7: Try it yourself before using it with a group

1. **Coach side**: open `https://YOUR-SITE.onrender.com/#coach` (note the `#coach` at the end) and sign in.
   - Click **New batch**. Enter a prompt and a few test names, one per line. Click **Create batch**.
   - You'll see each person's **PIN** and a 6-letter **batch code**.
2. **Participant side**: open `https://YOUR-SITE.onrender.com` (no `#coach`) in a **different browser or a private window**, ideally on your phone too.
   - Enter the batch code, pick a name, enter that person's PIN, and start writing.
   - Try pasting (Ctrl+V). It's blocked, and a **Paste attempt** flag appears on the coach dashboard within about 5 seconds.
   - Switch to another tab and come back. A **Left window** flag appears.
3. On the coach dashboard, click a person's tile to see their writing, a words-over-time chart and their flags.
4. Click **End batch now** to lock everyone's answers.

### Step 8: Use it with a real group

- Send everyone the plain link and the batch code (the group chat is fine for these).
- Send each person their **PIN privately**.
- Keep the dashboard open while they write.
- If someone types a wrong PIN 10 times, their name is locked. Click their tile on the dashboard and choose **Unlock**.

---

## The flags (and how to change them)

| Flag | What it means |
|---|---|
| **Paste attempt ×N** | Tried to paste or drag text in. The paste was blocked, but the attempt was recorded. |
| **Copy attempt ×N** | Tried to copy or cut text out of the prompt or their own answer. The copy was blocked, but the attempt was recorded. |
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

## Batch names

Every new batch needs a name in the standard format, **Wave 8, 2026** or **Wave 4.2, 2026**. Coaches fill in two boxes, **Wave** (e.g. `8` or `4.2`) and **Year** (filled in with the current year), and the tool writes the name itself, so it's always consistent.

- The name appears on the dashboard, in **My batches**, on the participant's screens (after they enter the code, and at the top while writing), and in the "Batch" line of downloaded files. The **Download all** ZIP is named after it, e.g. `Wave 8, 2026 - Baseline - coach copies.zip`.
- To change it, click **Rename** next to the name on the dashboard. Participants who are already writing see the new name within a few seconds. Batches created before names existed show "Unnamed batch" with an **Add name** button.
- Names don't have to be unique. Several coaches can each run "Wave 8, 2026"; every batch still has its own 6-letter code.

## What participants tried to paste or copy

When a paste or copy is blocked, the tool also records **the text involved**. The coach sees it on the participant's page under **Paste and copy attempts**, and in the coach copy of their file.

- **Recorded:** text they tried to paste or drag into the writing area, and text they selected and tried to copy from the prompt or their own answer. Up to 5,000 characters are kept from each attempt; longer text is cut off with a note. After about 100,000 characters in total, further attempts are still counted but their text isn't kept.
- **Not recorded:** anything copied elsewhere (another tab or app), and the content of pasted images or files (only the fact that one was included). On some phone keyboards (e.g. Gboard's clipboard suggestions), a paste can look like ordinary typing and may not be detected at all.
- **Privacy:** people sometimes have unrelated private text on their clipboard. Participants see a notice on the PIN screen, before they join, saying that attempts and their text are recorded and visible to the coach. Check this fits your organisation's data policy.

## Downloading answers (Word and PDF)

Files are named with the participant's name and the date and time of submission, e.g. `Ann Lee - 2026-10-06 14.32.docx`. Times are in the downloading computer's time zone.

| Copy | Contains | Who can download it |
|---|---|---|
| **Participant copy** | Name, batch, submission date and time, word count, and their answer | The participant, as **PDF or Print only** (no Word), on their "Submitted" / "Batch ended" screen. The coach can also download it in any format from the participant's page (named "… (participant copy)"). |
| **Coach copy** | The same, plus the prompt, a flags summary, and the paste/copy log on its own page | The coach only, from the participant's page, or **Download all (ZIP)** on the dashboard for every finished participant. |

Each copy is available as:
- **Word**, with bold, italics, underline, colours, fonts, alignment and lists kept.
- **PDF**, created automatically. The font files are checked as they load; a damaged one is re-downloaded or replaced with a similar style, and if a PDF still can't be made, the message says why (use Print / save as PDF instead). In "Download all", the Word files are always included even if a PDF fails. Fonts are drawn with free look-alikes (Calibri-, Arial-, Times- and Courier-style). English and other Latin-alphabet text works; other scripts (e.g. Hindi) and emoji may not show.
- **Print / save as PDF**, which opens a print view that looks exactly like the screen and shows every language. Choose "Save as PDF" as the printer.

Good to know:
- Participants can only download right after they finish. Once they close that page they can't get back in. If someone misses it, the coach can download their participant copy and send it to them.
- Someone who was still writing when the batch ended gets the batch's end time as their submission time.
- Everything is made in the browser: no extra cost, and no extra copies are stored anywhere.

## Spelling

The writing area has **no spell-checking and no autocorrect**: no red underlines, and nothing is changed automatically. What participants type is saved exactly as typed. Phone keyboards are asked not to autocorrect either. Most respect this, but a few keyboard apps may still suggest words. Grammar tools such as Grammarly are switched off in the writing area.

## Fonts

The font menu works like Word's: about 140 fonts from Word's list, plus common Mac fonts. Like Word, it can only show fonts that are **installed on the participant's device**, so each person sees the fonts their computer has.

Popular Office fonts have free look-alikes that load automatically, so they appear for everyone, including on Macs and phones. These are Arial, Calibri, Cambria, Times New Roman, Georgia, Garamond, Courier New, Comic Sans MS, Century Gothic, Franklin Gothic and Baskerville.

Aptos (Word's newest default) only appears where the computer has it installed. The writing area starts in Aptos if it's available, otherwise in Calibri.

## Capacity and data use

**Load test** (on a copy of the same database software Supabase uses, limited to one processor core): 80, 160 and 240 people writing at the same time, with coach dashboards open, gave no errors and no lost or changed answers. The typical save took about 5 ms. Even at 240 people, the database was at most a quarter busy. A separate test with 80 real browser windows typing into the app saved every word exactly. The expected peak of 60–80 people at once is well within capacity. Do a practice session on the live site before the first large assessment.

**Keeping data transfer low** (the free Supabase plan has a monthly allowance):
- Dashboard refreshes only load what the tiles show (status, word count, flags), about 1 KB per participant. Full answers and paste text are loaded only when you open a participant's page or download files.
- Dashboards refresh every 5 seconds while a batch is running, and once a minute after it has ended (unless someone has been reopened).
- Nothing refreshes while the tab is in the background; it catches up as soon as you switch back.

## Security

- **Coaches** each have their own email and password. A coach can only see and change their **own** batches. The database enforces this, not just the website.
- **Participants** never sign in and can't read the database directly. They can only:
  - look up the list of names for a batch code,
  - join with the right PIN,
  - save and read **their own** writing, using a private token their browser gets when they join.
- Other people's PINs and answers are never sent to participants.
- **10 wrong PINs** in a row lock that name until the coach unlocks it. This stops someone guessing PINs.
- Participants can't lower their own flag counts or erase their own activity logs. The database only ever keeps the higher number.
- Participants' writing is cleaned before it's shown to the coach, so text typed into an answer can't run code in the coach's browser.

What it still **can't** do:
- It can't see what happens off-screen, such as a phone next to the keyboard or a second monitor.
- A very technical participant could make their browser report fewer paste or copy attempts than really happened. Pasting itself is still blocked.

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
| `supabase/schema.sql` | Creates the database tables and security rules (run in Supabase; safe to run again) |
| `render.yaml` | Optional automatic Render setup ("New → Blueprint") |
| `index.html`, `src/main.jsx`, `vite.config.js`, `package.json` | Standard setup files; you won't need to touch these |

## Troubleshooting

- **A red "Can't reach the database" message**: the Supabase address or key in Render is missing or wrong. Check both environment variables (Step 5), then click **Manual Deploy → Deploy latest commit**.
- **"The database isn't set up yet"**: run `supabase/schema.sql` again (Step 2).
- **A coach can't sign in**: in Supabase **Authentication → Users**, check their email is listed and confirmed. If they forgot their password, they can click **Forgot password?** on the sign-in page. Supabase's free plan only sends a few emails per hour. If the email doesn't arrive, delete the user and create them again with a new temporary password.
- **A participant is "locked out: too many wrong PINs"**: open their tile on the dashboard and click **Unlock**.
- **Nothing happens after a while on Supabase's free plan**: Supabase pauses free projects after about a week with no activity. Open your Supabase dashboard and click **Restore project** before a session.
- **To see actual errors**: in Chrome, press F12 and open the **Console** tab.
