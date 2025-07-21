# Migration Guide: Supabase Edge Functions → Node.js + Prisma

This guide will help you migrate from the current Supabase Edge Functions setup to a Node.js backend with Prisma ORM while keeping Supabase as your database.

## 🎯 Migration Overview

### What's Changing
- **Backend**: Supabase Edge Functions → Node.js Express server
- **ORM**: Direct Supabase client → Prisma ORM
- **Database**: Supabase PostgreSQL (unchanged)
- **Frontend**: Updated API client to use new backend

### What's Staying the Same
- **Database**: Supabase PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn/ui components
- **Authentication**: Supabase Auth (optional)

## 📋 Pre-Migration Checklist

- [ ] Backup your current database
- [ ] Note down all current API endpoints
- [ ] Document current environment variables
- [ ] Test current functionality

## 🚀 Step-by-Step Migration

### Step 1: Set Up Node.js Backend

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your actual values:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.speqcclarritenwiyrzl.supabase.co:5432/postgres"
   PORT=3001
   NODE_ENV=development
   OPENAI_API_KEY=[YOUR-OPENAI-API-KEY]
   HEYGEN_API_KEY=[YOUR-HEYGEN-API-KEY]
   RUNWAYML_API_KEY=[YOUR-RUNWAYML-API-KEY]
   ```

4. **Set up Prisma**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```

### Step 2: Update Frontend Configuration

1. **Create frontend environment file**
   ```bash
   cp frontend.env.example .env
   ```

2. **Update frontend environment variables**
   ```env
   VITE_BACKEND_URL=http://localhost:3001
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Step 3: Update Frontend API Calls

Replace Supabase client calls with the new API client:

#### Before (Supabase)
```typescript
import { supabase } from '@/integrations/supabase/client';

// Get inventory
const { data, error } = await supabase
  .from('inventory')
  .select('*');

// Create asset
const { data, error } = await supabase
  .from('asset_library')
  .insert(newAsset);
```

#### After (Node.js Backend)
```typescript
import { inventoryAPI, assetsAPI } from '@/api/backend-client';

// Get inventory
const response = await inventoryAPI.getAll();
const data = response.data.data;

// Create asset
const response = await assetsAPI.create(newAsset);
const data = response.data.data;
```

### Step 4: Update AI Generation Calls

#### Before (Supabase Edge Functions)
```typescript
// HeyGen generation
const response = await fetch('/functions/v1/heygen-generate', {
  method: 'POST',
  body: JSON.stringify({ templateId, instruction })
});

// OpenAI generation
const response = await fetch('/functions/v1/openai-generate', {
  method: 'POST',
  body: JSON.stringify({ prompt, type: 'text' })
});
```

#### After (Node.js Backend)
```typescript
import { aiAPI } from '@/api/backend-client';

// HeyGen generation
const response = await aiAPI.heygenGenerate({
  templateId,
  instruction,
  formatSpecs: { channel: 'social_media' }
});

// OpenAI generation
const response = await aiAPI.openaiGenerate({
  prompt,
  type: 'text',
  options: { maxTokens: 1000 }
});
```

### Step 5: Test the Migration

1. **Test backend health**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Test API endpoints**
   ```bash
   # Test inventory API
   curl http://localhost:3001/api/inventory
   
   # Test assets API
   curl http://localhost:3001/api/assets
   
   # Test AI API
   curl http://localhost:3001/api/ai/stats
   ```

3. **Test frontend integration**
   - Start frontend: `npm run dev`
   - Navigate to inventory page
   - Test CRUD operations
   - Test AI generation

## 🔄 API Endpoint Mapping

| Supabase Edge Function | Node.js Backend Endpoint |
|------------------------|--------------------------|
| `heygen-generate` | `POST /api/ai/heygen/generate` |
| `heygen-status-check` | `GET /api/ai/heygen/status/:videoId` |
| `openai-generate` | `POST /api/ai/openai/generate` |
| `runwayml-generate` | `POST /api/ai/runwayml/generate` |
| Direct DB queries | Prisma ORM calls |

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```
   Error: P1001: Can't reach database server
   ```
   **Solution**: Check `DATABASE_URL` and ensure Supabase database is accessible

2. **CORS Error**
   ```
   Access to fetch at 'http://localhost:3001/api/...' from origin 'http://localhost:8080' has been blocked by CORS policy
   ```
   **Solution**: Update `CORS_ORIGIN` in backend `.env` to include `http://localhost:8080`

3. **Prisma Client Not Generated**
   ```
   Error: PrismaClient is not generated
   ```
   **Solution**: Run `npm run db:generate` in backend directory

4. **API Key Errors**
   ```
   Error: OpenAI API key not configured
   ```
   **Solution**: Add API keys to backend `.env` file

### Debug Mode

Enable debug logging:
```bash
# Backend
NODE_ENV=development npm run dev

# Frontend
VITE_DEV_MODE=true npm run dev
```

## 📊 Performance Comparison

### Before (Supabase Edge Functions)
- ✅ Serverless, auto-scaling
- ✅ No server management
- ❌ Cold start latency
- ❌ Limited execution time
- ❌ Less control over environment

### After (Node.js + Prisma)
- ✅ Full control over server
- ✅ Better performance
- ✅ Custom middleware
- ✅ Advanced error handling
- ✅ Better debugging
- ❌ Server management required
- ❌ Manual scaling

## 🔒 Security Considerations

### New Security Features
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Zod schema validation
- **Security Headers**: Helmet middleware
- **Error Handling**: Centralized error management
- **Request Logging**: Audit trail

### Environment Variables
Ensure all sensitive data is in environment variables:
- API keys
- Database credentials
- JWT secrets

## 🚀 Deployment

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend
npm run dev
```

### Production
```bash
# Backend
cd backend && npm run build && npm start

# Frontend
npm run build
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Configure production database URL
- Set all API keys
- Configure CORS for production domain

## 📈 Monitoring

### Health Checks
- Backend: `GET /health`
- Database: Prisma connection test
- API endpoints: Response time monitoring

### Logging
- Request logs: Morgan middleware
- Error logs: Centralized error handler
- Database logs: Prisma query logging

## 🔄 Rollback Plan

If you need to rollback:

1. **Stop Node.js backend**
2. **Revert frontend API calls to Supabase**
3. **Restart Supabase Edge Functions**
4. **Update environment variables**

## 📞 Support

If you encounter issues during migration:

1. Check the troubleshooting section
2. Review error logs
3. Test individual components
4. Verify environment configuration

## ✅ Migration Checklist

- [ ] Backend server running on port 3001
- [ ] Prisma client generated
- [ ] Database schema synced
- [ ] Environment variables configured
- [ ] Frontend connecting to backend
- [ ] All API endpoints working
- [ ] AI generation functional
- [ ] Asset management working
- [ ] Inventory management working
- [ ] Error handling working
- [ ] Security features enabled
- [ ] Performance acceptable
- [ ] Tests passing

## 🎉 Post-Migration

After successful migration:

1. **Monitor performance**
2. **Set up production deployment**
3. **Configure monitoring**
4. **Update documentation**
5. **Train team on new architecture**

Congratulations! You now have full control over your backend with Node.js and Prisma while maintaining the power of Supabase's PostgreSQL database. 