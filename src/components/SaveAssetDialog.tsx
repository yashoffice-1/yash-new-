
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, X } from 'lucide-react';
import { useAssetLibrary } from '@/hooks/useAssetLibrary';

interface SaveAssetDialogProps {
  asset: {
    id: string;
    type: 'image' | 'video' | 'content';
    url: string;
    instruction: string;
    content?: string;
    source_system?: string;
  };
  trigger?: React.ReactNode;
  prefillData?: {
    title: string;
    description: string;
    tags: string[];
  };
}

export function SaveAssetDialog({ asset, trigger, prefillData }: SaveAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(prefillData?.title || '');
  const [description, setDescription] = useState(prefillData?.description || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(prefillData?.tags || []);
  
  const { saveToLibrary, isLoading } = useAssetLibrary();

  // Update state when prefillData changes or dialog opens
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

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    try {
      await saveToLibrary({
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        asset_type: asset.type,
        asset_url: asset.url,
        content: asset.content,
        instruction: asset.instruction,
        source_system: (asset.source_system || 'runway') as 'runway' | 'heygen' | 'openai',
        // Only include original_asset_id if it's a valid UUID
        original_asset_id: isValidUUID(asset.id) ? asset.id : undefined,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setOpen(false);
    } catch (error) {
      // Error handling is done in the hook
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save to Asset Library</DialogTitle>
          <DialogDescription>
            Add this {asset.type} to your library with additional metadata for easy discovery.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="space-y-2">
              <Input
                id="tags"
                placeholder="Add tags (press Enter or comma to add)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
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
            <Label>Asset Details</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Type:</strong> {asset.type}</p>
              <p><strong>Source:</strong> {asset.source_system || 'runway'}</p>
              <p><strong>Instruction:</strong> {asset.instruction}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save to Library'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
