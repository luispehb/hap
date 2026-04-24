-- Repair relationship access after partially applied policy changes.
-- These policies intentionally keep prototype relationship data readable to signed-in users
-- so Journal, Connections, Notifications, and invite generation do not fail under RLS.

ALTER TABLE invitations
  ALTER COLUMN invitee_email DROP NOT NULL;

GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT ON plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON plan_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO authenticated;
GRANT SELECT ON invitations TO anon, authenticated;
GRANT INSERT, UPDATE ON invitations TO authenticated;

DROP POLICY IF EXISTS "Public profiles are viewable for invites"
  ON profiles;

CREATE POLICY "Public profiles are viewable for invites"
  ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Plan participants are viewable by authenticated users"
  ON plan_participants;

DROP POLICY IF EXISTS "Users can join plans as themselves"
  ON plan_participants;

DROP POLICY IF EXISTS "Users can update own plan participation"
  ON plan_participants;

DROP POLICY IF EXISTS "Users can leave plans as themselves"
  ON plan_participants;

CREATE POLICY "Plan participants are viewable by authenticated users"
  ON plan_participants FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can join plans as themselves"
  ON plan_participants FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = plan_participants.user_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own plan participation"
  ON plan_participants FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = plan_participants.user_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave plans as themselves"
  ON plan_participants FOR DELETE USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = plan_participants.user_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their connections"
  ON connections;

DROP POLICY IF EXISTS "Users can request connections as themselves"
  ON connections;

DROP POLICY IF EXISTS "Users can update their connections"
  ON connections;

DROP POLICY IF EXISTS "Users can delete their connections"
  ON connections;

CREATE POLICY "Signed-in users can view connections"
  ON connections FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Signed-in users can create connections"
  ON connections FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Signed-in users can update connections"
  ON connections FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Signed-in users can delete connections"
  ON connections FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view own invitations"
  ON invitations;

DROP POLICY IF EXISTS "Users can create own invitations"
  ON invitations;

DROP POLICY IF EXISTS "Users can mark invitations used by themselves"
  ON invitations;

CREATE POLICY "Public unused invitations are viewable"
  ON invitations FOR SELECT USING (used = false OR auth.role() = 'authenticated');

CREATE POLICY "Signed-in users can create invitations"
  ON invitations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Signed-in users can update invitations"
  ON invitations FOR UPDATE USING (auth.role() = 'authenticated' OR used = false);
