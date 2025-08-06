
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/forms/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/forms/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';

interface FormatSpecSelectorProps {
  assetType: 'image' | 'video';
  onSpecChange: (specs: FormatSpecs) => void;
  initialSpecs?: FormatSpecs;
  channel?: string;
  format?: string;
}

interface FormatSpecs {
  aspectRatio: string;
  width: number;
  height: number;
  dimensions: string;
  duration?: string;
}

// Channel-specific aspect ratios based on post type
const INSTAGRAM_RATIOS = {
  'Feed Post': { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 },
  'Story': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Reel Thumbnail': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'IGTV Cover': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Feed Ad': { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 },
  'Story Ad': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Reel Ad': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Reel': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Story Video': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'IGTV': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  // Handle landscape option for posts (not commonly used but available)
  'Landscape': { value: '1.91:1', label: 'Landscape (1.91:1)', width: 1080, height: 566 },
  // Handle 4:5 vertical posts (also available for Instagram posts)
  'Vertical': { value: '4:5', label: 'Vertical (4:5)', width: 1080, height: 1350 }
};

const FACEBOOK_RATIOS = {
  'Feed Post': { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 },
  'Story': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Carousel': { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 },
  'Cover Photo': { value: '2.63:1', label: 'Landscape (2.63:1)', width: 1125, height: 432 }
};

const GOOGLE_ADS_RATIOS = {
  'Responsive Display (Landscape)': { value: '1.91:1', label: 'Landscape (1.91:1)', width: 1200, height: 628 },
  'Responsive Display (Square)': { value: '1:1', label: 'Square (1:1)', width: 1200, height: 1200 },
  'Portrait': { value: '4:5', label: 'Portrait (4:5)', width: 960, height: 1200 },
  'Logo (Square)': { value: '1:1', label: 'Square (1:1)', width: 1200, height: 1200 }
};

const LINKEDIN_RATIOS = {
  'Feed Image Post': { value: '1.91:1', label: 'Landscape (1.91:1)', width: 1200, height: 627 },
  'Story': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Carousel': { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 },
  'Company Banner': { value: '4:1', label: 'Landscape (4:1)', width: 1536, height: 396 }
};

const TWITTER_RATIOS = {
  'Tweet Image': { value: '16:9', label: 'Landscape (16:9)', width: 1200, height: 675 },
  'Header Image': { value: '3:1', label: 'Landscape (3:1)', width: 1500, height: 500 },
  'Multiple Images': { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 }
};

const TIKTOK_RATIOS = {
  'Video Post': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Ad Creative': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Square': { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 }
};

const YOUTUBE_RATIOS = {
  'Thumbnail': { value: '16:9', label: 'Landscape (16:9)', width: 1280, height: 720 },
  'Video (Standard)': { value: '16:9', label: 'Landscape (16:9)', width: 1920, height: 1080 },
  'Shorts': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Channel Banner': { value: '6.2:1', label: 'Landscape (6.2:1)', width: 2560, height: 423 }
};

const PINTEREST_RATIOS = {
  'Standard Pin': { value: '2:3', label: 'Vertical (2:3)', width: 1000, height: 1500 },
  'Square Pin': { value: '1:1', label: 'Square (1:1)', width: 1000, height: 1000 },
  'Story / Idea Pin': { value: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
  'Long Pin': { value: '1:2.1', label: 'Vertical (1:2.1)', width: 1000, height: 2100 }
};

const ASPECT_RATIOS = {
  image: [
    { value: '16:9', label: '16:9', width: 1920, height: 1080 },
    { value: '3:2', label: '3:2', width: 1500, height: 1000 },
    { value: '1:1', label: '1:1', width: 1024, height: 1024 },
    { value: '2:3', label: '2:3', width: 1000, height: 1500 },
    { value: '9:16', label: '9:16', width: 1080, height: 1920 }
  ],
  video: [
    { value: '3:2', label: '3:2', width: 1500, height: 1000 },
    { value: '1:1', label: '1:1', width: 1080, height: 1080 },
    { value: '2:3', label: '2:3', width: 1080, height: 1620 }
  ]
};

const VIDEO_DURATIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '15', label: '15 seconds' },
  { value: '20', label: '20 seconds' }
];

