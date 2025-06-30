
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FormatSpecSelectorProps {
  assetType: 'image' | 'video';
  onSpecChange: (specs: FormatSpecs) => void;
  initialSpecs?: FormatSpecs;
}

interface FormatSpecs {
  aspectRatio: string;
  width: number;
  height: number;
  dimensions: string;
  duration?: string;
}

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

export function FormatSpecSelector({ assetType, onSpecChange, initialSpecs }: FormatSpecSelectorProps) {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(
    initialSpecs?.aspectRatio || (assetType === 'image' ? '2:3' : '2:3')
  );
  const [selectedDuration, setSelectedDuration] = useState(
    initialSpecs?.duration || '5'
  );

  const aspectRatios = ASPECT_RATIOS[assetType];
  const selectedRatio = aspectRatios.find(r => r.value === selectedAspectRatio) || aspectRatios[0];

  const updateSpecs = (aspectRatio?: string, duration?: string) => {
    const ratio = aspectRatio || selectedAspectRatio;
    const dur = duration || selectedDuration;
    const ratioData = aspectRatios.find(r => r.value === ratio) || aspectRatios[0];
    
    const specs: FormatSpecs = {
      aspectRatio: ratio,
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

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
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
      </div>
    </div>
  );
}
