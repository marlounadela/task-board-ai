# Authentication Setup Guide

This document explains the Google OAuth sign-in and forgot password features that have been implemented.

## Features Implemented

### 1. Google OAuth Sign-In ✅
- Google sign-in button is now functional
- Uses NextAuth.js with Prisma adapter
- Automatically creates/updates user accounts when signing in with Google
- Properly handles OAuth callbacks and user data synchronization

### 2. Forgot Password Feature ✅
- "Forgot password?" link on login page
- Modal dialog for entering email address
- Password reset email sent via Gmail
- Secure token-based password reset flow
- Reset password page with token validation

## Environment Variables Required

Add the following environment variables to your `.env` file:

### Google OAuth (Required for Google Sign-In)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**How to get Google OAuth credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
7. Copy the Client ID and Client Secret to your `.env` file

### Gmail Integration (Required for Forgot Password)
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

**How to get Gmail App Password:**
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to "Security" → "2-Step Verification" (enable if not already enabled)
3. Scroll down to "App passwords"
4. Select "Mail" and "Other (Custom name)" → enter "Task Board AI"
5. Click "Generate" and copy the 16-character password
6. Add it to your `.env` file as `GMAIL_APP_PASSWORD`

**Important:** Use an App Password, NOT your regular Gmail password. Regular passwords won't work with SMTP.

### NextAuth Configuration
```env
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:5000  # For development
# NEXTAUTH_URL=https://yourdomain.com  # For production
```

**Generate a secret:**
```bash
openssl rand -base64 32
```

## Database Migration

The password reset token model has been added to the Prisma schema. Run the migration:

```bash
npx prisma migrate dev
```

This creates the `PasswordResetToken` table needed for the forgot password feature.

## Files Created/Modified

### New Files:
- `src/lib/email.ts` - Email utility for sending password reset emails
- `src/app/api/auth/forgot-password/route.ts` - API endpoint for requesting password reset
- `src/app/api/auth/reset-password/route.ts` - API endpoint for resetting password
- `src/app/api/auth/verify-reset-token/route.ts` - API endpoint for validating reset tokens
- `src/app/reset-password/page.tsx` - Reset password page

### Modified Files:
- `auth.ts` - Added Prisma adapter and Google OAuth callbacks
- `src/app/login/page.tsx` - Added forgot password modal
- `prisma/schema.prisma` - Added `PasswordResetToken` model

## How It Works

### Google Sign-In Flow:
1. User clicks "Continue with Google" button
2. Redirects to Google OAuth consent screen
3. User authorizes the application
4. Google redirects back to `/api/auth/callback/google`
5. NextAuth creates/updates user account in database
6. User is logged in and redirected to home page

### Forgot Password Flow:
1. User clicks "Forgot password?" link on login page
2. Modal opens asking for email address
3. System generates a secure token and stores it in database (expires in 1 hour)
4. Email is sent to user with reset link containing the token
5. User clicks link in email → redirected to `/reset-password?token=...`
6. System validates token (checks if exists and not expired)
7. User enters new password
8. Password is hashed and updated in database
9. Reset token is deleted
10. User is redirected to login page

## Security Features

- Password reset tokens expire after 1 hour
- Tokens are single-use (deleted after password reset)
- Tokens are cryptographically secure (32-byte random hex string)
- Password validation (minimum 8 characters)
- Email doesn't reveal if account exists (security best practice)
- Passwords are hashed using bcrypt (12 rounds)

## Testing

### Test Google Sign-In:
1. Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
2. Click "Continue with Google" on login page
3. Complete OAuth flow
4. Should be redirected to home page and logged in

### Test Forgot Password:
1. Ensure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set
2. Click "Forgot password?" on login page
3. Enter a valid email address
4. Check email inbox for reset link
5. Click reset link
6. Enter new password
7. Should be redirected to login page
8. Login with new password

## Troubleshooting

### Google Sign-In Not Working:
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify redirect URI matches exactly in Google Cloud Console
- Check browser console for errors
- Ensure `NEXTAUTH_URL` matches your current URL

### Email Not Sending:
- Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set correctly
- Ensure you're using an App Password, not regular password
- Check that 2-Step Verification is enabled on Google Account
- Check server logs for email sending errors
- Verify `NEXTAUTH_URL` is set correctly (used in reset link)

### Reset Token Invalid/Expired:
- Tokens expire after 1 hour
- Tokens are single-use (can't be used twice)
- Request a new reset link if token expires

## Notes

- The Prisma adapter is used for Google OAuth to properly sync account data
- Password reset emails are sent synchronously (consider queueing for production)
- Email template is HTML with fallback plain text
- All API routes include proper error handling and validation




