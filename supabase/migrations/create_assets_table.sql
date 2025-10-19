-- Create assets table for ad assets (images, videos, and text ads)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text')),
  format TEXT,
  size TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'rejected')) DEFAULT 'draft',

  -- For images/videos
  file_url TEXT,
  file_path TEXT,
  dimensions TEXT,

  -- For text assets (Google Search Ads)
  ad_format TEXT CHECK (ad_format IN ('rsa', 'eta', 'generic')),
  ad_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Users can view assets from their organizations
CREATE POLICY "Users can view assets from their organizations"
  ON assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = assets.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can create assets in their organizations
CREATE POLICY "Users can create assets in their organizations"
  ON assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = assets.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can update assets in their organizations
CREATE POLICY "Users can update assets in their organizations"
  ON assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = assets.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Users can delete assets in their organizations
CREATE POLICY "Users can delete assets in their organizations"
  ON assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = assets.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_assets_organization_id ON assets(organization_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_status ON assets(status);
