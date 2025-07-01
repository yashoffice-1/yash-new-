
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Package, Sparkles, Download, Save, Redo, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SaveAssetDialog } from '@/components/SaveAssetDialog';
import { FormatSpecSelector } from '@/components/FormatSpecSelector';

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  images: string[];
  metadata: any;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AssetGenerationConfig {
  channel: string;
  asset_type: 'image' | 'video' | 'content' | 'ad';
  type: string;
  specification: string;
  description: string;
}

interface UnifiedAssetGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: InventoryItem[];
  initialAssetType: 'image' | 'video' | 'content' | 'ad';
}

interface GeneratedAsset {
  id?: string;
  type: string;
  content?: string;
  url?: string;
  instruction: string;
  status?: string;
  message?: string;
  adCopy?: string;
}

const CHANNELS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google-ads', label: 'Google Ads' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'pinterest', label: 'Pinterest' }
];

const ASSET_TYPES = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'content', label: 'Content' },
  { value: 'ad', label: 'Ad (Visual + Copy)' }
];

const TYPE_OPTIONS = {
  'facebook-image': ['Feed Post', 'Story', 'Carousel', 'Cover Photo'],
  'facebook-video': ['Feed Video', 'Story Video', 'Reel'],
  'facebook-content': ['Post Copy', 'Ad Copy', 'Story Text'],
  'facebook-ad': ['Feed Ad', 'Story Ad', 'Carousel Ad'],
  'instagram-image': ['Feed Post', 'Story', 'Reel Thumbnail', 'IGTV Cover'],
  'instagram-video': ['Reel', 'Story Video', 'IGTV'],
  'instagram-content': ['Caption', 'Story Text', 'Bio'],
  'instagram-ad': ['Feed Ad', 'Story Ad', 'Reel Ad'],
  'google-ads-image': ['Responsive Display Ad', 'Banner Ad', 'Square Ad'],
  'google-ads-video': ['YouTube Ad', 'Display Video'],
  'google-ads-content': ['Search Ad Copy', 'Display Ad Text'],
  'google-ads-ad': ['Search Ad', 'Display Ad', 'Shopping Ad'],
  'email-image': ['Header Image', 'Product Image', 'Banner'],
  'email-video': ['Product Demo', 'Promotional Video'],
  'email-content': ['Subject Line', 'Body Copy', 'CTA'],
  'email-ad': ['Newsletter Ad', 'Promotional Email'],
  'sms-content': ['Text Message', 'MMS Caption'],
  'sms-ad': ['Promotional SMS', 'Alert Message'],
  'linkedin-image': ['Post Image', 'Article Header'],
  'linkedin-video': ['Post Video', 'Article Video'],
  'linkedin-content': ['Post Copy', 'Article Content'],
  'linkedin-ad': ['Sponsored Content', 'Message Ad'],
  'twitter-image': ['Tweet Image', 'Header Image'],
  'twitter-video': ['Tweet Video', 'Promotional Video'],
  'twitter-content': ['Tweet Copy', 'Thread'],
  'twitter-ad': ['Promoted Tweet', 'Video Ad'],
  'tiktok-image': ['Video Thumbnail', 'Profile Image'],
  'tiktok-video': ['Short Video', 'Ad Video'],
  'tiktok-content': ['Video Caption', 'Bio'],
  'tiktok-ad': ['In-Feed Ad', 'Brand Takeover'],
  'youtube-image': ['Thumbnail', 'Channel Art'],
  'youtube-video': ['Short', 'Ad Video', 'Content Video'],
  'youtube-content': ['Video Title', 'Description'],
  'youtube-ad': ['Video Ad', 'Display Ad'],
  'pinterest-image': ['Pin Image', 'Board Cover'],
  'pinterest-video': ['Video Pin', 'Story Pin'],
  'pinterest-content': ['Pin Description', 'Board Description'],
  'pinterest-ad': ['Promoted Pin', 'Shopping Ad']
};

