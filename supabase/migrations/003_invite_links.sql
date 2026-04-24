-- Invite links do not target a specific email address, so this field must be optional.
ALTER TABLE invitations
  ALTER COLUMN invitee_email DROP NOT NULL;
