-- Create summaries table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  norm_id UUID NOT NULL REFERENCES public.norms(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one summary per norm
  UNIQUE (norm_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_summaries_norm_id ON public.summaries(norm_id);

-- Enable RLS
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view summaries"
  ON public.summaries FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert summaries"
  ON public.summaries FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update summaries"
  ON public.summaries FOR UPDATE
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete summaries"
  ON public.summaries FOR DELETE
  TO service_role
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_summaries_updated_at();
