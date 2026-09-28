-- Invoices table, under the same access model as 20260803_tighten_rls.sql.
--
-- WHY
--
-- supabase/migration_invoices.sql was applied to the hosted project only, so
-- the self-hosted stack never got the table. Its policies also used
-- `USING (true)` for SELECT, which lets anyone holding the anon key (embedded
-- in the client bundle) read every invoice: bill-to details, totals and the
-- bank details in `notes`. Any authenticated non-admin could also edit or
-- delete invoices.
--
-- MODEL
--
--   anon           -> no access
--   authenticated  -> admins only; /invoice already redirects non-admins
--   service_role   -> bypasses RLS; the Telegram webhook inserts through it
--
-- Columns match the hosted table so its data loads unchanged.
-- invoice_number_seq is unused (numbers come from max(invoice_number) + 1) but
-- exists on the hosted project, whose dumps call setval() on it.

begin;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number integer not null unique,
  sender_name text not null,
  bill_to text not null,
  invoice_date date not null,
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  tax_rate numeric not null default 0,
  total numeric not null default 0,
  notes text,
  is_paid boolean default false,
  date_range_str text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.invoices enable row level security;

drop policy if exists "Enable read access for all users" on public.invoices;
drop policy if exists "Enable insert for authenticated users only" on public.invoices;
drop policy if exists "Enable update for authenticated users only" on public.invoices;
drop policy if exists "Enable delete for authenticated users only" on public.invoices;
drop policy if exists "invoices: admin" on public.invoices;

create policy "invoices: admin"
  on public.invoices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.invoices from anon;
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;

create sequence if not exists public.invoice_number_seq start with 1;
revoke all on sequence public.invoice_number_seq from anon;

commit;
