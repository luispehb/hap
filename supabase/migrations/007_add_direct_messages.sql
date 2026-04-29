CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON direct_messages TO authenticated;
GRANT UPDATE ON messages TO authenticated;

CREATE INDEX IF NOT EXISTS direct_messages_sender_receiver_idx
  ON direct_messages(sender_id, receiver_id, created_at);

CREATE INDEX IF NOT EXISTS direct_messages_receiver_unread_idx
  ON direct_messages(receiver_id, read_at, created_at);

DROP POLICY IF EXISTS "Users can view own direct messages"
  ON direct_messages;

CREATE POLICY "Users can view own direct messages"
  ON direct_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id IN (direct_messages.sender_id, direct_messages.receiver_id)
    )
  );

DROP POLICY IF EXISTS "Users can send direct messages as themselves"
  ON direct_messages;

CREATE POLICY "Users can send direct messages as themselves"
  ON direct_messages FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id = direct_messages.sender_id
    )
  );

DROP POLICY IF EXISTS "Users can mark received direct messages read"
  ON direct_messages;

CREATE POLICY "Users can mark received direct messages read"
  ON direct_messages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id = direct_messages.receiver_id
    )
  );

CREATE INDEX IF NOT EXISTS messages_plan_unread_idx
  ON messages(plan_id, read_at, sent_at);

DROP POLICY IF EXISTS "Plan participants can mark messages read"
  ON messages;

CREATE POLICY "Plan participants can mark messages read"
  ON messages FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM plan_participants
      JOIN profiles ON profiles.id = plan_participants.user_id
      WHERE plan_participants.plan_id = messages.plan_id
        AND profiles.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
