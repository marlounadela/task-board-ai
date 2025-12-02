# Task Board AI

A modern, AI-powered task management application built with Next.js 14, Prisma, and TypeScript.

## Features

- 🎯 Kanban-style task management
- 🤖 AI-powered task suggestions and summaries
- 👥 User authentication with NextAuth.js
- 📊 Real-time analytics and insights
- 🎨 Beautiful, modern UI with dark mode support
- 💬 Comments and collaboration features
- ⏱️ Time tracking for tasks
- 📱 Responsive design

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** SQLite (development) / PostgreSQL (production)
- **ORM:** Prisma
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS
- **UI Components:** Custom shadcn/ui components
- **Testing:** Vitest, Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd task-board-ai
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Generate Prisma client:

```bash
npx prisma generate
```

5. Run database migrations:

```bash
npx prisma migrate dev
```

6. (Optional) Seed the database:

```bash
npm run db:seed
```

7. Start the development server:

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Environment Variables

Create a `.env` file in the root directory (you can copy from `.env.example`):

```env
# Database
DATABASE_URL="file:./prisma/dev.db"  # For development (SQLite)
# DATABASE_URL="postgresql://..." # For production (PostgreSQL)

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:5000"  # Must match the port your dev server runs on

# Optional: Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Gmail Integration (Required for email verification and password reset)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-16-character-app-password"

# OpenAI (for AI features)
OPENAI_API_KEY="your-openai-api-key"

# Node Environment
NODE_ENV="development"
```

### Setting Up Gmail for Email Sending

The application requires Gmail credentials to send verification emails and password reset emails. Follow these steps:

1. **Enable 2-Step Verification** on your Google Account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate an App Password**:
   - Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" as the app
   - Select "Other (Custom name)" as the device
   - Enter "Task Board AI" as the name
   - Click "Generate"
   - Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

3. **Add to `.env` file**:
   ```env
   GMAIL_USER="your-email@gmail.com"
   GMAIL_APP_PASSWORD="abcdefghijklmnop"  # Remove spaces from the generated password
   ```

**Important:** 
- Use an **App Password**, NOT your regular Gmail password
- Remove any spaces from the generated app password
- The app password is 16 characters without spaces

For more details, see [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md).

## Project Structure

```
task-board-ai/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── api/              # API routes
│   │   └── page.tsx          # Main page
│   ├── components/           # React components
│   │   ├── kanban/          # Kanban board components
│   │   └── ui/              # UI components
│   ├── actions/              # Server actions
│   └── lib/                  # Utility functions
├── scripts/                  # Utility scripts
└── test/                     # Test files
```

## Database Setup

### Development (SQLite)

The app uses SQLite by default for development. No additional setup is required.

### Production (PostgreSQL)

1. Update `.env` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

2. Update the Prisma schema provider:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:

```bash
npx prisma migrate deploy
```

4. Generate Prisma client:

```bash
npx prisma generate
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploy to Railway/Render

1. Connect your GitHub repository
2. Add PostgreSQL database
3. Configure environment variables
4. Deploy

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run db:studio` - Open Prisma Studio

## Database Management

### View all users:

```bash
node scripts/check-db.js
```

### Query users:

```bash
node scripts/query-users.js
```

### Create test user:

```bash
node scripts/create-test-user.js
```

### Open Prisma Studio:

```bash
npx prisma studio
```

## Features

### Administrator Panel

Access the administrator panel through the Settings dropdown in the header. You can view:

- Database statistics (users, tasks, boards, comments)
- Registered users with their details
- User activity counts

### User Management

The administrator can see all registered users along with:

- Creation date
- Number of boards owned
- Number of tasks assigned
- Number of comments made
- Password status

## Troubleshooting

### Database issues

If you encounter database errors:

1. Check your `DATABASE_URL` in `.env`
2. Run migrations: `npx prisma migrate dev`
3. Reset database: `npx prisma migrate reset`

### Authentication issues

1. Verify `NEXTAUTH_SECRET` is set
2. Check `NEXTAUTH_URL` matches your deployment URL (or dev server port, e.g., `http://localhost:5000`)
3. For OAuth providers, ensure redirect URIs in provider settings match `NEXTAUTH_URL`
4. Clear browser cookies and try again

### Module not found errors

1. Delete `node_modules` and `.next`
2. Run `npm install`
3. Run `npx prisma generate`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
