import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken, requireSuperadmin, requireAdmin } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'superadmin'])
});

const createAdminSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(8)
});

// Get all users (admin+)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.profile.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Update user role (superadmin only)
router.patch('/users/:userId/role', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = updateUserRoleSchema.parse(req.body);
    
    // Get the current user making the request
    const currentUser = req.user;
    
    // Prevent superadmin from demoting themselves
    if (currentUser && currentUser.userId === userId && role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot demote yourself from superadmin role'
      });
    }
    
    // Check if this is the last superadmin and prevent demotion
    if (role !== 'superadmin') {
      const superadminCount = await prisma.profile.count({
        where: { role: 'superadmin' }
      });
      
      const targetUser = await prisma.profile.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      // If this is the last superadmin and they're being demoted, prevent it
      if (targetUser?.role === 'superadmin' && superadminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot demote the last superadmin. At least one superadmin must remain in the system.'
        });
      }
    }

    const updatedUser = await prisma.profile.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role'
    });
  }
});

// Get system statistics (admin+)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      totalAssets,
      totalVideos,
      totalImages
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.profile.count({ where: { emailVerified: true } }),
      prisma.assetLibrary.count(),
      prisma.assetLibrary.count({ where: { assetType: 'video' } }),
      prisma.assetLibrary.count({ where: { assetType: 'image' } })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        pendingUsers: totalUsers - verifiedUsers,
        totalAssets,
        totalVideos,
        totalImages
      }
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system statistics'
    });
  }
});

// Get user analytics (admin+)
router.get('/users/:userId/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const [user, assets, uploads] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      }),
      prisma.assetLibrary.count({ where: { createdBy: userId } }),
      prisma.socialMediaUpload.count({ where: { profileId: userId } })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        analytics: {
          totalAssets: assets,
          totalUploads: uploads,
          accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics'
    });
  }
});

// Create admin account (superadmin only)
router.post('/admins', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { email, firstName, lastName, password } = createAdminSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.profile.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.profile.create({
      data: {
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
        password: hashedPassword,
        role: 'admin',
        status: 'verified',
        emailVerified: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: admin
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create admin account'
    });
  }
});

export default router; 