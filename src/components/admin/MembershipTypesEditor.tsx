import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface MembershipType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
}

interface MembershipTypesEditorProps {
  organizationId: string;
}

export function MembershipTypesEditor({ organizationId }: MembershipTypesEditorProps) {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<MembershipType | null>(null);

  useEffect(() => {
    loadMembershipTypes();
  }, [organizationId]);

  const loadMembershipTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_membership_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('display_order');

      if (error) throw error;

      setMembershipTypes(data || []);
    } catch (error) {
      console.error('Error loading membership types:', error);
      toast.error('Failed to load membership types');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: Partial<MembershipType>) => {
    try {
      if (editingType) {
        const { error } = await supabase
          .from('organization_membership_types')
          .update({
            code: type.code,
            name: type.name,
            description: type.description,
            price: type.price,
            is_default: type.is_default,
            is_active: type.is_active,
            display_order: type.display_order
          })
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Membership type updated');
      } else {
        const maxOrder = membershipTypes.length > 0
          ? Math.max(...membershipTypes.map(t => t.display_order))
          : 0;

        const { error } = await supabase
          .from('organization_membership_types')
          .insert({
            organization_id: organizationId,
            code: type.code,
            name: type.name,
            description: type.description,
            price: type.price,
            is_default: type.is_default || false,
            is_active: type.is_active !== false,
            display_order: maxOrder + 1
          });

        if (error) throw error;
        toast.success('Membership type created');
      }

      setShowForm(false);
      setEditingType(null);
      loadMembershipTypes();
    } catch (error: any) {
      console.error('Error saving membership type:', error);
      toast.error(error.message || 'Failed to save membership type');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this membership type?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_membership_types')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Membership type deactivated');
      loadMembershipTypes();
    } catch (error) {
      console.error('Error deactivating membership type:', error);
      toast.error('Failed to deactivate membership type');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = membershipTypes.findIndex(t => t.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= membershipTypes.length) return;

    const newTypes = [...membershipTypes];
    [newTypes[index], newTypes[newIndex]] = [newTypes[newIndex], newTypes[index]];

    try {
      const updates = newTypes.map((type, idx) => ({
        id: type.id,
        display_order: idx + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('organization_membership_types')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      setMembershipTypes(newTypes);
      toast.success('Order updated');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to update order');
      loadMembershipTypes();
    }
  };

  if (loading) {
    return <div className="p-8">Loading membership types...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Membership Types</h2>
          <p className="text-muted-foreground mt-1">
            Configure membership tiers and pricing for your organization
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingType(null);
            setShowForm(true);
          }}
          data-testid="button-add-membership-type"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Membership Type
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>{editingType ? 'Edit' : 'Add'} Membership Type</CardTitle>
            <CardDescription>
              {editingType ? 'Update' : 'Create a new'} membership type with pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MembershipTypeForm
              initialData={editingType}
              onSave={(type) => handleSave(type)}
              onCancel={() => {
                setShowForm(false);
                setEditingType(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {membershipTypes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No membership types configured. Click "Add Membership Type" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {membershipTypes.map((type, index) => (
            <Card key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(type.id, 'up')}
                      disabled={index === 0}
                      className="h-6 px-1"
                      data-testid={`button-move-up-${type.code}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(type.id, 'down')}
                      disabled={index === membershipTypes.length - 1}
                      className="h-6 px-1"
                      data-testid={`button-move-down-${type.code}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{type.name}</h3>
                      <span className="text-sm text-muted-foreground">({type.code})</span>
                      {type.is_default && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                      {!type.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {type.description && (
                      <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      £{parseFloat(type.price).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingType(type);
                        setShowForm(true);
                      }}
                      data-testid={`button-edit-${type.code}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {type.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(type.id)}
                        data-testid={`button-delete-${type.code}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface MembershipTypeFormProps {
  initialData?: MembershipType | null;
  onSave: (data: Partial<MembershipType>) => void;
  onCancel: () => void;
}

function MembershipTypeForm({ initialData, onSave, onCancel }: MembershipTypeFormProps) {
  const [formData, setFormData] = useState({
    code: initialData?.code || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || '0.00',
    is_default: initialData?.is_default || false,
    is_active: initialData?.is_active !== false,
    display_order: initialData?.display_order || 1
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData({
      code: initialData?.code || '',
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || '0.00',
      is_default: initialData?.is_default || false,
      is_active: initialData?.is_active !== false,
      display_order: initialData?.display_order || 1
    });
    setErrors({});
  }, [initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must be lowercase letters, numbers, and underscores only';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Price must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    onSave({
      ...formData,
      price: parseFloat(formData.price).toFixed(2)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
            placeholder="e.g. adult, family, student"
            data-testid="input-membership-code"
            className={errors.code ? 'border-red-500' : ''}
          />
          {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            Unique identifier (lowercase, no spaces)
          </p>
        </div>

        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Adult Membership"
            data-testid="input-membership-name"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description or eligibility criteria"
          rows={2}
          data-testid="input-membership-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price (£) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            data-testid="input-membership-price"
            className={errors.price ? 'border-red-500' : ''}
          />
          {errors.price && <p className="text-sm text-red-500 mt-1">{errors.price}</p>}
        </div>

        <div className="flex items-end pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData({ ...formData, is_default: !!checked })}
              data-testid="checkbox-is-default"
            />
            <Label htmlFor="is_default" className="cursor-pointer">
              Default selection
            </Label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
          data-testid="checkbox-is-active"
        />
        <Label htmlFor="is_active" className="cursor-pointer">
          Active (visible in signup forms)
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-membership"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" data-testid="button-save-membership">
          <Save className="h-4 w-4 mr-2" />
          {initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
