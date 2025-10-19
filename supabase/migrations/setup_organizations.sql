-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')) DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY IF NOT EXISTS "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS Policies for organization_members
CREATE POLICY IF NOT EXISTS "Users can view their organization memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Insert TEST ORG if it doesn't exist
INSERT INTO organizations (name)
VALUES ('TEST ORG')
ON CONFLICT DO NOTHING;

-- Add ops@getbiddable.com to TEST ORG
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

  -- Only insert if both user and org exist
  IF v_user_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    INSERT INTO organization_members (user_id, organization_id, role)
    VALUES (v_user_id, v_org_id, 'admin')
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    RAISE NOTICE 'User ops@getbiddable.com added to TEST ORG as admin';
  ELSE
    IF v_user_id IS NULL THEN
      RAISE NOTICE 'User ops@getbiddable.com not found - please sign up first';
    END IF;
    IF v_org_id IS NULL THEN
      RAISE NOTICE 'Organization TEST ORG not found';
    END IF;
  END IF;
END $$;
