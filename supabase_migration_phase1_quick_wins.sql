-- ============================================================================
-- PHASE 1: QUICK WINS MIGRATION
-- Features: Email Templates, Member Notes, Notifications, Document Library
-- ============================================================================

-- ============================================================================
-- PART 1: EMAIL TEMPLATES LIBRARY
-- ============================================================================

-- 1. Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  template_type VARCHAR(50) DEFAULT 'custom' CHECK (template_type IN ('welcome', 'renewal', 'expiry', 'event', 'newsletter', 'custom')),
  variables JSONB, -- available template variables
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- default template for this type
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- 3. Create updated_at trigger for email_templates
CREATE TRIGGER set_updated_at_email_templates
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS on email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for email_templates
-- Members can view templates in their organization
CREATE POLICY "Members can view org email templates"
ON email_templates FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can manage email templates
CREATE POLICY "Admins can manage email templates"
ON email_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = email_templates.organization_id
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = email_templates.organization_id
    AND role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- PART 2: MEMBER NOTES & HISTORY
-- ============================================================================

-- 6. Create member_notes table
CREATE TABLE IF NOT EXISTS member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN ('general', 'admin', 'support', 'payment', 'behavior')),
  is_private BOOLEAN DEFAULT true, -- only admins can see
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create indexes for member_notes
CREATE INDEX IF NOT EXISTS idx_member_notes_profile ON member_notes(profile_id);
CREATE INDEX IF NOT EXISTS idx_member_notes_created_by ON member_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_member_notes_created_at ON member_notes(created_at DESC);

-- 8. Create updated_at trigger for member_notes
CREATE TRIGGER set_updated_at_member_notes
BEFORE UPDATE ON member_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 9. Enable RLS on member_notes
ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for member_notes
-- Admins can view notes for members in their organization
CREATE POLICY "Admins can view org member notes"
ON member_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.id = member_notes.profile_id
    WHERE p1.user_id = auth.uid()
    AND p1.organization_id = p2.organization_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- Admins can create notes for members in their organization
CREATE POLICY "Admins can create member notes"
ON member_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.id = profile_id
    WHERE p1.user_id = auth.uid()
    AND p1.organization_id = p2.organization_id
    AND p1.role IN ('admin', 'super_admin')
  )
  AND created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can update their own notes
CREATE POLICY "Admins can update own notes"
ON member_notes FOR UPDATE
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can delete their own notes
CREATE POLICY "Admins can delete own notes"
ON member_notes FOR DELETE
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- PART 3: IN-APP NOTIFICATIONS
-- ============================================================================

-- 11. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) DEFAULT 'info' CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'event', 'membership', 'system')),
  link_url VARCHAR(500), -- optional link for action
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 13. Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 14. RLS Policies for notifications
-- Members can view their own notifications
CREATE POLICY "Members can view own notifications"
ON notifications FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Members can update their own notifications (mark as read)
CREATE POLICY "Members can update own notifications"
ON notifications FOR UPDATE
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Service role can insert notifications (for system/automated notifications)
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Admins can insert notifications for members in their org
CREATE POLICY "Admins can create org notifications"
ON notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.id = profile_id
    WHERE p1.user_id = auth.uid()
    AND p1.organization_id = p2.organization_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- PART 4: DOCUMENT LIBRARY
-- ============================================================================

-- 15. Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(1000) NOT NULL, -- URL to file in storage
  file_type VARCHAR(50), -- pdf, doc, xls, etc.
  file_size BIGINT, -- in bytes
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'policy', 'form', 'guide', 'legal', 'financial', 'other')),
  is_public BOOLEAN DEFAULT false, -- visible to all members
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- 17. Create updated_at trigger for documents
CREATE TRIGGER set_updated_at_documents
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 18. Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 19. RLS Policies for documents
-- Members can view public documents or documents in their organization
CREATE POLICY "Members can view accessible documents"
ON documents FOR SELECT
USING (
  (is_public = true AND organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ))
  OR
  (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ))
);

-- Admins can manage documents in their organization
CREATE POLICY "Admins can manage org documents"
ON documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = documents.organization_id
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = documents.organization_id
    AND role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- PART 5: HELPER FUNCTION FOR NOTIFICATIONS
-- ============================================================================

-- 20. Create function to create notification for all members in an organization
CREATE OR REPLACE FUNCTION create_org_notification(
  p_organization_id UUID,
  p_title VARCHAR(255),
  p_message TEXT,
  p_notification_type VARCHAR(50) DEFAULT 'info',
  p_link_url VARCHAR(500) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insert notification for each active member in the organization
  INSERT INTO notifications (profile_id, title, message, notification_type, link_url)
  SELECT id, p_title, p_message, p_notification_type, p_link_url
  FROM profiles
  WHERE organization_id = p_organization_id
  AND status = 'active';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update TypeScript types in src/lib/supabase/client.ts
-- 3. Build UI components for each feature
-- ============================================================================
