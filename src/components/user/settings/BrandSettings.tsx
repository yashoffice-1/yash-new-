
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/ui/use-toast";
import { Save, Palette } from "lucide-react";

export function BrandSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [brandData, setBrandData] = useState({
    brandVoice: "professional",
    benefit1: "Industry-leading performance and reliability",
    benefit2: "24/7 customer support and service",
    benefit3: "Cost-effective solutions for your business",
    benefit4: "Easy integration with existing systems",
    benefit5: "Scalable to grow with your needs",
    disclaimer: "Results may vary. Please consult with our specialists.",
    legalInstructions: "All content must comply with FTC guidelines and local regulations.",
    visualTone: "modern"
  });

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast({
      title: "Brand Settings Saved",
      description: "Your brand settings have been updated successfully.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="h-5 w-5" />
          <span>Brand Settings</span>
        </CardTitle>
        <CardDescription>
          Configure your brand voice and messaging for AI-generated content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Voice */}
        <div className="space-y-2">
          <Label htmlFor="brand-voice">Brand Voice</Label>
          <Select value={brandData.brandVoice} onValueChange={(value) => setBrandData({ ...brandData, brandVoice: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly & Approachable</SelectItem>
              <SelectItem value="authoritative">Authoritative</SelectItem>
              <SelectItem value="casual">Casual & Conversational</SelectItem>
              <SelectItem value="innovative">Innovative & Forward-thinking</SelectItem>
              <SelectItem value="trustworthy">Trustworthy & Reliable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Top Benefits */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Top 5 Brand Benefits</Label>
          <p className="text-sm text-gray-600">These will be used by AI to generate compelling content</p>
          
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="space-y-2">
              <Label htmlFor={`benefit${num}`}>Benefit #{num}</Label>
              <Input
                id={`benefit${num}`}
                value={brandData[`benefit${num}` as keyof typeof brandData] as string}
                onChange={(e) => setBrandData({ ...brandData, [`benefit${num}`]: e.target.value })}
                placeholder={`Enter your ${num === 1 ? 'primary' : num === 2 ? 'secondary' : `${num}${num === 3 ? 'rd' : 'th'}`} brand benefit`}
              />
            </div>
          ))}
        </div>

        {/* Disclaimers */}
        <div className="space-y-2">
          <Label htmlFor="disclaimer">Standard Disclaimer</Label>
          <Textarea
            id="disclaimer"
            value={brandData.disclaimer}
            onChange={(e) => setBrandData({ ...brandData, disclaimer: e.target.value })}
            placeholder="Enter your standard disclaimer text"
            rows={3}
          />
        </div>

        {/* Legal Instructions */}
        <div className="space-y-2">
          <Label htmlFor="legal-instructions">Legal Instructions</Label>
          <Textarea
            id="legal-instructions"
            value={brandData.legalInstructions}
            onChange={(e) => setBrandData({ ...brandData, legalInstructions: e.target.value })}
            placeholder="Enter legal guidelines for content generation"
            rows={3}
          />
        </div>

        {/* Visual Tone */}
        <div className="space-y-2">
          <Label htmlFor="visual-tone">Visual Tone Preference</Label>
          <Select value={brandData.visualTone} onValueChange={(value) => setBrandData({ ...brandData, visualTone: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modern">Modern & Clean</SelectItem>
              <SelectItem value="classic">Classic & Elegant</SelectItem>
              <SelectItem value="bold">Bold & Dynamic</SelectItem>
              <SelectItem value="minimalist">Minimalist</SelectItem>
              <SelectItem value="colorful">Vibrant & Colorful</SelectItem>
              <SelectItem value="corporate">Corporate & Professional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isLoading} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{isLoading ? "Saving..." : "Save Brand Settings"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
