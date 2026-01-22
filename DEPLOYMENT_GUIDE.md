# Casero Deployment Guide

\n+## Landing + Web Portal on Vercel
This repo is configured so `/` serves a static landing page and `/web` serves the Expo Web portal. Ensure Production Environment Variables are set in Vercel (see `.env.example`), otherwise the portal will crash at runtime (e.g., missing `FIREBASE_API_KEY`). Build command is `node scripts/build-web.cjs`, output dir is `dist`.
\n+Routes:

- `/` → `dist/landing/index.html`
- `/web`, `/web/*` → `dist/web/index.html`
- `/_expo/*`, `/favicon.ico` → `dist/web`

# Environment Variables and Deployment Guide

This guide explains how to deploy your LoyaltyCardApp with the environment variables already configured in EAS.

## 🚀 Deploying to Vercel (Web)

Your project is fully configured for Vercel deployment. It serves a static landing page at `/` and the Expo Web App at `/web`.

### Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) installed (`npm i -g vercel`)
- A Vercel account

### Deployment Steps

1. **Login to Vercel**

   ```bash
   npx vercel login
   ```

2. **Deploy**
   Run the following command in the project root:

   ```bash
   npx vercel
   ```

   - Follow the prompts (Select scope, Link to existing project: No (first time), Project Name: `caseroapp`).
   - For "In which directory is your code located?", keep default `./`.
   - It should auto-detect the build settings from `vercel.json` (Output: `dist`).

3. **Configure Environment Variables (CRITICAL)**
   The build _will fail_ or the app _will crash_ if you don't set your environment variables in Vercel.
   - Go to your Vercel Project Dashboard > Settings > Environment Variables.
   - Add all variables from your `.env` or `config/env.ts` (Production values).
   - **Required:**
     - `APP_ENV=production`
     - `FIREBASE_API_KEY`
     - `FIREBASE_AUTH_DOMAIN`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_STORAGE_BUCKET`
     - `FIREBASE_MESSAGING_SENDER_ID`
     - `FIREBASE_APP_ID`
   - `API_BASE_URL` (e.g. `https://www.soycasero.com/api`)

4. **Production Deployment**
   Once verified, deploy to production:
   ```bash
   npx vercel --prod
   ```

