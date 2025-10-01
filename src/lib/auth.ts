import { supabase } from './supabase/client'

export interface User {
  id: string
  email: string
  profile?: {
    id: string
    first_name: string
    last_name: string
    role: string
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

    // Get user profile with organization (use left join for super admins who have no org)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        organization_id,
        organizations:organization_id(
          id,
          name,
          slug,
          primary_color,
          secondary_color
        )
      `)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error loading profile:', error)
    }

    if (!profile) {
      console.warn('No profile found for user:', user.id)
    } else {
      const org = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations
      console.log('Profile loaded:', { role: profile.role, org: org?.slug, has_org: !!profile.organization_id })
    }

    const org = Array.isArray(profile?.organizations) ? profile.organizations[0] : profile?.organizations

    return {
      id: user.id,
      email: user.email!,
      profile: profile ? {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        organization: org || undefined
      } : undefined
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