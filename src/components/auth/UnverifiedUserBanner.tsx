import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/ui/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail } from 'lucide-react';

export function UnverifiedUserBanner() {
  const { user, resendVerification } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  if (!user || user.emailVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const result = await resendVerification(user.email);
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email Sent",
          description: "Verification email has been sent. Please check your inbox.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-800">
                Please verify your email address to access all features
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                <Mail className="h-4 w-4 mr-1" />
                {isResending ? 'Sending...' : 'Resend Email'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 