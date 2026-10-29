-- CVs table for storing customized CV templates and data
-- Accessible by admins only (matching public.is_admin() model)

begin;

create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.cvs enable row level security;

drop policy if exists "cvs: admin" on public.cvs;

create policy "cvs: admin"
  on public.cvs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.cvs from anon;
grant select, insert, update, delete on public.cvs to authenticated;
grant all on public.cvs to service_role;

commit;
