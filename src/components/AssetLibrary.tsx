
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Download, Copy, Trash2, Search, AlertCircle } from 'lucide-react';
import { useAssetLibrary, AssetLibraryItem } from '@/hooks/useAssetLibrary';
import { useToast } from '@/hooks/use-toast';

export function AssetLibrary() {
  const [assets, setAssets] = useState<AssetLibraryItem[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetLibraryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  const { getLibraryAssets, toggleFavorite, deleteFromLibrary, isLoading } = useAssetLibrary();
  const { toast } = useToast();

  const loadAssets = async () => {
    const data = await getLibraryAssets();
    console.log('Loaded assets from library:', data);
    setAssets(data);
    setFilteredAssets(data);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    let filtered = assets;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => asset.asset_type === selectedType);
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(asset => asset.favorited);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.title.toLowerCase().includes(search) ||
        asset.description?.toLowerCase().includes(search) ||
        asset.instruction.toLowerCase().includes(search) ||
        asset.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    setFilteredAssets(filtered);
  }, [assets, selectedType, showFavoritesOnly, searchTerm]);

  const handleToggleFavorite = async (id: string, currentFavorited: boolean) => {
    await toggleFavorite(id, !currentFavorited);
    // Update local state
    setAssets(assets.map(asset => 
      asset.id === id ? { ...asset, favorited: !currentFavorited } : asset
    ));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this asset from your library?')) {
      await deleteFromLibrary(id);
      setAssets(assets.filter(asset => asset.id !== id));
    }
  };

  const handleDownload = (asset: AssetLibraryItem) => {
    if (asset.asset_url && asset.asset_type !== 'content') {
      const link = document.createElement('a');
      link.href = asset.asset_url;
      link.download = `${asset.title}-${asset.asset_type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${asset.title}...`,
      });
    }
  };

  const handleCopyContent = async (content: string, title: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Content Copied",
        description: `${title} content copied to clipboard!`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const assetCounts = {
    all: assets.length,
    image: assets.filter(a => a.asset_type === 'image').length,
    video: assets.filter(a => a.asset_type === 'video').length,
    content: assets.filter(a => a.asset_type === 'content').length,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Asset Library</h2>
        <p className="text-muted-foreground">Manage and organize your saved AI-generated assets</p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search assets by title, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className="flex items-center space-x-2"
        >
          <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          <span>Favorites Only</span>
        </Button>
      </div>

      {/* Asset Type Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({assetCounts.all})</TabsTrigger>
          <TabsTrigger value="image">Images ({assetCounts.image})</TabsTrigger>
          <TabsTrigger value="video">Videos ({assetCounts.video})</TabsTrigger>
          <TabsTrigger value="content">Content ({assetCounts.content})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchTerm || showFavoritesOnly || selectedType !== 'all' ? 
                  'No assets match your current filters.' : 
                  'No assets in your library yet. Generate some content and save them to get started!'
                }
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 mr-2">
                        <CardTitle className="text-lg line-clamp-1">{asset.title}</CardTitle>
                        {asset.description && (
                          <CardDescription className="line-clamp-2">{asset.description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(asset.id, asset.favorited)}
                      >
                        <Heart className={`h-4 w-4 ${asset.favorited ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {asset.asset_type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {asset.source_system.toUpperCase()}
                      </Badge>
                      {asset.tags?.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Asset Preview */}
                    {asset.asset_type === 'image' && asset.asset_url && (
                      <div className="aspect-video bg-gray-100 rounded overflow-hidden relative">
                        <img 
                          src={asset.asset_url} 
                          alt={asset.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image failed to load:', asset.asset_url);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // Show error message
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'w-full h-full flex items-center justify-center bg-red-50 text-red-600 text-sm p-4';
                            errorDiv.innerHTML = `
                              <div class="text-center">
                                <div class="flex items-center justify-center mb-2">
                                  <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p class="font-medium">Image failed to load</p>
                                <p class="text-xs mt-1">This asset may need to be re-generated</p>
                              </div>
                            `;
                            target.parentElement?.appendChild(errorDiv);
                          }}
                        />
                      </div>
                    )}

                    {asset.asset_type === 'video' && asset.asset_url && (
                      <div className="aspect-video bg-black rounded overflow-hidden">
                        <video 
                          src={asset.asset_url} 
                          className="w-full h-full object-contain"
                          controls
                          onError={(e) => {
                            console.error('Video failed to load:', asset.asset_url);
                          }}
                        />
                      </div>
                    )}

                    {asset.asset_type === 'content' && asset.content && (
                      <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                        <p className="whitespace-pre-wrap line-clamp-4">{asset.content}</p>
                      </div>
                    )}

                    {/* Instruction */}
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 mb-1">Original Instruction:</p>
                      <p className="text-gray-600 text-xs bg-gray-50 p-2 rounded line-clamp-2">
                        {asset.instruction}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </span>
                      
                      <div className="flex space-x-1">
                        {asset.asset_type === 'content' && asset.content ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyContent(asset.content!, asset.title)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(asset)}
                            disabled={!asset.asset_url}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(asset.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
