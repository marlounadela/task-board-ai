# Deployment Guide

This guide will help you deploy Task Board AI to production.

## Prerequisites

- PostgreSQL database (or use a managed service like Railway, Supabase, or Neon)
- Node.js 18+
- Git repository

## Quick Start

### 1. Database Setup

#### Option A: Use Supabase (Recommended for easy setup)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Copy the connection string from Project Settings > Database
4. Update your `.env` file:

```env
DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"
```

#### Option B: Use Railway

1. Go to [railway.app](https://railway.app) and create an account
2. Click "New Project" > "Provision PostgreSQL"
3. Copy the DATABASE_URL from the PostgreSQL service
4. Update your `.env` file with the connection string

#### Option C: Use Neon (Serverless PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string
4. Update your `.env` file

### 2. Update Prisma Schema for PostgreSQL

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 3. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

### 4. Set Environment Variables

Create/update `.env` in your deployment environment:

```env
# Database - PostgreSQL connection string
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth - Generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET="your-production-secret-here"
NEXTAUTH_URL="https://yourdomain.com"

# Optional: Google OAuth (if enabled)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: OpenAI (for AI features)
OPENAI_API_KEY="your-openai-api-key"

# Node Environment
NODE_ENV="production"
```

## Deploy to Vercel

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Deploy

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Production deploy
vercel --prod
```

### Step 3: Set Environment Variables

1. Go to your project dashboard on Vercel
2. Navigate to Settings > Environment Variables
3. Add all required variables from `.env`

### Step 4: Run Database Migrations

After deployment, run migrations on your production database:

```bash
npx prisma migrate deploy
```

## Deploy to Railway

### Step 1: Connect Repository

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### Step 2: Add PostgreSQL Database

1. Click "New" in your project
2. Select "Database" > "Add PostgreSQL"

### Step 3: Add Environment Variables

1. Click on your service
2. Go to Variables tab
3. Add all required environment variables

Railway will automatically set the `DATABASE_URL` variable.

### Step 4: Update Prisma Schema

Update `prisma/schema.prisma` to use PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 5: Run Migrations

Add a custom command to run migrations before build:

In Railway, add a build command:

```bash
npx prisma generate && npx prisma migrate deploy && npm run build
```

## Deploy to Render

### Step 1: Create Web Service

1. Go to [render.com](https://render.com)
2. Click "New" > "Web Service"
3. Connect your GitHub repository

### Step 2: Configure Service

- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command**: `npm start`
- **Environment**: `Node`

### Step 3: Create PostgreSQL Database

1. In your Render dashboard, click "New" > "PostgreSQL"
2. Copy the connection string

### Step 4: Add Environment Variables

Add these variables in Render dashboard:

- `DATABASE_URL` (from PostgreSQL service)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NODE_ENV=production`
- (Optional) `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- (Optional) `OPENAI_API_KEY`

## Deploy to DigitalOcean App Platform

### Step 1: Create App

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository

### Step 2: Configure App

- **Type**: Web Service
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Run Command**: `npm start`
- **Environment**: Node.js

### Step 3: Add Database

1. Click "Components" > "Database" > "PostgreSQL"
2. Choose a plan

### Step 4: Add Environment Variables

Add all required environment variables in the App Settings.

## Environment Variables Reference

| Variable               | Required | Description                                                       |
| ---------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                                      |
| `NEXTAUTH_SECRET`      | Yes      | Secret key for NextAuth (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL`         | Yes      | Public URL of your application                                    |
| `NODE_ENV`             | Yes      | Set to `production`                                               |
| `GOOGLE_CLIENT_ID`     | No       | For Google OAuth                                                  |
| `GOOGLE_CLIENT_SECRET` | No       | For Google OAuth                                                  |
| `OPENAI_API_KEY`       | No       | For AI features                                                   |

## Database Migrations in Production

After deploying, you need to run migrations on your production database:

```bash
# Connect to your production database
DATABASE_URL="your-production-database-url" npx prisma migrate deploy
```

Or use environment variables:

```bash
export DATABASE_URL="your-production-database-url"
npx prisma migrate deploy
```

## Backup and Restore

### Backup

```bash
# Using pg_dump
pg_dump "your-database-url" > backup.sql

# Or using Prisma Studio (for small databases)
npx prisma studio
```

### Restore

```bash
psql "your-database-url" < backup.sql
```

## Monitoring

### Recommended Tools

1. **Sentry** - Error tracking
2. **LogRocket** - Session replay and monitoring
3. **Uptime Robot** - Uptime monitoring

### Health Check

Add a health check endpoint:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

## Troubleshooting

### Database Connection Errors

1. Check your `DATABASE_URL` is correct
2. Ensure your database is accessible from your deployment
3. Check SSL requirements
4. For Railway/Render, ensure the database URL is properly passed

### NextAuth Errors

1. Verify `NEXTAUTH_SECRET` is set
2. Check `NEXTAUTH_URL` matches your deployment URL
3. Clear cookies and try again

### Build Errors

1. Check Prisma client is generated: `npx prisma generate`
2. Verify all environment variables are set
3. Check database migrations: `npx prisma migrate status`

## Scaling

### For Higher Traffic

1. **Database**: Upgrade to a higher-tier PostgreSQL plan
2. **CDN**: Enable CDN for static assets (automatic on Vercel)
3. **Caching**: Add Redis for session storage
4. **Load Balancing**: Use multiple server instances

### Recommended Plans

- **Vercel**: Hobby (free) → Pro ($20/month)
- **Railway**: Starter ($5/month) → Pro ($20/month)
- **Render**: Free → Starter ($7/month)
- **DigitalOcean**: Basic ($5/month) → Professional ($12/month)

## Security Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Enable HTTPS only
- [ ] Set secure cookies
- [ ] Use environment variables for secrets
- [ ] Enable database SSL
- [ ] Regularly update dependencies
- [ ] Set up error monitoring
- [ ] Implement rate limiting
- [ ] Add CORS policies if needed
- [ ] Enable database backups

## Support

For issues and questions:

1. Check the README.md
2. Review the troubleshooting section
3. Open an issue on GitHub
