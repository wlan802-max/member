import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, Plus, Trash2, Edit, Power, PowerOff } from 'lucide-react'

interface EmailWorkflow {
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

interface EmailWorkflowsManagerProps {
  organizationId: string
}

export function EmailWorkflowsManager({ organizationId }: EmailWorkflowsManagerProps) {
  const [workflows, setWorkflows] = useState<EmailWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddWorkflow, setShowAddWorkflow] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<EmailWorkflow | null>(null)

  useEffect(() => {
    fetchWorkflows()
  }, [organizationId])

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('email_workflows')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkflows(data || [])
    } catch (error) {
      console.error('Error fetching workflows:', error)
      toast.error('Failed to load email workflows')
    } finally {
      setLoading(false)
    }
  }

  const toggleWorkflow = async (workflow: EmailWorkflow) => {
    try {
      const { error } = await supabase
        .from('email_workflows')
        .update({ is_active: !workflow.is_active })
        .eq('id', workflow.id)

      if (error) throw error

      toast.success(`Workflow ${!workflow.is_active ? 'enabled' : 'disabled'}`)
      fetchWorkflows()
    } catch (error) {
      console.error('Error toggling workflow:', error)
      toast.error('Failed to toggle workflow')
    }
  }

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('email_workflows')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Workflow deleted')
      fetchWorkflows()
    } catch (error) {
      console.error('Error deleting workflow:', error)
      toast.error('Failed to delete workflow')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-gray-500">Loading workflows...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Workflows</CardTitle>
              <CardDescription>
                Automate email notifications when members sign up or renew their membership
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddWorkflow(true)} data-testid="button-add-workflow">
              <Plus className="h-4 w-4 mr-2" />
              Add Workflow
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows configured</h3>
              <p className="text-gray-500 mb-4">
                Create your first email workflow to automatically notify admins when members sign up or renew
              </p>
              <Button onClick={() => setShowAddWorkflow(true)} data-testid="button-add-first-workflow">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg" data-testid={`text-workflow-name-${workflow.id}`}>
                            {workflow.name}
                          </h3>
                          <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                            {workflow.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline">{workflow.trigger_event}</Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Recipient:</span>
                            <p className="font-medium">
                              {workflow.recipient_name || workflow.recipient_email}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Subject:</span>
                            <p className="font-medium">{workflow.email_subject}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWorkflow(workflow)}
                          data-testid={`button-toggle-workflow-${workflow.id}`}
                        >
                          {workflow.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingWorkflow(workflow)}
                          data-testid={`button-edit-workflow-${workflow.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWorkflow(workflow.id)}
                          data-testid={`button-delete-workflow-${workflow.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(showAddWorkflow || editingWorkflow) && (
        <WorkflowEditor
          organizationId={organizationId}
          workflow={editingWorkflow}
          onClose={() => {
            setShowAddWorkflow(false)
            setEditingWorkflow(null)
          }}
          onSuccess={() => {
            setShowAddWorkflow(false)
            setEditingWorkflow(null)
            fetchWorkflows()
          }}
        />
      )}
    </div>
  )
}

interface WorkflowEditorProps {
  organizationId: string
  workflow: EmailWorkflow | null
  onClose: () => void
  onSuccess: () => void
}

function WorkflowEditor({ organizationId, workflow, onClose, onSuccess }: WorkflowEditorProps) {
  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    trigger_event: workflow?.trigger_event || 'signup',
    recipient_email: workflow?.recipient_email || '',
    recipient_name: workflow?.recipient_name || '',
    email_subject: workflow?.email_subject || '',
    email_template: workflow?.email_template || '',
    is_active: workflow?.is_active ?? true
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const data = {
        organization_id: organizationId,
        name: formData.name,
        description: formData.description || null,
        trigger_event: formData.trigger_event,
        conditions: {},
        recipient_email: formData.recipient_email,
        recipient_name: formData.recipient_name || null,
        email_subject: formData.email_subject,
        email_template: formData.email_template,
        is_active: formData.is_active
      }

      let error
      if (workflow) {
        const result = await supabase
          .from('email_workflows')
          .update(data)
          .eq('id', workflow.id)
        error = result.error
      } else {
        const result = await supabase
          .from('email_workflows')
          .insert(data)
        error = result.error
      }

      if (error) throw error

      toast.success(`Workflow ${workflow ? 'updated' : 'created'} successfully`)
      onSuccess()
    } catch (error) {
      console.error('Error saving workflow:', error)
      toast.error(`Failed to ${workflow ? 'update' : 'create'} workflow`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{workflow ? 'Edit' : 'Create'} Email Workflow</CardTitle>
          <CardDescription>
            Configure automated email notifications for member signups and renewals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium">Workflow Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Notify Treasurer of Adult Membership"
                required
                data-testid="input-workflow-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this workflow does"
                data-testid="input-workflow-description"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Trigger Event</label>
              <select
                value={formData.trigger_event}
                onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="select-trigger-event"
              >
                <option value="signup">New Signup</option>
                <option value="renewal">Membership Renewal</option>
                <option value="both">Both Signup and Renewal</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Recipient Email</label>
                <Input
                  type="email"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  placeholder="admin@example.com"
                  required
                  data-testid="input-recipient-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Recipient Name (Optional)</label>
                <Input
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="Treasurer"
                  data-testid="input-recipient-name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Email Subject</label>
              <Input
                value={formData.email_subject}
                onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                placeholder="New Member Signup: {{first_name}} {{last_name}}"
                required
                data-testid="input-email-subject"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{' + '{first_name}}'}, {'{' + '{last_name}}'}, {'{' + '{email}}'}, {'{' + '{membership_type}}'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Email Template</label>
              <textarea
                value={formData.email_template}
                onChange={(e) => setFormData({ ...formData, email_template: e.target.value })}
                placeholder="New member {{first_name}} {{last_name}} has signed up for {{membership_type}} membership."
                rows={8}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
                data-testid="textarea-email-template"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use template variables like {'{' + '{first_name}}'} to insert member data. HTML is supported.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="workflow-active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                data-testid="checkbox-workflow-active"
              />
              <label htmlFor="workflow-active" className="text-sm font-medium">
                Enable this workflow immediately
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} data-testid="button-save-workflow">
                {saving ? 'Saving...' : workflow ? 'Update Workflow' : 'Create Workflow'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
