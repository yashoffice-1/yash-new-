import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data_display/badge';
import { Download, Save, X, Package, FileText, Video, Image } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import { useGeneration } from '@/contexts/GenerationContext';
import { useAssetLibrary } from '@/hooks/data/useAssetLibrary';
import { GeneratedAsset } from '@/types/inventory';

export function GlobalGenerationResultsModal() {
  const { 
    globalGenerationResults, 
    showGlobalResultsModal, 
    setShowGlobalResultsModal,
    removeGenerationResult 
  } = useGeneration();
  const { toast } = useToast();
  const { saveToLibrary, isLoading } = useAssetLibrary();
  const [savingAssets, setSavingAssets] = useState<Set<string>>(new Set());

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
      if (lowerInstruction.includes('google ads')) return 'google-ads';
      return 'social_media';
    }
    
    // For visual assets, try to extract from instruction or default to social_media
    const lowerInstruction = instruction.toLowerCase();
    if (lowerInstruction.includes('facebook') || lowerInstruction.includes('fb')) return 'facebook';
    if (lowerInstruction.includes('instagram') || lowerInstruction.includes('ig')) return 'instagram';
    if (lowerInstruction.includes('linkedin') || lowerInstruction.includes('li')) return 'linkedin';
    if (lowerInstruction.includes('twitter') || lowerInstruction.includes('x')) return 'twitter';
    if (lowerInstruction.includes('tiktok')) return 'tiktok';
    if (lowerInstruction.includes('youtube')) return 'youtube';
    if (lowerInstruction.includes('google ads')) return 'google-ads';
    if (lowerInstruction.includes('pinterest')) return 'pinterest';
    return 'social_media';
  };

  const handleClose = () => {
    setShowGlobalResultsModal(false);
  };

  const handleDownload = (asset: GeneratedAsset) => {
    if (asset.url && asset.url.trim() !== '' && asset.url !== 'undefined') {
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
    } else if (asset.content) {
      const blob = new Blob([asset.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `content-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Content download initiated.",
      });
    }
  };

  const handleSaveToLibrary = async (asset: GeneratedAsset) => {
    if (savingAssets.has(asset.id)) return; // Prevent duplicate saves
    
    setSavingAssets(prev => new Set(prev).add(asset.id));
    
    try {
      // Prepare asset data for saving
      const assetData = {
        title: `${asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} - ${new Date(asset.timestamp).toLocaleDateString()}`,
        description: asset.instruction || `Generated ${asset.type} asset`,
        tags: [asset.type, asset.source_system || 'ai'],
        asset_type: asset.type as 'image' | 'video' | 'content',
        asset_url: asset.url || '',
        content: asset.content,
        instruction: asset.instruction,
        source_system: (asset.source_system as 'runway' | 'heygen' | 'openai') || 'openai',
        channel: getChannelFromContent(asset.type, asset.instruction),
      };

      await saveToLibrary(assetData);
      
      toast({
        title: "Success",
        description: `${asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} saved to library successfully!`,
      });
      
      // Remove from global results after successful save
      removeGenerationResult(asset.id);
      
    } catch (error) {
      console.error('Error saving asset to library:', error);
      toast({
        title: "Error",
        description: "Failed to save asset to library. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset.id);
        return newSet;
      });
    }
  };

  const handleRemove = (assetId: string) => {
    removeGenerationResult(assetId);
    toast({
      title: "Removed",
      description: "Generation result removed.",
    });
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'content':
        return <FileText className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const renderAssetContent = (asset: GeneratedAsset) => {
    if (asset.type === 'content' && asset.content) {
      return (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-40 overflow-y-auto">
            {asset.content}
          </div>
        </div>
      );
    } else if (asset.url && asset.url.trim() !== '' && asset.url !== 'undefined') {
      if (asset.type === 'image') {
        return (
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <img 
              src={asset.url} 
              alt={asset.type}
              className="w-full h-full object-cover"
            />
          </div>
        );
      } else if (asset.type === 'video') {
        return (
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <video 
              src={asset.url} 
              className="w-full h-full object-cover"
              controls
            />
          </div>
        );
      }
    }
    
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
        <Package className="h-8 w-8 text-gray-400" />
      </div>
    );
  };

  return (
    <Dialog open={showGlobalResultsModal} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Generation Results
              {globalGenerationResults.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({globalGenerationResults.length})
                </span>
              )}
            </span>
            <div className="flex items-center space-x-2">
              {globalGenerationResults.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      globalGenerationResults.forEach(asset => handleSaveToLibrary(asset));
                    }}
                    disabled={isLoading || savingAssets.size > 0}
                    className="flex items-center space-x-1"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save All</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      globalGenerationResults.forEach(asset => removeGenerationResult(asset.id));
                    }}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    <span>Clear All</span>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {globalGenerationResults.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Generation Results</h3>
              <p className="text-gray-500">Generate content to see results here.</p>
            </div>
          ) : (
            globalGenerationResults.map((asset) => (
              <div key={asset.id} className="border rounded-lg p-4 space-y-3">
                {/* Asset Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getAssetIcon(asset.type)}
                    <h4 className="font-medium">Generated {asset.type}</h4>
                    <Badge variant="outline" className="text-xs">
                      {asset.source_system}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(asset.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Asset Content */}
                {renderAssetContent(asset)}

                {/* Asset Info */}
                {asset.instruction && (
                  <div className="text-sm text-gray-600">
                    <strong>Instruction:</strong> {asset.instruction}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleDownload(asset)}
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleSaveToLibrary(asset)}
                    size="sm"
                    className="flex items-center space-x-1 relative"
                    disabled={savingAssets.has(asset.id)}
                  >
                    <Save className="h-4 w-4" />
                    <span>{savingAssets.has(asset.id) ? 'Saving...' : 'Save to Library'}</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
