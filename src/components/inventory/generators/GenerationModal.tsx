import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays/dialog";
import { Button } from "@/components/ui/forms/button";
import { Textarea } from "@/components/ui/forms/textarea";
import { Badge } from "@/components/ui/data_display/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { Package, Sparkles, Loader2, Download, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import { generationAPI } from "@/api/clients/generation-client";
import { useAssetLibrary } from "@/hooks/data/useAssetLibrary";
import { useGeneration } from "@/contexts/GenerationContext";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  images: string[];
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'content' | 'formats' | 'ad';
  url?: string;
  content?: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  status?: string;
  message?: string;
}

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (instruction: string) => void;
  product: InventoryItem;
  generationType: 'image' | 'video' | 'content' | 'formats' | 'ad';
  title: string;
}

const SUGGESTION_PROMPTS = {
  image: [
    "4th of July Message",
    "Send to a Customer via SMS", 
    "Facebook Post",
    "250X 250 Banner"
  ],
  video: [
    "Create a dynamic product showcase video with smooth transitions",
    "Generate an engaging social media video with motion graphics",
    "Create a product demo video highlighting key features",
    "Design a promotional video with cinematic effects"
  ],
  content: [
    "Write compelling Facebook Ad copy with headline and CTA",
    "Generate SMS marketing message under 160 characters",
    "Write email marketing content with subject line",
    "Create LinkedIn promotional post copy",
    "Generate Twitter/X ad copy with engagement focus"
  ],
  formats: [
    "Create multiple format variations for different platforms",
    "Generate content optimized for various social media channels",
    "Create a complete marketing package with different sizes",
    "Design responsive content for web and mobile"
  ],
  ad: [
    "Create a high-impact digital ad banner",
    "Design a promotional ad for social media",
    "Generate a marketing ad with clear call-to-action",
    "Create an animated ad for online campaigns"
  ]
};