const SPECIFICATIONS = {
  'Feed Post': '1080x1080',
  'Story': '1080x1920',
  'Carousel': '1080x1080',
  'Cover Photo': '820x312',
  'Feed Video': '1080x1080, 15-60s',
  'Story Video': '1080x1920, 15s',
  'Reel': '1080x1920, 15-30s',
  'Post Copy': '2200 chars max',
  'Ad Copy': '125 chars headline, 27 chars description',
  'Story Text': '2200 chars max',
  'Feed Ad': '1080x1080',
  'Story Ad': '1080x1920',
  'Carousel Ad': '1080x1080',
  'Caption': '2200 chars max',
  'Bio': '150 chars max',
  'IGTV Cover': '420x654',
  'IGTV': '1080x1920, 15s-10min',
  'Reel Thumbnail': '1080x1350',
  'Responsive Display Ad': '300x250, 728x90, 320x50',
  'Banner Ad': '728x90',
  'Square Ad': '300x300',
  'YouTube Ad': '1920x1080, 15-30s',
  'Display Video': '1920x1080, 30s',
  'Search Ad Copy': '30 chars headline, 90 chars description',
  'Display Ad Text': '25 chars headline, 90 chars description',
  'Search Ad': 'Text only',
  'Display Ad': '300x250',
  'Shopping Ad': 'Product feed based',
  'Header Image': '600x200',
  'Product Image': '600x400',
  'Banner': '600x150',
  'Product Demo': '1920x1080, 30-60s',
  'Promotional Video': '1920x1080, 15-30s',
  'Subject Line': '50 chars max',
  'Body Copy': '200 words max',
  'CTA': '20 chars max',
  'Newsletter Ad': '600x400',
  'Promotional Email': 'HTML template',
  'Text Message': '160 chars max',
  'MMS Caption': '1600 chars max',
  'Promotional SMS': '160 chars max',
  'Alert Message': '160 chars max',
  'Post Image': '1200x627',
  'Article Header': '1200x627',
  'Post Video': '1920x1080, 30s-10min',
  'Article Video': '1920x1080, 1-10min',
  'Article Content': '125000 chars max',
  'Sponsored Content': '1200x627',
  'Message Ad': 'Text only',
  'Tweet Image': '1200x675',
  'Header Image LinkedIn': '1584x396',
  'Tweet Video': '1280x720, 2min 20s max',
  'Tweet Copy': '280 chars max',
  'Thread': '280 chars per tweet',
  'Promoted Tweet': '1200x675',
  'Video Ad Twitter': '1920x1080, 15s-10min',
  'Video Thumbnail': '1080x1920',
  'Profile Image': '400x400',
  'Short Video': '1080x1920, 15-60s',
  'Ad Video TikTok': '1080x1920, 5-60s',
  'Video Caption': '2200 chars max',
  'In-Feed Ad': '1080x1920',
  'Brand Takeover': '1080x1920',
  'Thumbnail YouTube': '1280x720',
  'Channel Art': '2560x1440',
  'Short': '1080x1920, 60s max',
  'Content Video': '1920x1080, any length',
  'Video Title': '100 chars max',
  'Description': '5000 chars max',
  'Video Ad YouTube': '1920x1080, 15-30s',
  'Display Ad YouTube': '300x250',
  'Pin Image': '1000x1500',
  'Board Cover': '600x600',
  'Video Pin': '1080x1920, 4s-15min',
  'Story Pin': '1080x1920',
  'Pin Description': '500 chars max',
  'Board Description': '500 chars max',
  'Promoted Pin': '1000x1500',
  'Shopping Ad Pinterest': 'Product feed based'
};

