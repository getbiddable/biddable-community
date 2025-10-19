-- Completely reset all policies on organization_members and organizations

-- Disable RLS temporarily to drop all policies
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (in case there are unnamed ones)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on organization_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organization_members';
    END LOOP;

    -- Drop all policies on organizations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create NEW simple policy for organization_members
-- This is the KEY: just check user_id directly, no subqueries at all
CREATE POLICY "Select own memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Allow insert for testing (optional, remove if not needed)
CREATE POLICY "Insert own memberships"
  ON organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create policy for organizations
-- This should work because organization_members now has a simple policy
CREATE POLICY "Select member organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('organization_members', 'organizations')
ORDER BY tablename, policyname;
