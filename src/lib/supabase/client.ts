import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          slug: string
          name: string
          domain: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          contact_email: string
          contact_phone: string | null
          address: any | null
          settings: any
          membership_year_start_month: number
          membership_year_end_month: number
          renewal_enabled: boolean
          renewal_form_schema_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          domain?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          contact_email: string
          contact_phone?: string | null
          address?: any | null
          settings?: any
          membership_year_start_month?: number
          membership_year_end_month?: number
          renewal_enabled?: boolean
          renewal_form_schema_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          domain?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          contact_email?: string
          contact_phone?: string | null
          address?: any | null
          settings?: any
          membership_year_start_month?: number
          membership_year_end_month?: number
          renewal_enabled?: boolean
          renewal_form_schema_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          address: any | null
          role: string
          status: 'pending' | 'active' | 'suspended' | 'rejected'
          is_active: boolean
          pending_reason: string | null
          rejection_note: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          address?: any | null
          role?: string
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          is_active?: boolean
          pending_reason?: string | null
          rejection_note?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          address?: any | null
          role?: string
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          is_active?: boolean
          pending_reason?: string | null
          rejection_note?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          organization_id: string
          profile_id: string
          membership_year: number
          start_date: string
          end_date: string
          status: string
          membership_type: string
          amount_paid: number | null
          payment_date: string | null
          payment_reference: string | null
          benefits: any
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          profile_id: string
          membership_year: number
          start_date: string
          end_date: string
          status?: string
          membership_type?: string
          amount_paid?: number | null
          payment_date?: string | null
          payment_reference?: string | null
          benefits?: any
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          profile_id?: string
          membership_year?: number
          start_date?: string
          end_date?: string
          status?: string
          membership_type?: string
          amount_paid?: number | null
          payment_date?: string | null
          payment_reference?: string | null
          benefits?: any
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          location: string | null
          start_date: string
          end_date: string | null
          is_published: boolean
          registration_url: string | null
          max_attendees: number | null
          current_attendees: number
          registration_deadline: string | null
          allow_waitlist: boolean
          require_approval: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          location?: string | null
          start_date: string
          end_date?: string | null
          is_published?: boolean
          registration_url?: string | null
          max_attendees?: number | null
          current_attendees?: number
          registration_deadline?: string | null
          allow_waitlist?: boolean
          require_approval?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          location?: string | null
          start_date?: string
          end_date?: string | null
          is_published?: boolean
          registration_url?: string | null
          max_attendees?: number | null
          current_attendees?: number
          registration_deadline?: string | null
          allow_waitlist?: boolean
          require_approval?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string
          profile_id: string
          organization_id: string
          status: 'registered' | 'waitlist' | 'cancelled' | 'checked_in' | 'pending_approval'
          registered_at: string
          cancelled_at: string | null
          checked_in_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          profile_id: string
          organization_id: string
          status?: 'registered' | 'waitlist' | 'cancelled' | 'checked_in' | 'pending_approval'
          registered_at?: string
          cancelled_at?: string | null
          checked_in_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          profile_id?: string
          organization_id?: string
          status?: 'registered' | 'waitlist' | 'cancelled' | 'checked_in' | 'pending_approval'
          registered_at?: string
          cancelled_at?: string | null
          checked_in_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      committees: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          slug: string
          mailing_list_id: string | null
          is_active: boolean
          member_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          slug: string
          mailing_list_id?: string | null
          is_active?: boolean
          member_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          slug?: string
          mailing_list_id?: string | null
          is_active?: boolean
          member_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      committee_members: {
        Row: {
          id: string
          committee_id: string
          profile_id: string
          role: 'chair' | 'vice_chair' | 'secretary' | 'treasurer' | 'member'
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          committee_id: string
          profile_id: string
          role?: 'chair' | 'vice_chair' | 'secretary' | 'treasurer' | 'member'
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          committee_id?: string
          profile_id?: string
          role?: 'chair' | 'vice_chair' | 'secretary' | 'treasurer' | 'member'
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          badge_type: 'manual' | 'automatic' | 'milestone'
          criteria: any | null
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          badge_type?: 'manual' | 'automatic' | 'milestone'
          criteria?: any | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          badge_type?: 'manual' | 'automatic' | 'milestone'
          criteria?: any | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      member_badges: {
        Row: {
          id: string
          profile_id: string
          badge_id: string
          awarded_at: string
          awarded_by: string | null
          notes: string | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          badge_id: string
          awarded_at?: string
          awarded_by?: string | null
          notes?: string | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          badge_id?: string
          awarded_at?: string
          awarded_by?: string | null
          notes?: string | null
          metadata?: any | null
          created_at?: string
        }
      }
      automated_reminders: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          reminder_type: 'membership_renewal' | 'membership_expiry' | 'event_upcoming' | 'event_followup' | 'custom'
          trigger_days: number
          email_subject: string
          email_body: string
          is_active: boolean
          target_audience: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          reminder_type: 'membership_renewal' | 'membership_expiry' | 'event_upcoming' | 'event_followup' | 'custom'
          trigger_days: number
          email_subject: string
          email_body: string
          is_active?: boolean
          target_audience?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          reminder_type?: 'membership_renewal' | 'membership_expiry' | 'event_upcoming' | 'event_followup' | 'custom'
          trigger_days?: number
          email_subject?: string
          email_body?: string
          is_active?: boolean
          target_audience?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      reminder_logs: {
        Row: {
          id: string
          reminder_id: string
          profile_id: string
          sent_at: string
          status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked'
          error_message: string | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          reminder_id: string
          profile_id: string
          sent_at?: string
          status?: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked'
          error_message?: string | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          reminder_id?: string
          profile_id?: string
          sent_at?: string
          status?: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked'
          error_message?: string | null
          metadata?: any | null
          created_at?: string
        }
      }
      saved_reports: {
        Row: {
          id: string
          organization_id: string
          created_by: string
          name: string
          description: string | null
          report_type: 'members' | 'memberships' | 'events' | 'committees' | 'financial' | 'custom'
          filters: any
          columns: any
          sort_by: any | null
          is_public: boolean
          last_run_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          created_by: string
          name: string
          description?: string | null
          report_type: 'members' | 'memberships' | 'events' | 'committees' | 'financial' | 'custom'
          filters: any
          columns: any
          sort_by?: any | null
          is_public?: boolean
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string
          name?: string
          description?: string | null
          report_type?: 'members' | 'memberships' | 'events' | 'committees' | 'financial' | 'custom'
          filters?: any
          columns?: any
          sort_by?: any | null
          is_public?: boolean
          last_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          subject: string
          body: string
          template_type: 'welcome' | 'renewal' | 'expiry' | 'event' | 'newsletter' | 'custom'
          variables: any | null
          is_active: boolean
          is_default: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          subject: string
          body: string
          template_type?: 'welcome' | 'renewal' | 'expiry' | 'event' | 'newsletter' | 'custom'
          variables?: any | null
          is_active?: boolean
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          subject?: string
          body?: string
          template_type?: 'welcome' | 'renewal' | 'expiry' | 'event' | 'newsletter' | 'custom'
          variables?: any | null
          is_active?: boolean
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      member_notes: {
        Row: {
          id: string
          profile_id: string
          created_by: string
          note: string
          note_type: 'general' | 'admin' | 'support' | 'payment' | 'behavior'
          is_private: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          created_by: string
          note: string
          note_type?: 'general' | 'admin' | 'support' | 'payment' | 'behavior'
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          created_by?: string
          note?: string
          note_type?: 'general' | 'admin' | 'support' | 'payment' | 'behavior'
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          profile_id: string
          title: string
          message: string
          notification_type: 'info' | 'success' | 'warning' | 'error' | 'event' | 'membership' | 'system'
          link_url: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          message: string
          notification_type?: 'info' | 'success' | 'warning' | 'error' | 'event' | 'membership' | 'system'
          link_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          message?: string
          notification_type?: 'info' | 'success' | 'warning' | 'error' | 'event' | 'membership' | 'system'
          link_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          file_url: string
          file_type: string | null
          file_size: number | null
          category: 'general' | 'policy' | 'form' | 'guide' | 'legal' | 'financial' | 'other'
          is_public: boolean
          uploaded_by: string
          download_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          file_url: string
          file_type?: string | null
          file_size?: number | null
          category?: 'general' | 'policy' | 'form' | 'guide' | 'legal' | 'financial' | 'other'
          is_public?: boolean
          uploaded_by: string
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          category?: 'general' | 'policy' | 'form' | 'guide' | 'legal' | 'financial' | 'other'
          is_public?: boolean
          uploaded_by?: string
          download_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      subscribers: {
        Row: {
          id: string
          organization_id: string
          email: string
          first_name: string | null
          last_name: string | null
          status: string
          resend_contact_id: string | null
          subscription_source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          status?: string
          resend_contact_id?: string | null
          subscription_source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          status?: string
          resend_contact_id?: string | null
          subscription_source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      mailing_lists: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          slug: string
          is_active: boolean
          subscriber_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          slug: string
          is_active?: boolean
          subscriber_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          slug?: string
          is_active?: boolean
          subscriber_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      subscriber_lists: {
        Row: {
          id: string
          subscriber_id: string
          mailing_list_id: string
          status: 'subscribed' | 'unsubscribed' | 'pending'
          subscribed_at: string
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subscriber_id: string
          mailing_list_id: string
          status?: 'subscribed' | 'unsubscribed' | 'pending'
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subscriber_id?: string
          mailing_list_id?: string
          status?: 'subscribed' | 'unsubscribed' | 'pending'
          subscribed_at?: string
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_campaigns: {
        Row: {
          id: string
          organization_id: string
          title: string
          subject: string
          content: string
          status: string
          mailing_list_id: string | null
          resend_broadcast_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          recipient_count: number | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          subject: string
          content: string
          status?: string
          mailing_list_id?: string | null
          resend_broadcast_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          recipient_count?: number | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          subject?: string
          content?: string
          status?: string
          mailing_list_id?: string | null
          resend_broadcast_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          recipient_count?: number | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_membership_types: {
        Row: {
          id: string
          organization_id: string
          code: string
          name: string
          description: string | null
          price: number
          is_default: boolean
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          code: string
          name: string
          description?: string | null
          price?: number
          is_default?: boolean
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          code?: string
          name?: string
          description?: string | null
          price?: number
          is_default?: boolean
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      organization_form_schemas: {
        Row: {
          id: string
          organization_id: string
          schema_version: number
          title: string
          description: string | null
          schema_data: any
          form_type: 'signup' | 'renewal' | 'both'
          is_active: boolean
          created_at: string
          created_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          schema_version?: number
          title?: string
          description?: string | null
          schema_data: any
          form_type?: 'signup' | 'renewal' | 'both'
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          schema_version?: number
          title?: string
          description?: string | null
          schema_data?: any
          form_type?: 'signup' | 'renewal' | 'both'
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
        }
      }
      email_workflows: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          trigger_event: 'signup' | 'renewal' | 'both'
          conditions: any
          recipient_email: string
          recipient_name: string | null
          email_subject: string
          email_template: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          trigger_event: 'signup' | 'renewal' | 'both'
          conditions?: any
          recipient_email: string
          recipient_name?: string | null
          email_subject: string
          email_template: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          trigger_event?: 'signup' | 'renewal' | 'both'
          conditions?: any
          recipient_email?: string
          recipient_name?: string | null
          email_subject?: string
          email_template?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profile_form_responses: {
        Row: {
          id: string
          profile_id: string
          organization_id: string
          schema_id: string | null
          schema_version: number | null
          response_data: any
          selected_membership_types: string[]
          total_amount: number
          submitted_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          organization_id: string
          schema_id?: string | null
          schema_version?: number | null
          response_data?: any
          selected_membership_types?: string[]
          total_amount?: number
          submitted_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          organization_id?: string
          schema_id?: string | null
          schema_version?: number | null
          response_data?: any
          selected_membership_types?: string[]
          total_amount?: number
          submitted_at?: string
        }
      }
    }
  }
}