function ProductConfig({
  product,
  configKey,
  config,
  typeOptions,
  loadingInstructions,
  isImproving,
  isGenerating,
  formatSpecs,
  updateConfig,
  handleImproveInstruction,
  handleFormatSpecChange,
  handleGenerate,
  renderGeneratedAsset,
}: {
  product: InventoryItem;
  configKey: string;
  config: AssetGenerationConfig;
  typeOptions: string[];
  loadingInstructions: boolean;
  isImproving: Record<string, boolean>;
  isGenerating: boolean;
  formatSpecs: Record<string, any>;
  updateConfig: (productId: string, field: keyof AssetGenerationConfig, value: string) => void;
  handleImproveInstruction: (productId: string) => void;
  handleFormatSpecChange: (productId: string, specs: any) => void;
  handleGenerate: (productId: string) => void;
  renderGeneratedAsset: (productId: string) => JSX.Element | null;
}) {
  // Determine the format spec selector type based on asset type
  const getFormatSpecType = (assetType: string): 'image' | 'video' => {
    if (assetType === 'video') return 'video';
    // For 'ad', 'image', and 'content', default to 'image'
    return 'image';
  };

  return (
    <div key={configKey} className="space-y-4 p-4 border rounded-lg">
      {/* Product Header */}
      <div className="flex items-center space-x-3 pb-3 border-b">
        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML =
                  '<div class="w-full h-full flex items-center justify-center bg-gray-200"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h3m10-5v4a1 1 0 01-1 1h-3m-6 4h6m-6 0v4a1 1 0 001 1h3m6-5v4a1 1 0 01-1 1h-3" /></svg></div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Package className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium">{product.name}</h4>
          {product.brand && (
            <Badge variant="outline" className="text-xs">
              {product.brand}
            </Badge>
          )}
        </div>
      </div>

      {/* Configuration Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>📡 Channel</Label>
          <Select
            value={config.channel}
            onValueChange={(value) => updateConfig(configKey, 'channel', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map(channel => (
                <SelectItem key={channel.value} value={channel.value}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>🧩 Type</Label>
          <Select
            value={config.asset_type}
            onValueChange={(value) => updateConfig(configKey, 'asset_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>🎛️ Format</Label>
          <Select
            value={config.type}
            onValueChange={(value) => updateConfig(configKey, 'type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>⚙️ Specification</Label>
          <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm text-gray-600">
            {config.specification || 'Auto-generated'}
          </div>
        </div>
      </div>

      {/* Format Specification Selector - Only show for image/video/ad assets */}
      {(config.asset_type === 'image' || config.asset_type === 'video' || config.asset_type === 'ad') && (
        <div className="space-y-2">
          <Label>🎯 Format Specifications</Label>
          <FormatSpecSelector
            assetType={getFormatSpecType(config.asset_type)}
            onSpecChange={(specs) => handleFormatSpecChange(configKey, specs)}
            initialSpecs={formatSpecs[configKey]}
          />
        </div>
      )}

      {/* Instruction Box */}
      <div className="space-y-2">
        <Label>📝 Instruction</Label>
        {loadingInstructions ? (
          <div className="flex items-center space-x-2 text-sm text-gray-500 p-3 border rounded-md">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Generating smart instruction...</span>
          </div>
        ) : (
          <Textarea
            value={config.description}
            onChange={(e) => updateConfig(configKey, 'description', e.target.value)}
            placeholder="Enter your generation instructions..."
            className="min-h-[100px]"
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleImproveInstruction(configKey)}
          disabled={isImproving[configKey] || !config.description?.trim() || loadingInstructions}
          className="flex items-center space-x-1"
        >
          {isImproving[configKey] ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Improving...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              <span>Improve with AI</span>
            </>
          )}
        </Button>
      </div>

      {/* Generate Button */}
      <Button
        onClick={() => handleGenerate(configKey)}
        disabled={isGenerating || !config.description?.trim() || loadingInstructions}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          `Generate ${config.asset_type || 'Asset'}`
        )}
      </Button>

      {/* Generated Asset Display */}
      {renderGeneratedAsset(configKey)}
    </div>
  );
}

