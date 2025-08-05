
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Bot, Zap } from "lucide-react";
import { IntegrationMethod } from './utils/types';

interface IntegrationMethodSelectorProps {
  integrationMethod: IntegrationMethod;
  onIntegrationMethodChange: (method: IntegrationMethod) => void;
}

export function IntegrationMethodSelector({ 
  integrationMethod, 
  onIntegrationMethodChange 
}: IntegrationMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Integration Method</Label>
      <RadioGroup value={integrationMethod} onValueChange={onIntegrationMethodChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="direct" id="direct" />
          <Label htmlFor="direct" className="flex items-center space-x-2 cursor-pointer">
            <Bot className="h-4 w-4" />
            <span>Direct HeyGen API (Recommended)</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="zapier" id="zapier" />
          <Label htmlFor="zapier" className="flex items-center space-x-2 cursor-pointer">
            <Zap className="h-4 w-4" />
            <span>Google Sheets + Zapier</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
