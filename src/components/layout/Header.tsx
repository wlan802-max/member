import React from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { LogOut, User, Settings, CreditCard } from 'lucide-react'

export function Header() {
  const { user, signOut, isAdmin } = useAuth()
  const { organization } = useTenant()

  const handleSignOut = async () => {
    await signOut()
  }

  if (!organization) return null

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {organization.logo_url && (
              <img 
                src={organization.logo_url} 
                alt={organization.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold" style={{ color: organization.primary_color }}>
                {organization.name}
              </h1>
              <p className="text-sm text-gray-600">Member Portal</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.profile?.first_name} {user.profile?.last_name}
              </span>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                
                {isAdmin && (
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}