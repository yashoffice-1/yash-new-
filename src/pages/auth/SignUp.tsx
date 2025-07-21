import React from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function SignUp() {
  return (
    <AuthLayout
      title="Create your account"
      description="Get started with your free account"
    >
      <SignUpForm />
    </AuthLayout>
  );
} 