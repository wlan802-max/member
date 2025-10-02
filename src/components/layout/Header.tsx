import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useNotifications } from '@/hooks/useNotifications'
import { LogOut, User, Settings, Bell, Info, CheckCircle, AlertTriangle, XCircle, Calendar, UserPlus, Cog } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Database } from '@/lib/supabase/client'

type NotificationType = Database['public']['Tables']['notifications']['Row']['notification_type']

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
    case 'error':
      return <XCircle className="h-5 w-5 text-red-600" />
    case 'event':
      return <Calendar className="h-5 w-5 text-purple-600" />
    case 'membership':
      return <UserPlus className="h-5 w-5 text-indigo-600" />
    case 'system':
      return <Cog className="h-5 w-5 text-gray-600" />
    default:
      return <Info className="h-5 w-5 text-blue-600" />
  }
}

function getNotificationBorderColor(type: NotificationType) {
  switch (type) {
    case 'success':
      return 'border-l-green-500'
    case 'warning':
      return 'border-l-orange-500'
    case 'error':
      return 'border-l-red-500'
    case 'event':
      return 'border-l-purple-500'
    case 'membership':
      return 'border-l-indigo-500'
    case 'system':
      return 'border-l-gray-500'
    default:
      return 'border-l-blue-500'
  }
}

function NotificationBell() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications(user?.profile?.id)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        data-testid="button-notifications"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
            data-testid="badge-unread-count"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[32rem] flex flex-col"
          data-testid="dropdown-notifications"
        >
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-gray-900" data-testid="text-notifications-title">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                data-testid="button-mark-all-read"
              >
                {isMarkingAllAsRead ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1" style={{ maxHeight: '24rem' }}>
            {isLoading ? (
              <div className="p-8 text-center" data-testid="loading-notifications">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center" data-testid="empty-notifications">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No notifications</p>
                <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id)
                      }
                      if (notification.link_url) {
                        window.location.href = notification.link_url
                      }
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-l-4 ${getNotificationBorderColor(
                      notification.notification_type
                    )} ${!notification.is_read ? 'bg-blue-50' : ''}`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !notification.is_read
                              ? 'font-semibold text-gray-900'
                              : 'font-medium text-gray-700'
                          }`}
                          data-testid={`notification-title-${notification.id}`}
                        >
                          {notification.title}
                        </p>
                        <p
                          className="text-sm text-gray-600 mt-0.5 line-clamp-2"
                          data-testid={`notification-message-${notification.id}`}
                        >
                          {notification.message}
                        </p>
                        <p
                          className="text-xs text-gray-500 mt-1"
                          data-testid={`notification-time-${notification.id}`}
                        >
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div
                            className="h-2 w-2 bg-blue-600 rounded-full"
                            data-testid={`notification-unread-indicator-${notification.id}`}
                          ></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <p className="text-xs text-center text-gray-500" data-testid="text-notifications-footer">
                Showing {notifications.length} most recent notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
              <span className="text-sm text-gray-700 hidden md:block">
                Welcome, {user.profile?.first_name} {user.profile?.last_name}
              </span>
              
              <div className="flex items-center space-x-2">
                <NotificationBell />
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled
                  title="Access your profile from the dashboard"
                  data-testid="button-profile"
                  className="hidden sm:flex"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.hash = 'admin'}
                    data-testid="button-admin"
                  >
                    <Settings className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  data-testid="button-signout"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
