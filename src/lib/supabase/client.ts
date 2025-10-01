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
          is_active: boolean
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
          is_active?: boolean
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
          is_active?: boolean
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
    }
  }
}