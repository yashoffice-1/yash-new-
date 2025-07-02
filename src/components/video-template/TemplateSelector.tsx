
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Template } from './types';

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
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
