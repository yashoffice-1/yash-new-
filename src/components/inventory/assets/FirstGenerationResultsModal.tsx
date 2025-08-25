import React, { useState } from 'react';
import { Button } from "@/components/ui/forms/button";
import { Badge } from "@/components/ui/data_display/badge";
import { CheckCircle, RefreshCw, FileText, Download, Save, X, ExternalLink } from "lucide-react";
import { useGeneration } from "@/contexts/GenerationContext";
import { useToast } from "@/hooks/ui/use-toast";
import { useAssetLibrary } from "@/hooks/data/useAssetLibrary";
import { useTheme } from "@/contexts/ThemeContext";
import { GeneratedAsset } from "@/types/inventory";

export function FirstGenerationResultsModal() {
  const { globalGenerationResults, showFirstModal, setShowFirstModal, clearGenerationResults } = useGeneration();
  const { toast } = useToast();
  const { saveToLibrary } = useAssetLibrary();
  const { theme } = useTheme();
  const [savingAssets, setSavingAssets] = useState<Set<string>>(new Set());
  const [isSavingAll, setIsSavingAll] = useState(false);

  const handleClose = () => {
    setShowFirstModal(false);
  };

  const handleSaveIndividual = async (result: GeneratedAsset) => {
    if (!result.id || savingAssets.has(result.id) || isSavingAll) return;

    try {
      setSavingAssets(prev => new Set(prev).add(result.id!));

      await saveToLibrary({
        title: result.title || `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} - ${result.instruction.substring(0, 50)}...`,
        description: result.description || result.instruction,
        tags: [result.type, result.source_system || 'unknown', result.platform || 'social_media'],
        asset_type: result.type as 'image' | 'video' | 'content',
        asset_url: result.url || result.asset_url || '',
        content: result.content,
        instruction: result.instruction,
        source_system: result.source_system as 'runway' | 'heygen' | 'openai',
        channel: result.platform || result.channel || 'social_media',
        inventoryId: result.inventoryId || result.product?.id // Use direct inventoryId with fallback
      });

      toast({
        title: "Asset Saved",
        description: `${result.title || 'Asset'} saved to library successfully!`,
      });
    } catch (error) {
      console.error('Error saving asset:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save the asset. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.id!);
        return newSet;
      });
    }
  };

  const handleSaveAll = async () => {
    if (isSavingAll) return;

    try {
      setIsSavingAll(true);
      
      for (const result of globalGenerationResults) {
        await saveToLibrary({
          title: result.title || `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} - ${result.instruction.substring(0, 50)}...`,
          description: result.description || result.instruction,
          tags: [result.type, result.source_system || 'unknown', result.platform || 'social_media'],
          asset_type: result.type as 'image' | 'video' | 'content',
          asset_url: result.url || result.asset_url || '',
          content: result.content,
          instruction: result.instruction,
          source_system: result.source_system as 'runway' | 'heygen' | 'openai',
          channel: result.platform || result.channel || 'social_media',
          inventoryId: result.inventoryId || result.product?.id // Use direct inventoryId with fallback
        });
      }
      
      toast({
        title: "All Assets Saved",
        description: `${globalGenerationResults.length} asset(s) saved to library successfully!`,
      });
      
      clearGenerationResults();
      setShowFirstModal(false);
    } catch (error) {
      console.error('Error saving all assets:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save some assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleClearAll = () => {
    clearGenerationResults();
    setShowFirstModal(false);
    toast({
      title: "Results Cleared",
      description: "All generation results have been cleared.",
    });
  };

  const handleDownload = async (result: GeneratedAsset) => {
    try {
      const assetUrl = result.url || result.asset_url;
      if (assetUrl && !assetUrl.startsWith('pending_')) {
        const response = await fetch(assetUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch asset');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        let extension = '.png';
        const contentType = blob.type;
        if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
        else if (contentType.includes('webp')) extension = '.webp';
        else if (contentType.includes('mp4')) extension = '.mp4';
        else if (contentType.includes('webm')) extension = '.webm';
        
        const fileName = `${(result.title || result.instruction).replace(/[^a-zA-Z0-9]/g, '_')}${extension}`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download Started",
          description: `Asset downloaded as ${fileName}`,
        });
      } else if (result.content) {
        // For content assets
        const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const fileName = `${(result.title || result.instruction).replace(/[^a-zA-Z0-9]/g, '_')}-content.txt`;
        
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

  if (!showFirstModal || globalGenerationResults.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-300">
      <div className={`rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4 sm:p-6 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          </div>

          <div className="relative flex justify-between items-start sm:items-center">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-2xl font-bold flex items-center">
                <div className="relative">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                </div>
                <span className="truncate">Generation Results</span>
              </h3>
              <p className="text-green-100 mt-1 text-sm sm:text-base">
                {globalGenerationResults.length} result{globalGenerationResults.length > 1 ? 's' : ''} generated successfully
              </p>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 ml-2 flex-shrink-0 transition-all duration-200 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin ${
          theme === 'dark'
            ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800'
            : 'scrollbar-thumb-gray-300 scrollbar-track-gray-100'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {globalGenerationResults.map((result, index) => {
              const assetUrl = result.url || result.asset_url;
              const isPending = assetUrl && assetUrl.startsWith('pending_');
              const isFailed = result.status === 'failed';
              const isSaving = result.id ? savingAssets.has(result.id) : false;
              
              return (
                <div key={result.id || index} className={`border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  {/* Asset Preview */}
                  <div className={`relative aspect-video ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {isPending ? (
                      // Show loading state for pending assets
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
                        <div className="text-center">
                          <RefreshCw className="h-12 w-12 text-orange-500 animate-spin" />
                          <p className="text-sm text-orange-600 mt-2">Processing...</p>
                        </div>
                      </div>
                    ) : result.type === 'image' && assetUrl ? (
                      <img 
                        src={assetUrl} 
                        alt={result.instruction}
                        className="w-full h-full object-cover"
                      />
                    ) : result.type === 'video' && assetUrl ? (
                      <video 
                        src={assetUrl} 
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : result.type === 'content' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                        <FileText className="h-12 w-12 text-blue-500" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    
                                         {/* Source System Badge */}
                     <div className="absolute top-2 left-2">
                       <Badge variant="secondary" className={`${
                         theme === 'dark'
                           ? 'bg-gray-800/90 text-gray-200 border-gray-600'
                           : 'bg-white/90 text-gray-700'
                       }`}>
                         {result.source_system || 'unknown'}
                       </Badge>
                     </div>
                    
                                         {/* Platform Badge */}
                     {result.platform && (
                       <div className="absolute top-2 left-2 mt-8">
                         <Badge variant="outline" className={`text-xs ${
                           theme === 'dark'
                             ? 'bg-gray-800/90 text-gray-200 border-gray-600'
                             : 'bg-white/90 text-gray-700'
                         }`}>
                           {result.platform}
                         </Badge>
                       </div>
                     )}
                    
                                         {/* Status Badge */}
                     {result.status && (
                       <div className="absolute top-2 right-2">
                         <Badge 
                           variant={result.status === 'failed' ? 'destructive' : 'secondary'} 
                           className={`${
                             theme === 'dark'
                               ? 'bg-gray-800/90 text-gray-200 border-gray-600'
                               : 'bg-white/90 text-gray-700'
                           }`}
                         >
                           {result.status}
                         </Badge>
                       </div>
                     )}
                  </div>

                  {/* Content Details */}
                  <div className="p-4">
                    <h4 className={`font-semibold mb-2 line-clamp-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {result.title || `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} - ${result.instruction.substring(0, 50)}...`}
                    </h4>
                    
                    {result.description && (
                      <p className={`text-sm mb-3 line-clamp-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>{result.description}</p>
                    )}
                    
                    {result.type === 'content' && result.content && (
                      <div className={`text-sm mb-3 line-clamp-3 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {result.content}
                      </div>
                    )}
                    
                                         {/* Product Info */}
                     {result.product && (
                       <div className="flex items-center space-x-2 mb-3">
                         <Badge variant="outline" className={`text-xs ${
                           theme === 'dark'
                             ? 'border-gray-600 text-gray-300'
                             : 'border-gray-300 text-gray-700'
                         }`}>
                           {result.product.category || 'Uncategorized'}
                         </Badge>
                         {result.format && (
                           <Badge variant="outline" className={`text-xs ${
                             theme === 'dark'
                               ? 'border-gray-600 text-gray-300'
                               : 'border-gray-300 text-gray-700'
                           }`}>
                             {result.format}
                           </Badge>
                         )}
                       </div>
                     )}
                    
                    <div className={`text-xs mb-3 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Generated: {result.timestamp?.toLocaleString() || 'Unknown'}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveIndividual(result)}
                        size="sm"
                        disabled={isPending || isFailed || isSaving || !result.id || isSavingAll}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {isPending ? 'Processing...' : 
                         isSaving ? 'Saving...' : 
                         isSavingAll ? 'Save All in Progress...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(result)}
                        disabled={!assetUrl && !result.content || isSavingAll}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      {assetUrl && !isPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(assetUrl, '_blank')}
                          disabled={isSavingAll}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with Save All and Clear All buttons */}
        <div className={`border-t p-4 flex justify-between items-center ${
          theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className={`text-sm ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {isSavingAll ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Saving all assets to library...</span>
              </div>
            ) : (
              `${globalGenerationResults.length} result${globalGenerationResults.length === 1 ? '' : 's'} ready`
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClearAll}
              className={`${
                theme === 'dark'
                  ? 'border-red-500 text-red-400 hover:bg-red-900/20'
                  : 'border-red-300 text-red-600 hover:bg-red-50'
              }`}
              disabled={isSavingAll}
            >
              Clear All
            </Button>
            <Button
              onClick={handleSaveAll}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isSavingAll}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSavingAll ? 'Saving...' : 'Save All to Library'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
