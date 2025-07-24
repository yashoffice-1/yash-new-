import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';

const router = Router();

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Helper function to generate initials
const generateInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
};

// Helper function to generate verification token
const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Sign up endpoint with email verification
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = signUpSchema.parse(req.body);

    // Check if user already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { email }
    });

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create profile in database (unverified)
    const initials = generateInitials(firstName, lastName);
    const profile = await prisma.profile.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        initials,
        status: 'pending', // Start as pending until email is verified
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      }
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, firstName, verificationToken);

    if (!emailSent) {
      // If email fails, delete the profile and return error
      await prisma.profile.delete({
        where: { id: profile.id }
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          initials: profile.initials,
          emailVerified: profile.emailVerified,
          status: profile.status,
          createdAt: profile.createdAt.toISOString(),
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Verify email endpoint
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);

    // Find profile with this verification token
    const profile = await prisma.profile.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    });

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    // Update profile to verified
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        emailVerified: true,
        status: 'verified',
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }
    });

    // Generate JWT token for automatic login
    const jwtToken = jwt.sign(
      { 
        userId: updatedProfile.id, 
        email: updatedProfile.email,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        initials: updatedProfile.initials
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully! You can now sign in to your account.',
      data: {
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          displayName: updatedProfile.displayName,
          initials: updatedProfile.initials,
          emailVerified: updatedProfile.emailVerified,
          status: updatedProfile.status,
          createdAt: updatedProfile.createdAt.toISOString(),
        },
        token: jwtToken
      }
    });

  } catch (error) {
    next(error);
  }
});

// Resend verification email - NO AUTHENTICATION REQUIRED
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const profile = await prisma.profile.findUnique({
      where: { email }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address'
      });
    }

    if (profile.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update profile with new token
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      }
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, profile.firstName, verificationToken);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.'
    });

  } catch (error) {
    next(error);
  }
});

// Sign in endpoint (updated to check email verification)
router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = signInSchema.parse(req.body);

    // Find user profile
    const profile = await prisma.profile.findUnique({
      where: { email }
    });

    if (!profile) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!profile.emailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email address before signing in. Check your inbox for a verification email.',
        needsVerification: true
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, profile.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: profile.id, 
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        initials: profile.initials
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Signed in successfully',
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          initials: profile.initials,
          emailVerified: profile.emailVerified,
          status: profile.status,
          createdAt: profile.createdAt.toISOString(),
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({
      where: { email }
    });

    if (!profile) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update profile with reset token
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        emailVerificationToken: resetToken,
        emailVerificationExpires: resetExpires,
      }
    });

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, profile.firstName, resetToken);

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });

  } catch (error) {
    next(error);
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Find profile with this reset token
    const profile = await prisma.profile.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    });

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update profile with new password and clear reset token
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        password: hashedPassword,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }
    });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.'
    });

  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: (req as any).user.userId }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          initials: profile.initials,
          emailVerified: profile.emailVerified,
          status: profile.status,
          createdAt: profile.createdAt.toISOString(),
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required'
      });
    }

    const initials = generateInitials(firstName, lastName);
    
    const updatedProfile = await prisma.profile.update({
      where: { id: (req as any).user.userId },
      data: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        initials,
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          displayName: updatedProfile.displayName,
          initials: updatedProfile.initials,
          emailVerified: updatedProfile.emailVerified,
          status: updatedProfile.status,
          createdAt: updatedProfile.createdAt.toISOString(),
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router; 