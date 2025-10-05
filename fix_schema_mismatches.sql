-- =================================================================
-- SCHEMA FIX: Align database with code expectations
-- =================================================================

-- 1. Fix email_templates table - add 'body' column
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS body TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Update body from body_html if exists
UPDATE public.email_templates SET body = body_html WHERE body IS NULL AND body_html IS NOT NULL;

-- 2. Create subscriber_lists table (missing junction table)
CREATE TABLE IF NOT EXISTS public.subscriber_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  mailing_list_id UUID NOT NULL REFERENCES public.mailing_lists(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'pending')),
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, mailing_list_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriber_lists_subscriber ON public.subscriber_lists(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_list ON public.subscriber_lists(mailing_list_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_status ON public.subscriber_lists(status);

-- Enable RLS
ALTER TABLE public.subscriber_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriber_lists
CREATE POLICY "Members can view subscriber lists"
  ON public.subscriber_lists FOR SELECT
  TO authenticated
  USING (
    mailing_list_id IN (
      SELECT id FROM public.mailing_lists
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage subscriber lists"
  ON public.subscriber_lists FOR ALL
  TO authenticated
  USING (
    mailing_list_id IN (
      SELECT id FROM public.mailing_lists
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "service_role_subscriber_lists" 
  ON public.subscriber_lists FOR ALL 
  TO service_role 
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriber_lists TO authenticated;
GRANT ALL ON public.subscriber_lists TO service_role;

-- 3. Add missing columns to committees (if needed)
ALTER TABLE public.committees 
ADD COLUMN IF NOT EXISTS mailing_list_id UUID REFERENCES public.mailing_lists(id) ON DELETE SET NULL;

-- 4. Update mailing_lists to ensure proper columns
ALTER TABLE public.mailing_lists
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. Verify all tables exist
SELECT 'email_subscribers' as table_name, COUNT(*) as exists FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'email_subscribers'
UNION ALL
SELECT 'mailing_lists', COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'mailing_lists'
UNION ALL
SELECT 'subscriber_lists', COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'subscriber_lists'
UNION ALL
SELECT 'committees', COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'committees'
UNION ALL
SELECT 'email_templates', COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'email_templates';
