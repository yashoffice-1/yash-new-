# Feed Genesis - AI-Powered Content Generation Platform

A comprehensive platform for generating, managing, and distributing AI-powered content across multiple social media platforms.

## 🚀 Features

### Core Functionality
- **AI Content Generation**: Integration with OpenAI, HeyGen, and RunwayML
- **Social Media Management**: YouTube, Instagram, Facebook, and TikTok integration
- **Asset Library**: Centralized content management with tagging and organization
- **Template System**: Reusable video and content templates
- **Real-time Updates**: WebSocket-based real-time status updates
- **User Management**: Role-based access control with admin dashboard

### Technical Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT-based auth with email verification
- **File Storage**: Cloudinary integration
- **Real-time**: Server-Sent Events (SSE)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Supabase recommended)
- API keys for:
  - OpenAI
  - HeyGen
  - RunwayML
  - Cloudinary
  - Social media platforms (YouTube, Instagram, Facebook)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd yash-new-
```

### 2. Backend Setup
```bash
cd backend
npm install
cp env.example .env
```

Update `.env` with your configuration:
```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Server
PORT=3001
NODE_ENV=development
JWT_SECRET="your-super-secret-jwt-key"

# API Keys
OPENAI_API_KEY="your-openai-key"
HEYGEN_API_KEY="your-heygen-key"
RUNWAYML_API_KEY="your-runwayml-key"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Social Media
YOUTUBE_CLIENT_ID="your-youtube-client-id"
YOUTUBE_CLIENT_SECRET="your-youtube-client-secret"
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"
INSTAGRAM_CLIENT_ID="your-instagram-client-id"
INSTAGRAM_CLIENT_SECRET="your-instagram-client-secret"

# Email (for verification)
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
```

### 3. Database Setup
```bash
npm run db:generate
npm run db:migrate
npm run db:seed  # Optional: seed with sample data
```

### 4. Frontend Setup
```bash
cd ..
npm install
cp frontend.env.example .env
```

Update frontend `.env`:
```env
VITE_BACKEND_URL=http://localhost:3001
VITE_APP_NAME=Feed Genesis
```

### 5. Start Development Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

## 📁 Project Structure

```
yash-new-/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── prisma/             # Database schema
│   └── package.json
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── api/               # API clients
│   └── contexts/          # React contexts
├── public/                # Static assets
└── package.json
```

## 🔧 Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Code Quality
- ESLint configuration for both frontend and backend
- TypeScript strict mode enabled
- Prettier formatting (recommended)
- Husky pre-commit hooks (recommended)

## 🚀 Deployment

### Backend Deployment
1. Set up production environment variables
2. Run database migrations: `npm run db:migrate`
3. Build the application: `npm run build`
4. Start the server: `npm start`

### Frontend Deployment
1. Update environment variables for production
2. Build the application: `npm run build`
3. Deploy the `dist` folder to your hosting provider

### Environment Variables for Production
Ensure all required environment variables are set in your production environment, especially:
- `JWT_SECRET` (use a strong, unique secret)
- `DATABASE_URL` (production database)
- All API keys
- `NODE_ENV=production`

## 🔒 Security Features

- JWT-based authentication
- Email verification
- Role-based access control
- Rate limiting
- Input validation with Zod
- CORS protection
- Helmet security headers
- Webhook signature verification

## 📊 Monitoring & Logging

- Winston logging system
- Health check endpoints
- Error tracking and monitoring
- Performance metrics
- Database query logging (development)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

## 🔄 Migration Guide

If migrating from Supabase Edge Functions, see `MIGRATION_GUIDE.md` for detailed instructions.

## 📈 Roadmap

### Planned Features
- [ ] Advanced analytics dashboard
- [ ] Content scheduling
- [ ] Team collaboration features
- [ ] Mobile app
- [ ] Advanced AI models
- [ ] White-label solutions
- [ ] API rate limiting
- [ ] Advanced billing system

### Performance Improvements
- [ ] Database query optimization
- [ ] Caching layer
- [ ] CDN integration
- [ ] Image optimization
- [ ] Lazy loading

### Security Enhancements
- [ ] Two-factor authentication
- [ ] Advanced audit logging
- [ ] IP whitelisting
- [ ] API key rotation
- [ ] Data encryption at rest
