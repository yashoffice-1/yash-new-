import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { CheckCircle, XCircle, Mail, ArrowLeft, Loader2 } from 'lucide-react';

export function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resendVerification } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'form'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('form');
      setMessage('Please enter your email address to resend the verification email.');
    }
    // eslint-disable-next-line
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage(result.message || 'Email verified successfully!');
        if (result.data?.token) {
          localStorage.setItem('token', result.data.token);
          localStorage.setItem('user', JSON.stringify(result.data.user));
          toast({
            title: "Success!",
            description: "Your email has been verified. Welcome!",
          });
        }
      } else {
        setStatus('error');
        setMessage(result.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    setIsResending(true);
    try {
      const result = await resendVerification(email);
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
        setMessage('Verification email sent! Please check your inbox and spam folder.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center justify-center py-8">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="ml-2">Verifying your email...</span>
          </div>
        );
      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-600 mb-2">Email Verified!</h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center py-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Verification Failed</h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Button onClick={() => setStatus('form')}>Resend Verification Email</Button>
              <Button variant="outline" onClick={() => navigate('/auth/signin')}>
                Back to Sign In
              </Button>
            </div>
          </div>
        );
      case 'form':
        return (
          <div className="py-8">
            <div className="text-center mb-6">
              <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Resend Verification Email</h3>
              <p className="text-gray-600">{message}</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
              </div>
              <Button onClick={handleResend} disabled={isResending} className="w-full">
                {isResending ? (
                  <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth/signin')} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Email Verification</h2>
          <p className="mt-2 text-sm text-gray-600">
            Verify your email address to complete your registration
          </p>
        </div>
        <Card>
          <CardContent className="p-6">{renderContent()}</CardContent>
        </Card>
      </div>
    </div>
  );
} 