function ChannelSelector({
  selectedChannel,
  setSelectedChannel,
  currentGenerationType,
}: {
  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
  currentGenerationType: 'image' | 'video' | 'content' | 'formats' | 'ad';
}) {
  const getChannelOptions = () => {
    if (currentGenerationType === 'content') {
      return [
        { value: 'facebook', label: 'Facebook' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'twitter', label: 'Twitter/X' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'email', label: 'Email Marketing' },
        { value: 'sms', label: 'SMS/Text' },
        { value: 'google_ads', label: 'Google Ads' },
        { value: 'social_media', label: 'General Social Media' }
      ];
    }
    
    return [
      { value: 'social_media', label: 'Social Media' },
      { value: 'video_platforms', label: 'Video Platforms' },
      { value: 'advertising', label: 'Advertising' },
      { value: 'multi_platform', label: 'Multi-Platform' },
      { value: 'general', label: 'General' }
    ];
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Target Channel:
      </label>
      <Select value={selectedChannel} onValueChange={setSelectedChannel}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select channel" />
        </SelectTrigger>
        <SelectContent>
          {getChannelOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InstructionForm({
  instruction,
  setInstruction,
  isImprovingInstruction,
  handleImproveInstruction,
  currentGenerationType,
  selectedChannel,
  setSelectedChannel,
}: {
  instruction: string;
  setInstruction: React.Dispatch<React.SetStateAction<string>>;
  isImprovingInstruction: boolean;
  handleImproveInstruction: () => Promise<void>;
  currentGenerationType: 'image' | 'video' | 'content' | 'formats' | 'ad';
  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Channel Selector */}
      <ChannelSelector
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        currentGenerationType={currentGenerationType}
      />
      
      <div className="border-2 border-black rounded-lg p-4 bg-gray-50">
        <div className="space-y-2">
          <div className="bg-yellow-300 text-black px-2 py-1 rounded text-sm font-semibold">
            Type Your Instructions Here.
          </div>
          <div className="bg-yellow-300 text-black px-2 py-1 rounded text-xs">
            {currentGenerationType === 'content' 
              ? "Specify the type of marketing content you want to create. Focus on text, headlines, and copy only."
              : "If you want a Message with the Product Like \"SALE\" be sure you use quotes to send the instructions"
            }
          </div>
          
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={currentGenerationType === 'content' 
              ? "Example: Create compelling Facebook Ad copy for this product with attention-grabbing headline, benefits-focused body text highlighting key features, and strong call-to-action that drives clicks"
              : "Example: I want this product to showcase 4th of July SALE with Fireworks in the background and the message '4th of July SUPER SALE' and the number '30% OFF'"
            }
            className="min-h-[120px] bg-white"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleImproveInstruction}
            disabled={isImprovingInstruction || !instruction.trim()}
            className="flex items-center space-x-1"
          >
            {isImprovingInstruction ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            <span>Improved with AI</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuggestionButtons({
  currentGenerationType,
  handleSuggestionClick,
}: {
  currentGenerationType: 'image' | 'video' | 'content' | 'formats' | 'ad';
  handleSuggestionClick: (suggestion: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {SUGGESTION_PROMPTS[currentGenerationType].map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleSuggestionClick(suggestion)}
            className="text-left h-auto p-3 whitespace-normal text-xs"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ResultsDisplay({
  generatedAsset,
  previousAsset,
  product,
  isSavingToLibrary,
  handleStartOver,
  handleDownload,
  handleSaveToLibrary,
  handleGenerateAdditionalContent,
}: {
  generatedAsset: GeneratedAsset;
  previousAsset: GeneratedAsset | null;
  product: InventoryItem;
  isSavingToLibrary: boolean;
  handleStartOver: () => void;
  handleDownload: () => void;
  handleSaveToLibrary: () => Promise<void>;
  handleGenerateAdditionalContent: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Show both assets when we have a campaign */}
      {previousAsset && generatedAsset.type === 'content' && (
        <div className="space-y-4">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 bg-green-100 text-green-800 border-green-300">
              Complete Marketing Campaign
            </Badge>
          </div>
          
          {/* Visual Asset */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3 text-center">Your Visual Asset:</h4>
            <div className="flex justify-center">
              <div className="relative rounded-lg overflow-hidden bg-white shadow max-w-md">
                {previousAsset.type === 'image' && previousAsset.url ? (
                  <img
                    src={previousAsset.url}
                    alt="Generated visual content"
                    className="w-full h-auto object-contain max-h-60"
                  />
                ) : previousAsset.type === 'video' && previousAsset.url ? (
                  <video
                    src={previousAsset.url}
                    controls
                    className="w-full h-auto max-h-60"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-gray-100">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Marketing Content */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium mb-3 text-center">Your Marketing Content:</h4>
            <div className="bg-white rounded-lg p-4 border">
              <div className="whitespace-pre-wrap text-sm">{generatedAsset.content}</div>
            </div>
          </div>
        </div>
      )}

      {/* Single Asset Display (when no campaign) - Content gets special treatment */}
      {!(previousAsset && generatedAsset.type === 'content') && (
        <div className="flex justify-center">
          {generatedAsset.type === 'content' && generatedAsset.content ? (
            <div className="w-full max-w-3xl">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <div className="text-center mb-4">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    Marketing Content Generated
                  </Badge>
                </div>
                <div className="bg-white rounded-lg p-6 border shadow-sm">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{generatedAsset.content}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-gray-100 max-w-md">
              {generatedAsset.type === 'image' && generatedAsset.url ? (
                <img
                  src={generatedAsset.url}
                  alt="Generated content"
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = 
                      '<div class="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg"><Package class="h-8 w-8 text-gray-400" /><span class="ml-2 text-gray-500">Image failed to load</span></div>';
                  }}
                />
              ) : generatedAsset.type === 'video' && generatedAsset.url ? (
                <video
                  src={generatedAsset.url}
                  controls
                  className="w-full h-auto max-h-96"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = 
                      '<div class="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg"><Package class="h-8 w-8 text-gray-400" /><span class="ml-2 text-gray-500">Video failed to load</span></div>';
                  }}
                />
              ) : generatedAsset.type === 'ad' && generatedAsset.url ? (
                <img
                  src={generatedAsset.url}
                  alt="Generated ad content"
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = 
                      '<div class="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg"><Package class="h-8 w-8 text-gray-400" /><span class="ml-2 text-gray-500">Ad image failed to load</span></div>';
                  }}
                />
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {generatedAsset.message && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-sm text-blue-800">{generatedAsset.message}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          onClick={handleStartOver}
          className="flex items-center space-x-1 border-red-500 text-red-500 hover:bg-red-50"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Modify Asset</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={handleStartOver}
          className="flex items-center space-x-1 border-blue-500 text-blue-500 hover:bg-blue-50"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Start All Over</span>
        </Button>

        <Button
          onClick={handleDownload}
          className="flex items-center space-x-1"
          disabled={!generatedAsset.url && !generatedAsset.content}
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </Button>

        <Button
          onClick={handleSaveToLibrary}
          disabled={isSavingToLibrary}
          className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700"
        >
          {isSavingToLibrary ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>
            {previousAsset && generatedAsset.type === 'content' 
              ? 'Save Complete Campaign' 
              : 'Save to Library'
            }
          </span>
        </Button>
      </div>

      {/* Generate Additional Content Button - Only show for non-content types */}
      {generatedAsset.type !== 'content' && (
        <div className="text-center">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            onClick={handleGenerateAdditionalContent}
          >
            <Save className="h-5 w-5 mr-2" />
            Do you Need Text to Go with the Asset For an Ad, Post or Content?
          </Button>
        </div>
      )}
    </div>
  );
}

export function GenerationModal({ isOpen, onClose, onConfirm, product, generationType, title }: GenerationModalProps) {
  const { toast } = useToast();
  const { saveToLibrary } = useAssetLibrary();
  const { addGenerationResult } = useGeneration();
  const [instruction, setInstruction] = useState('');
  const [isImprovingInstruction, setIsImprovingInstruction] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [previousAsset, setPreviousAsset] = useState<GeneratedAsset | null>(null);
  const [currentGenerationType, setCurrentGenerationType] = useState<'image' | 'video' | 'content' | 'formats' | 'ad'>(generationType);
  const [selectedChannel, setSelectedChannel] = useState<string>('social_media');

  const getDefaultInstruction = (type: 'image' | 'video' | 'content' | 'formats' | 'ad') => {
    const brandText = product.brand ? `for ${product.brand}` : '';
    const categoryText = product.category ? `in the ${product.category} category` : '';
    
    switch (type) {
      case 'image':
        return `Create a high-quality promotional image ${brandText} ${categoryText}. Focus on ${product.name} with clean, modern styling.`;
      case 'video':
        return `Create an engaging video ${brandText} ${categoryText}. Showcase ${product.name} with dynamic visuals and smooth transitions.`;
      case 'content':
        return `Write compelling marketing copy for ${product.name} ${brandText} ${categoryText}. Create engaging text suitable for social media advertising and promotional campaigns. Include headline, body text, and call-to-action.`;
      case 'formats':
        return `Generate multiple format variations ${brandText} ${categoryText}. Create different sizes and layouts for ${product.name} across various platforms.`;
      case 'ad':
        return `Create a high-impact digital ad ${brandText} ${categoryText} for ${product.name}. Focus on clear messaging and strong call-to-action.`;
      default:
        return `Generate content for ${product.name}`;
    }
  };

  useEffect(() => {
    if (isOpen && !instruction) {
      setInstruction(getDefaultInstruction(currentGenerationType));
    }
  }, [isOpen, product, currentGenerationType, instruction, getDefaultInstruction]);

  // Reset state when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setInstruction('');
      setGeneratedAsset(null);
      setShowResults(false);
      setIsGenerating(false);
      setPreviousAsset(null);
      setCurrentGenerationType(generationType);
    } else {
      // When modal opens, set the current generation type based on the prop
      setCurrentGenerationType(generationType);
    }
  }, [isOpen, generationType]);

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === "4th of July Message") {
      setInstruction(`I want this product to showcase 4th of July SALE with Fireworks in the background and the message "4th of July SUPER SALE" and the number "30% OFF"`);
    } else if (currentGenerationType === 'content') {
      // For content generation, create channel-specific instructions that focus ONLY on content
      let channelInstruction = '';
      if (suggestion.includes('Facebook Ad')) {
        channelInstruction = `Create compelling Facebook Ad copy for ${product.name}. Write a strong attention-grabbing headline, benefits-focused body text highlighting key features, and a clear call-to-action. Format specifically for Facebook advertising standards with engaging opening and compelling offer that drives clicks.`;

      } else if (suggestion.includes('SMS')) {
        channelInstruction = `Generate SMS marketing message for ${product.name}. Keep it concise (under 160 characters), include clear value proposition, create urgency, and strong call-to-action. Make it personal and direct to drive immediate action.`;
      } else if (suggestion.includes('email')) {
        channelInstruction = `Write email marketing content for ${product.name}. Create compelling subject line, engaging body copy with benefits and features, and compelling call-to-action. Format for email marketing best practices with clear structure.`;
      } else if (suggestion.includes('LinkedIn')) {
        channelInstruction = `Create professional LinkedIn promotional post for ${product.name}. Write business-focused copy that highlights value proposition, professional benefits, and includes appropriate LinkedIn hashtags with clear call-to-action.`;
      } else if (suggestion.includes('Twitter') || suggestion.includes('X')) {
        channelInstruction = `Generate Twitter/X ad copy for ${product.name}. Create concise, engaging text under 280 characters with strong hook, key benefit, and clear call-to-action. Include 2-3 relevant hashtags for maximum engagement.`;
      } else {
        channelInstruction = `${suggestion} for ${product.name}${product.brand ? ` by ${product.brand}` : ''}${product.description ? `. ${product.description}` : ''}`;
      }
      setInstruction(channelInstruction);
    } else {
      const enhancedSuggestion = `${suggestion} for ${product.name}${product.brand ? ` by ${product.brand}` : ''}${product.description ? `. ${product.description}` : ''}`;
      setInstruction(enhancedSuggestion);
    }
  };

  const handleImproveInstruction = async () => {
    if (!instruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction first.",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingInstruction(true);
    
    try {
      const response = await generationAPI.generateWithOpenAI({
        type: 'text',
        instruction: instruction.trim(),
        productInfo: {
          name: product.name,
          description: product.description || ''
        },
        formatSpecs: {
          maxTokens: 200,
          temperature: 0.7
        }
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to improve instruction');
      }

      setInstruction(data.result);
      toast({
        title: "Instruction Improved",
        description: "Your instruction has been optimized for better AI generation.",
      });
    } catch (error) {
      console.error('Error improving instruction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to improve instruction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImprovingInstruction(false);
    }
  };

  const handleConfirm = async () => {
    console.log('=== HANDLE CONFIRM STARTED ===');
    console.log('Instruction:', instruction);
    console.log('Current generation type:', currentGenerationType);
    console.log('Generation type prop:', generationType);
    
    if (!instruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Setting isGenerating to true');
    setIsGenerating(true);
    
    try {
      // For content generation, ONLY use OpenAI and focus exclusively on text content
      if (currentGenerationType === 'content') {
        console.log('=== ENTERING CONTENT GENERATION SECTION ===');
        const response = await generationAPI.generateWithOpenAI({
          type: 'text',
          instruction: instruction,
          productInfo: {
            name: product.name,
            description: product.description || ''
          },
          formatSpecs: {
            maxTokens: 500,
            temperature: 0.7
          }
        });

        const data = response.data;
        console.log('OpenAI API response:', data);
        
        if (!data.success && !data.result) {
          throw new Error(data.error || 'Failed to generate content');
        }

        // Extract the actual content from the response
        const content = data.result?.data?.result || data.result || data.data?.result;
        
        if (!content) {
          throw new Error('No content received from API');
        }

        const asset: GeneratedAsset = {
          id: `content-${Date.now()}`,
          type: 'content',
          content: content,
          instruction: instruction,
          timestamp: new Date(),
          source_system: 'openai'
        };

        console.log('Created content asset:', asset);
        setGeneratedAsset(asset);
        setShowResults(true);
        // Add to global generation results
        console.log('About to call addGenerationResult with asset:', asset);
        try {
          addGenerationResult(asset);
          console.log('Successfully called addGenerationResult');
        } catch (error) {
          console.error('Error calling addGenerationResult:', error);
        }

        toast({
          title: "Content Generated",
          description: "Your marketing content has been created successfully!",
        });
      } else {
        // For other generation types (image, video, formats, ad), use the appropriate API
        const requestBody: Record<string, unknown> = {
          type: currentGenerationType,
          instruction: instruction,
          productInfo: {
            name: product.name,
            description: product.description
          }
        };

        // Add image URL for video generation if available
        if (currentGenerationType === 'video' && product.images && product.images.length > 0) {
          requestBody.imageUrl = product.images[0];
        }

        console.log(`Calling generation API with:`, requestBody);

        // Try OpenAI first for image generation, then fallback to RunwayML
        let data, error;
        
        if (currentGenerationType === 'image') {
          console.log('=== ENTERING IMAGE GENERATION SECTION ===');
          // Try OpenAI for image generation
          console.log('Calling OpenAI for image generation...');
          console.log('Request body:', {
            type: 'image-generation',
            instruction: instruction,
            productInfo: {
              name: product.name,
              description: product.description
            }
          });
          
          let openaiResponse;
          try {
            console.log('About to make OpenAI API call...');
            openaiResponse = await generationAPI.generateWithOpenAI({
              type: 'image',
              instruction: instruction,
              productInfo: {
                name: product.name,
                description: product.description || ''
              },
              formatSpecs: {
                size: '1024x1024'
              }
            });
            console.log('OpenAI API call completed successfully');
            console.log('OpenAI response object:', openaiResponse);
          } catch (apiError) {
            console.error('OpenAI API call failed:', apiError);
            throw apiError;
          }
          
          console.log('OpenAI response:', openaiResponse);
          
          if (openaiResponse.data?.success) {
            data = openaiResponse.data;
            error = null;
            console.log('Using OpenAI response');
          } else {
            // Fallback to RunwayML
            console.log('Falling back to RunwayML...');
            const runwayResponse = await generationAPI.generateWithRunway({
              type: 'image',
              instruction: instruction,
              productInfo: {
                name: product.name,
                description: product.description || ''
              },
              formatSpecs: {
                width: 1024,
                height: 1024
              }
            });
            data = runwayResponse.data;
            error = null;
            console.log('Using RunwayML response');
          }
        } else {
          // Use RunwayML for other types
          const runwayResponse = await generationAPI.generateWithRunway({
            type: currentGenerationType as 'image' | 'video',
            instruction: instruction,
            productInfo: {
              name: product.name,
              description: product.description || ''
            },
            formatSpecs: {
              width: 1024,
              height: 1024
            }
          });
          data = runwayResponse.data;
          error = null;
        }

        if (error) {
          throw new Error(error.message);
        }

        console.log('Generation API response:', data);
        console.log('Full response structure:', JSON.stringify(data, null, 2));
        
        // Check if the generation is still processing
        if (data.status === 'processing' || data.status === 'pending') {
          console.log('Generation is still processing...');
          toast({
            title: `${currentGenerationType} Generation Started`,
            description: `Your ${currentGenerationType} is being generated. This may take a few minutes.`,
          });
          
          // Create a placeholder asset for processing state
          const processingAsset: GeneratedAsset = {
            id: `${currentGenerationType}-processing-${Date.now()}`,
            type: currentGenerationType,
            instruction: instruction,
            timestamp: new Date(),
            source_system: data.service === 'openai' ? 'openai' : 'runway',
            status: 'processing',
            message: 'Generation in progress...'
          };
          
          setGeneratedAsset(processingAsset);
          setShowResults(true);
          addGenerationResult(processingAsset);
          return;
        }
        
        if (!data.success && !data.asset_url && !data.result) {
          throw new Error(data.error || `Failed to generate ${currentGenerationType}`);
        }

        // Extract the actual URL from the response (handle both OpenAI and RunwayML formats)
        let assetUrl = data.asset_url || data.data?.result || data.result?.data?.result || data.result;
        
        // For OpenAI image generation, the URL might be in a different format
        if (!assetUrl && data.service === 'openai') {
          assetUrl = data.data?.result || data.result;
        }
        
        // Additional check for nested result structures
        if (!assetUrl && data.result && typeof data.result === 'object') {
          assetUrl = data.result.url || data.result.image_url || data.result.asset_url;
        }
        
        // Additional debugging for URL extraction
        console.log('Extracted assetUrl:', assetUrl);
        console.log('data.asset_url:', data.asset_url);
        console.log('data.data?.result:', data.data?.result);
        console.log('data.result?.data?.result:', data.result?.data?.result);
        console.log('data.result:', data.result);
        
        if (!assetUrl) {
          console.error('No asset URL found in response');
          console.error('Full response for debugging:', data);
          throw new Error('No asset URL received from API');
        }

        const asset: GeneratedAsset = {
          id: data.asset_id || `${currentGenerationType}-${Date.now()}`,
          type: currentGenerationType,
          url: assetUrl,
          instruction: instruction,
          timestamp: new Date(),
          source_system: data.service === 'openai' ? 'openai' : 'runway',
          status: data.status,
          message: data.message
        };

        console.log('Created visual asset:', asset);
        console.log('Asset URL:', asset.url);
        console.log('Asset type:', asset.type);
        console.log('Asset id:', asset.id);
        setGeneratedAsset(asset);
        setShowResults(true);
        // Add to global generation results
        console.log('About to call addGenerationResult with visual asset:', asset);
        try {
          addGenerationResult(asset);
          console.log('Successfully called addGenerationResult for visual asset');
        } catch (error) {
          console.error('Error calling addGenerationResult for visual asset:', error);
        }

        if (data.status === 'processing') {
          toast({
            title: `${currentGenerationType} Generation Started`,
            description: `Your ${currentGenerationType} is being generated. This may take a few minutes.`,
          });
        } else if (data.status === 'error') {
          toast({
            title: "Using Placeholder",
            description: data.message || `API issue detected. Using placeholder ${currentGenerationType} for testing.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: `${currentGenerationType} Generated`,
            description: `Your ${currentGenerationType} has been created successfully!`,
          });
        }
      }

    } catch (error) {
      console.error('=== GENERATION ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast({
        title: "Generation Failed",
        description: error.message || `Failed to generate ${currentGenerationType}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      console.log('Setting isGenerating to false');
      setIsGenerating(false);
    }
    
    // Call the original onConfirm callback
    onConfirm(instruction);
  };

  const handleDownload = async () => {
    if (!generatedAsset) {
      toast({
        title: "Download Failed",
        description: "No asset available to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (generatedAsset.url) {
        // For image/video/ad assets with URLs
        const response = await fetch(generatedAsset.url);
        if (!response.ok) {
          throw new Error('Failed to fetch asset');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Determine file extension based on asset type and content type
        let extension = '';
        const contentType = blob.type;
        
        if (generatedAsset.type === 'image' || generatedAsset.type === 'ad') {
          if (contentType.includes('png')) extension = '.png';
          else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
          else if (contentType.includes('webp')) extension = '.webp';
          else extension = '.png'; // default
        } else if (generatedAsset.type === 'video') {
          if (contentType.includes('mp4')) extension = '.mp4';
          else if (contentType.includes('webm')) extension = '.webm';
          else if (contentType.includes('mov')) extension = '.mov';
          else extension = '.mp4'; // default
        }
        
        const fileName = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}-${generatedAsset.type}-${Date.now()}${extension}`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download Started",
          description: `${generatedAsset.type} asset downloaded as ${fileName}`,
        });
      } else if (generatedAsset.content && generatedAsset.type === 'content') {
        // For content assets
        const blob = new Blob([generatedAsset.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const fileName = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}-content-${Date.now()}.txt`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download Started",
          description: `Content downloaded as ${fileName}`,
        });
      } else {
        throw new Error('No downloadable content available');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the asset. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to determine channel based on content type and instruction
  const getChannelFromContent = (type: string, instruction: string): string => {
    if (type === 'content') {
      const lowerInstruction = instruction.toLowerCase();
      if (lowerInstruction.includes('facebook') || lowerInstruction.includes('fb')) return 'facebook';
      if (lowerInstruction.includes('instagram') || lowerInstruction.includes('ig')) return 'instagram';
      if (lowerInstruction.includes('sms') || lowerInstruction.includes('text')) return 'sms';
      if (lowerInstruction.includes('email') || lowerInstruction.includes('mail')) return 'email';
      if (lowerInstruction.includes('linkedin') || lowerInstruction.includes('li')) return 'linkedin';
      if (lowerInstruction.includes('twitter') || lowerInstruction.includes('x')) return 'twitter';
      if (lowerInstruction.includes('tiktok')) return 'tiktok';
      if (lowerInstruction.includes('youtube')) return 'youtube';
      if (lowerInstruction.includes('google ads')) return 'google_ads';
      return 'social_media';
    }
    
    // For visual assets, use the selected channel
    return selectedChannel;
  };

  const handleSaveToLibrary = async () => {
    if (!generatedAsset) return;
    
    setIsSavingToLibrary(true);
    
    try {

      // If we have both a visual asset (previousAsset) and content (current asset), save them as a campaign
      if (previousAsset && generatedAsset.type === 'content' && generatedAsset.content) {
        // Save as a combined campaign entry
        const campaignTitle = `${product.name} - Complete Campaign (${previousAsset.type} + content)`;
        const campaignDescription = `Visual Asset: ${previousAsset.instruction}\n\nMarketing Content: ${generatedAsset.instruction}`;
        
        // Create a combined asset entry that includes both visual and text
        await saveToLibrary({
          title: campaignTitle,
          description: campaignDescription,
          tags: [product.category, product.brand, 'campaign', previousAsset.type, 'content'].filter(Boolean),
          asset_type: previousAsset.type === 'formats' ? 'image' : previousAsset.type, // Use the visual asset type as primary, but handle formats
          asset_url: previousAsset.url || '',
          content: `VISUAL ASSET: ${previousAsset.url || 'N/A'}\n\nMARKETING CONTENT:\n${generatedAsset.content}`,
          instruction: `Combined Campaign - Visual: ${previousAsset.instruction} | Content: ${generatedAsset.instruction}`,
          source_system: 'openai', // Since content was generated last
          channel: getChannelFromContent(generatedAsset.type, generatedAsset.instruction)
        });
        
        toast({
          title: "Campaign Saved to Library",
          description: "Complete campaign with visual asset and marketing content saved together!",
        });
      } else {
        // Save individual asset as before
        // Determine the correct asset type for library storage
        let libraryAssetType: 'image' | 'video' | 'content' | 'formats' | 'ad' = generatedAsset.type;
        
        // Map formats to image for library storage, unless we want to keep it as formats
        if (generatedAsset.type === 'formats') {
          libraryAssetType = 'image';
        }
        
        await saveToLibrary({
          title: `${product.name} - ${generatedAsset.type}`,
          description: generatedAsset.instruction,
          tags: [product.category, product.brand, generatedAsset.type].filter(Boolean),
          asset_type: libraryAssetType,
          asset_url: generatedAsset.url || '',
          content: generatedAsset.content,
          instruction: generatedAsset.instruction,
          source_system: generatedAsset.source_system as 'runway' | 'heygen' | 'openai',
          channel: getChannelFromContent(generatedAsset.type, generatedAsset.instruction)
        });
        
        toast({
          title: "Asset Saved to Library",
          description: "Asset has been successfully saved to your library!",
        });
      }
    } catch (error) {
      console.error('Error saving to library:', error);
      toast({
        title: "Save Failed", 
        description: "Failed to save to library. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  const handleStartOver = () => {
    setShowResults(false);
    setGeneratedAsset(null);
    setInstruction(getDefaultInstruction(currentGenerationType));
    setPreviousAsset(null);
  };

  const handleGenerateAdditionalContent = () => {
    // Store the current asset as previous asset
    setPreviousAsset(generatedAsset);
    // Switch to content generation mode
    setCurrentGenerationType('content');
    // Set appropriate instruction for content generation
    const contentInstruction = `Create compelling marketing text to accompany this ${generatedAsset?.type} asset for ${product.name}. Generate engaging copy that would work well for an ad, social media post, or promotional content. Include a catchy headline, persuasive body text, and strong call-to-action.`;
    setInstruction(contentInstruction);
    // Go back to the first flow
    setShowResults(false);
    setGeneratedAsset(null);
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  // Updated function to use currentGenerationType instead of generationType
  const getButtonText = () => {
    switch (currentGenerationType) {
      case 'image':
        return 'Generate Image';
      case 'video':
        return 'Generate Video';
      case 'content':
        return 'Generate Content';
      case 'formats':
        return 'Generate Formats';
      case 'ad':
        return 'Generate Ad';
      default:
        return 'Generate';
    }
  };

  // Updated function to get the modal title based on currentGenerationType
  const getModalTitle = () => {
    switch (currentGenerationType) {
      case 'image':
        return 'Generate Image';
      case 'video':
        return 'Generate Video';
      case 'content':
        return 'Generate Marketing Content';
      case 'formats':
        return 'Generate Formats';
      case 'ad':
        return 'Generate Ad';
      default:
        return 'Generate Image'; // Changed default from 'Generate Content' to 'Generate Image'
    }
  };

  // Results view when asset is generated
  if (showResults && generatedAsset) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Here is Your Generated {generatedAsset.type}:</DialogTitle>
          </DialogHeader>

          <ResultsDisplay
            generatedAsset={generatedAsset}
            previousAsset={previousAsset}
            product={product}
            isSavingToLibrary={isSavingToLibrary}
            handleStartOver={handleStartOver}
            handleDownload={handleDownload}
            handleSaveToLibrary={handleSaveToLibrary}
            handleGenerateAdditionalContent={handleGenerateAdditionalContent}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Main generation form
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription>
            {currentGenerationType === 'content' 
              ? 'Content-focused suggestions for text and copy generation:'
              : 'Some Quick Ideas From Your Marketing Calendar and Previous Generations:'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Show previous asset prominently when generating content */}
        {previousAsset && currentGenerationType === 'content' && (
          <div className="mb-6 border-2 border-green-500 rounded-lg p-4 bg-green-50">
            <h4 className="font-semibold text-green-800 mb-3 text-center">
              Your Generated {previousAsset.type.charAt(0).toUpperCase() + previousAsset.type.slice(1)} - Now Creating Marketing Text:
            </h4>
            <div className="flex justify-center">
              <div className="relative rounded-lg overflow-hidden bg-white shadow-lg max-w-md">
                {previousAsset.type === 'image' && previousAsset.url ? (
                  <img
                    src={previousAsset.url}
                    alt="Generated content"
                    className="w-full h-auto object-contain max-h-80"
                  />
                ) : previousAsset.type === 'video' && previousAsset.url ? (
                  <video
                    src={previousAsset.url}
                    controls
                    className="w-full h-auto max-h-80"
                  />
                ) : previousAsset.type === 'ad' && previousAsset.url ? (
                  <img
                    src={previousAsset.url}
                    alt="Generated ad content"
                    className="w-full h-auto object-contain max-h-80"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-sm text-green-700 mt-2">
              Generate marketing copy to accompany this visual asset
            </p>
          </div>
        )}

        <SuggestionButtons
          currentGenerationType={currentGenerationType}
          handleSuggestionClick={handleSuggestionClick}
        />

        <InstructionForm
          instruction={instruction}
          setInstruction={setInstruction}
          isImprovingInstruction={isImprovingInstruction}
          handleImproveInstruction={handleImproveInstruction}
          currentGenerationType={currentGenerationType}
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
        />

        {/* Generation Status */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                {currentGenerationType === 'content' 
                  ? 'Generating Marketing Content...' 
                  : 'Generating Content...'
                }
              </h3>
              <p className="text-gray-500">
                {currentGenerationType === 'content' 
                  ? 'Creating compelling marketing copy for your product'
                  : 'This may take a few moments'
                }
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-4 border-t">
          <Button 
            onClick={handleConfirm} 
            disabled={!instruction.trim() || isGenerating}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              getButtonText()
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
