import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, CheckCircle } from 'lucide-react'

interface SubscriptionFormProps {
  organizationId: string
  organizationName: string
}

export function SubscriptionForm({ organizationId, organizationName }: SubscriptionFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: ''
  })
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('subscribers')
        .insert({
          organization_id: organizationId,
          email: formData.email,
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          status: 'subscribed',
          subscribed_at: new Date().toISOString(),
          subscription_source: 'website'
        })

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already subscribed')
        }
        throw error
      }

      setSubscribed(true)
      toast.success('Successfully subscribed!')
    } catch (error: any) {
      console.error('Error subscribing:', error)
      toast.error(error.message || 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  if (subscribed) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">You're Subscribed!</h3>
          <p className="text-gray-600">
            Thank you for subscribing to {organizationName}'s mailing list. 
            You'll receive updates and announcements at {formData.email}.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <Mail className="h-12 w-12 text-blue-600 mx-auto mb-2" />
        <CardTitle className="text-2xl">Subscribe to Updates</CardTitle>
        <CardDescription>
          Stay informed with news and updates from {organizationName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
              required
              data-testid="input-subscribe-email"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                data-testid="input-subscribe-first-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                data-testid="input-subscribe-last-name"
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
            data-testid="button-subscribe"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
