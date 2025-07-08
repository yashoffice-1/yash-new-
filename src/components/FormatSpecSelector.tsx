
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

// Instagram-specific aspect ratios based on post type
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

  // Use Instagram-specific ratios if channel is Instagram and format is specified
  const useInstagramRatios = channel === 'instagram' && format && INSTAGRAM_RATIOS[format];
  const isInstagramFeedPost = channel === 'instagram' && (format === 'Feed Post' || format === 'Feed Ad');
  
  let aspectRatios;
  let selectedRatio;
  
  if (useInstagramRatios) {
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

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
      {useInstagramRatios ? (
        // Instagram-specific format display
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Instagram Format</Label>
          {isInstagramFeedPost ? (
            // For Instagram Feed Posts, show ratio options
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <p className="text-xs text-blue-600">
                  Instagram {format} supports multiple aspect ratios:
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
            // For other Instagram formats, show fixed ratio
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <Label className="text-sm font-medium text-blue-800">
                  {selectedRatio.label} - {selectedRatio.width}x{selectedRatio.height}px
                </Label>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Optimized for Instagram {format}
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
        {useInstagramRatios && (
          <div className="text-blue-600 font-medium mt-1">
            ✅ Instagram {format} optimized
          </div>
        )}
      </div>
    </div>
  );
}
