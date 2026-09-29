begin;

-- Add fixed pricing support to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'hourly'
    CHECK (pricing_type IN ('hourly', 'fixed')),
  ADD COLUMN IF NOT EXISTS fixed_price NUMERIC DEFAULT 0;

-- Add fixed pricing support to profiles (team members)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'hourly'
    CHECK (pricing_type IN ('hourly', 'fixed')),
  ADD COLUMN IF NOT EXISTS fixed_salary NUMERIC DEFAULT 0;

commit;
