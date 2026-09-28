-- Tighten RLS ahead of exposing the app to the public internet.
--
-- WHY
--
-- The policies inherited from the hosted project used `USING (true)` on
-- profiles, projects, payroll and time_entries, and `anon` held SELECT on all
-- of them. The anon key is embedded in the client JS bundle by design, so
-- before this migration an unauthenticated caller could read every profile
-- (including bank_name / bank_number / hourly_rate), every payroll total, and
-- all 813 time entries. That was survivable while the app was tailnet-only. It
-- is not survivable once the app is published via Tailscale Funnel.
--
-- Separately, /team, /payroll, /payroll/run and /projects have no server-side
-- role check -- only BottomNav hides the links -- so any authenticated
-- non-admin could read the same data by typing the URL. Pushing the boundary
-- into RLS fixes both problems at once, and keeps working even if a page
-- forgets its gate.
--
-- MODEL
--
--   anon           -> no access to any application table
--   authenticated  -> own rows; projects list; payroll runs touching own entries
--   admin          -> everything (profiles.role = 'admin')
--   service_role   -> unaffected; it bypasses RLS entirely, which is what the
--                     admin client in src/utils/supabase/admin.ts relies on for
--                     member management, payroll runs and project mutations
--
-- Nav intent confirms this split: non-admins only get Home / Timesheet /
-- Report, so Payroll, Projects and Team are admin surfaces by design.

begin;

--------------------------------------------------------------------------------
-- Admin predicate
--------------------------------------------------------------------------------

-- SECURITY DEFINER so that reading profiles.role from inside a policy ON
-- profiles does not recurse: the function runs as its owner (postgres), who
-- owns the table and is therefore exempt from RLS.
--
-- search_path is pinned so a caller cannot shadow `profiles` with a temp table.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

comment on function public.is_admin() is
  'True when the current session belongs to a profile with role = admin. SECURITY DEFINER to avoid RLS recursion on profiles.';

--------------------------------------------------------------------------------
-- profiles
--------------------------------------------------------------------------------

-- Both of these were unconditional reads; the second targeted anon explicitly.
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "allow read for anon" on public.profiles;

-- Own profile is required by getAuthUser() and requireAuth(); admins need the
-- whole table for /team, /payroll and /reports.
create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Unchanged in effect, but re-scoped to `authenticated` so anon is never
-- considered. Member management runs through the service-role client.
drop policy if exists "Users can update own profile." on public.profiles;
create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

--------------------------------------------------------------------------------
-- projects
--------------------------------------------------------------------------------

drop policy if exists "Enable read access for all users" on public.projects;
drop policy if exists "Enable insert for authenticated users only" on public.projects;
drop policy if exists "Enable update for authenticated users only" on public.projects;

-- Every signed-in user may list projects: /add needs the ones they are assigned
-- to and /reports needs them for filters. Project rows carry no personal data.
-- Deliberately NOT restricted to profiles.projects membership, because that
-- would break the report filters for users with historical entries on projects
-- they are no longer assigned to.
create policy "projects: read authenticated"
  on public.projects for select to authenticated
  using (true);

-- Writes only ever happen through the service-role client in
-- projects/actions.ts, so these exist purely as a backstop.
create policy "projects: write admin"
  on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

--------------------------------------------------------------------------------
-- payroll
--------------------------------------------------------------------------------

drop policy if exists "Enable read access for all users" on public.payroll;
drop policy if exists "Enable insert for authenticated users only" on public.payroll;
drop policy if exists "Enable update for authenticated users only" on public.payroll;

-- Admins see all runs. A regular user sees only runs that actually include
-- their own entries, which is what reports/actions.ts looks up when it resolves
-- payroll rows for a user's paid entries.
create policy "payroll: read admin or own runs"
  on public.payroll for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.time_entries te
      where te.payroll_id = payroll.id
        and te.user_id = auth.uid()
    )
  );

create policy "payroll: write admin"
  on public.payroll for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

--------------------------------------------------------------------------------
-- time_entries
--------------------------------------------------------------------------------

-- This was the widest hole: an unconditional SELECT sitting alongside the
-- correct own-rows policy. Postgres ORs permissive policies together, so the
-- narrow one had no effect at all.
drop policy if exists "Everyone can view all entries for now" on public.time_entries;
drop policy if exists "Users can view their own entries" on public.time_entries;

create policy "time_entries: read own or admin"
  on public.time_entries for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can insert their own entries" on public.time_entries;
create policy "time_entries: insert own"
  on public.time_entries for insert to authenticated
  with check (user_id = auth.uid());

-- Own rows, plus an admin override so the /payroll surfaces keep working if
-- they are ever switched off the service-role client. Deliberately does NOT
-- restrict editing of already-paid entries: that would be a new behavioural
-- restriction, and this migration is scoped to closing the read exposure.
drop policy if exists "Users can update their own entries" on public.time_entries;
create policy "time_entries: update own"
  on public.time_entries for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can delete their own entries" on public.time_entries;
create policy "time_entries: delete own"
  on public.time_entries for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

--------------------------------------------------------------------------------
-- notifications
--------------------------------------------------------------------------------

-- Already own-rows-only, but the policies applied to role `public`, which
-- includes anon. Re-scope to authenticated for clarity; behaviour is unchanged
-- because auth.uid() is null for anon.
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update their own notifications (mark as read)" on public.notifications;
create policy "notifications: update own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

--------------------------------------------------------------------------------
-- Revoke anon's table privileges
--------------------------------------------------------------------------------

-- Defence in depth. RLS alone already yields zero rows for anon now that no
-- anon-facing policy exists, but removing the grants means a future permissive
-- policy cannot silently re-open public read access. Nothing in the app reads
-- tables unauthenticated: the login and password-reset pages talk only to
-- GoTrue (/auth/v1), never to PostgREST.
revoke all on public.profiles      from anon;
revoke all on public.projects      from anon;
revoke all on public.payroll       from anon;
revoke all on public.time_entries  from anon;
revoke all on public.notifications from anon;

commit;
