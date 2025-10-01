import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'

interface UnsubscribePageProps {
  subscriberId: string
  organizationName: string
}

export function UnsubscribePage({ subscriberId, organizationName }: UnsubscribePageProps) {
  const [loading, setLoading] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchSubscriber()
  }, [subscriberId])

  const fetchSubscriber = async () => {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('email, status')
        .eq('id', subscriberId)
        .single()

      if (error) throw error

      setEmail(data.email)
      if (data.status === 'unsubscribed') {
        setUnsubscribed(true)
      }
    } catch (error) {
      console.error('Error fetching subscriber:', error)
      setError(true)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from('subscribers')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        })
        .eq('id', subscriberId)

      if (error) throw error

      setUnsubscribed(true)
      toast.success('Successfully unsubscribed')
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast.error('Failed to unsubscribe')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Link Invalid</h3>
          <p className="text-gray-600">
            This unsubscribe link is invalid or has expired. Please contact support if you continue to receive emails.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (unsubscribed) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Successfully Unsubscribed</h3>
          <p className="text-gray-600">
            {email} has been removed from {organizationName}'s mailing list. 
            You will no longer receive emails from us.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            We're sorry to see you go. You can resubscribe at any time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <Mail className="h-12 w-12 text-gray-600 mx-auto mb-2" />
        <CardTitle className="text-2xl">Unsubscribe</CardTitle>
        <CardDescription>
          We're sorry to see you go
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          You are about to unsubscribe <strong>{email}</strong> from {organizationName}'s mailing list.
        </p>
        <p className="text-sm text-gray-500">
          You will no longer receive updates, announcements, or newsletters from us.
        </p>
        <Button 
          onClick={handleUnsubscribe} 
          variant="destructive" 
          className="w-full"
          disabled={loading}
          data-testid="button-confirm-unsubscribe"
        >
          {loading ? 'Unsubscribing...' : 'Confirm Unsubscribe'}
        </Button>
      </CardContent>
    </Card>
  )
}
