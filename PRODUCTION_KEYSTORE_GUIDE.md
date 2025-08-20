# Android Production Keystore Guide

## Overview

A production keystore is required to sign your Android app for release on Google Play Store. This document explains how to generate and configure a production keystore for CaseroApp.

## 🔑 What is a Keystore?

A keystore is a binary file that contains your private key(s) used to sign your Android app. Google Play Store uses this signature to verify that future updates come from the same developer.

**⚠️ CRITICAL:** Once you upload an app to Google Play Store, you MUST use the same keystore for all future updates. Losing your keystore means you cannot update your app!

## 📋 Prerequisites

- Java JDK installed (comes with Android Studio)
- Command line access (PowerShell/Command Prompt)

## 🚀 Method 1: Using the Provided Script (Recommended)

1. **Run the generation script:**

   ```powershell
   # From project root
   .\scripts\generate-keystore.bat
   ```

2. **Follow the prompts and enter:**
   - Keystore password (choose a strong password)
   - Key password (can be same as keystore password)
   - Your details:
     - First and last name: "Your Name"
     - Organizational unit: "Development" (or press Enter)
     - Organization: "Your Company Name"
     - City: "Your City"
     - State: "Your State"
     - Country code: "US" (or your country code)

## 🛠️ Method 2: Manual Generation

If you prefer to generate manually:

```powershell
# Navigate to your project root
cd c:\DEV\LoyaltyCardApp

# Create keystores directory
mkdir android\app\keystores

# Generate keystore
keytool -genkeypair -v -storetype PKCS12 -keystore android\app\keystores\caseroapp-release.keystore -alias caseroapp -keyalg RSA -keysize 2048 -validity 10000
```

## 📁 File Structure After Generation

```
android/
  app/
    keystores/
      caseroapp-release.keystore  ← Your production keystore
    debug.keystore               ← Development keystore (existing)
    build.gradle
```

## ⚙️ Configuration Steps

### 1. Update gradle.properties

Add these lines to `android/gradle.properties`:

```properties
# Production keystore configuration
CASEROAPP_UPLOAD_STORE_FILE=keystores/caseroapp-release.keystore
CASEROAPP_UPLOAD_KEY_ALIAS=caseroapp
CASEROAPP_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
CASEROAPP_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

### 2. Update app/build.gradle

Add the release signing config to `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('CASEROAPP_UPLOAD_STORE_FILE')) {
                storeFile file(CASEROAPP_UPLOAD_STORE_FILE)
                storePassword CASEROAPP_UPLOAD_STORE_PASSWORD
                keyAlias CASEROAPP_UPLOAD_KEY_ALIAS
                keyPassword CASEROAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            shrinkResources true
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

## 🔒 Security Best Practices

### 1. Backup Your Keystore

- Store the keystore file in multiple secure locations
- Use cloud storage with encryption (Google Drive, Dropbox, etc.)
- Keep offline backups on external drives

### 2. Password Management

- Use a password manager to store your keystore passwords
- Never commit passwords to version control
- Consider using environment variables for CI/CD

### 3. Environment Variables (Optional)

For enhanced security, use environment variables instead of gradle.properties:

```powershell
# Set environment variables (Windows)
$env:CASEROAPP_UPLOAD_STORE_PASSWORD="your_password"
$env:CASEROAPP_UPLOAD_KEY_PASSWORD="your_password"
```

## 🚀 Building with Production Keystore

### Local Build

```powershell
# Generate production APK
cd android
.\gradlew assembleRelease

# Generate production AAB (recommended for Play Store)
.\gradlew bundleRelease
```

### EAS Build

Your `eas.json` is already configured. Just run:

```powershell
# Production build with EAS
npx eas build --profile production --platform android
```

## 📱 Google Play Store Upload

1. **First Upload:** Use either APK or AAB (AAB recommended)
2. **App Signing:** Choose "Let Google manage my app signing key" for easier management
3. **Future Updates:** Always use the same keystore

## ❌ Common Issues

### "keytool not found"

- Install Java JDK: https://adoptium.net/
- Add Java to your PATH environment variable

### "Invalid keystore format"

- Use PKCS12 format (default in newer Java versions)
- Avoid special characters in passwords

### "Key was created with errors"

- Ensure all required fields are filled
- Use standard characters in organization details

## 🆘 Emergency Recovery

If you lose your keystore:

1. **Cannot update existing app** - you'll need to publish as a new app
2. **Contact Google Play Support** - they may help in rare cases
3. **App Bundle signing** - if you use Google Play App Signing, Google has a backup

## 📋 Checklist

- [ ] Keystore generated successfully
- [ ] Passwords saved in secure location
- [ ] Keystore backed up to multiple locations
- [ ] gradle.properties updated
- [ ] build.gradle updated
- [ ] Test build successful
- [ ] Ready for production release

---

**Remember:** Your keystore is the key to your app's identity. Treat it like a valuable asset and keep it secure!
