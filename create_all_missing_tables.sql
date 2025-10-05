-- ========================================================================
-- COMPREHENSIVE DATABASE SETUP - All Missing Tables
-- Run this in Supabase SQL Editor to fix all 404 errors
-- ========================================================================

-- ========================================================================
-- PART 1: MAILING LISTS & EMAIL SUBSCRIBERS
-- ========================================================================

-- Create email_subscribers table (the code references "subscribers" but table is "email_subscribers")
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_org ON public.email_subscribers(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON public.email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON public.email_subscribers(status);

-- Create subscribers view for backward compatibility
CREATE OR REPLACE VIEW public.subscribers AS SELECT * FROM public.email_subscribers;

-- Create mailing_lists table
CREATE TABLE IF NOT EXISTS public.mailing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_mailing_lists_org ON public.mailing_lists(organization_id);

-- ========================================================================
-- PART 2: COMMITTEES
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_committees_org ON public.committees(organization_id);

CREATE TABLE IF NOT EXISTS public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('chair', 'vice_chair', 'secretary', 'treasurer', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(committee_id, profile_id)
);

-- ========================================================================
-- PART 3: EMAIL TEMPLATES
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_type VARCHAR(50) DEFAULT 'custom' CHECK (template_type IN ('welcome', 'renewal', 'event', 'custom')),
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON public.email_templates(organization_id);

-- ========================================================================
-- PART 4: BADGES & ACHIEVEMENTS
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  badge_type VARCHAR(50) DEFAULT 'manual' CHECK (badge_type IN ('manual', 'automatic', 'milestone')),
  criteria JSONB,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_org ON public.badges(organization_id);

CREATE TABLE IF NOT EXISTS public.member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, badge_id)
);

-- ========================================================================
-- PART 5: AUTOMATED REMINDERS
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.automated_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('membership_renewal', 'membership_expiry', 'event_upcoming', 'event_followup', 'custom')),
  trigger_days INTEGER NOT NULL,
  email_subject VARCHAR(500) NOT NULL,
  email_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  target_audience JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_org ON public.automated_reminders(organization_id);

-- Create reminders view for backward compatibility
CREATE OR REPLACE VIEW public.reminders AS SELECT * FROM public.automated_reminders;

-- ========================================================================
-- PART 6: DOCUMENTS LIBRARY
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents(organization_id);

-- ========================================================================
-- PART 7: NOTIFICATIONS
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  link VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- ========================================================================
-- PART 8: SAVED REPORTS
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('members', 'memberships', 'events', 'committees', 'financial', 'custom')),
  filters JSONB NOT NULL,
  columns JSONB NOT NULL,
  sort_by JSONB,
  is_public BOOLEAN DEFAULT false,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_org ON public.saved_reports(organization_id);

-- ========================================================================
-- PART 9: ENABLE RLS ON ALL TABLES
-- ========================================================================

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- PART 10: BASIC RLS POLICIES (Org-level access)
-- ========================================================================

-- Email Subscribers
CREATE POLICY "Admins can manage subscribers"
  ON public.email_subscribers FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Mailing Lists  
CREATE POLICY "Members can view mailing lists"
  ON public.mailing_lists FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage mailing lists"
  ON public.mailing_lists FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Committees
CREATE POLICY "Members can view committees"
  ON public.committees FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage committees"
  ON public.committees FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Email Templates
CREATE POLICY "Admins can manage templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Badges
CREATE POLICY "Members can view badges"
  ON public.badges FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Automated Reminders
CREATE POLICY "Admins can manage reminders"
  ON public.automated_reminders FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Documents
CREATE POLICY "Members can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Saved Reports
CREATE POLICY "Admins can manage reports"
  ON public.saved_reports FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Service role full access to all tables
CREATE POLICY "service_role_email_subscribers" ON public.email_subscribers FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_mailing_lists" ON public.mailing_lists FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_committees" ON public.committees FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_email_templates" ON public.email_templates FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_badges" ON public.badges FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_reminders" ON public.automated_reminders FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_documents" ON public.documents FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_notifications" ON public.notifications FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_reports" ON public.saved_reports FOR ALL TO service_role USING (true);

-- ========================================================================
-- PART 11: GRANT PERMISSIONS
-- ========================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_subscribers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailing_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automated_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_reports TO authenticated;

-- ========================================================================
-- DONE! Verify tables were created
-- ========================================================================

SELECT 
  'email_subscribers' as table_name, COUNT(*) as row_count FROM public.email_subscribers
UNION ALL
SELECT 'mailing_lists', COUNT(*) FROM public.mailing_lists
UNION ALL
SELECT 'committees', COUNT(*) FROM public.committees
UNION ALL
SELECT 'email_templates', COUNT(*) FROM public.email_templates
UNION ALL
SELECT 'badges', COUNT(*) FROM public.badges
UNION ALL
SELECT 'automated_reminders', COUNT(*) FROM public.automated_reminders
UNION ALL
SELECT 'documents', COUNT(*) FROM public.documents
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications
UNION ALL
SELECT 'saved_reports', COUNT(*) FROM public.saved_reports;
