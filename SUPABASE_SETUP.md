-- Create TESTORG organization
INSERT INTO organizations (name) VALUES ('TESTORG');

-- Add ops@getbiddable.com to TESTORG as admin
-- (First create user in Supabase Dashboard > Authentication > Users with email: ops@getbiddable.com)
INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
  (SELECT id FROM organizations WHERE name = 'TESTORG'),
  (SELECT id FROM auth.users WHERE email = 'ops@getbiddable.com'),
  'admin'
);
