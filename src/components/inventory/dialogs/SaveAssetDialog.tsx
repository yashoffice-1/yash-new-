
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Textarea } from '@/components/ui/forms/textarea';
import { Label } from '@/components/ui/forms/label';
import { Badge } from '@/components/ui/data_display/badge';
import { Save, X } from 'lucide-react';
import { useAssetLibrary } from '@/hooks/data/useAssetLibrary';
import { useToast } from '@/hooks/ui/use-toast';
import { validateAssetForSaving, prepareAssetData, handleSaveError } from '@/utils/assetSaving';
import { useTheme } from '@/contexts/ThemeContext';

interface SaveAssetDialogProps {
  asset: {
    id: string;
    type: 'image' | 'video' | 'content';
    url: string;
    instruction: string;
    content?: string;
    source_system?: string;
    channel?: string;
    inventoryId?: string;
  };
  trigger?: React.ReactNode;
  prefillData?: {
    title: string;
    description: string;
    tags: string[];
  };
}

export function SaveAssetDialog({ asset, trigger, prefillData }: SaveAssetDialogProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(prefillData?.title || '');
  const [description, setDescription] = useState(prefillData?.description || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(prefillData?.tags || []);
  
  const { saveToLibrary, isLoading } = useAssetLibrary();
  const { toast } = useToast();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && prefillData) {
      setTitle(prefillData.title);
      setDescription(prefillData.description);
      setTags(prefillData.tags);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      const assetData = prepareAssetData({
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        asset_type: asset.type,
        asset_url: asset.url,
        content: asset.content,
        instruction: asset.instruction,
        source_system: (asset.source_system || 'runway') as 'runway' | 'heygen' | 'openai',
        channel: asset.channel || 'social_media',
        inventoryId: asset.inventoryId,
      });

      const validation = validateAssetForSaving(assetData);
      if (!validation.isValid) {
        toast({
          title: "Cannot Save",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      await saveToLibrary(assetData);

      // Reset form and close dialog
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setOpen(false);
    } catch (error) {
      handleSaveError(error, 'asset');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save to Library
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`sm:max-w-[425px] ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Save to Asset Library</DialogTitle>
          <DialogDescription className={`${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Add this {asset.type} to your library with additional metadata for easy discovery.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className={`${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Title *</Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${
                theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className={`${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={`${
                theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
              }`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className={`${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Tags</Label>
            <div className="space-y-2">
              <Input
                id="tags"
                placeholder="Add tags (press Enter or comma to add)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className={`${
                  theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                }`}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className={`text-xs ${
                      theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
                    }`}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className={`ml-1 ${
                          theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className={`${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Asset Details</Label>
            <div className={`text-sm space-y-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <p><strong>Type:</strong> {asset.type}</p>
              <p><strong>Source:</strong> {asset.source_system || 'runway'}</p>
              {asset.channel && <p><strong>Platform:</strong> {asset.channel}</p>}
              {asset.inventoryId && <p><strong>Product ID:</strong> {asset.inventoryId}</p>}
              <p><strong>Instruction:</strong> {asset.instruction}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className={`${
              theme === 'dark' ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-gray-300 text-gray-900 hover:bg-gray-100'
            }`}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || isLoading}
            className={`${
              theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? 'Saving...' : 'Save to Library'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
