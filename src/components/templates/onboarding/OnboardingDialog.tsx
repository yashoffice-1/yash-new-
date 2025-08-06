
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays/dialog";
import { Button } from "@/components/ui/forms/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Textarea } from "@/components/ui/forms/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Checkbox } from "@/components/ui/forms/checkbox";
import { Separator } from "@/components/ui/layout/separator";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: any) => void;
}

export function OnboardingDialog({ open, onOpenChange, onComplete }: OnboardingDialogProps) {
  const [formData, setFormData] = useState({
    // Brand Information
    brandName: '',
    industry: '',
    targetAudience: '',
    brandVoice: '',
    
    // Brand Benefits
    primaryBenefit: '',
    secondaryBenefit: '',
    thirdBenefit: '',
    
    // Visual Preferences
    colorScheme: '',
    logoUrl: '',
    
    // Content Preferences
    contentTypes: [] as string[],
    toneOfVoice: '',
    keyMessages: '',
    
    // Additional Information
    competitorAnalysis: '',
    additionalNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContentTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      contentTypes: checked 
        ? [...prev.contentTypes, type]
        : prev.contentTypes.filter(t => t !== type)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Brand Onboarding</DialogTitle>
          <DialogDescription>
            Help us understand your brand so we can create personalized video templates that match your voice and style.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Brand Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Brand Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name *</Label>
                <Input
                  id="brandName"
                  value={formData.brandName}
                  onChange={(e) => handleInputChange('brandName', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="automotive">Automotive</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience *</Label>
              <Textarea
                id="targetAudience"
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                placeholder="Describe your primary target audience (age, demographics, interests, etc.)"
                rows={2}
                required
              />
            </div>
          </div>

          <Separator />

          {/* Top Brand Benefits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Top Brand Benefits</h3>
            <p className="text-sm text-gray-600">What are the top 3 benefits your brand offers to customers?</p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="primaryBenefit">Primary Benefit *</Label>
                <Input
                  id="primaryBenefit"
                  value={formData.primaryBenefit}
                  onChange={(e) => handleInputChange('primaryBenefit', e.target.value)}
                  placeholder="e.g., Save time and increase productivity"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondaryBenefit">Secondary Benefit</Label>
                <Input
                  id="secondaryBenefit"
                  value={formData.secondaryBenefit}
                  onChange={(e) => handleInputChange('secondaryBenefit', e.target.value)}
                  placeholder="e.g., Cost-effective solution"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="thirdBenefit">Third Benefit</Label>
                <Input
                  id="thirdBenefit"
                  value={formData.thirdBenefit}
                  onChange={(e) => handleInputChange('thirdBenefit', e.target.value)}
                  placeholder="e.g., Easy to use and implement"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Brand Voice & Style */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Brand Voice & Style</h3>
            
            <div className="space-y-2">
              <Label htmlFor="brandVoice">Brand Voice *</Label>
              <Select value={formData.brandVoice} onValueChange={(value) => handleInputChange('brandVoice', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="colorScheme">Primary Color Scheme</Label>
                <Input
                  id="colorScheme"
                  value={formData.colorScheme}
                  onChange={(e) => handleInputChange('colorScheme', e.target.value)}
                  placeholder="e.g., Blue and white, or #1234AB"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Content Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Content Preferences</h3>
            
            <div className="space-y-2">
              <Label>Content Types (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Product Demos', 'Brand Stories', 'Testimonials', 'How-to Guides', 'Promotional', 'Educational'].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={formData.contentTypes.includes(type)}
                      onCheckedChange={(checked) => handleContentTypeChange(type, checked as boolean)}
                    />
                    <Label htmlFor={type} className="text-sm">{type}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyMessages">Key Messages</Label>
              <Textarea
                id="keyMessages"
                value={formData.keyMessages}
                onChange={(e) => handleInputChange('keyMessages', e.target.value)}
                placeholder="What key messages should consistently appear in your video content?"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Complete Onboarding
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
