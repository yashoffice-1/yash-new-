import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

// Validation schemas
const createApiKeySchema = z.object({
  keyValue: z.string().min(1, 'API key value is required'),
  provider: z.string().min(1, 'Provider is required')
});

// Get all API keys
router.get('/api-keys', async (req, res, next) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        provider: true,
        createdAt: true,
        updatedAt: true
        // Don't return the actual key value for security
      }
    });

    res.json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    next(error);
  }
});

// Create new API key
router.post('/api-keys', async (req, res, next) => {
  try {
    const validatedData = createApiKeySchema.parse(req.body);
    
    const apiKey = await prisma.apiKey.create({
      data: validatedData
    });

    res.status(201).json({
      success: true,
      data: {
        id: apiKey.id,
        provider: apiKey.provider,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt
      },
      message: 'API key created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    next(error);
  }
});

// Delete API key
router.delete('/api-keys/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.apiKey.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get API key by provider
router.get('/api-keys/provider/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params;
    
    const apiKey = await prisma.apiKey.findFirst({
      where: { provider }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found for this provider'
      });
    }

    res.json({
      success: true,
      data: {
        id: apiKey.id,
        provider: apiKey.provider,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Health check for auth service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

export default router; 