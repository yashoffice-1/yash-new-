import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

// Helper function to generate initials
const generateInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
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

// Sign up endpoint
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

    // Create profile in database
    const initials = generateInitials(firstName, lastName);
    const profile = await prisma.profile.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        initials,
        status: 'verified', // Auto-verified for simplicity
      }
    });

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

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          initials: profile.initials,
          createdAt: profile.createdAt.toISOString(),
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
});

// Sign in endpoint
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
          createdAt: profile.createdAt.toISOString(),
        },
        token
      }
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
          createdAt: updatedProfile.createdAt.toISOString(),
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router; 