-- Add ops@getbiddable.com to TEST ORG organization

-- First, find the user ID and organization ID
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get the user ID for ops@getbiddable.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'ops@getbiddable.com';

  -- Get the organization ID for TEST ORG
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name = 'TEST ORG';

  -- Check if both exist
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User ops@getbiddable.com not found';
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization TEST ORG not found';
  END IF;

  -- Insert into organization_members if not already a member
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (v_user_id, v_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RAISE NOTICE 'User ops@getbiddable.com added to TEST ORG as admin';
END $$;
