
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Check, X, ExternalLink } from "lucide-react";

interface ApiKeyStatus {
  name: string;
  configured: boolean;
  testing?: boolean;
  lastTested?: Date;
  error?: string;
}

const API_KEYS = [
  {
    name: 'RUNWAYML_API_KEY',
    label: 'RunwayML API Key',
    description: 'For image and video generation',
    docsUrl: 'https://app.runwayml.com/account/keys'
  },
  {
    name: 'OPENAI_API_KEY', 
    label: 'OpenAI API Key',
    description: 'For instruction cleaning and content generation',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  {
    name: 'HEYGEN_API_KEY',
    label: 'HeyGen API Key', 
    description: 'For video generation (alternative to RunwayML)',
    docsUrl: 'https://docs.heygen.com/docs/api-key'
  }
];

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyStatuses, setKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkApiKeyStatuses();
  }, []);

  const checkApiKeyStatuses = async () => {
    setIsLoading(true);
    const statuses: ApiKeyStatus[] = [];

    for (const key of API_KEYS) {
      try {
        // Test each API key by making a simple request
        const { data, error } = await supabase.functions.invoke('test-api-key', {
          body: { keyName: key.name }
        });

        statuses.push({
          name: key.name,
          configured: !error && data?.configured,
          error: error?.message || data?.error
        });
      } catch (error) {
        statuses.push({
          name: key.name,
          configured: false,
          error: 'Failed to check status'
        });
      }
    }

    setKeyStatuses(statuses);
    setIsLoading(false);
  };

  const handleKeyChange = (keyName: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [keyName]: value }));
  };

  const toggleShowKey = (keyName: string) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const saveApiKey = async (keyName: string) => {
    const value = apiKeys[keyName];
    if (!value?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('update-api-key', {
        body: { keyName, keyValue: value.trim() }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${keyName} has been updated successfully`,
      });

      // Clear the input and refresh statuses
      setApiKeys(prev => ({ ...prev, [keyName]: '' }));
      await checkApiKeyStatuses();
    } catch (error) {
      toast({
        title: "Error", 
        description: error.message || "Failed to save API key",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: ApiKeyStatus) => {
    if (status.configured) {
      return <Badge className="bg-green-100 text-green-800">Configured</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Not Configured</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">API Key Management</h3>
          <p className="text-sm text-muted-foreground">Configure API keys for external services</p>
        </div>
        <Button onClick={checkApiKeyStatuses} disabled={isLoading} variant="outline">
          {isLoading ? "Checking..." : "Refresh Status"}
        </Button>
      </div>

      <div className="grid gap-4">
        {API_KEYS.map((key) => {
          const status = keyStatuses.find(s => s.name === key.name);
          return (
            <Card key={key.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{key.label}</CardTitle>
                    <CardDescription>{key.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status && getStatusBadge(status)}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(key.docsUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={key.name}>API Key</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        id={key.name}
                        type={showKeys[key.name] ? "text" : "password"}
                        placeholder="Enter your API key..."
                        value={apiKeys[key.name] || ''}
                        onChange={(e) => handleKeyChange(key.name, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => toggleShowKey(key.name)}
                      >
                        {showKeys[key.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      onClick={() => saveApiKey(key.name)}
                      disabled={!apiKeys[key.name]?.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>

                {status?.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <strong>Error:</strong> {status.error}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>Current status of all API integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {keyStatuses.map((status) => (
              <div key={status.name} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <span className="font-medium">{status.name}</span>
                <div className="flex items-center space-x-2">
                  {status.configured ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  {getStatusBadge(status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
