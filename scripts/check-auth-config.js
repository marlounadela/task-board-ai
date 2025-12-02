#!/usr/bin/env node

/**
 * Diagnostic script to check NextAuth configuration
 * Run with: node scripts/check-auth-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking NextAuth Configuration...\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');

let envExists = fs.existsSync(envPath);
let envLocalExists = fs.existsSync(envLocalPath);

if (!envExists && !envLocalExists) {
  console.error('❌ No .env or .env.local file found!');
  console.log('\n📝 Create a .env file in the project root with:');
  console.log('   DATABASE_URL="file:./prisma/dev.db"');
  console.log('   NEXTAUTH_SECRET="your-secret-here"');
  console.log('   NEXTAUTH_URL="http://localhost:5000"');
  console.log('   GOOGLE_CLIENT_ID="your-client-id"');
  console.log('   GOOGLE_CLIENT_SECRET="your-client-secret"');
  process.exit(1);
}

// Read .env file (simple parsing, doesn't handle all edge cases)
const envFile = envExists ? fs.readFileSync(envPath, 'utf8') : fs.readFileSync(envLocalPath, 'utf8');
// Split by lines, but handle multi-line values (lines that don't have = and continue previous line)
const envLines = envFile.split('\n');
const envVars = {};

let currentKey = null;
let currentValue = '';

envLines.forEach((line, index) => {
  const trimmed = line.trim();
  
  // Skip empty lines and full-line comments
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }
  
  // Check if this line has a key=value pattern
  const match = trimmed.match(/^([^=#]+)=(.*)$/);
  
  if (match) {
    // Save previous key-value if exists
    if (currentKey) {
      envVars[currentKey] = currentValue.trim().replace(/^["']|["']$/g, '');
    }
    
    // Start new key-value pair
    currentKey = match[1].trim();
    currentValue = match[2] || '';
  } else if (currentKey) {
    // Continuation of previous value (multi-line)
    currentValue += ' ' + trimmed;
  }
});

// Don't forget the last key-value pair
if (currentKey) {
  envVars[currentKey] = currentValue.trim().replace(/^["']|["']$/g, '');
}

console.log('📋 Environment Variables Check:\n');

// Required variables
const required = {
  'DATABASE_URL': envVars.DATABASE_URL,
  'NEXTAUTH_SECRET': envVars.NEXTAUTH_SECRET || envVars.AUTH_SECRET,
  'NEXTAUTH_URL': envVars.NEXTAUTH_URL || envVars.AUTH_URL,
};

let hasErrors = false;

// Check required variables
Object.entries(required).forEach(([key, value]) => {
  if (!value) {
    console.error(`❌ ${key} is missing`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key} is set`);
  }
});

// Check Google OAuth (optional but needed for Google sign-in)
console.log('\n📋 Google OAuth Configuration:\n');

const googleClientId = envVars.GOOGLE_CLIENT_ID;
const googleClientSecret = envVars.GOOGLE_CLIENT_SECRET;

if (!googleClientId || googleClientId === 'your-google-client-id') {
  console.log('⚠️  GOOGLE_CLIENT_ID is not set or is a placeholder');
} else {
  console.log(`✅ GOOGLE_CLIENT_ID is set (${googleClientId.substring(0, 20)}...)`);
}

if (!googleClientSecret || googleClientSecret === 'your-google-client-secret') {
  console.log('⚠️  GOOGLE_CLIENT_SECRET is not set or is a placeholder');
} else {
  console.log(`✅ GOOGLE_CLIENT_SECRET is set`);
}

// Special check for NEXTAUTH_URL when Google OAuth is configured
if ((googleClientId && googleClientId !== 'your-google-client-id') && 
    (googleClientSecret && googleClientSecret !== 'your-google-client-secret')) {
  if (!envVars.NEXTAUTH_URL) {
    console.error('\n❌ CRITICAL: Google OAuth is configured but NEXTAUTH_URL is missing!');
    console.error('   This will cause OAuth sign-in to fail with a server configuration error.');
    console.error('   Please add to your .env file:');
    console.error('   NEXTAUTH_URL=http://localhost:5000');
    hasErrors = true;
  } else {
    console.log(`\n✅ NEXTAUTH_URL is set: ${envVars.NEXTAUTH_URL}`);
    
    // Check if it matches expected format
    if (!envVars.NEXTAUTH_URL.startsWith('http://') && !envVars.NEXTAUTH_URL.startsWith('https://')) {
      console.warn('⚠️  NEXTAUTH_URL should start with http:// or https://');
    }
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Configuration has errors. Please fix them before running the app.');
  process.exit(1);
} else {
  console.log('\n✅ Configuration looks good!');
  console.log('\n💡 If you still see errors:');
  console.log('   1. Restart your development server after changing .env');
  console.log('   2. Check server console logs for detailed error messages');
  console.log('   3. Verify Google Cloud Console redirect URI matches:');
  console.log(`      ${envVars.NEXTAUTH_URL || 'http://localhost:5000'}/api/auth/callback/google`);
}

