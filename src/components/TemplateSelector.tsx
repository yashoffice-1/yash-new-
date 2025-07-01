
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateConfig {
  id: string;
  name: string;
  webhookUrl: string;
  variables: string[];
  description?: string;
}

interface TemplateSelectorProps {
  onTemplateSelect: (template: TemplateConfig) => void;
  selectedTemplate?: TemplateConfig;
}

const DEFAULT_TEMPLATES: TemplateConfig[] = [
  {
    id: 'heygen-product-showcase',
    name: 'HeyGen Product Showcase',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/23139889/ube0vsx/',
    variables: [
      'product_name', 'product_price', 'product_discount', 
      'category_name', 'feature_one', 'feature_two', 
      'feature_three', 'website_description', 'product_image'
    ],
    description: 'Standard product showcase template with all fields'
  },
  {
    id: 'heygen-minimal',
    name: 'HeyGen Minimal',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/23139889/minimal/',
    variables: ['product_name', 'product_price', 'product_image'],
    description: 'Minimal template with basic product info'
  }
];

export function TemplateSelector({ onTemplateSelect, selectedTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateConfig[]>(DEFAULT_TEMPLATES);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    webhookUrl: '',
    variables: '',
    description: ''
  });
  const { toast } = useToast();

  const handleAddTemplate = () => {
    if (!newTemplate.name || !newTemplate.webhookUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide template name and webhook URL",
        variant: "destructive"
      });
      return;
    }

    const template: TemplateConfig = {
      id: `custom-${Date.now()}`,
      name: newTemplate.name,
      webhookUrl: newTemplate.webhookUrl,
      variables: newTemplate.variables.split(',').map(v => v.trim()).filter(v => v),
      description: newTemplate.description
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({ name: '', webhookUrl: '', variables: '', description: '' });
    setIsAddingTemplate(false);
    
    toast({
      title: "Template Added",
      description: `Template "${template.name}" has been added successfully`
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    toast({
      title: "Template Deleted",
      description: "Template has been removed"
    });
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Template Configuration</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingTemplate(!isAddingTemplate)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </CardTitle>
        <CardDescription>
          Select a template configuration for your video generation. Each template can have different variables and webhook endpoints.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="template-select">Select Template</Label>
          <Select onValueChange={handleTemplateChange} value={selectedTemplate?.id || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{template.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {template.variables.length} vars
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Selected Template: {selectedTemplate.name}</h4>
            <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Webhook URL:</Label>
                <p className="text-xs font-mono bg-background p-2 rounded">{selectedTemplate.webhookUrl}</p>
              </div>
              <div>
                <Label className="text-xs">Variables ({selectedTemplate.variables.length}):</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTemplate.variables.map(variable => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {isAddingTemplate && (
          <div className="p-4 border rounded-lg space-y-4">
            <h4 className="font-medium">Add New Template</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., HeyGen Custom Template"
                />
              </div>
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  value={newTemplate.webhookUrl}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="variables">Variables (comma-separated)</Label>
              <Input
                id="variables"
                value={newTemplate.variables}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, variables: e.target.value }))}
                placeholder="product_name, product_price, category_name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this template"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleAddTemplate}>Add Template</Button>
              <Button variant="outline" onClick={() => setIsAddingTemplate(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {templates.length > 2 && (
          <div className="space-y-2">
            <Label className="text-sm">Manage Custom Templates:</Label>
            {templates.slice(2).map(template => (
              <div key={template.id} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{template.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
