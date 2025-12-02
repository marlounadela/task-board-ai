# Google OAuth Quick Start Checklist

## ✅ Quick Setup Steps

### 1. Google Cloud Console Setup (5 minutes)

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project or select existing one
- [ ] Navigate to **APIs & Services** → **OAuth consent screen**
- [ ] Complete the consent screen setup (External user type)
- [ ] Add scopes: `userinfo.email` and `userinfo.profile`
- [ ] Navigate to **APIs & Services** → **Credentials**
- [ ] Click **+ CREATE CREDENTIALS** → **OAuth client ID**
- [ ] Select **Web application**
- [ ] Add authorized redirect URI: `http://localhost:5000/api/auth/callback/google`
- [ ] Copy **Client ID** and **Client Secret**

### 2. Environment Variables (2 minutes)

Create/update `.env` file in project root:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:5000
```

**Generate NEXTAUTH_SECRET:**
- PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
- Bash: `openssl rand -base64 32`

### 3. Restart Server

```bash
# Stop your current server (Ctrl+C)
npm run dev
```

### 4. Test

- [ ] Go to `http://localhost:5000/login`
- [ ] Click **"Continue with Google"**
- [ ] Sign in with Google account
- [ ] Should redirect back and be logged in

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Verify URI in Google Console matches exactly: `http://localhost:5000/api/auth/callback/google` |
| Button not showing | Check `.env` file has correct values (not placeholders) and restart server |
| Access blocked | Add your email as test user in OAuth consent screen |
| User not created | Run `npx prisma migrate dev` to ensure database is set up |

## 📝 Important URLs

- **Development callback**: `http://localhost:5000/api/auth/callback/google`
- **Production callback**: `https://yourdomain.com/api/auth/callback/google`
- **Google Cloud Console**: https://console.cloud.google.com/

## 🔒 Security Notes

- Never commit `.env` file to git
- Use different credentials for dev/production
- Always use HTTPS in production

For detailed instructions, see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)



