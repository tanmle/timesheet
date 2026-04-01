-- Set up the public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  projects UUID[] DEFAULT '{}',
  hourly_rate NUMERIC DEFAULT 0,
  exchange_rate NUMERIC DEFAULT 25000,
  bank_name TEXT,
  bank_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING ( true );
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ( auth.uid() = id );

-- Optional: Function to handle new user registration automatically via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, hourly_rate)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), 
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''), 
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Projects Table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  rate NUMERIC DEFAULT 0,
  total_work_hour NUMERIC DEFAULT 0,
  spent_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.projects FOR UPDATE USING (auth.role() = 'authenticated');


-- 3. Payroll Table
CREATE TABLE public.payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_name TEXT NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.payroll FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.payroll FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.payroll FOR UPDATE USING (auth.role() = 'authenticated');


-- 4. Time Entries Table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_description TEXT NOT NULL,
  date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  payroll_id UUID REFERENCES public.payroll(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own entries" ON public.time_entries FOR SELECT USING (auth.uid() = user_id);
-- Depending on requirements, managers might need to see all. Assuming single-user MVP or open team view:
CREATE POLICY "Everyone can view all entries for now" ON public.time_entries FOR SELECT USING (true);
CREATE POLICY "Users can insert their own entries" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own entries" ON public.time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own entries" ON public.time_entries FOR DELETE USING (auth.uid() = user_id);
