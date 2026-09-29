begin;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time'));
commit;
