import { supabase } from './supabase/client'

export interface Organization {
  id: string
  slug: string
  name: string
  domain: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  contact_email: string
  contact_phone: string | null
  settings: any
  membership_year_start_month: number
  membership_year_end_month: number
  renewal_enabled: boolean
  renewal_form_schema_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export const tenant = {
  async getOrganizationByCustomDomain(domain: string): Promise<Organization | null> {
    console.log('Getting organization for custom domain:', domain)
    
    // Query organization_domains table to find the organization
    const { data: domainData, error: domainError } = await supabase
      .from('organization_domains')
      .select('organization_id')
      .eq('domain', domain.toLowerCase())
      .eq('verification_status', 'verified')
      .single()

    if (domainError || !domainData) {
      console.log('Custom domain not found or not verified:', domainError)
      return null
    }

    // Load the organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', domainData.organization_id)
      .eq('is_active', true)
      .single()

    if (orgError || !orgData) {
      console.log('Organization not found for custom domain:', orgError)
      return null
    }

    console.log('Found organization via custom domain:', orgData)
    return orgData
  },

  async getOrganizationBySubdomain(subdomain: string): Promise<Organization | null> {
    console.log('Getting organization for subdomain:', subdomain)
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', subdomain)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.log('Organization not found:', error)
      return null
    }
    console.log('Found organization:', data)
    return data
  },

  getCurrentSubdomain(): string | null {
    if (typeof window === 'undefined') return null

    const hostname = window.location.hostname
    console.log('Current hostname:', hostname)
    const parts = hostname.split('.')
    console.log('Hostname parts:', parts)

    // Check for ?org= parameter first (works for all environments)
    const urlParams = new URLSearchParams(window.location.search)
    const orgParam = urlParams.get('org')
    if (orgParam) {
      console.log('Found org parameter:', orgParam)
      return orgParam
    }

    // For development (localhost or IP address)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      console.log('Development mode (localhost/IP), no org param - showing selector')
      return null
    }

    // For production (subdomain.m.ringing.org.uk or subdomain.member.ringing.org.uk)
    if (parts.length >= 4 && (parts[parts.length - 4] === 'm' || parts[parts.length - 4] === 'member')) {
      const subdomain = parts[0]
      console.log('Production mode, detected subdomain:', subdomain)
      return subdomain
    }

    console.log('No subdomain detected')
    return null
  },

  isSuperAdminSubdomain(): boolean {
    if (typeof window === 'undefined') return false

    const hostname = window.location.hostname
    console.log('Checking if super admin subdomain for hostname:', hostname)
    const parts = hostname.split('.')

    // Check URL parameter first (works for all environments)
    const urlParams = new URLSearchParams(window.location.search)
    const orgParam = urlParams.get('org')

    // For development (localhost or IP address)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const isAdmin = orgParam === 'admin'
      console.log('Development mode (localhost/IP), is admin:', isAdmin)
      return isAdmin
    }

    // For production (admin.m.ringing.org.uk or admin.member.ringing.org.uk)
    if (parts.length >= 4 && (parts[parts.length - 4] === 'm' || parts[parts.length - 4] === 'member')) {
      const isAdmin = parts[0] === 'admin'
      console.log('Production mode, is admin:', isAdmin)
      return isAdmin
    }

    console.log('Not super admin subdomain')
    return false
  },

  async getCurrentOrganization(): Promise<Organization | null> {
    // Don't try to get organization for super admin subdomain
    if (this.isSuperAdminSubdomain()) return null
    
    // First, check if we're on a custom domain
    const hostname = typeof window !== 'undefined' ? window.location.hostname : null
    if (hostname) {
      // Skip custom domain check for localhost, IP addresses, and known subdomains
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
      const isSubdomain = hostname.includes('.m.ringing.org.uk') || hostname.includes('.member.ringing.org.uk')
      
      if (!isLocalhost && !isSubdomain) {
        console.log('Checking if hostname is a custom domain:', hostname)
        const org = await this.getOrganizationByCustomDomain(hostname)
        if (org) {
          console.log('Found organization via custom domain')
          return org
        }
      }
    }
    
    // Fallback to subdomain/URL parameter detection
    const subdomain = this.getCurrentSubdomain()
    if (!subdomain) return null
    
    return await this.getOrganizationBySubdomain(subdomain)
  }
}