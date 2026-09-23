-- Invoices table for storing generated invoice history
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number INTEGER NOT NULL UNIQUE,
  sender_name TEXT NOT NULL,
  bill_to TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  is_paid BOOLEAN DEFAULT false,
  date_range_str TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.invoices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.invoices FOR DELETE USING (auth.role() = 'authenticated');

-- Sequence for auto-incrementing invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;