export function UnifiedAssetGenerator({
  isOpen,
  onClose,
  selectedProducts,
  initialAssetType
}: UnifiedAssetGeneratorProps) {
  const { toast } = useToast();
  const [applyToAll, setApplyToAll] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, AssetGenerationConfig>>({});
  const [generatedAssets, setGeneratedAssets] = useState<Record<string, GeneratedAsset>>({});
  const [loadingInstructions, setLoadingInstructions] = useState(false);
  const [formatSpecs, setFormatSpecs] = useState<Record<string, any>>({});

  const isMultiProduct = selectedProducts.length > 1;

  // Enhanced instruction generation with advertising context
  const generateInitialInstruction = async (product: InventoryItem, config: AssetGenerationConfig) => {
    setLoadingInstructions(true);

    try {
      const specification = SPECIFICATIONS[config.type as keyof typeof SPECIFICATIONS] || '';

      // Enhanced context for advertising-focused content
      const advertisingContext = config.asset_type === 'ad' ||
        config.type.toLowerCase().includes('ad') ||
        config.channel === 'google-ads' ||
        config.type.includes('Story') ||
        config.type.includes('Reel')
        ? {
          requiresCallToAction: true,
          includeEmojis: true,
          useSalesLanguage: true,
          includeUrgency: config.channel !== 'linkedin',
          format: config.type,
          platform: config.channel
        }
        : null;

      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'marketing-suggestions',
          productInfo: {
            name: product.name,
            description: product.description,
            category: product.category,
            brand: product.brand,
            price: product.price
          },
          channel: config.channel,
          assetType: config.asset_type,
          format: config.type,
          specification: specification,
          advertisingContext: advertisingContext,
          context: {
            requirements: advertisingContext
              ? `Create advertising content optimized for ${config.channel} ${config.type} format. 
                 MUST include: compelling call-to-action, relevant emojis, urgency/scarcity elements, 
                 and sales-focused language. Format specifications: ${specification}. 
                 For Stories/Reels: use informal, engaging tone with visual emphasis.
                 For Google Ads: focus on search intent and conversion optimization.
                 For social ads: emphasize social proof and emotional triggers.`
              : `Create content optimized for ${config.channel} ${config.type} format. Consider the specifications: ${specification}. The content should be tailored for this specific format and platform requirements.`
          }
        }
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Failed to generate instruction');
      }

      const suggestions = data.result.split('\n').filter(Boolean);
      const initialInstruction = suggestions[0]?.replace(/^[\d\-\*\.\s]+/, '').trim() ||
        (advertisingContext
          ? `Create compelling ${config.asset_type} ad for ${product.name} with strong CTA, emojis, and urgency for ${config.channel} ${config.type} (${specification})`
          : `Create compelling ${config.asset_type} content for ${product.name} optimized for ${config.channel} ${config.type} format (${specification})`);

      return initialInstruction;

    } catch (error) {
      console.error('Error generating initial instruction:', error);
      const specification = SPECIFICATIONS[config.type as keyof typeof SPECIFICATIONS] || '';
      const isAd = config.asset_type === 'ad' || config.type.toLowerCase().includes('ad');
      return isAd
        ? `Create compelling ${config.asset_type} ad for ${product.name} with strong CTA, emojis, and urgency for ${config.channel} ${config.type} (${specification})`
        : `Create compelling ${config.asset_type} content for ${product.name} optimized for ${config.channel} ${config.type} format (${specification})`;
    } finally {
      setLoadingInstructions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initializeConfigs = async () => {
        const initialConfig: AssetGenerationConfig = {
          channel: 'facebook',
          asset_type: initialAssetType,
          type: getDefaultType('facebook', initialAssetType),
          specification: '',
          description: ''
        };

        if (isMultiProduct && applyToAll) {
          const instruction = await generateInitialInstruction(selectedProducts[0], initialConfig);
          initialConfig.description = instruction;
          setConfigs({ 'all': initialConfig });
        } else {
          const newConfigs: Record<string, AssetGenerationConfig> = {};
          for (const product of selectedProducts) {
            const productConfig = { ...initialConfig };
            const instruction = await generateInitialInstruction(product, productConfig);
            productConfig.description = instruction;
            newConfigs[product.id] = productConfig;
          }
          setConfigs(newConfigs);
        }
      };

      initializeConfigs();
    }
  }, [isOpen, selectedProducts, initialAssetType, applyToAll]);

  const getDefaultType = (channel: string, assetType: string): string => {
    const key = `${channel}-${assetType}` as keyof typeof TYPE_OPTIONS;
    const options = TYPE_OPTIONS[key];
    return options?.[0] || '';
  };

  const getTypeOptions = (channel: string, assetType: string): string[] => {
    const key = `${channel}-${assetType}` as keyof typeof TYPE_OPTIONS;
    return TYPE_OPTIONS[key] || [];
  };

  const updateConfig = async (productId: string, field: keyof AssetGenerationConfig, value: string) => {
    setConfigs(prev => {
      const newConfigs = { ...prev };
      const config = newConfigs[productId] || {} as AssetGenerationConfig;

      if (field === 'channel' || field === 'asset_type') {
        const newType = getDefaultType(
          field === 'channel' ? value : config.channel,
          field === 'asset_type' ? value : config.asset_type
        );
        config.type = newType;
        config.specification = SPECIFICATIONS[newType as keyof typeof SPECIFICATIONS] || '';

        // Regenerate instruction when channel or asset type changes
        const product = selectedProducts.find(p => p.id === productId) || selectedProducts[0];
        const updatedConfig = { ...config, [field]: value as any };
        generateInitialInstruction(product, updatedConfig).then(instruction => {
          setConfigs(current => ({
            ...current,
            [productId]: { ...current[productId], description: instruction }
          }));
        });
      } else if (field === 'type') {
        config.specification = SPECIFICATIONS[value as keyof typeof SPECIFICATIONS] || '';

        // Regenerate instruction when type changes to consider new specifications
        const product = selectedProducts.find(p => p.id === productId) || selectedProducts[0];
        const updatedConfig = { ...config, [field]: value as any };
        generateInitialInstruction(product, updatedConfig).then(instruction => {
          setConfigs(current => ({
            ...current,
            [productId]: { ...current[productId], description: instruction }
          }));
        });
      }

      config[field] = value as any;
      newConfigs[productId] = config;

      return newConfigs;
    });
  };

  const generateTaggedInstruction = (config: AssetGenerationConfig, product: InventoryItem): string => {
    const specification = config.specification || SPECIFICATIONS[config.type as keyof typeof SPECIFICATIONS] || '';
    const isAdvertising = config.asset_type === 'ad' ||
      config.type.toLowerCase().includes('ad') ||
      config.channel === 'google-ads' ||
      config.type.includes('Story') ||
      config.type.includes('Reel');

    const tags = [
      `#channel: ${CHANNELS.find(c => c.value === config.channel)?.label || config.channel}`,
      `#type: ${config.type}`,
      `#spec: ${specification}`,
      `#product: ${product.name}${product.brand ? ` by ${product.brand}` : ''}`,
      product.price ? `#price: $${product.price}` : '',
      `#format_requirements: Optimize for ${config.channel} ${config.type} with specifications: ${specification}`,
      isAdvertising ? `#advertising_context: Include CTA, emojis, urgency, sales language` : ''
    ].filter(Boolean).join('\n');

    return `${tags}\n\n${config.description}`;
  };

  const handleImproveInstruction = async (productId: string) => {
    const config = configs[productId];
    if (!config?.description.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction first.",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(prev => ({ ...prev, [productId]: true }));

    try {
      const product = selectedProducts.find(p => p.id === productId) || selectedProducts[0];
      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'clean-instruction',
          instruction: config.description.trim(),
          productInfo: {
            name: product.name,
            description: product.description,
            category: product.category,
            brand: product.brand
          },
          context: {
            channel: config.channel,
            assetType: config.asset_type,
            format: config.type,
            specification: config.specification
          }
        }
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Failed to improve instruction');
      }

      updateConfig(productId, 'description', data.result);
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
      setIsImproving(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleFormatSpecChange = (productId: string, specs: any) => {
    setFormatSpecs(prev => ({
      ...prev,
      [productId]: specs
    }));
  };

  const handleGenerate = async (productId: string) => {
    setIsGenerating(true);

    try {
      const config = configs[productId];
      const product = selectedProducts.find(p => p.id === productId) || selectedProducts[0];
      const fullInstruction = generateTaggedInstruction(config, product);
      const specification = config.specification || SPECIFICATIONS[config.type as keyof typeof SPECIFICATIONS] || '';
      const currentFormatSpecs = formatSpecs[productId];

      let result: GeneratedAsset;

      if (config.asset_type === 'content') {
        const { data, error } = await supabase.functions.invoke('openai-generate', {
          body: {
            type: 'marketing-content',
            instruction: fullInstruction,
            productInfo: {
              name: product.name,
              description: product.description,
              category: product.category,
              brand: product.brand,
              price: product.price
            },
            formatSpecs: {
              channel: config.channel,
              assetType: config.asset_type,
              format: config.type,
              specification: specification,
              dimensions: specification,
              ...currentFormatSpecs
            }
          }
        });

        if (error || !data.success) {
          throw new Error(data?.error || 'Failed to generate content');
        }

        result = {
          type: 'content',
          content: data.result,
          instruction: fullInstruction
        };
      } else if (config.asset_type === 'ad') {
        // Generate both visual asset and ad copy for ads
        toast({
          title: "Generating Ad Package",
          description: "Creating both visual asset and ad copy...",
        });

        // First generate the visual asset
        let width, height, duration, aspectRatio;

        if (currentFormatSpecs) {
          width = currentFormatSpecs.width;
          height = currentFormatSpecs.height;
          aspectRatio = currentFormatSpecs.aspectRatio;
          duration = currentFormatSpecs.duration;
        } else {
          const dimensionMatch = specification.match(/(\d+)x(\d+)/);
          width = dimensionMatch ? parseInt(dimensionMatch[1]) : 1024;
          height = dimensionMatch ? parseInt(dimensionMatch[2]) : 1024;

          const durationMatch = specification.match(/(\d+)(?:s|sec|seconds?)/i);
          duration = durationMatch ? `${durationMatch[1]} seconds` : '5 seconds';

          aspectRatio = width && height ? `${width}:${height}` : '1:1';
        }

        const visualRequestBody: any = {
          type: config.type.toLowerCase().includes('video') ? 'video' : 'image',
          instruction: fullInstruction,
          productInfo: {
            name: product.name,
            description: product.description,
            price: product.price
          },
          formatSpecs: {
            channel: config.channel,
            assetType: 'ad',
            format: config.type,
            specification: specification,
            width: width,
            height: height,
            dimensions: `${width}x${height}`,
            aspectRatio: aspectRatio,
            duration: duration,
            ...currentFormatSpecs
          }
        };

        // Add image URL for video generation if available
        if (config.type.toLowerCase().includes('video') && product.images?.length > 0) {
          visualRequestBody.imageUrl = product.images[0];
        }

        console.log('Generating ad visual with format specs:', visualRequestBody.formatSpecs);

        const { data: visualData, error: visualError } = await supabase.functions.invoke('runwayml-generate', {
          body: visualRequestBody
        });

        if (visualError || !visualData.success) {
          throw new Error(visualData?.error || 'Failed to generate ad visual');
        }

        // Generate ad copy
        const { data: copyData, error: copyError } = await supabase.functions.invoke('openai-generate', {
          body: {
            type: 'marketing-content',
            instruction: `${fullInstruction}\n\nGenerate compelling ad copy with strong call-to-action, emojis, and urgency for this visual asset. Include price if relevant.`,
            productInfo: {
              name: product.name,
              description: product.description,
              category: product.category,
              brand: product.brand,
              price: product.price
            },
            formatSpecs: {
              channel: config.channel,
              assetType: 'content',
              format: `${config.type} Copy`,
              specification: `Ad copy for ${specification}`,
              requiresCallToAction: true,
              includeEmojis: true,
              useSalesLanguage: true
            }
          }
        });

        if (copyError || !copyData.success) {
          console.warn('Failed to generate ad copy, using visual only');
        }

        result = {
          id: visualData.asset_id,
          type: 'ad',
          url: visualData.asset_url,
          instruction: fullInstruction,
          status: visualData.status,
          message: visualData.message,
          adCopy: copyData?.success ? copyData.result : undefined
        };
      } else {
        // Regular image/video generation with enhanced format specs
        let width, height, duration, aspectRatio;

        if (currentFormatSpecs) {
          width = currentFormatSpecs.width;
          height = currentFormatSpecs.height;
          aspectRatio = currentFormatSpecs.aspectRatio;
          duration = currentFormatSpecs.duration;
        } else {
          const dimensionMatch = specification.match(/(\d+)x(\d+)/);
          width = dimensionMatch ? parseInt(dimensionMatch[1]) : 1024;
          height = dimensionMatch ? parseInt(dimensionMatch[2]) : 1024;

          const durationMatch = specification.match(/(\d+)(?:s|sec|seconds?)/i);
          duration = durationMatch ? `${durationMatch[1]} seconds` : '5 seconds';

          aspectRatio = width && height ? `${width}:${height}` : '1:1';
        }

        console.log(`Generating ${config.asset_type} with specifications:`, {
          width, height, duration, aspectRatio, specification
        });

        const requestBody: any = {
          type: config.asset_type,
          instruction: fullInstruction,
          productInfo: {
            name: product.name,
            description: product.description,
            price: product.price
          },
          formatSpecs: {
            channel: config.channel,
            assetType: config.asset_type,
            format: config.type,
            specification: specification,
            width: width,
            height: height,
            dimensions: `${width}x${height}`,
            aspectRatio: aspectRatio,
            duration: duration,
            ...currentFormatSpecs
          }
        };

        // Add image URL for video generation if available
        if (config.asset_type === 'video' && product.images?.length > 0) {
          requestBody.imageUrl = product.images[0];
        }

        console.log('Sending request to RunwayML with enhanced format specs:', requestBody.formatSpecs);

        const { data, error } = await supabase.functions.invoke('runwayml-generate', {
          body: requestBody
        });

        if (error || !data.success) {
          throw new Error(data?.error || `Failed to generate ${config.asset_type}`);
        }

        result = {
          id: data.asset_id,
          type: config.asset_type,
          url: data.asset_url,
          instruction: fullInstruction,
          status: data.status,
          message: data.message
        };
      }

      setGeneratedAssets(prev => ({ ...prev, [productId]: result }));

      const formatInfo = currentFormatSpecs ?
        `${currentFormatSpecs.aspectRatio} (${currentFormatSpecs.dimensions})${config.asset_type === 'video' || config.asset_type === 'ad' ? `, ${currentFormatSpecs.duration}` : ''}` :
        specification;

      toast({
        title: "Generation Successful",
        description: config.asset_type === 'ad'
          ? `Your ad package (visual + copy) has been generated with format: ${formatInfo}`
          : `Your ${config.asset_type} has been generated with format: ${formatInfo}`,
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || `Failed to generate ${configs[productId]?.asset_type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRedoGeneration = async (productId: string) => {
    // Clear the current asset to allow instruction editing
    setGeneratedAssets(prev => {
      const newAssets = { ...prev };
      delete newAssets[productId];
      return newAssets;
    });

    toast({
      title: "Ready to Regenerate",
      description: "You can now modify your instruction and generate again.",
    });
  };

  const handleDownloadAsset = (asset: GeneratedAsset) => {
    if (asset.url && asset.type !== 'content') {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `${asset.type}-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: `Downloading your ${asset.type}...`,
      });
    }
  };

  const renderAssetActions = (productId: string, asset: GeneratedAsset) => {
    const config = configs[productId];
    const product = selectedProducts.find(p => p.id === productId) || selectedProducts[0];

    // Generate prefilled data for Save to Library
    const generateSaveData = () => {
      const channelLabel = CHANNELS.find(c => c.value === config?.channel)?.label || config?.channel;
      const specification = config?.specification || SPECIFICATIONS[config?.type as keyof typeof SPECIFICATIONS] || '';

      return {
        title: `${product.name} - ${channelLabel} ${config?.type || 'Asset'}`,
        description: [
          `Product: ${product.name}`,
          product.brand ? `Brand: ${product.brand}` : '',
          product.category ? `Category: ${product.category}` : '',
          product.description ? `Description: ${product.description}` : '',
          `Channel: ${channelLabel}`,
          `Format: ${config?.type || 'N/A'}`,
          specification ? `Specifications: ${specification}` : '',
          asset.adCopy ? `Ad Copy: ${asset.adCopy}` : ''
        ].filter(Boolean).join('\n'),
        tags: [
          product.brand?.toLowerCase(),
          product.category?.toLowerCase(),
          config?.channel,
          config?.asset_type,
          config?.type?.toLowerCase().replace(/\s+/g, '-'),
          'generated',
          asset.adCopy ? 'with-copy' : ''
        ].filter(Boolean) as string[]
      };
    };

    return (
      <div className="flex flex-wrap gap-2 mt-4 p-3 bg-gray-50 rounded-lg border-t">
        {/* Save to Library */}
        {asset.type !== 'combo' && asset.url && (
          <SaveAssetDialog
            asset={{
              id: asset.id || `${asset.type}-${Date.now()}`,
              type: asset.type as 'image' | 'video' | 'content' | 'ad',
              url: asset.url,
              instruction: asset.instruction,
              content: asset.content || asset.adCopy,
              source_system: 'runway',
            }}
            prefillData={generateSaveData()}
          />
        )}

        {/* Download */}
        {asset.type !== 'content' && asset.url && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadAsset(asset)}
            className="flex items-center space-x-1"
          >
            <Download className="h-3 w-3" />
            <span>Download</span>
          </Button>
        )}

        {/* Copy Content (for content type or ad copy) */}
        {(asset.type === 'content' && asset.content) || asset.adCopy ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const textToCopy = asset.adCopy || asset.content || '';
              navigator.clipboard.writeText(textToCopy);
              toast({ title: "Content copied to clipboard" });
            }}
            className="flex items-center space-x-1"
          >
            <Save className="h-3 w-3" />
            <span>Copy {asset.adCopy ? 'Ad Copy' : 'Content'}</span>
          </Button>
        ) : null}

        {/* Redo */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRedoGeneration(productId)}
          disabled={isGenerating}
          className="flex items-center space-x-1"
        >
          <Redo className="h-3 w-3" />
          <span>Redo</span>
        </Button>

        {/* Exit/Close */}
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          className="flex items-center space-x-1 ml-auto"
        >
          <X className="h-3 w-3" />
          <span>Exit</span>
        </Button>
      </div>
    );
  };

  const renderGeneratedAsset = (productId: string) => {
    const asset = generatedAssets[productId];
    if (!asset) return null;

    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-50">
        <h4 className="font-medium mb-2 flex items-center space-x-2">
          <span>Generated {asset.type === 'ad' ? 'Ad Package' : asset.type}</span>
          {asset.status === 'processing' && (
            <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
          )}
          {asset.status === 'completed' && (
            <Badge className="bg-green-100 text-green-800">Completed</Badge>
          )}
          {asset.status === 'error' && (
            <Badge className="bg-red-100 text-red-800">Error</Badge>
          )}
        </h4>

        {/* Asset Display */}
        {asset.type === 'content' && asset.content ? (
          <div className="whitespace-pre-wrap text-sm bg-white p-3 rounded border mb-3">
            {asset.content}
          </div>
        ) : asset.url ? (
          <div className="space-y-2 mb-3">
            {asset.type === 'image' || asset.type === 'ad' ? (
              <img
                src={asset.url}
                alt="Generated asset"
                className="max-w-full h-auto rounded border max-h-64 object-contain"
                onError={(e) => {
                  console.error('Image failed to load:', asset.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : asset.type === 'video' ? (
              <video
                controls
                className="max-w-full h-auto rounded border max-h-64"
                onError={(e) => {
                  console.error('Video failed to load:', asset.url);
                }}
              >
                <source src={asset.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : null}

            {/* Display ad copy if available */}
            {asset.adCopy && (
              <div className="mt-3">
                <h5 className="font-medium text-sm mb-1">Ad Copy:</h5>
                <div className="whitespace-pre-wrap text-sm bg-white p-3 rounded border">
                  {asset.adCopy}
                </div>
              </div>
            )}
          </div>
        ) : asset.status === 'error' ? (
          <div className="text-red-600 text-sm mb-3">
            {asset.message || 'Generation failed'}
          </div>
        ) : null}

        {/* Action Buttons */}
        {renderAssetActions(productId, asset)}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unified Asset Generator</DialogTitle>
          <DialogDescription>
            Generate {initialAssetType === 'ad' ? 'ads (visual + copy)' : `${initialAssetType}s`} for {selectedProducts.length} selected product{selectedProducts.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Multi-Product Toggle */}
        {isMultiProduct && (
          <div className="flex items-center justify-center space-x-4 p-4 bg-blue-50 rounded-lg">
            <Label htmlFor="apply-to-all">Apply to All Products</Label>
            <Switch
              id="apply-to-all"
              checked={applyToAll}
              onCheckedChange={setApplyToAll}
            />
            <Label htmlFor="apply-to-all">Customize Per Product</Label>
          </div>
        )}

        {/* Generation Configs */}
        <div className="space-y-6">
          {isMultiProduct && applyToAll ? (
            <div>
              <h3 className="text-lg font-medium mb-4">
                Configuration for All Products ({selectedProducts.length} items)
              </h3>
              {(() => {
                const product = selectedProducts[0];
                const config = configs['all'] || {} as AssetGenerationConfig;
                const typeOptions = getTypeOptions(config.channel, config.asset_type);
                return (
                  <ProductConfig
                    product={product}
                    configKey="all"
                    config={config}
                    typeOptions={typeOptions}
                    loadingInstructions={loadingInstructions}
                    isImproving={isImproving}
                    isGenerating={isGenerating}
                    formatSpecs={formatSpecs}
                    updateConfig={updateConfig}
                    handleImproveInstruction={handleImproveInstruction}
                    handleFormatSpecChange={handleFormatSpecChange}
                    handleGenerate={handleGenerate}
                    renderGeneratedAsset={renderGeneratedAsset}
                  />
                );
              })()}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium mb-4">
                {isMultiProduct ? 'Individual Product Configurations' : 'Product Configuration'}
              </h3>
              {selectedProducts.map(product => {
                const config = configs[product.id] || {} as AssetGenerationConfig;
                const typeOptions = getTypeOptions(config.channel, config.asset_type);
                return (
                  <ProductConfig
                    key={product.id}
                    product={product}
                    configKey={product.id}
                    config={config}
                    typeOptions={typeOptions}
                    loadingInstructions={loadingInstructions}
                    isImproving={isImproving}
                    isGenerating={isGenerating}
                    formatSpecs={formatSpecs}
                    updateConfig={updateConfig}
                    handleImproveInstruction={handleImproveInstruction}
                    handleFormatSpecChange={handleFormatSpecChange}
                    handleGenerate={handleGenerate}
                    renderGeneratedAsset={renderGeneratedAsset}
                  />
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