## 📋 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Files](#environment-files)
3. [EAS Build Configuration](#eas-build-configuration)
4. [Deployment Process](#deployment-process)
5. [Environment Variable Management](#environment-variable-management)
6. [Security Best Practices](#security-best-practices)

## 🛠️ Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run start:clear
```

Your `.env.local` file is already configured with your Firebase settings for local development.

## 📁 Environment Files

### `.env.local` (Local Development)

- Contains all your development environment variables
- **NEVER commit this file to version control**
- Used for local development only
- ✅ Already configured with your Firebase settings

### `.env.template`

- Template file showing required environment variables
- Safe to commit to version control
- Used as reference for team members

### `config/env.ts`

- Centralized environment configuration
- Handles environment variable loading and validation
- Provides type safety and fallbacks
- ✅ Already integrated with your Firebase service

## 🏗️ EAS Build Configuration

### Build Profiles in `eas.json`

```json
{
  "build": {
    "development": {
      "env": { "APP_ENV": "development" }
    },
    "staging": {
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "env": { "APP_ENV": "production" }
    }
  }
}
```

### Set Environment Variables for EAS

#### Method 1: EAS CLI (Recommended)

Set environment variables for each build profile:

```bash
# Set variables for production
eas secret:create --scope project --name FIREBASE_API_KEY --value "your_production_api_key"
eas secret:create --scope project --name FIREBASE_PROJECT_ID --value "your_production_project_id"
eas secret:create --scope project --name FIREBASE_STORAGE_BUCKET --value "your_production_storage_bucket"

# Set variables for staging (if different)
eas secret:create --scope project --name STAGING_FIREBASE_API_KEY --value "your_staging_api_key"
```

#### Method 2: Environment-Specific Files

Create environment-specific files for EAS builds:

```bash
# Create .env.production for production builds
echo "FIREBASE_API_KEY=your_production_key" > .env.production
echo "FIREBASE_PROJECT_ID=your_production_project" >> .env.production

# Create .env.staging for staging builds
echo "FIREBASE_API_KEY=your_staging_key" > .env.staging
echo "FIREBASE_PROJECT_ID=your_staging_project" >> .env.staging
```

**⚠️ Important:** Add these files to `.gitignore` if they contain sensitive data.

## 🚀 Deployment Process

✅ **Your environment variables are already configured in EAS!**

### 1. Development Build

```bash
npm run build:dev
# OR: eas build --profile development --platform android
```

### 2. Staging Build

```bash
npm run build:staging
# OR: eas build --profile staging --platform all
```

### 3. Production Build

```bash
npm run build:prod
# OR: eas build --profile production --platform all
```

### 4. Submit to App Stores

```bash
npm run submit:all
# OR individual platforms:
npm run submit:ios
npm run submit:android
```

## 🔧 Environment Variable Management

### Required Variables

#### Firebase Configuration

- `FIREBASE_API_KEY` - Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `FIREBASE_APP_ID` - Firebase app ID
- `FIREBASE_MEASUREMENT_ID` - Firebase analytics measurement ID

#### App Configuration

- `APP_ENV` - Environment (development/staging/production)
- `APP_NAME` - Application name
- `APP_VERSION` - Application version
- `EXPO_PROJECT_ID` - Expo project ID

#### API Configuration

- `API_BASE_URL` - Base URL for API calls
- `API_TIMEOUT` - API request timeout

#### Feature Flags

- `ENABLE_DEBUG_LOGS` - Enable debug logging
- `ENABLE_ANALYTICS` - Enable analytics
- `ENABLE_CRASH_REPORTING` - Enable crash reporting

### Using Environment Variables in Code

```typescript
import { env, debugLog, isProduction } from "../config/env";

// Use environment variables
const apiUrl = env.API_BASE_URL;
const enableAnalytics = env.ENABLE_ANALYTICS;

// Use helper functions
debugLog("This only logs in development:", someData);

if (isProduction()) {
  // Production-only code
}
```

## 🔒 Security Best Practices

### 1. Never Commit Sensitive Data

- Add `.env*.local` to `.gitignore`
- Never hardcode API keys or secrets
- Use EAS secrets for production builds

### 2. Environment Separation

- Use different Firebase projects for development/staging/production
- Separate API endpoints for each environment
- Different database instances for each environment

### 3. Access Control

- Limit who can access production environment variables
- Use EAS organization features for team management
- Regularly rotate API keys and secrets

### 4. Validation

- Always validate environment variables exist
- Provide meaningful error messages for missing variables
- Use TypeScript for type safety

## 📝 Commands Reference

### Local Development

```bash
# Start development server
npm run start:clear

# Install dependencies
npm install
```

### EAS Commands

```bash
# Login to EAS (if needed)
eas login

# Build commands (using npm scripts)
npm run build:dev      # Development build
npm run build:staging  # Staging build
npm run build:prod     # Production build
npm run build:all      # Production build for all platforms

# Submit commands
npm run submit:ios     # Submit to App Store
npm run submit:android # Submit to Play Store
npm run submit:all     # Submit to both stores

# Environment variable management
npm run env:list       # List current EAS secrets

# Or use EAS commands directly:
eas build --profile development
eas build --profile production
eas submit --platform ios

# List environment variables
eas secret:list

# Delete environment variable
eas secret:delete --name VAR_NAME
```

## 🚨 Troubleshooting

### Common Issues

1. **"Environment variable X is not defined"**
   - Check if the variable is set in your `.env.local` file
   - Verify the variable name matches exactly
   - For EAS builds, ensure the secret is set with `eas secret:create`

2. **"Firebase configuration error"**
   - Verify all Firebase environment variables are set
   - Check that the Firebase project ID matches your actual project
   - Ensure Firebase services are enabled in your project

3. **"Build fails with environment variable errors"**
   - Check that all required secrets are set for the build profile
   - Verify the `.env` file exists for the environment
   - Check the `app.config.js` configuration

### Getting Help

If you encounter issues:

1. Check the Expo documentation
2. Verify your EAS configuration
3. Test locally first before building
4. Check the build logs for specific error messages

## 📚 Additional Resources

- [Expo Environment Variables Guide](https://docs.expo.dev/guides/environment-variables/)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Firebase Configuration](https://firebase.google.com/docs/web/setup)
- [React Native Environment Variables](https://docs.expo.dev/guides/environment-variables/)
