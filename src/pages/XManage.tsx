import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

export function XManage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          throw new Error(`Authorization failed: ${errorParam}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('User not authenticated');
        }

        // Call the callback function
        const { data, error } = await supabase.functions.invoke('twitter-oauth-callback', {
          body: { 
            userId: user.id,
            code,
            state 
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        setSuccess(true);
        toast({
          title: "Twitter Connected Successfully",
          description: `Connected to @${data.username}`,
        });

        // Redirect back to social profiles after a delay
        setTimeout(() => {
          window.location.href = '/?tab=social';
        }, 3000);

      } catch (err: any) {
        console.error('Twitter OAuth callback error:', err);
        setError(err.message);
        toast({
          title: "Connection Failed",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Twitter Connection</CardTitle>
          <CardDescription>
            Processing your Twitter authorization...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isProcessing && (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Connecting your Twitter account...
              </p>
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm text-green-600">
                Twitter connected successfully! Redirecting...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600">
                {error}
              </p>
              <a 
                href="/?tab=social" 
                className="text-sm text-primary hover:underline"
              >
                Return to Social Profiles
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}