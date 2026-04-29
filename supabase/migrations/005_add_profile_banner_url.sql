ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text;

NOTIFY pgrst, 'reload schema';
