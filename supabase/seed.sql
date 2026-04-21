INSERT INTO profiles (
  display_name, origin_city, current_city,
  trip_start_date, trip_end_date, is_local,
  bio_question, interests, trust_score,
  is_verified, membership_status
) VALUES
(
  'Valentina R.', 'Buenos Aires', 'Ciudad de México',
  CURRENT_DATE - 2, CURRENT_DATE + 5, false,
  'A conversation with a street vendor in Oaxaca about time. He said I don''t sell tacos, I sell mornings. Still think about it.',
  ARRAY['gastronomy','photography','literature','art'],
  78, true, 'active'
),
(
  'Diego M.', 'Madrid', 'Ciudad de México',
  CURRENT_DATE - 10, CURRENT_DATE + 20, false,
  'Reading Simone Weil at 3am during a flight delay. I missed my connection but didn''t care.',
  ARRAY['architecture','philosophy','technology','cinema'],
  85, true, 'active'
),
(
  'Amara K.', 'Lagos', 'Ciudad de México',
  CURRENT_DATE - 1, CURRENT_DATE + 3, false,
  'A Noh theater performance in Tokyo. I didn''t understand a word and understood everything.',
  ARRAY['music','art','gastronomy','languages'],
  72, true, 'active'
),
(
  'Carlos B.', 'Ciudad de México', 'Ciudad de México',
  null, null, true,
  'My daughter asked me why the sky is blue and I realized I had stopped asking questions like that.',
  ARRAY['architecture','literature','photography','sport'],
  91, true, 'active'
),
(
  'Mia K.', 'Berlin', 'Lisboa',
  CURRENT_DATE - 3, CURRENT_DATE + 4, false,
  'A book by Clarice Lispector I found in a hostel. Read it in one sitting. Called my sister after.',
  ARRAY['architecture','photography','culture','gastronomy'],
  82, true, 'active'
),
(
  'Julien R.', 'Paris', 'Lisboa',
  CURRENT_DATE - 20, CURRENT_DATE + 40, false,
  'Failing at a startup I loved. Learned more in 6 months of failure than in 3 years of success.',
  ARRAY['cowork','photography','sport','philosophy'],
  91, true, 'active'
),
(
  'Layla P.', 'Beirut', 'Bogotá',
  CURRENT_DATE - 4, CURRENT_DATE + 6, false,
  'Living through a city rebuilding itself. You learn what is essential very fast.',
  ARRAY['architecture','art','literature','languages'],
  77, true, 'active'
),
(
  'Kenji T.', 'Osaka', 'Bogotá',
  CURRENT_DATE - 2, CURRENT_DATE + 2, false,
  'A cook in Oaxaca who spent 6 hours on a mole. No recipe. Just memory and time.',
  ARRAY['gastronomy','nature','music','photography'],
  69, true, 'active'
);
