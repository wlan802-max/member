import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Save, Eye, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Tabs will be replaced with simple button-based tabs
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer';
import type { FormSchema, FormSection, FormField, MembershipType } from '@/lib/formSchema';

interface FormBuilderProps {
  organizationId: string;
}

function FormPreview({ schema, organizationId }: { schema: FormSchema; organizationId: string }) {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);

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
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      setMembershipTypes(
        data.map((mt) => ({
          id: mt.id,
          code: mt.code,
          name: mt.name,
          description: mt.description || undefined,
          price: parseFloat(mt.price),
          is_default: mt.is_default,
          is_active: mt.is_active,
          display_order: mt.display_order
        }))
      );
    } catch (error) {
      console.error('Error loading membership types:', error);
      toast.error('Failed to load membership types');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading membership types...</div>;
  }

  if (membershipTypes.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No membership types configured. Please add membership types before previewing the form.
      </div>
    );
  }

  return (
    <DynamicFormRenderer
      schema={schema}
      membershipTypes={membershipTypes}
      onSubmit={async (data) => {
        console.log('Preview form submitted:', data);
        toast.info('This is a preview - form not actually submitted');
      }}
      submitLabel="Sign Up (Preview)"
    />
  );
}

export function FormBuilder({ organizationId }: FormBuilderProps) {
  const [schema, setSchema] = useState<FormSchema>({
    version: 1,
    sections: []
  });
  const [formType, setFormType] = useState<'signup' | 'renewal' | 'both'>('signup');
  const [formTitle, setFormTitle] = useState('Membership Signup Form');
  const [formDescription, setFormDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [editingField, setEditingField] = useState<{ sectionIdx: number; fieldIdx: number } | null>(null);

  useEffect(() => {
    loadFormSchema();
  }, [organizationId]);

  const loadFormSchema = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_form_schemas')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Support both old (form_schema) and new (schema_data) column names for backward compatibility
        const schemaData = (data.schema_data || data.form_schema) as FormSchema;
        if (schemaData) {
          setSchema(schemaData);
          setFormType(data.form_type || 'signup');
          setFormTitle(data.title || 'Membership Form');
          setFormDescription(data.description || '');
        } else {
          // If no schema data at all, use default
          setDefaultSchema();
        }
      } else {
        setDefaultSchema();
      }
    } catch (error) {
      console.error('Error loading form schema:', error);
      toast.error('Failed to load form schema');
    } finally {
      setLoading(false);
    }
  };

  const setDefaultSchema = () => {
    setSchema({
      version: 1,
      sections: [
        {
          id: 'personal_info',
          title: 'Personal Information',
          description: 'Please provide your basic information',
          fields: [
            {
              id: 'title',
              type: 'text',
              label: 'Title',
              required: false
            },
            {
              id: 'date_of_birth',
              type: 'date',
              label: 'Date of Birth',
              required: true
            },
            {
              id: 'address',
              type: 'text',
              label: 'Address',
              required: true
            },
            {
              id: 'postcode',
              type: 'text',
              label: 'Postcode',
              required: true
            },
            {
              id: 'phone',
              type: 'tel',
              label: 'Phone Number',
              required: true
            }
          ]
        },
        {
          id: 'membership',
          title: 'Membership Selection',
          description: 'Choose your membership type',
          fields: [
            {
              id: 'membership_selection',
              type: 'membership_selection',
              label: 'Select Membership Type(s)',
              required: true,
              allow_multiple: true
            }
          ]
        }
      ]
    });
  };

  const saveFormSchema = async () => {
    // Validate form title
    if (!formTitle.trim()) {
      toast.error('Please provide a form title');
      return;
    }

    // Validate schema structure
    for (const section of schema.sections) {
      for (const field of section.fields) {
        // Validate dropdown fields have options
        if (field.type === 'select' && (!field.options || field.options.length === 0)) {
          toast.error(`Dropdown field "${field.label}" must have at least one option`);
          return;
        }
        
        // Ensure all fields have required properties
        if (!field.id || !field.label) {
          toast.error(`All fields must have an ID and label`);
          return;
        }
      }
    }

    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from('organization_form_schemas')
        .select('id, schema_version')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        const { error: deactivateError } = await supabase
          .from('organization_form_schemas')
          .update({ is_active: false })
          .eq('id', existing.id);

        if (deactivateError) {
          console.error('Deactivate error:', deactivateError.message);
          throw deactivateError;
        }
      }

      const newVersion = (existing?.schema_version || 0) + 1;
      const newSchema = { ...schema, version: newVersion };

      const { error: insertError } = await supabase
        .from('organization_form_schemas')
        .insert({
          organization_id: organizationId,
          schema_version: newVersion,
          title: formTitle,
          description: formDescription || null,
          schema_data: newSchema,
          form_type: formType,
          is_active: true
        });

      if (insertError) {
        console.error('Insert error:', insertError.message);
        throw insertError;
      }

      setSchema(newSchema);
      toast.success(`Form saved successfully (version ${newVersion})`);
    } catch (error) {
      console.error('Error saving form schema:', error);
      toast.error(`Failed to save form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    setSchema({
      ...schema,
      sections: [
        ...schema.sections,
        {
          id: `section_${Date.now()}`,
          title: 'New Section',
          description: '',
          fields: []
        }
      ]
    });
    setExpandedSections(new Set([...expandedSections, schema.sections.length]));
  };

  const updateSection = (index: number, updates: Partial<FormSection>) => {
    const newSections = [...schema.sections];
    newSections[index] = { ...newSections[index], ...updates };
    setSchema({ ...schema, sections: newSections });
  };

  const deleteSection = (index: number) => {
    if (confirm('Are you sure you want to delete this section?')) {
      const newSections = schema.sections.filter((_, i) => i !== index);
      setSchema({ ...schema, sections: newSections });
      setExpandedSections(new Set([...expandedSections].filter(i => i !== index)));
    }
  };

  const addField = (sectionIndex: number) => {
    const newSections = [...schema.sections];
    newSections[sectionIndex].fields.push({
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false
    });
    setSchema({ ...schema, sections: newSections });
  };

  const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<FormField>) => {
    const newSections = [...schema.sections];
    newSections[sectionIndex].fields[fieldIndex] = {
      ...newSections[sectionIndex].fields[fieldIndex],
      ...updates
    };
    setSchema({ ...schema, sections: newSections });
  };

  const deleteField = (sectionIndex: number, fieldIndex: number) => {
    const newSections = [...schema.sections];
    newSections[sectionIndex].fields = newSections[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
    setSchema({ ...schema, sections: newSections });
    if (editingField?.sectionIdx === sectionIndex && editingField?.fieldIdx === fieldIndex) {
      setEditingField(null);
    }
  };

  const moveField = (sectionIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    const newSections = [...schema.sections];
    const fields = newSections[sectionIndex].fields;
    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    [fields[fieldIndex], fields[newIndex]] = [fields[newIndex], fields[fieldIndex]];
    setSchema({ ...schema, sections: newSections });
  };

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  if (loading) {
    return <div className="p-8">Loading form builder...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Form Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create and customize membership forms
          </p>
        </div>
        <Button onClick={saveFormSchema} disabled={saving} data-testid="button-save-form">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Form'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Form Configuration</CardTitle>
          <CardDescription>Configure basic form settings and type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="form-type">Form Type</Label>
            <Select value={formType} onValueChange={(value: any) => setFormType(value)}>
              <SelectTrigger id="form-type" data-testid="select-form-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="signup">New Signup Form</SelectItem>
                <SelectItem value="renewal">Renewal Form</SelectItem>
                <SelectItem value="both">Both Signup & Renewal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {formType === 'signup' && 'This form will be used for new member signups'}
              {formType === 'renewal' && 'This form will be used for membership renewals'}
              {formType === 'both' && 'This form can be used for both signups and renewals'}
            </p>
          </div>

          <div>
            <Label htmlFor="form-title">Form Title</Label>
            <Input
              id="form-title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Membership Signup Form"
              data-testid="input-form-title"
            />
          </div>

          <div>
            <Label htmlFor="form-description">Form Description (optional)</Label>
            <Textarea
              id="form-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Additional information about this form..."
              rows={2}
              data-testid="input-form-description"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'builder' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
          data-testid="tab-builder"
        >
          <Edit2 className="h-4 w-4" />
          Form Builder
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
          data-testid="tab-preview"
        >
          <Eye className="h-4 w-4" />
          Preview
        </button>
      </div>

      {activeTab === 'builder' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Sections</CardTitle>
              <CardDescription>
                Organize your form into sections with different fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {schema.sections.map((section, sectionIdx) => (
                <Card key={sectionIdx} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection(sectionIdx)}
                        className="flex-1 justify-start"
                        data-testid={`button-toggle-section-${sectionIdx}`}
                      >
                        {expandedSections.has(sectionIdx) ? (
                          <ChevronUp className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-semibold">{section.title}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSection(sectionIdx)}
                        data-testid={`button-delete-section-${sectionIdx}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {expandedSections.has(sectionIdx) && (
                    <CardContent className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor={`section-title-${sectionIdx}`}>Section Title</Label>
                          <Input
                            id={`section-title-${sectionIdx}`}
                            value={section.title}
                            onChange={(e) => updateSection(sectionIdx, { title: e.target.value })}
                            data-testid={`input-section-title-${sectionIdx}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`section-desc-${sectionIdx}`}>Description</Label>
                          <Textarea
                            id={`section-desc-${sectionIdx}`}
                            value={section.description || ''}
                            onChange={(e) => updateSection(sectionIdx, { description: e.target.value })}
                            rows={2}
                            data-testid={`input-section-description-${sectionIdx}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-3 mt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Fields</h4>
                          <Button
                            size="sm"
                            onClick={() => addField(sectionIdx)}
                            data-testid={`button-add-field-${sectionIdx}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Field
                          </Button>
                        </div>

                        {section.fields.map((field, fieldIdx) => (
                          <FieldEditor
                            key={fieldIdx}
                            field={field}
                            sectionIdx={sectionIdx}
                            fieldIdx={fieldIdx}
                            isEditing={editingField?.sectionIdx === sectionIdx && editingField?.fieldIdx === fieldIdx}
                            onEdit={() => setEditingField({ sectionIdx, fieldIdx })}
                            onUpdate={(updates) => updateField(sectionIdx, fieldIdx, updates)}
                            onDelete={() => deleteField(sectionIdx, fieldIdx)}
                            onMove={(direction) => moveField(sectionIdx, fieldIdx, direction)}
                            canMoveUp={fieldIdx > 0}
                            canMoveDown={fieldIdx < section.fields.length - 1}
                          />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}

              <Button onClick={addSection} variant="outline" className="w-full" data-testid="button-add-section">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Form Preview</CardTitle>
            <CardDescription>
              This is how your signup form will appear to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormPreview schema={schema} organizationId={organizationId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FieldEditorProps {
  field: FormField;
  sectionIdx: number;
  fieldIdx: number;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function FieldEditor({
  field,
  sectionIdx,
  fieldIdx,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown
}: FieldEditorProps) {
  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'membership_selection', label: 'Membership Selection' },
    { value: 'repeatable_group', label: 'Repeating Group' }
  ];

  return (
    <Card className={isEditing ? 'border-primary' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('up')}
              disabled={!canMoveUp}
              className="h-6 px-1"
              data-testid={`button-move-up-${sectionIdx}-${fieldIdx}`}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('down')}
              disabled={!canMoveDown}
              className="h-6 px-1"
              data-testid={`button-move-down-${sectionIdx}-${fieldIdx}`}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{field.label || field.id}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  data-testid={`button-edit-field-${sectionIdx}-${fieldIdx}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  data-testid={`button-delete-field-${sectionIdx}-${fieldIdx}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {isEditing && (
              <div className="grid gap-3 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`field-id-${sectionIdx}-${fieldIdx}`}>Field ID</Label>
                    <Input
                      id={`field-id-${sectionIdx}-${fieldIdx}`}
                      value={field.id}
                      onChange={(e) => onUpdate({ id: e.target.value })}
                      placeholder="field_id"
                      data-testid={`input-field-id-${sectionIdx}-${fieldIdx}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`field-label-${sectionIdx}-${fieldIdx}`}>Label</Label>
                    <Input
                      id={`field-label-${sectionIdx}-${fieldIdx}`}
                      value={field.label}
                      onChange={(e) => onUpdate({ label: e.target.value })}
                      placeholder="Field Label"
                      data-testid={`input-field-label-${sectionIdx}-${fieldIdx}`}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`field-type-${sectionIdx}-${fieldIdx}`}>Field Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value) => onUpdate({ type: value as FormField['type'] })}
                  >
                    <SelectTrigger data-testid={`select-field-type-${sectionIdx}-${fieldIdx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {field.type === 'select' && (
                  <div>
                    <Label htmlFor={`field-options-${sectionIdx}-${fieldIdx}`}>
                      Options (format: value|Label, one per line)
                    </Label>
                    <Textarea
                      id={`field-options-${sectionIdx}-${fieldIdx}`}
                      value={field.options?.map(o => `${o.value}|${o.label}`).join('\n') || ''}
                      onChange={(e) => {
                        const options = e.target.value.split('\n').filter(Boolean).map(line => {
                          const [value, label] = line.split('|');
                          return { value: value.trim(), label: (label || value).trim() };
                        });
                        onUpdate({ options });
                      }}
                      placeholder="mr|Mr&#10;mrs|Mrs&#10;ms|Ms"
                      rows={4}
                      data-testid={`textarea-field-options-${sectionIdx}-${fieldIdx}`}
                    />
                  </div>
                )}

                {field.type === 'repeatable_group' && (
                  <div>
                    <Label>Repeating Fields (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(field.fields || [], null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          onUpdate({ fields: parsed });
                        } catch (err) {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={6}
                      className="font-mono text-sm"
                      data-testid={`textarea-repeating-fields-${sectionIdx}-${fieldIdx}`}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor={`field-placeholder-${sectionIdx}-${fieldIdx}`}>Placeholder</Label>
                  <Input
                    id={`field-placeholder-${sectionIdx}-${fieldIdx}`}
                    value={field.placeholder || ''}
                    onChange={(e) => onUpdate({ placeholder: e.target.value })}
                    data-testid={`input-field-placeholder-${sectionIdx}-${fieldIdx}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`field-required-${sectionIdx}-${fieldIdx}`}
                    checked={field.required}
                    onCheckedChange={(checked) => onUpdate({ required: !!checked })}
                    data-testid={`checkbox-field-required-${sectionIdx}-${fieldIdx}`}
                  />
                  <Label htmlFor={`field-required-${sectionIdx}-${fieldIdx}`}>Required</Label>
                </div>

                {field.type === 'membership_selection' && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`field-allow-multiple-${sectionIdx}-${fieldIdx}`}
                      checked={field.allow_multiple || false}
                      onCheckedChange={(checked) => onUpdate({ allow_multiple: !!checked })}
                      data-testid={`checkbox-field-allow-multiple-${sectionIdx}-${fieldIdx}`}
                    />
                    <Label htmlFor={`field-allow-multiple-${sectionIdx}-${fieldIdx}`}>
                      Allow Multiple Selections
                    </Label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
