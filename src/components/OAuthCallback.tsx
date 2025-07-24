import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOAuth } from '@/hooks/useOAuth';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, CheckCircle, XCircle } from 'lucide-react';

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useOAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authorization...');

  useEffect(() => {
    const processOAuth = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage('Authorization was cancelled or failed.');
          toast({
            title: "Authorization Failed",
            description: "The authorization process was cancelled or failed.",
            variant: "destructive"
          });
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Invalid authorization response.');
          toast({
            title: "Invalid Authorization",
            description: "Missing authorization code or state.",
            variant: "destructive"
          });
          return;
        }

        // Process the OAuth callback
        const success = await handleOAuthCallback();
        
        if (success) {
          setStatus('success');
          setMessage('Successfully connected! Redirecting...');
          
          // Get the return URL and tab state from sessionStorage
          const returnUrl = sessionStorage.getItem('youtube_oauth_return') || '/dashboard';
          const tabState = sessionStorage.getItem('youtube_oauth_tab') || 'social';
          
          // Clean up sessionStorage
          sessionStorage.removeItem('youtube_oauth_return');
          sessionStorage.removeItem('youtube_oauth_tab');
          
          // Redirect after a short delay to show success message
          setTimeout(() => {
            // Parse the return URL to extract path and query parameters
            const returnUrlObj = new URL(returnUrl, window.location.origin);
            const path = returnUrlObj.pathname;
            const search = returnUrlObj.search;
            
            // Navigate to the exact return URL with query parameters
            navigate(path + search, { replace: true });
            
            // Set the tab state in localStorage for the main app to pick up
            localStorage.setItem('activeTab', tabState);
          }, 1500);
        } else {
          setStatus('error');
          setMessage('Failed to complete the connection.');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred.');
        toast({
          title: "Connection Error",
          description: "An unexpected error occurred during the connection process.",
          variant: "destructive"
        });
      }
    };

    processOAuth();
  }, [searchParams, handleOAuthCallback, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
           <span>
              {status === 'loading' && 'Connecting...'}
              {status === 'success' && 'Connected!'}
              {status === 'error' && 'Connection Failed'}
            </span>
          </CardTitle>
         <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'error' && (
            <button
              onClick={() => {
                const returnUrl = sessionStorage.getItem('youtube_oauth_return') || '/dashboard';
                const returnUrlObj = new URL(returnUrl, window.location.origin);
                const path = returnUrlObj.pathname;
                const search = returnUrlObj.search;
                navigate(path + search, { replace: true });
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Return to Dashboard
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 