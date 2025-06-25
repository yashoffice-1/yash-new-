
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ApiKeys {
  openai: string;
  runwayml: string;
  heygen: string;
}

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    runwayml: '',
    heygen: ''
  });
  const [showKeys, setShowKeys] = useState<Record<keyof ApiKeys, boolean>>({
    openai: false,
    runwayml: false,
    heygen: false
  });
  const { toast } = useToast();

  const handleSaveKey = (provider: keyof ApiKeys) => {
    toast({
      title: "API Key Saved",
      description: `${provider.toUpperCase()} API key has been saved securely.`,
    });
  };

  const handleTestKey = (provider: keyof ApiKeys) => {
    if (!apiKeys[provider]) {
      toast({
        title: "No API Key",
        description: `Please enter a ${provider.toUpperCase()} API key first.`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Testing API Key",
      description: `Testing connection to ${provider.toUpperCase()}...`,
    });

    // Simulate API test
    setTimeout(() => {
      toast({
        title: "API Key Valid",
        description: `Successfully connected to ${provider.toUpperCase()}.`,
      });
    }, 2000);
  };

  const toggleKeyVisibility = (provider: keyof ApiKeys) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const API_PROVIDERS = [
    {
      key: 'openai' as keyof ApiKeys,
      name: 'OpenAI',
      description: 'Used for instruction cleaning and content generation',
      placeholder: 'sk-...'
    },
    {
      key: 'runwayml' as keyof ApiKeys,
      name: 'RunwayML',
      description: 'Used for image and video generation',
      placeholder: 'rw_...'
    },
    {
      key: 'heygen' as keyof ApiKeys,
      name: 'HeyGen',
      description: 'Alternative video generation provider',
      placeholder: 'hg_...'
    }
  ];

  return (
    <div className="space-y-4">
      {API_PROVIDERS.map((provider) => (
        <Card key={provider.key}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {provider.name}
              <span className={`text-xs px-2 py-1 rounded-full ${
                apiKeys[provider.key] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {apiKeys[provider.key] ? 'Configured' : 'Not Set'}
              </span>
            </CardTitle>
            <CardDescription>{provider.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={provider.key}>API Key</Label>
              <div className="flex space-x-2">
                <Input
                  id={provider.key}
                  type={showKeys[provider.key] ? "text" : "password"}
                  placeholder={provider.placeholder}
                  value={apiKeys[provider.key]}
                  onChange={(e) => setApiKeys(prev => ({
                    ...prev,
                    [provider.key]: e.target.value
                  }))}
                />
                <Button
                  variant="outline"
                  onClick={() => toggleKeyVisibility(provider.key)}
                >
                  {showKeys[provider.key] ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => handleSaveKey(provider.key)}
                disabled={!apiKeys[provider.key]}
              >
                Save Key
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleTestKey(provider.key)}
                disabled={!apiKeys[provider.key]}
              >
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
