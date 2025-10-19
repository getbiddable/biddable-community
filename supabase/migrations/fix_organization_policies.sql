-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Create simple, non-recursive policy for organization_members
-- Users can view their own memberships (no subquery needed)
CREATE POLICY "Users can view their own organization memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for organizations
-- Users can view organizations they are members of
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
