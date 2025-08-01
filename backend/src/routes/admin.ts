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
    const currentUser = (req as any).user;
    
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

    return res.json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({
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

    const [user, uploads, lastUpload] = await Promise.all([
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
      prisma.socialMediaUpload.count({ where: { profileId: userId } }),
      prisma.socialMediaUpload.findFirst({
        where: { profileId: userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate time since last upload
    let lastUploadTime = null;
    if (lastUpload) {
      const now = new Date();
      const lastUploadDate = new Date(lastUpload.createdAt);
      const diffInHours = Math.floor((now.getTime() - lastUploadDate.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 24) {
        lastUploadTime = `${diffInHours}h ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        lastUploadTime = `${diffInDays}d ago`;
      }
    }

    return res.json({
      success: true,
      data: {
        user,
        analytics: {
          totalUploads: uploads,
          lastUpload: lastUploadTime,
          hasUploads: uploads > 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return res.status(500).json({
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

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: admin
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create admin account'
    });
  }
});

export default router; 