-- Live Assessment Writer: database setup (version 2, with coach logins).
-- Run this in Supabase → SQL Editor → New query → paste everything → Run.
-- It is safe to run more than once.
--
-- Who can do what:
--   * Coaches sign in with their own email + password (Supabase Auth). A coach can only see and
--     change their OWN batches and those batches' participants.
--   * Participants never sign in and can't read any table directly. They can only call the three
--     functions at the bottom: look up a batch's name list by code, join with the right PIN, and
--     save/read their OWN writing using the private token they got when joining.

-- The prototype's open key-value table. It only ever held test data.
drop table if exists public.kv;

-- ---------- Tables ----------
create table if not exists public.batches (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  coach_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assessment_type text not null,
  prompt          text not null,
  status          text not null default 'active' check (status in ('active', 'ended')),
  created_at      timestamptz not null default now(),
  ended_at        timestamptz
);

create table if not exists public.participants (
  id                   uuid primary key default gen_random_uuid(),
  batch_id             uuid not null references public.batches(id) on delete cascade,
  position             int  not null default 0,
  slug                 text not null,
  name                 text not null,
  pin                  text not null,
  status               text not null default 'unjoined' check (status in ('unjoined', 'writing', 'submitted', 'locked')),
  claimed_at           timestamptz,
  submitted_at         timestamptz,
  active_device_token  text,
  device_switches      int  not null default 0,
  device_switch_log    jsonb not null default '[]',
  pin_failures         int  not null default 0,
  reopened             boolean not null default false,
  reopen_log           jsonb not null default '[]',
  content              text not null default '',
  word_count           int  not null default 0,
  activity_log         jsonb not null default '[]',
  focus_log            jsonb not null default '[]',
  key_count            int  not null default 0,
  backspace_count      int  not null default 0,
  paste_attempts       int  not null default 0,
  paste_log            jsonb not null default '[]',
  copy_attempts        int  not null default 0,
  copy_log             jsonb not null default '[]',
  longest_streak_ms    bigint not null default 0,
  longest_streak_words int  not null default 0,
  updated_at           timestamptz not null default now(),
  unique (batch_id, slug)
);
create index if not exists participants_batch_idx on public.participants (batch_id);

-- ---------- Coach access (row-level security) ----------
alter table public.batches      enable row level security;
alter table public.participants enable row level security;

revoke all on public.batches, public.participants from anon;
grant select, insert, update on public.batches, public.participants to authenticated;

drop policy if exists "coach reads own batches"   on public.batches;
drop policy if exists "coach creates own batches" on public.batches;
drop policy if exists "coach updates own batches" on public.batches;
create policy "coach reads own batches"   on public.batches for select to authenticated using (coach_id = auth.uid());
create policy "coach creates own batches" on public.batches for insert to authenticated with check (coach_id = auth.uid());
create policy "coach updates own batches" on public.batches for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists "coach reads own participants"   on public.participants;
drop policy if exists "coach creates own participants" on public.participants;
drop policy if exists "coach updates own participants" on public.participants;
create policy "coach reads own participants" on public.participants for select to authenticated
  using (exists (select 1 from public.batches b where b.id = batch_id and b.coach_id = auth.uid()));
create policy "coach creates own participants" on public.participants for insert to authenticated
  with check (exists (select 1 from public.batches b where b.id = batch_id and b.coach_id = auth.uid()));
create policy "coach updates own participants" on public.participants for update to authenticated
  using (exists (select 1 from public.batches b where b.id = batch_id and b.coach_id = auth.uid()))
  with check (exists (select 1 from public.batches b where b.id = batch_id and b.coach_id = auth.uid()));

-- ---------- Participant functions ----------
-- These run with elevated rights but each one checks the code / PIN / token itself,
-- and only ever returns the caller's own data.

create or replace function public.ms(t timestamptz) returns bigint
language sql immutable as $$ select (extract(epoch from t) * 1000)::bigint $$;

-- Keep whichever log is longer, so a participant can't wipe their own history by sending an empty one.
create or replace function public.longer_log(old_log jsonb, new_log jsonb) returns jsonb
language sql immutable as $$
  select case
    when new_log is null or jsonb_typeof(new_log) <> 'array' then old_log
    when jsonb_array_length(new_log) >= jsonb_array_length(old_log) then new_log
    else old_log end
$$;

-- Step 1 of joining: given a batch code, list the names (no PINs, no writing).
create or replace function public.join_lookup(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b public.batches;
begin
  select * into b from public.batches where code = upper(trim(p_code));
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if b.status = 'ended' then return jsonb_build_object('error', 'ended'); end if;
  return jsonb_build_object(
    'assessment_type', b.assessment_type,
    'roster', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'status', status) order by position)
                        from public.participants where batch_id = b.id), '[]'::jsonb));
end $$;

