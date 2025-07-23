import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';

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

const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
});

// Helper function to generate initials
const generateInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
};

// JWT-based signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = signUpSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.profile.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const initials = generateInitials(firstName, lastName);

    // Create user profile
    const user = await prisma.profile.create({
      data: {
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        initials,
        status: 'verified',
        is_active: true,
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        initials: user.initials,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          displayName: user.display_name,
          initials: user.initials,
        },
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// JWT-based signin endpoint
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = signInSchema.parse(req.body);

    // Find user
    const user = await prisma.profile.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        initials: user.initials,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Signed in successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          displayName: user.display_name,
          initials: user.initials,
        },
        token
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign in'
    });
  }
});

// Get current user profile
router.get('/profile', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    // User data is already available from the middleware
    const { userId, email, firstName, lastName, initials } = req.user;

    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: email,
          firstName: firstName,
          lastName: lastName,
          displayName: `${firstName} ${lastName}`,
          initials: initials,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    const { firstName, lastName } = updateProfileSchema.parse(req.body);
    const initials = generateInitials(firstName, lastName);
    
    // Update profile in database
    const updatedProfile = await prisma.profile.update({
      where: { id: req.user.userId },
      data: {
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        initials: initials,
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          firstName: updatedProfile.first_name,
          lastName: updatedProfile.last_name,
          displayName: updatedProfile.display_name,
          initials: updatedProfile.initials,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router; 