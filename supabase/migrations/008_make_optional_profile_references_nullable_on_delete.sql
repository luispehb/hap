ALTER TABLE admissions
  DROP CONSTRAINT IF EXISTS admissions_invited_by_fkey,
  ADD CONSTRAINT admissions_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE invitations
  DROP CONSTRAINT IF EXISTS invitations_used_by_fkey,
  ADD CONSTRAINT invitations_used_by_fkey
    FOREIGN KEY (used_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE connections
  DROP CONSTRAINT IF EXISTS connections_plan_id_fkey,
  ADD CONSTRAINT connections_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL;
