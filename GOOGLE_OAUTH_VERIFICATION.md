# Google OAuth Configuration Verification

## Your Credentials (from JSON)

```json
{
  "client_id": "1016836568594-n3b1ctn8930or0uvlrhqkeo5u3ih4jvt.apps.googleusercontent.com",
  "client_secret": "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"
}
```

## Required .env Configuration

Your `.env` file should contain:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=1016836568594-n3b1ctn8930or0uvlrhqkeo5u3ih4jvt.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# NextAuth Configuration
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:5000
```

## Verification Checklist

### ✅ 1. Environment Variables Match

- **GOOGLE_CLIENT_ID**: Should be exactly `1016836568594-n3b1ctn8930or0uvlrhqkeo5u3ih4jvt.apps.googleusercontent.com`
- **GOOGLE_CLIENT_SECRET**: Should be exactly `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`
- **Format**: ✅ Client ID ends with `.apps.googleusercontent.com`
- **Format**: ✅ Client Secret starts with `GOCSPX-` (correct format)

### ✅ 2. Google Cloud Console Configuration

**Authorized JavaScript origins:**

- `http://localhost:5000` (for development)

**Authorized redirect URIs (CRITICAL):**

- `http://localhost:5000/api/auth/callback/google` (for development)
- `https://yourdomain.com/api/auth/callback/google` (for production - when deployed)

### ✅ 3. Code Configuration Verification

The `auth.ts` file is configured to:

- ✅ Read `GOOGLE_CLIENT_ID` from environment
- ✅ Read `GOOGLE_CLIENT_SECRET` from environment
- ✅ Use the correct GoogleProvider configuration
- ✅ Set up proper authorization parameters
- ✅ Handle OAuth callbacks correctly

### ✅ 4. NextAuth Route Handler

The route handler at `src/app/api/auth/[...nextauth]/route.ts` is correctly set up to:

- ✅ Export GET and POST handlers
- ✅ Use the handlers from `@/auth`

## Testing Steps

1. **Verify .env file exists** in the project root (same level as `package.json`)

2. **Check .env contents** match exactly:

   ```env
   GOOGLE_CLIENT_ID=1016836568594-n3b1ctn8930or0uvlrhqkeo5u3ih4jvt.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=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
   NEXTAUTH_SECRET=<your-secret>
   NEXTAUTH_URL=http://localhost:5000
   ```

3. **Verify Google Cloud Console** has the redirect URI:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID
   - Verify **Authorized redirect URIs** includes: `http://localhost:5000/api/auth/callback/google`

4. **Restart your development server**:

   ```bash
   npm run dev
   ```

5. **Test the flow**:
   - Go to `http://localhost:5000/login`
   - Click "Continue with Google"
   - Should redirect to Google sign-in
   - After authorization, should redirect back and log you in

## Common Issues

### Issue: "Redirect URI mismatch"

**Solution**: Make sure the redirect URI in Google Cloud Console is EXACTLY:

```
http://localhost:5000/api/auth/callback/google
```

- No trailing slash
- Must be `http://` (not `https://`) for localhost
- Must match exactly (case-sensitive)

### Issue: "Invalid client"

**Solution**:

- Verify the Client ID and Secret in `.env` match exactly (no extra spaces)
- Make sure you copied the full Client ID (including `.apps.googleusercontent.com`)
- Restart the server after updating `.env`

### Issue: Button not working

**Solution**:

- Check browser console for errors
- Verify environment variables are loaded (restart server)
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set to placeholder values

## Summary

✅ **Credentials Format**: Correct
✅ **Environment Variable Names**: Match (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
✅ **Code Configuration**: Correctly set up
✅ **Redirect URI**: Should be `http://localhost:5000/api/auth/callback/google`

**Everything matches!** Just make sure:

1. Your `.env` file has the exact values above
2. Google Cloud Console has the correct redirect URI
3. Server is restarted after updating `.env`

**Don't forget before pushing to Github**
npx prisma migrate deploy
