# Server Error Troubleshooting Guide

If you're seeing a "Server error" or "There is a problem with the server configuration" message, follow these steps:

## Quick Checklist

### 1. Check Environment Variables

Make sure your `.env` file in the project root contains:

```env
# Required
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:5000"

# Optional (for Google OAuth)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### 2. Generate NEXTAUTH_SECRET

If you don't have a secret, generate one:

**Windows (PowerShell):**

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Mac/Linux:**

```bash
openssl rand -base64 32
```

**Or use online generator:**
https://generate-secret.vercel.app/32

### 3. Initialize Database

Run these commands in order:

```bash
# Generate Prisma client
npx prisma generate

# Create database and run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to verify database
npx prisma studio
```

### 4. Verify Database Connection

Check if your database file exists:

- For SQLite: `prisma/dev.db` should exist
- If it doesn't exist, run `npx prisma migrate dev`

### 5. Restart Development Server

After making changes to `.env` or running migrations:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## Common Error Messages and Solutions

### "DATABASE_URL is not set"

**Solution:** Add `DATABASE_URL="file:./prisma/dev.db"` to your `.env` file

### "NEXTAUTH_SECRET is not set"

**Solution:** Generate a secret and add it to `.env` as `NEXTAUTH_SECRET`

### "Failed to connect to database"

**Solutions:**

1. Run `npx prisma migrate dev` to create the database
2. Check that `prisma/dev.db` file exists
3. Verify `DATABASE_URL` in `.env` is correct

### "Prisma Client not generated"

**Solution:** Run `npx prisma generate`

### "Migration not applied"

**Solution:** Run `npx prisma migrate dev`

### "Server error" when using "Continue with Google" / Google OAuth

**This error typically occurs due to missing `NEXTAUTH_URL` configuration.**

**⚠️ IMPORTANT:** NextAuth v5 requires `NEXTAUTH_URL` for OAuth providers, even with `trustHost: true`.

**Quick Diagnostic:**
Run this command to check your configuration:

```bash
node scripts/check-auth-config.js
```

**Solutions:**

1. **Add `NEXTAUTH_URL` to your `.env` file (REQUIRED):**

   ```env
   NEXTAUTH_URL="http://localhost:5000"
   ```

   - For development: `http://localhost:5000` (must match your dev server port)
   - For production: `https://yourdomain.com` (your actual domain)
   - **This is required even if you have `trustHost: true` in your NextAuth config**

2. **Verify Google OAuth credentials are set:**

   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

   - Make sure these are NOT placeholder values like `"your-google-client-id"`
   - Client ID should end with `.apps.googleusercontent.com`
   - Client Secret should start with `GOCSPX-`

3. **Check Google Cloud Console redirect URI:**

   - Must match exactly: `http://localhost:5000/api/auth/callback/google`
   - No trailing slashes
   - Wait a few minutes after updating (Google caches redirect URIs)

4. **Restart your development server** after updating `.env`:

   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

5. **Check server console logs** for specific error messages:
   - Look for warnings about `NEXTAUTH_URL`
   - Look for configuration errors
   - The updated code now provides more detailed error messages

## Step-by-Step Fix

1. **Create/Update `.env` file:**

   ```env
   DATABASE_URL="file:./prisma/dev.db"
   NEXTAUTH_SECRET="paste-your-generated-secret-here"
   NEXTAUTH_URL="http://localhost:5000"
   ```

2. **Run database setup:**

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

3. **Restart server:**

   ```bash
   npm run dev
   ```

4. **Check server logs:**
   - Look for "✅ Database connected successfully"
   - Look for any error messages

## Still Having Issues?

1. **Check server console** for detailed error messages
2. **Verify file structure:**
   - `.env` should be in project root (same level as `package.json`)
   - `prisma/dev.db` should exist after running migrations
3. **Clear cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```
4. **Check Node version:**
   ```bash
   node --version  # Should be 18 or higher
   ```

## Getting Help

If the error persists:

1. Check the server console output for specific error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations have been run
4. Check that Prisma client is generated
