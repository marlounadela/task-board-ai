# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for your Task Board AI application. Once configured, users can sign in or sign up using their Google account credentials saved in their browser.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Your application running on `http://localhost:5000` (development) or your production domain

## Step-by-Step Setup Instructions

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click **"New Project"**
4. Enter a project name (e.g., "Task Board AI")
5. Click **"Create"**
6. Wait for the project to be created, then select it from the project dropdown

### Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, navigate to **"APIs & Services"** → **"OAuth consent screen"** (from the left sidebar)
2. Select **"External"** user type (unless you have a Google Workspace account, then choose "Internal")
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: Task Board AI (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **"Scopes"** page, click **"Add or Remove Scopes"**
   - Check the following scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Click **"Update"**, then **"Save and Continue"**
7. On the **"Test users"** page (if in testing mode):
   - Click **"Add Users"**
   - Add your email address and any test user emails
   - Click **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

### Step 3: Create OAuth 2.0 Credentials

1. In the Google Cloud Console, navigate to **"APIs & Services"** → **"Credentials"** (from the left sidebar)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Choose **"Web application"** as the application type
5. Give it a name (e.g., "Task Board AI Web Client")
6. **Authorized JavaScript origins** (add these):
   - For development: `http://localhost:5000`
   - For production: `https://yourdomain.com` (replace with your actual domain)
7. **Authorized redirect URIs** (add these - **CRITICAL**):
   - For development: `http://localhost:5000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google` (replace with your actual domain)
8. Click **"Create"**
9. **IMPORTANT**: A popup will appear with your **Client ID** and **Client Secret**
   - Copy both values immediately (you won't be able to see the secret again)
   - If you missed it, you'll need to create a new client ID

### Step 4: Configure Environment Variables

1. Create or edit your `.env` file in the root directory of your project
2. Add the following variables:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:5000
```

3. **Generate NEXTAUTH_SECRET**:

   - On Windows (PowerShell):
     ```powershell
     [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
     ```
   - On Mac/Linux:
     ```bash
     openssl rand -base64 32
     ```
   - Or use an online generator: https://generate-secret.vercel.app/32

4. **Important Notes**:
   - Replace `your-client-id-here` with your actual Google Client ID
   - Replace `your-client-secret-here` with your actual Google Client Secret
   - Make sure `NEXTAUTH_URL` matches your development server URL (port 5000)
   - For production, update `NEXTAUTH_URL` to your production domain

### Step 5: Verify Your Configuration

1. Make sure your `.env` file is in the root directory (same level as `package.json`)
2. Verify the file is not committed to git (check `.gitignore` includes `.env`)
3. Restart your development server:
   ```bash
   npm run dev
   ```

### Step 6: Test Google OAuth

1. Navigate to `http://localhost:5000/login`
2. Click the **"Continue with Google"** button
3. You should be redirected to Google's sign-in page
4. Sign in with your Google account
5. Grant permissions if prompted
6. You should be redirected back to your application and logged in

## How It Works

### Sign Up Flow (New Users)

1. User clicks "Continue with Google" on the signup page
2. Google OAuth consent screen appears
3. User authorizes the application
4. Google redirects back to `/api/auth/callback/google`
5. NextAuth creates a new user account in your database automatically
6. User is logged in and redirected to the home page

### Sign In Flow (Existing Users)

1. User clicks "Continue with Google" on the login page
2. Google OAuth consent screen appears (may be skipped if already authorized)
3. Google redirects back to `/api/auth/callback/google`
4. NextAuth finds the existing user account
5. User is logged in and redirected to the home page

### Auto-Login with Browser Credentials

- If the user is already signed into Google in their browser, the OAuth flow will use those credentials automatically
- No need to enter email/password manually
- The browser's saved Google session is used for authentication

## Troubleshooting

### Issue: "Redirect URI mismatch" Error

**Solution:**

- Verify the redirect URI in Google Cloud Console exactly matches: `http://localhost:5000/api/auth/callback/google`
- Make sure there are no trailing slashes
- Check that `NEXTAUTH_URL` in your `.env` matches your actual URL
- Wait a few minutes after updating redirect URIs (Google caches them)

### Issue: Google Sign-In Button Not Appearing

**Solution:**

- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Verify the values are not set to placeholder values like `"your-google-client-id"`
- Restart your development server after adding environment variables
- Check the browser console for errors

### Issue: "Access blocked: This app's request is invalid"

**Solution:**

- Make sure you've completed the OAuth consent screen setup
- If in testing mode, ensure your email is added as a test user
- Check that the required scopes are configured
- Verify your app is not in a restricted state

### Issue: User Not Created in Database

**Solution:**

- Check that Prisma migrations have been run: `npx prisma migrate dev`
- Verify the database connection is working
- Check server logs for errors
- Ensure the Prisma adapter is properly configured in `auth.ts`

### Issue: Environment Variables Not Loading

**Solution:**

- Make sure `.env` file is in the root directory
- Restart your development server after changing `.env`
- Verify there are no syntax errors in `.env` (no spaces around `=`)
- Check that variable names match exactly (case-sensitive)

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console**:

   - Add your production domain to authorized JavaScript origins
   - Add your production callback URL: `https://yourdomain.com/api/auth/callback/google`
   - Update OAuth consent screen with production domain

2. **Update Environment Variables**:

   ```env
   NEXTAUTH_URL=https://yourdomain.com
   GOOGLE_CLIENT_ID=your-production-client-id
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   ```

3. **Publish Your App** (if in testing mode):
   - Go to OAuth consent screen in Google Cloud Console
   - Click "PUBLISH APP"
   - This allows any Google user to sign in (not just test users)

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use different OAuth credentials** for development and production
3. **Rotate secrets regularly** in production
4. **Monitor OAuth usage** in Google Cloud Console
5. **Set up OAuth consent screen properly** with accurate app information
6. **Use HTTPS in production** (required by Google OAuth)

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

## Current Implementation Status

✅ Google OAuth provider configured in `auth.ts`
✅ Auto-signup for new Google users
✅ Auto-login for existing Google users
✅ User data synchronization (name, email, image)
✅ Prisma adapter for account management
✅ Login page with Google button
✅ Signup page with Google button

Your application is ready to use Google OAuth once you complete the setup steps above!


