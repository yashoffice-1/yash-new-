
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface TemplateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateRequestDialog({ open, onOpenChange }: TemplateRequestDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    templateName: '',
    category: '',
    duration: '',
    description: '',
    specificRequirements: '',
    urgency: 'normal'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Template request submitted:', formData);
    
    toast({
      title: "Template Request Submitted",
      description: "Our creative team will review your request and get back to you within 2-3 business days.",
    });
    
    onOpenChange(false);
    setFormData({
      templateName: '',
      category: '',
      duration: '',
      description: '',
      specificRequirements: '',
      urgency: 'normal'
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Custom Video Template</DialogTitle>
          <DialogDescription>
            Tell us about the video template you need. Our creative team will design a custom HeyGen template for your brand.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name *</Label>
            <Input
              id="templateName"
              value={formData.templateName}
              onChange={(e) => handleInputChange('templateName', e.target.value)}
              placeholder="e.g., Product Launch Announcement"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15s">15 seconds</SelectItem>
                  <SelectItem value="30s">30 seconds</SelectItem>
                  <SelectItem value="60s">60 seconds</SelectItem>
                  <SelectItem value="90s">90 seconds</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Template Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the purpose and key elements of this template..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specificRequirements">Specific Requirements</Label>
            <Textarea
              id="specificRequirements"
              value={formData.specificRequirements}
              onChange={(e) => handleInputChange('specificRequirements', e.target.value)}
              placeholder="Any specific design elements, animations, or features you need..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (1-2 weeks)</SelectItem>
                <SelectItem value="normal">Normal (3-5 business days)</SelectItem>
                <SelectItem value="high">High (1-2 business days)</SelectItem>
                <SelectItem value="urgent">Urgent (24 hours)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
