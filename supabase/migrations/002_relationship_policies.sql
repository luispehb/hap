-- RLS policies for relationship-driven features: connections, journals,
-- notifications, plan participation, and invite links.

DROP POLICY IF EXISTS "Plan participants are viewable by authenticated users"
  ON plan_participants;

CREATE POLICY "Plan participants are viewable by authenticated users"
  ON plan_participants FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can join plans as themselves"
  ON plan_participants;

CREATE POLICY "Users can join plans as themselves"
  ON plan_participants FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = plan_participants.user_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own plan participation"
  ON plan_participants;

CREATE POLICY "Users can update own plan participation"
  ON plan_participants FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = plan_participants.user_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can leave plans as themselves"
  ON plan_participants;

CREATE POLICY "Users can leave plans as themselves"
  ON plan_participants FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = plan_participants.user_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their connections"
  ON connections;

CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id IN (connections.user_a_id, connections.user_b_id)
    )
  );

DROP POLICY IF EXISTS "Users can request connections as themselves"
  ON connections;

CREATE POLICY "Users can request connections as themselves"
  ON connections FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = connections.user_a_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their connections"
  ON connections;

CREATE POLICY "Users can update their connections"
  ON connections FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id IN (connections.user_a_id, connections.user_b_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their connections"
  ON connections;

CREATE POLICY "Users can delete their connections"
  ON connections FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id IN (connections.user_a_id, connections.user_b_id)
    )
  );

DROP POLICY IF EXISTS "Users can view own invitations"
  ON invitations;

CREATE POLICY "Users can view own invitations"
  ON invitations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = invitations.inviter_id
        AND profiles.user_id = auth.uid()
    )
    OR used = false
  );

DROP POLICY IF EXISTS "Users can create own invitations"
  ON invitations;

CREATE POLICY "Users can create own invitations"
  ON invitations FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = invitations.inviter_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can mark invitations used by themselves"
  ON invitations;

CREATE POLICY "Users can mark invitations used by themselves"
  ON invitations FOR UPDATE USING (
    used = false
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id IN (invitations.inviter_id, invitations.used_by)
    )
  );
