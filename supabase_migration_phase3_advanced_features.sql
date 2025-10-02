-- ============================================================================
-- PHASE 3: ADVANCED FEATURES MIGRATION
-- Features: Badges/Achievements, Automated Reminders, Saved Reports
-- ============================================================================

-- ============================================================================
-- PART 1: BADGES & ACHIEVEMENTS SYSTEM
-- ============================================================================

-- 1. Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- lucide-react icon name or emoji
  color VARCHAR(50), -- hex color or tailwind color name
  badge_type VARCHAR(50) DEFAULT 'manual' CHECK (badge_type IN ('manual', 'automatic', 'milestone')),
  criteria JSONB, -- rules for automatic awarding
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create member_badges junction table
CREATE TABLE IF NOT EXISTS member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  awarded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB, -- additional data (certification number, achievement date, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, badge_id)
);

-- 3. Create indexes for badges
CREATE INDEX IF NOT EXISTS idx_badges_org ON badges(organization_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_member_badges_profile ON member_badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_badge ON member_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_awarded_at ON member_badges(awarded_at);

-- 4. Create updated_at triggers for badges
CREATE TRIGGER set_updated_at_badges
BEFORE UPDATE ON badges
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS on badges tables
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for badges
-- Members can view badges in their organization
CREATE POLICY "Members can view org badges"
ON badges FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can manage badges
CREATE POLICY "Admins can manage badges"
ON badges FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = badges.organization_id
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = badges.organization_id
    AND role IN ('admin', 'super_admin')
  )
);

-- 7. RLS Policies for member_badges
-- Members can view badges in their organization
CREATE POLICY "Members can view org member badges"
ON member_badges FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles
    WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Admins can award badges
CREATE POLICY "Admins can award badges"
ON member_badges FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.id = profile_id
    WHERE p1.user_id = auth.uid()
    AND p1.organization_id = p2.organization_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- Admins can update/delete badges
CREATE POLICY "Admins can manage member badges"
ON member_badges FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.id = member_badges.profile_id
    WHERE p1.user_id = auth.uid()
    AND p1.organization_id = p2.organization_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete member badges"
ON member_badges FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.id = member_badges.profile_id
    WHERE p1.user_id = auth.uid()
    AND p1.organization_id = p2.organization_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- PART 2: AUTOMATED REMINDERS SYSTEM
-- ============================================================================

-- 8. Create automated_reminders table
CREATE TABLE IF NOT EXISTS automated_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('membership_renewal', 'membership_expiry', 'event_upcoming', 'event_followup', 'custom')),
  trigger_days INTEGER NOT NULL, -- days before/after event (negative for before, positive for after)
  email_subject VARCHAR(500) NOT NULL,
  email_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  target_audience JSONB, -- filters for who receives (membership_types, statuses, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES automated_reminders(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')),
  error_message TEXT,
  metadata JSONB, -- email_id, reference dates, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create indexes for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_org ON automated_reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON automated_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON automated_reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder ON reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_profile ON reminder_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);

-- 11. Create updated_at trigger for reminders
CREATE TRIGGER set_updated_at_reminders
BEFORE UPDATE ON automated_reminders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 12. Enable RLS on reminders tables
ALTER TABLE automated_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies for automated_reminders
-- Members can view reminders in their organization
CREATE POLICY "Members can view org reminders"
ON automated_reminders FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can manage reminders
CREATE POLICY "Admins can manage reminders"
ON automated_reminders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = automated_reminders.organization_id
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = automated_reminders.organization_id
    AND role IN ('admin', 'super_admin')
  )
);

-- 14. RLS Policies for reminder_logs
-- Members can view their own reminder logs
CREATE POLICY "Members can view own reminder logs"
ON reminder_logs FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view all reminder logs in their org
CREATE POLICY "Admins can view org reminder logs"
ON reminder_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.id = reminder_logs.profile_id
    WHERE p1.user_id = auth.uid()
    AND p1.organization_id = p2.organization_id
    AND p1.role IN ('admin', 'super_admin')
  )
);

-- Service role can insert reminder logs (for background jobs)
-- NOTE: This policy restricts insert to service_role only
-- Background jobs must authenticate with service_role key
CREATE POLICY "Service role can insert reminder logs"
ON reminder_logs FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 3: CUSTOM REPORT BUILDER
-- ============================================================================

-- 15. Create saved_reports table
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('members', 'memberships', 'events', 'committees', 'financial', 'custom')),
  filters JSONB NOT NULL, -- query configuration
  columns JSONB NOT NULL, -- selected columns to display
  sort_by JSONB, -- sorting configuration
  is_public BOOLEAN DEFAULT false, -- visible to all admins
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Create indexes for saved_reports
CREATE INDEX IF NOT EXISTS idx_saved_reports_org ON saved_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_saved_reports_public ON saved_reports(is_public);

-- 17. Create updated_at trigger for saved_reports
CREATE TRIGGER set_updated_at_saved_reports
BEFORE UPDATE ON saved_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 18. Enable RLS on saved_reports
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- 19. RLS Policies for saved_reports
-- Members can view public reports or their own reports
CREATE POLICY "Members can view accessible reports"
ON saved_reports FOR SELECT
USING (
  (is_public = true AND organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  ))
  OR
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Admins can create reports
CREATE POLICY "Admins can create reports"
ON saved_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND organization_id = saved_reports.organization_id
    AND role IN ('admin', 'super_admin')
  )
  AND created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
ON saved_reports FOR UPDATE
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

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
ON saved_reports FOR DELETE
USING (
  created_by IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- PART 4: ANALYTICS VIEWS (Read-only, for reporting dashboard)
-- ============================================================================

-- 20. Create view for membership analytics
CREATE OR REPLACE VIEW membership_analytics AS
SELECT 
  m.organization_id,
  DATE_TRUNC('month', m.created_at) AS month,
  COUNT(*) AS total_memberships,
  COUNT(*) FILTER (WHERE m.status = 'active') AS active_memberships,
  COUNT(*) FILTER (WHERE m.status = 'expired') AS expired_memberships,
  COUNT(*) FILTER (WHERE m.status = 'pending') AS pending_memberships,
  mt.name AS membership_type,
  mt.id AS membership_type_id
FROM memberships m
JOIN membership_types mt ON m.membership_type_id = mt.id
GROUP BY m.organization_id, DATE_TRUNC('month', m.created_at), mt.name, mt.id;

-- 21. Create view for event analytics
CREATE OR REPLACE VIEW event_analytics AS
SELECT 
  e.organization_id,
  e.id AS event_id,
  e.title AS event_title,
  e.event_date,
  e.capacity,
  e.attendee_count,
  ROUND((e.attendee_count::NUMERIC / NULLIF(e.capacity, 0)) * 100, 2) AS capacity_percentage,
  COUNT(er.id) AS total_registrations,
  COUNT(er.id) FILTER (WHERE er.status = 'registered') AS registered_count,
  COUNT(er.id) FILTER (WHERE er.status = 'checked_in') AS checked_in_count,
  COUNT(er.id) FILTER (WHERE er.status = 'waitlist') AS waitlist_count,
  COUNT(er.id) FILTER (WHERE er.status = 'cancelled') AS cancelled_count
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.organization_id, e.id, e.title, e.event_date, e.capacity, e.attendee_count;

-- 22. Grant access to views (RLS handled at row level via organization_id)
GRANT SELECT ON membership_analytics TO authenticated;
GRANT SELECT ON event_analytics TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update TypeScript types in src/lib/supabase/client.ts
-- 3. Build UI components for each feature
-- ============================================================================