-- Step 2 of joining: check the PIN and hand back a private token for this device.
-- 10 wrong PINs in a row lock the name until the coach unlocks it.
create or replace function public.participant_claim(p_code text, p_slug text, p_pin text, p_device_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.batches; p public.participants; tok text;
begin
  select * into b from public.batches where code = upper(trim(p_code));
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  select * into p from public.participants where batch_id = b.id and slug = p_slug for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if p.status in ('submitted', 'locked') then return jsonb_build_object('error', 'already_submitted'); end if;
  if b.status = 'ended' and not p.reopened then return jsonb_build_object('error', 'ended'); end if;
  if p.pin_failures >= 10 then return jsonb_build_object('error', 'locked_out'); end if;
  if p.pin <> trim(coalesce(p_pin, '')) then
    update public.participants set pin_failures = pin_failures + 1 where id = p.id;
    return jsonb_build_object('error', 'bad_pin');
  end if;

  if p.status = 'unjoined' then
    tok := replace(gen_random_uuid()::text, '-', '');
    update public.participants
      set status = 'writing', claimed_at = now(), active_device_token = tok, pin_failures = 0
      where id = p.id;
  elsif p_device_token is not null and p_device_token = p.active_device_token then
    tok := p.active_device_token;  -- same device coming back (e.g. after a refresh)
    update public.participants set pin_failures = 0 where id = p.id;
  else
    tok := replace(gen_random_uuid()::text, '-', '');  -- a different device: it takes over, and it's logged
    update public.participants
      set active_device_token = tok, pin_failures = 0,
          device_switches = device_switches + 1,
          device_switch_log = device_switch_log || jsonb_build_array(jsonb_build_object('at', public.ms(now())))
      where id = p.id;
  end if;
  return jsonb_build_object('token', tok);
end $$;

-- While writing: save the participant's work (p_data) and/or read back their state.
-- p_final = 'submitted' submits. If the coach has ended the batch, the save locks the answer.
create or replace function public.participant_sync(
  p_code text, p_slug text, p_token text, p_data jsonb default null, p_final text default null, p_full boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.batches; p public.participants; new_status text;
begin
  select * into b from public.batches where code = upper(trim(p_code));
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  select * into p from public.participants where batch_id = b.id and slug = p_slug for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if p_token is null or p.active_device_token is distinct from p_token then
    return jsonb_build_object('superseded', true);
  end if;

  if p.status = 'writing' then
    if p_data is not null then
      update public.participants set
        content              = left(coalesce(p_data->>'content', content), 300000),
        word_count           = coalesce((p_data->>'wordCount')::int, word_count),
        activity_log         = public.longer_log(activity_log, p_data->'activityLog'),
        focus_log            = public.longer_log(focus_log,    p_data->'focusLog'),
        paste_log            = public.longer_log(paste_log,    p_data->'pasteLog'),
        copy_log             = public.longer_log(copy_log,     p_data->'copyLog'),
        key_count            = greatest(key_count,       coalesce((p_data->>'keyCount')::int, 0)),
        backspace_count      = greatest(backspace_count, coalesce((p_data->>'backspaceCount')::int, 0)),
        paste_attempts       = greatest(paste_attempts,  coalesce((p_data->>'pasteAttempts')::int, 0)),
        copy_attempts        = greatest(copy_attempts,   coalesce((p_data->>'copyAttempts')::int, 0)),
        longest_streak_words = case when coalesce((p_data->>'longestStreakMs')::bigint, 0) > longest_streak_ms
                                    then coalesce((p_data->>'longestStreakWords')::int, 0) else longest_streak_words end,
        longest_streak_ms    = greatest(longest_streak_ms, coalesce((p_data->>'longestStreakMs')::bigint, 0)),
        updated_at           = now()
      where id = p.id;
    end if;
    new_status := case when p_final = 'submitted' then 'submitted'
                       when b.status = 'ended' and not p.reopened then 'locked'
                       else 'writing' end;
    if new_status <> 'writing' then
      update public.participants set status = new_status, submitted_at = now(), reopened = false where id = p.id;
    end if;
  end if;

  select * into p from public.participants where id = p.id;
  return jsonb_build_object(
    'batch', jsonb_build_object('assessment_type', b.assessment_type, 'prompt', b.prompt,
                                'status', b.status, 'created_at', public.ms(b.created_at)),
    'me', jsonb_build_object('status', p.status, 'reopened', p.reopened, 'word_count', p.word_count,
                             'name', p.name, 'submitted_at', public.ms(p.submitted_at))
          || case when p_full then jsonb_build_object(
               'content', p.content, 'claimed_at', public.ms(p.claimed_at),
               'activity_log', p.activity_log, 'focus_log', p.focus_log,
               'paste_log', p.paste_log, 'copy_log', p.copy_log,
               'key_count', p.key_count, 'backspace_count', p.backspace_count,
               'paste_attempts', p.paste_attempts, 'copy_attempts', p.copy_attempts,
               'longest_streak_ms', p.longest_streak_ms, 'longest_streak_words', p.longest_streak_words)
             else '{}'::jsonb end);
end $$;

revoke all on function public.join_lookup(text)                                      from public;
revoke all on function public.participant_claim(text, text, text, text)              from public;
revoke all on function public.participant_sync(text, text, text, jsonb, text, boolean) from public;
grant execute on function public.join_lookup(text)                                      to anon, authenticated;
grant execute on function public.participant_claim(text, text, text, text)              to anon, authenticated;
grant execute on function public.participant_sync(text, text, text, jsonb, text, boolean) to anon, authenticated;