export function FormatSpecSelector({ assetType, onSpecChange, initialSpecs, channel, format }: FormatSpecSelectorProps) {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(
    initialSpecs?.aspectRatio || (assetType === 'image' ? '2:3' : '2:3')
  );
  const [selectedDuration, setSelectedDuration] = useState(
    initialSpecs?.duration || '5'
  );

  // Use channel-specific ratios if channel and format are specified
  const useInstagramRatios = channel === 'instagram' && format && INSTAGRAM_RATIOS[format];
  const useFacebookRatios = channel === 'facebook' && format && FACEBOOK_RATIOS[format];
  const useGoogleAdsRatios = channel === 'google-ads' && format && GOOGLE_ADS_RATIOS[format];
  const useLinkedInRatios = channel === 'linkedin' && format && LINKEDIN_RATIOS[format];
  const useTwitterRatios = channel === 'twitter' && format && TWITTER_RATIOS[format];
  const useTikTokRatios = channel === 'tiktok' && format && TIKTOK_RATIOS[format];
  const useYouTubeRatios = channel === 'youtube' && format && YOUTUBE_RATIOS[format];
  const usePinterestRatios = channel === 'pinterest' && format && PINTEREST_RATIOS[format];
  
  const isInstagramFeedPost = channel === 'instagram' && (format === 'Feed Post' || format === 'Feed Ad');
  const isTwitterMultipleImages = channel === 'twitter' && format === 'Multiple Images';
  const isTikTokAdCreative = channel === 'tiktok' && format === 'Ad Creative';
  
  let aspectRatios;
  let selectedRatio;
  let channelName = '';
  
  if (useInstagramRatios) {
    channelName = 'Instagram';
    if (isInstagramFeedPost) {
      // For Instagram Feed Posts and Feed Ads, offer all three supported ratios
      aspectRatios = [
        INSTAGRAM_RATIOS['Feed Post'], // Square 1:1
        INSTAGRAM_RATIOS['Landscape'], // Landscape 1.91:1
        INSTAGRAM_RATIOS['Vertical']   // Vertical 4:5
      ];
      selectedRatio = aspectRatios.find(r => r.value === selectedAspectRatio) || aspectRatios[0];
    } else {
      // For other Instagram formats (Stories, Reels, etc.), use the predefined ratio
      const instagramRatio = INSTAGRAM_RATIOS[format];
      aspectRatios = [instagramRatio];
      selectedRatio = instagramRatio;
    }
  } else if (useFacebookRatios) {
    channelName = 'Facebook';
    const facebookRatio = FACEBOOK_RATIOS[format];
    aspectRatios = [facebookRatio];
    selectedRatio = facebookRatio;
  } else if (useGoogleAdsRatios) {
    channelName = 'Google Ads';
    const googleAdsRatio = GOOGLE_ADS_RATIOS[format];
    aspectRatios = [googleAdsRatio];
    selectedRatio = googleAdsRatio;
  } else if (useLinkedInRatios) {
    channelName = 'LinkedIn';
    const linkedInRatio = LINKEDIN_RATIOS[format];
    aspectRatios = [linkedInRatio];
    selectedRatio = linkedInRatio;
  } else if (useTwitterRatios) {
    channelName = 'Twitter/X';
    if (isTwitterMultipleImages) {
      // For Twitter Multiple Images, offer both 1:1 and 4:5 ratios
      aspectRatios = [
        TWITTER_RATIOS['Multiple Images'], // Square 1:1
        { value: '4:5', label: 'Vertical (4:5)', width: 1080, height: 1350 }
      ];
      selectedRatio = aspectRatios.find(r => r.value === selectedAspectRatio) || aspectRatios[0];
    } else {
      const twitterRatio = TWITTER_RATIOS[format];
      aspectRatios = [twitterRatio];
      selectedRatio = twitterRatio;
    }
  } else if (useTikTokRatios) {
    channelName = 'TikTok';
    if (isTikTokAdCreative) {
      // For TikTok Ad Creative, offer both 9:16 and 1:1 ratios
      aspectRatios = [
        TIKTOK_RATIOS['Ad Creative'], // Vertical 9:16
        TIKTOK_RATIOS['Square'] // Square 1:1
      ];
      selectedRatio = aspectRatios.find(r => r.value === selectedAspectRatio) || aspectRatios[0];
    } else {
      const tiktokRatio = TIKTOK_RATIOS[format];
      aspectRatios = [tiktokRatio];
      selectedRatio = tiktokRatio;
    }
  } else if (useYouTubeRatios) {
    channelName = 'YouTube';
    const youtubeRatio = YOUTUBE_RATIOS[format];
    aspectRatios = [youtubeRatio];
    selectedRatio = youtubeRatio;
  } else if (usePinterestRatios) {
    channelName = 'Pinterest';
    const pinterestRatio = PINTEREST_RATIOS[format];
    aspectRatios = [pinterestRatio];
    selectedRatio = pinterestRatio;
  } else {
    // For other channels, use the default aspect ratios
    aspectRatios = ASPECT_RATIOS[assetType];
    selectedRatio = aspectRatios.find(r => r.value === selectedAspectRatio) || aspectRatios[0];
  }

  const updateSpecs = (aspectRatio?: string, duration?: string) => {
    const ratio = aspectRatio || selectedAspectRatio;
    const dur = duration || selectedDuration;
    
    let ratioData;
    if (useInstagramRatios) {
      if (isInstagramFeedPost) {
        // For Instagram Feed Posts, find the selected ratio from the available options
        ratioData = aspectRatios.find(r => r.value === ratio) || aspectRatios[0];
      } else {
        // For other Instagram formats, use the predefined ratio
        ratioData = INSTAGRAM_RATIOS[format];
      }
    } else if (useFacebookRatios) {
      ratioData = FACEBOOK_RATIOS[format];
    } else if (useGoogleAdsRatios) {
      ratioData = GOOGLE_ADS_RATIOS[format];
    } else if (useLinkedInRatios) {
      ratioData = LINKEDIN_RATIOS[format];
    } else if (useTwitterRatios) {
      if (isTwitterMultipleImages) {
        ratioData = aspectRatios.find(r => r.value === ratio) || aspectRatios[0];
      } else {
        ratioData = TWITTER_RATIOS[format];
      }
    } else if (useTikTokRatios) {
      if (isTikTokAdCreative) {
        ratioData = aspectRatios.find(r => r.value === ratio) || aspectRatios[0];
      } else {
        ratioData = TIKTOK_RATIOS[format];
      }
    } else if (useYouTubeRatios) {
      ratioData = YOUTUBE_RATIOS[format];
    } else if (usePinterestRatios) {
      ratioData = PINTEREST_RATIOS[format];
    } else {
      ratioData = aspectRatios.find(r => r.value === ratio) || aspectRatios[0];
    }
    
    const specs: FormatSpecs = {
      aspectRatio: ratioData.value,
      width: ratioData.width,
      height: ratioData.height,
      dimensions: `${ratioData.width}x${ratioData.height}`,
      ...(assetType === 'video' && { duration: `${dur} seconds` })
    };
    
    onSpecChange(specs);
  };

  const handleAspectRatioChange = (value: string) => {
    setSelectedAspectRatio(value);
    updateSpecs(value, undefined);
  };

  const handleDurationChange = (value: string) => {
    setSelectedDuration(value);
    updateSpecs(undefined, value);
  };

  // Initialize specs when component mounts or when Instagram format changes
  useEffect(() => {
    updateSpecs();
  }, [channel, format]);

  const isChannelSpecific = channelName !== '';
  const hasMultipleOptions = isInstagramFeedPost || isTwitterMultipleImages || isTikTokAdCreative;

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
      {isChannelSpecific ? (
        // Channel-specific format display
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">{channelName} Format</Label>
          {hasMultipleOptions ? (
            // For formats with multiple ratio options
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <p className="text-xs text-blue-600">
                  {channelName} {format} supports multiple aspect ratios:
                </p>
              </div>
              <RadioGroup 
                value={selectedAspectRatio} 
                onValueChange={handleAspectRatioChange}
                className="space-y-2"
              >
                {aspectRatios.map((ratio) => (
                  <div key={ratio.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={ratio.value} id={`ratio-${ratio.value}`} />
                    <Label 
                      htmlFor={`ratio-${ratio.value}`} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {ratio.label} - {ratio.width}x{ratio.height}px
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ) : (
            // For formats with fixed ratios
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <Label className="text-sm font-medium text-blue-800">
                  {selectedRatio.label} - {selectedRatio.width}x{selectedRatio.height}px
                </Label>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Optimized for {channelName} {format}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Standard aspect ratio selector for other channels
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Aspect ratio</Label>
          <RadioGroup 
            value={selectedAspectRatio} 
            onValueChange={handleAspectRatioChange}
            className="space-y-2"
          >
            {aspectRatios.map((ratio) => (
              <div key={ratio.value} className="flex items-center space-x-2">
                <RadioGroupItem value={ratio.value} id={`ratio-${ratio.value}`} />
                <Label 
                  htmlFor={`ratio-${ratio.value}`} 
                  className="text-sm cursor-pointer flex-1"
                >
                  {ratio.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {assetType === 'video' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Duration</Label>
          <Select value={selectedDuration} onValueChange={handleDurationChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_DURATIONS.map((duration) => (
                <SelectItem key={duration.value} value={duration.value}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="text-xs text-gray-500 bg-white p-2 rounded border">
        <strong>Selected:</strong> {selectedRatio.width}x{selectedRatio.height}
        {assetType === 'video' && `, ${selectedDuration} seconds`}
        {isChannelSpecific && (
          <div className="text-blue-600 font-medium mt-1">
            ✅ {channelName} {format} optimized
          </div>
        )}
      </div>
    </div>
  );
}
