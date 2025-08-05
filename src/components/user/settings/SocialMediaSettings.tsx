
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/ui/use-toast";
import { useOAuth } from "@/hooks/auth/useOAuth";
import { Save, Share2, Facebook, Instagram, Linkedin, Youtube, Link, Unlink, ExternalLink } from "lucide-react";

interface SocialConnection {
  id: string;
  platform: string;
  platformUsername: string;
  platformEmail: string;
  isActive: boolean;
  createdAt: string;
}

export function SocialMediaSettings() {
  const { toast } = useToast();
  const { initiateYouTubeOAuth } = useOAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Fetch existing connections on component mount
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/social/connections', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectYouTube = async () => {
    setConnectingPlatform('youtube');
    const success = initiateYouTubeOAuth();
    if (!success) {
      setConnectingPlatform(null);
    }
  };

  const saveYouTubeConnection = async (oauthResult: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/social/youtube/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: oauthResult.accessToken,
          refreshToken: oauthResult.refreshToken,
          channelId: oauthResult.channelId,
          channelTitle: oauthResult.channelTitle,
          platformUserId: oauthResult.platformUserId,
          platformEmail: oauthResult.platformEmail
        })
      });
      
      if (response.ok) {
        // Refresh connections list
        fetchConnections();
      }
    } catch (error) {
      console.error('Error saving YouTube connection:', error);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/social/connections/${platform}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast({
          title: "Account Disconnected",
          description: `Your ${platform} account has been disconnected.`,
        });
        fetchConnections(); // Refresh connections
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Youtube className="h-4 w-4 text-red-600" />;
      case 'facebook': return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'linkedin': return <Linkedin className="h-4 w-4 text-blue-700" />;
      default: return <Share2 className="h-4 w-4" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'YouTube';
      case 'facebook': return 'Facebook';
      case 'instagram': return 'Instagram';
      case 'linkedin': return 'LinkedIn';
      default: return platform;
    }
  };

  const isConnected = (platform: string) => {
    return connections.some(conn => conn.platform === platform && conn.isActive);
  };

  const getConnection = (platform: string) => {
    return connections.find(conn => conn.platform === platform && conn.isActive);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Share2 className="h-5 w-5" />
          <span>Social Media Accounts</span>
        </CardTitle>
        <CardDescription>
          Connect your social media accounts to enable direct content uploads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Connected Accounts:</strong> You can now upload your generated videos directly to your connected social media accounts.
          </p>
        </div>

        {/* Connected Accounts Section */}
        {connections.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connected Accounts</h3>
            <div className="grid gap-4">
              {connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getPlatformIcon(connection.platform)}
                    <div>
                      <p className="font-medium">{getPlatformName(connection.platform)}</p>
                      <p className="text-sm text-gray-600">{connection.platformUsername}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Connected</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(connection.platform)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Platforms Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Platforms</h3>
          <div className="grid gap-4">
            {/* YouTube */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Youtube className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">YouTube</p>
                  <p className="text-sm text-gray-600">Upload videos to your YouTube channel</p>
                </div>
              </div>
              {isConnected('youtube') ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Connected</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect('youtube')}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleConnectYouTube}
                  disabled={connectingPlatform === 'youtube'}
                  className="flex items-center space-x-2"
                >
                  <Link className="h-4 w-4" />
                  <span>{connectingPlatform === 'youtube' ? 'Connecting...' : 'Connect YouTube'}</span>
                </Button>
              )}
            </div>

            {/* Facebook */}
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="flex items-center space-x-3">
                <Facebook className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Facebook</p>
                  <p className="text-sm text-gray-600">Post to your Facebook page</p>
                </div>
              </div>
              <Button disabled variant="outline" className="flex items-center space-x-2">
                <span>Coming Soon</span>
              </Button>
            </div>

            {/* Instagram */}
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="flex items-center space-x-3">
                <Instagram className="h-5 w-5 text-pink-600" />
                <div>
                  <p className="font-medium">Instagram</p>
                  <p className="text-sm text-gray-600">Share to your Instagram account</p>
                </div>
              </div>
              <Button disabled variant="outline" className="flex items-center space-x-2">
                <span>Coming Soon</span>
              </Button>
            </div>

            {/* LinkedIn */}
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="flex items-center space-x-3">
                <Linkedin className="h-5 w-5 text-blue-700" />
                <div>
                  <p className="font-medium">LinkedIn</p>
                  <p className="text-sm text-gray-600">Post to your LinkedIn profile</p>
                </div>
              </div>
              <Button disabled variant="outline" className="flex items-center space-x-2">
                <span>Coming Soon</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
