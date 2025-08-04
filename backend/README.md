# Node.js Backend with Prisma

This is the Node.js backend for the Shopify content generation application, replacing the Supabase Edge Functions with a more controlled server architecture.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Supabase)

### Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your actual values:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.speqcclarritenwiyrzl.supabase.co:5432/postgres"
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # API Keys
   OPENAI_API_KEY=[YOUR-OPENAI-API-KEY]
   HEYGEN_API_KEY=[YOUR-HEYGEN-API-KEY]
   RUNWAYML_API_KEY=[YOUR-RUNWAYML-API-KEY]
   ```

3. **Set up Prisma**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database (for development)
   npm run db:push
   
   # Or run migrations (for production)
   npm run db:migrate
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main server file
│   ├── routes/               # API routes
│   │   ├── inventory.ts      # Product management
│   │   ├── assets.ts         # Asset library
│   │   ├── ai.ts            # AI integrations
│   │   ├── templates.ts     # Template management
│   │   └── auth.ts          # Authentication
│   ├── middleware/           # Express middleware
│   │   ├── errorHandler.ts
│   │   └── notFoundHandler.ts
│   ├── services/            # Business logic (future)
│   ├── utils/               # Utility functions (future)
│   └── types/               # TypeScript types (future)
├── prisma/
│   └── schema.prisma        # Database schema
├── package.json
├── tsconfig.json
└── env.example
```

## 🗄️ Database Schema

The Prisma schema includes all tables from the original Supabase setup:

- **Inventory** - Product management
- **GeneratedAssets** - AI-generated content
- **GeneratedAsset** - All generated assets with user management features (favorites, titles, descriptions, tags)
- **ClientConfigs** - Client management
- **ClientTemplateAssignments** - Template assignments
- **TemplateFallbackVariables** - Template variables
- **ApiKeys** - API key management
- **Profiles** - User profiles
- **UserSocialConnections** - Social media connections

## 🔌 API Endpoints

### Inventory Management
- `GET /api/inventory` - Get all products
- `GET /api/inventory/:id` - Get single product
- `POST /api/inventory` - Create product
- `PUT /api/inventory/:id` - Update product
- `DELETE /api/inventory/:id` - Delete product
- `POST /api/inventory/bulk` - Bulk create products

### Asset Management
- `GET /api/assets` - Get all assets
- `GET /api/assets/:id` - Get single asset
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `PATCH /api/assets/:id/favorite` - Toggle favorite
- `GET /api/assets/generated/all` - Get generated assets
- `POST /api/assets/generated` - Create generated asset
- `PATCH /api/assets/generated/:id/approve` - Update approval status
- `GET /api/assets/stats/overview` - Get asset statistics

### AI Generation
- `POST /api/ai/openai/generate` - OpenAI content generation
- `POST /api/ai/heygen/generate` - HeyGen video generation
- `GET /api/ai/heygen/status/:videoId` - HeyGen status check
- `POST /api/ai/runwayml/generate` - RunwayML generation
- `GET /api/ai/stats` - AI statistics

### Template Management
- `GET /api/templates/clients` - Get client configurations
- `POST /api/templates/clients` - Create client configuration
- `GET /api/templates/clients/:clientId/assignments` - Get client assignments
- `POST /api/templates/clients/:clientId/assignments` - Assign template
- `GET /api/templates/fallback-variables/:templateId` - Get template variables
- `POST /api/templates/fallback-variables` - Create template variables
- `GET /api/templates/available` - Get available templates
- `GET /api/templates/stats` - Template statistics

### Authentication
- `GET /api/auth/api-keys` - Get API keys
- `POST /api/auth/api-keys` - Create API key
- `DELETE /api/auth/api-keys/:id` - Delete API key
- `GET /api/auth/api-keys/provider/:provider` - Get API key by provider

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `OPENAI_API_KEY` - OpenAI API key
- `HEYGEN_API_KEY` - HeyGen API key
- `RUNWAYML_API_KEY` - RunwayML API key
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Allowed CORS origin

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request rate limiting
- **Input Validation** - Zod schema validation
- **Error Handling** - Centralized error handling
- **Request Logging** - Morgan HTTP request logging

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
Make sure to set all required environment variables in your production environment.

### Database Migrations
For production, use migrations instead of `db:push`:
```bash
npm run db:migrate
```

## 🔄 Migration from Supabase Edge Functions

This backend replaces the following Supabase Edge Functions:
- `heygen-generate` → `/api/ai/heygen/generate`
- `heygen-status-check` → `/api/ai/heygen/status/:videoId`
- `openai-generate` → `/api/ai/openai/generate`
- `runwayml-generate` → `/api/ai/runwayml/generate`

### Frontend Integration
Update your frontend to use the new API client:
```typescript
import { inventoryAPI, assetsAPI, aiAPI } from '@/api/backend-client';

// Instead of Supabase client calls, use:
const products = await inventoryAPI.getAll();
const assets = await assetsAPI.getAll();
const generated = await aiAPI.openaiGenerate({ prompt, type: 'text' });
```

## 📊 Monitoring & Logging

- **Health Check**: `GET /health`
- **Request Logging**: Automatic with Morgan
- **Error Logging**: Centralized error handling
- **Database Logging**: Prisma query logging in development

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check `DATABASE_URL` in `.env`
   - Ensure Supabase database is accessible
   - Verify network connectivity

2. **Prisma Client Generation Error**
   - Run `npm run db:generate`
   - Check Prisma schema syntax
   - Ensure database is accessible

3. **API Key Errors**
   - Verify API keys in `.env`
   - Check API key permissions
   - Ensure services are accessible

4. **CORS Errors**
   - Update `CORS_ORIGIN` in `.env`
   - Check frontend URL configuration

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and logging. 