import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/forms/button';
import { Loader2, CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function ShopifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [shopDomain, setShopDomain] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const shop = searchParams.get('shop');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`Shopify OAuth error: ${error}`);
        }

        if (!code || !shop) {
          throw new Error('Missing required parameters from Shopify OAuth callback');
        }

        setShopDomain(shop);

        // Get the auth token from localStorage
        const authToken = localStorage.getItem('auth_token');
        
        if (!authToken) {
          throw new Error('No authentication token found');
        }

        // Complete the OAuth flow by calling the backend
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/shopify/auth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            code,
            shop,
            state,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(`Successfully connected to ${shop}!`);
          
          toast({
            title: "Shopify Connected",
            description: `Your store ${shop} has been successfully connected.`,
          });

          // Redirect to inventory page after a short delay
          setTimeout(() => {
            navigate('/inventory');
          }, 2000);
        } else {
          throw new Error(data.error || 'Failed to complete Shopify authentication');
        }
      } catch (error: any) {
        console.error('Shopify callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An unexpected error occurred');
        
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to Shopify. Please try again.",
          variant: "destructive",
        });
      }
    };

    // Check if user is authenticated by checking both user object and token
    const authToken = localStorage.getItem('auth_token');
    if (user && authToken) {
      handleCallback();
    } else {
      setStatus('error');
      setMessage('User not authenticated. Please sign in and try again.');
    }
  }, [searchParams, user, navigate, toast]);

  const handleRetry = () => {
    navigate('/inventory');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <ShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="mt-6 text-2xl font-bold text-gray-900">
              Shopify Integration
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Connecting to your Shopify store...'}
              {status === 'success' && 'Successfully connected!'}
              {status === 'error' && 'Connection failed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              {status === 'loading' && (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <p className="text-sm text-gray-600 text-center">
                    Please wait while we establish the connection with your Shopify store...
                  </p>
                </>
              )}
              
              {status === 'success' && (
                <>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {message}
                    </p>
                    {shopDomain && (
                      <p className="text-xs text-gray-500 mt-1">
                        Store: {shopDomain}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Redirecting to inventory page...
                    </p>
                  </div>
                </>
              )}
              
              {status === 'error' && (
                <>
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-900 mb-4">
                      {message}
                    </p>
                    <Button onClick={handleRetry} className="w-full">
                      Return to Inventory
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}