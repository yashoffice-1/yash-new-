
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: any;
}

interface OnboardingData {
  contactInfo: {
    name: string;
    email: string;
    company: string;
    phone: string;
  };
  brandVoice: {
    tone: string;
    personality: string[];
    targetAudience: string;
    brandValues: string;
  };
  benefits: {
    primaryBenefit: string;
    secondaryBenefits: string[];
    uniqueSellingPoint: string;
    competitiveAdvantage: string;
  };
  videoRequirements: {
    style: string;
    duration: string;
    callToAction: string;
    musicalPreference: string;
  };
  preferredMethod: 'form' | 'meeting';
}

export function TemplateRequestDialog({ open, onOpenChange, selectedProduct }: TemplateRequestDialogProps) {
  const [step, setStep] = useState<'method' | 'form' | 'meeting' | 'success'>('method');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    contactInfo: { name: '', email: '', company: '', phone: '' },
    brandVoice: { tone: '', personality: [], targetAudience: '', brandValues: '' },
    benefits: { primaryBenefit: '', secondaryBenefits: [], uniqueSellingPoint: '', competitiveAdvantage: '' },
    videoRequirements: { style: '', duration: '30s', callToAction: '', musicalPreference: '' },
    preferredMethod: 'form'
  });
  const { toast } = useToast();

  const personalityOptions = [
    'Professional', 'Friendly', 'Innovative', 'Trustworthy', 'Energetic', 
    'Sophisticated', 'Approachable', 'Expert', 'Caring', 'Bold'
  ];

  const benefitOptions = [
    'Cost Savings', 'Time Efficiency', 'Quality Improvement', 'Convenience', 
    'Innovation', 'Reliability', 'Customer Support', 'Sustainability', 'Security', 'Performance'
  ];

  const handleSubmitForm = async () => {
    // Validate required fields
    if (!onboardingData.contactInfo.name || !onboardingData.contactInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in your contact information",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Submit to backend/HeyGen API
      console.log('Submitting onboarding data:', onboardingData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('success');
      toast({
        title: "Request Submitted",
        description: "Your template request has been submitted. Our creative team will contact you within 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit template request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleMeeting = () => {
    // TODO: Integrate with calendar scheduling system
    toast({
      title: "Meeting Scheduling",
      description: "Redirecting to calendar scheduling...",
    });
    setStep('success');
  };

  const updateData = (section: keyof OnboardingData, field: string, value: any) => {
    setOnboardingData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value
      }
    }));
  };

  const toggleArrayValue = (section: keyof OnboardingData, field: string, value: string) => {
    setOnboardingData(prev => {
      const currentSection = prev[section] as any;
      const currentArray = currentSection[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item: string) => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [section]: {
          ...currentSection,
          [field]: newArray
        }
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>Request Custom Video Template</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'method' && (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              To create the perfect video template for your brand, we need to understand your brand voice and key benefits. 
              Choose how you'd like to proceed:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStep('form')}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Complete Onboarding Form</span>
                  </CardTitle>
                  <CardDescription>
                    Fill out a comprehensive form about your brand voice, benefits, and requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Self-paced completion</li>
                    <li>• Immediate submission</li>
                    <li>• 10-15 minutes to complete</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStep('meeting')}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Schedule Creative Meeting</span>
                  </CardTitle>
                  <CardDescription>
                    Meet with our creative manager to discuss your requirements in detail
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Personalized consultation</li>
                    <li>• 30-minute video call</li>
                    <li>• Expert guidance and recommendations</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === 'form' && (
          <Tabs defaultValue="contact" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="brand">Brand Voice</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
              <TabsTrigger value="video">Video Style</TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={onboardingData.contactInfo.name}
                    onChange={(e) => updateData('contactInfo', 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={onboardingData.contactInfo.email}
                    onChange={(e) => updateData('contactInfo', 'email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={onboardingData.contactInfo.company}
                    onChange={(e) => updateData('contactInfo', 'company', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={onboardingData.contactInfo.phone}
                    onChange={(e) => updateData('contactInfo', 'phone', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="brand" className="space-y-4">
              <h3 className="text-lg font-semibold">Brand Voice & Personality</h3>
              
              <div>
                <Label>Brand Tone</Label>
                <RadioGroup
                  value={onboardingData.brandVoice.tone}
                  onValueChange={(value) => updateData('brandVoice', 'tone', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="formal" id="formal" />
                    <Label htmlFor="formal">Formal & Professional</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="casual" id="casual" />
                    <Label htmlFor="casual">Casual & Conversational</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="energetic" id="energetic" />
                    <Label htmlFor="energetic">Energetic & Enthusiastic</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Brand Personality (Select all that apply)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {personalityOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={option}
                        checked={onboardingData.brandVoice.personality.includes(option)}
                        onCheckedChange={() => toggleArrayValue('brandVoice', 'personality', option)}
                      />
                      <Label htmlFor={option} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Textarea
                  id="audience"
                  placeholder="Describe your target audience..."
                  value={onboardingData.brandVoice.targetAudience}
                  onChange={(e) => updateData('brandVoice', 'targetAudience', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="values">Brand Values</Label>
                <Textarea
                  id="values"
                  placeholder="What values does your brand represent?"
                  value={onboardingData.brandVoice.brandValues}
                  onChange={(e) => updateData('brandVoice', 'brandValues', e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="benefits" className="space-y-4">
              <h3 className="text-lg font-semibold">Top Benefits & Advantages</h3>
              
              <div>
                <Label htmlFor="primary-benefit">Primary Benefit</Label>
                <Textarea
                  id="primary-benefit"
                  placeholder="What's the main benefit customers get from your product/service?"
                  value={onboardingData.benefits.primaryBenefit}
                  onChange={(e) => updateData('benefits', 'primaryBenefit', e.target.value)}
                />
              </div>

              <div>
                <Label>Secondary Benefits (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {benefitOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`benefit-${option}`}
                        checked={onboardingData.benefits.secondaryBenefits.includes(option)}
                        onCheckedChange={() => toggleArrayValue('benefits', 'secondaryBenefits', option)}
                      />
                      <Label htmlFor={`benefit-${option}`} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="usp">Unique Selling Point</Label>
                <Textarea
                  id="usp"
                  placeholder="What makes you different from competitors?"
                  value={onboardingData.benefits.uniqueSellingPoint}
                  onChange={(e) => updateData('benefits', 'uniqueSellingPoint', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="competitive">Competitive Advantage</Label>
                <Textarea
                  id="competitive"
                  placeholder="Why should customers choose you over alternatives?"
                  value={onboardingData.benefits.competitiveAdvantage}
                  onChange={(e) => updateData('benefits', 'competitiveAdvantage', e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="video" className="space-y-4">
              <h3 className="text-lg font-semibold">Video Requirements</h3>
              
              <div>
                <Label>Video Style</Label>
                <RadioGroup
                  value={onboardingData.videoRequirements.style}
                  onValueChange={(value) => updateData('videoRequirements', 'style', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="modern" id="modern" />
                    <Label htmlFor="modern">Modern & Sleek</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cinematic" id="cinematic" />
                    <Label htmlFor="cinematic">Cinematic & Dramatic</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="minimalist" id="minimalist" />
                    <Label htmlFor="minimalist">Minimalist & Clean</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="animated" id="animated" />
                    <Label htmlFor="animated">Animated & Dynamic</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Preferred Duration</Label>
                <RadioGroup
                  value={onboardingData.videoRequirements.duration}
                  onValueChange={(value) => updateData('videoRequirements', 'duration', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="15s" id="15s" />
                    <Label htmlFor="15s">15 seconds</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30s" id="30s" />
                    <Label htmlFor="30s">30 seconds</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="60s" id="60s" />
                    <Label htmlFor="60s">60 seconds</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="cta">Call to Action</Label>
                <Input
                  id="cta"
                  placeholder="e.g., Shop Now, Learn More, Get Started"
                  value={onboardingData.videoRequirements.callToAction}
                  onChange={(e) => updateData('videoRequirements', 'callToAction', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="music">Musical Preference</Label>
                <Input
                  id="music"
                  placeholder="e.g., Upbeat, Calm, Corporate, Energetic"
                  value={onboardingData.videoRequirements.musicalPreference}
                  onChange={(e) => updateData('videoRequirements', 'musicalPreference', e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setStep('method')}>
                  Back
                </Button>
                <Button onClick={handleSubmitForm}>
                  Submit Request
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {step === 'meeting' && (
          <div className="space-y-6 text-center">
            <Calendar className="h-16 w-16 mx-auto text-primary" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Schedule Your Creative Consultation</h3>
              <p className="text-muted-foreground mb-6">
                Meet with our creative manager to discuss your brand requirements and video template needs.
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-left space-y-4">
                  <h4 className="font-medium">What we'll cover:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Your brand voice and personality</li>
                    <li>• Top benefits and unique selling points</li>
                    <li>• Video style preferences and requirements</li>
                    <li>• Target audience and messaging strategy</li>
                    <li>• Timeline and delivery expectations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setStep('method')}>
                Back
              </Button>
              <Button onClick={handleScheduleMeeting}>
                Schedule Meeting
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 text-center">
            <Sparkles className="h-16 w-16 mx-auto text-green-500" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Request Submitted Successfully!</h3>
              <p className="text-muted-foreground">
                Our creative team will review your requirements and contact you within 24 hours to discuss next steps.
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>What happens next:</strong><br />
                1. Our team reviews your brand requirements<br />
                2. We create a custom video template design<br />
                3. You'll receive a preview for approval<br />
                4. Template is added to your account for use
              </p>
            </div>

            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
