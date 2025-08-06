
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Label } from "@/components/ui/forms/label";
import { Template } from './utils/types';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

export function TemplateSelector({ templates, selectedTemplate, onTemplateSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Choose Template</Label>
      <Select value={selectedTemplate} onValueChange={onTemplateSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a video template..." />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name} {template.variables.length > 0 ? `(${template.variables.length} variables)` : '(No variables)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
