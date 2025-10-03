import { supabase } from './supabase/client'

export interface User {
  id: string
  email: string
  profile?: {
    id: string
    first_name: string
    last_name: string
    role: string
    is_active: boolean
    organization?: {
      id: string
      name: string
      slug: string
      primary_color: string
      secondary_color: string
    }
  }
}

export const auth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  async signUp(email: string, password: string, userData: {
    first_name: string
    last_name: string
    organization_slug: string
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    console.log('Getting profile for user:', user.id)

    // Get user profile first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, is_active, organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error loading profile:', profileError)
      return null
    }

    if (!profile) {
      console.warn('No profile found for user:', user.id)
      return null
    }

    console.log('Profile loaded:', { role: profile.role, has_org: !!profile.organization_id })

    // Get organization separately if profile has one (to avoid join issues with NULL)
    let organization = undefined
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug, primary_color, secondary_color')
        .eq('id', profile.organization_id)
        .single()
      
      if (org) {
        organization = org
        console.log('Organization loaded:', org.slug)
      }
    } else {
      console.log('No organization_id (likely super admin)')
    }

    return {
      id: user.id,
      email: user.email!,
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        is_active: profile.is_active,
        organization
      }
    }
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}