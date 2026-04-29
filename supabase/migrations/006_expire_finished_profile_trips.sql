UPDATE public.profiles
SET
  current_city = home_city,
  is_local = true,
  trip_start_date = null,
  trip_end_date = null
WHERE is_local = false
  AND trip_end_date IS NOT NULL
  AND trip_end_date < CURRENT_DATE
  AND home_city IS NOT NULL;

NOTIFY pgrst, 'reload schema';
