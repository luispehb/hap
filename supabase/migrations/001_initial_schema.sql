CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  origin_city text,
  current_city text,
  trip_start_date date,
  trip_end_date date,
  is_local boolean DEFAULT false,
  bio_question text CHECK (char_length(bio_question) <= 280),
  interests text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  trust_score integer DEFAULT 50,
  is_verified boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  membership_status text DEFAULT 'pending',
  daily_joins_count integer DEFAULT 0,
  last_reset_at timestamptz DEFAULT now(),
  cancel_count integer DEFAULT 0,
  noshow_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  activity_type text NOT NULL,
  city text NOT NULL,
  location_name text,
  scheduled_at timestamptz NOT NULL,
  max_participants integer DEFAULT 4,
  description text,
  status text DEFAULT 'open',
  is_hap_day boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE plan_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES plans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

CREATE TABLE connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id),
  user_a_wants_connect boolean DEFAULT false,
  user_b_wants_connect boolean DEFAULT false,
  social_shared boolean DEFAULT false,
  connected_at timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES plans(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rater_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id) ON DELETE CASCADE,
  score integer CHECK (score >= 1 AND score <= 5),
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(rater_id, rated_id, plan_id)
);

CREATE TABLE admissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  answer_1 text,
  invited_by uuid REFERENCES profiles(id),
  status text DEFAULT 'pending',
  reviewer_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  used boolean DEFAULT false,
  used_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Plans are viewable by authenticated users"
  ON plans FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create plans"
  ON plans FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Messages viewable by plan participants"
  ON messages FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
