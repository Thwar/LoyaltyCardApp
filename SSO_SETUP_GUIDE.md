# SSO Integration Setup Guide

This guide explains how to complete the setup of Google and Facebook SSO for your CaseroApp.

## 🔧 What's Been Implemented

✅ **Core SSO Integration**

- Google Sign-In using `@react-native-google-signin/google-signin`
- Facebook Sign-In using Expo AuthSession
- Firebase Authentication integration
- SSO buttons in Login and Register screens
- Automatic user account creation for new SSO users
- User type defaults to "customer" for SSO signups

✅ **Technical Components**

- `SSOService` class for handling SSO authentication
- `SSOButton` component for consistent UI
- Updated `AuthContext` with SSO methods
- Updated `AuthService` with SSO user handling
- Cross-platform support (iOS, Android, Web)

## 🔑 Required Configuration

### 1. Google OAuth Setup

#### Step 1: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Enable the **Google+ API** and **Google Identity API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**

#### Step 2: Create OAuth Client IDs

Create **THREE** separate client IDs:

**Web Application Client ID:**

```
Name: CaseroApp Web
Application type: Web application
Authorized redirect URIs:
- http://localhost:19006 (for Expo development)
- https://auth.expo.io/@thwar077/CaseroApp (for production)
```

**Android Client ID:**

```
Name: CaseroApp Android
Application type: Android
Package name: com.thwar077.CaseroApp
SHA-1 certificate fingerprint: [See SHA-1 section below]
```

**iOS Client ID:**

```
Name: CaseroApp iOS
Application type: iOS
Bundle ID: com.thwar077.CaseroApp
```

#### Step 3: Update Configuration Files

## 📱 Getting SHA-1 Certificate Fingerprints

The SHA-1 fingerprint is required for Google Sign-In on Android. You need different fingerprints for debug and release builds.

### For Expo Managed Workflow (Your Current Setup)

#### Method 1: Expo Development Build (Debug)

```bash
# Get debug fingerprint for development
npx expo run:android --variant debug
```

After building, check the logs for the SHA-1 fingerprint, or use:

```bash
# If you have Android SDK installed
"%ANDROID_HOME%\platform-tools\adb.exe" logcat | findstr "SHA1"
```

#### Method 2: Using keytool (if Java is installed)

```bash
# For Windows (PowerShell/CMD)
# First, find your Java installation
where java

# Then use keytool (replace JAVA_HOME with your actual Java path)
"C:\Program Files\Java\jdk-XX.X.X\bin\keytool.exe" -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# Alternative path (if using Android Studio's JDK)
"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

#### Method 3: Expo Credentials Manager

```bash
npx expo credentials:manager
# Select Android → Keystore → View details
```

#### Method 4: EAS Build (Production)

```bash
# For production builds with EAS
npx eas credentials
# Select Android → Production keystore → View SHA-1
```

### For Expo Development Client / Bare Workflow

#### Using Gradle (if android folder exists)

```bash
cd android
./gradlew signingReport
```

Look for output like:

```
Variant: debug
Store: ~/.android/debug.keystore
Alias: AndroidDebugKey
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

### Quick Setup for Development

For **immediate development testing**, you can use this temporary debug SHA-1:

```
SHA1: 58:E1:C5:0D:7A:89:6E:EE:4F:2D:73:04:8B:6B:26:4A:4F:5D:FA:53
```

**Steps to get started right now:**

1. Use the SHA-1 above when creating your Android OAuth client ID in Google Cloud Console
2. Once you have the client IDs, update `src/services/ssoService.ts`
3. Test Google Sign-In immediately
4. Later, when you build for production, update with your actual production SHA-1

**⚠️ Important:** This is a common debug key. For production, you **must** generate your own keystore and use its SHA-1.

### Getting Your Specific SHA-1

1. **Try Method 2 above** (find Java/keytool path and run the command)
2. **Or create a simple batch file** to find and run keytool:

Create a file called `get-sha1.bat`:

```batch
@echo off
echo Looking for keytool...

REM Try common Java locations
if exist "C:\Program Files\Java\jdk*\bin\keytool.exe" (
    for /d %%i in ("C:\Program Files\Java\jdk*") do (
        "%%i\bin\keytool.exe" -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
        goto :found
    )
)

if exist "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" (
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
    goto :found
)

echo keytool not found. Please install Java or Android Studio.
echo You can also use: npx expo credentials:manager
pause
exit

:found
echo.
echo Look for "SHA1:" in the output above
pause
```

Run this batch file and look for the SHA1 line in the output.

**Update `src/services/ssoService.ts`:**

```typescript
const GOOGLE_CONFIG = {
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
};
```

**Update `app.json`:**

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleSignIn": {
          "reservedClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com"
        }
      }
    },
    "android": {
      "config": {
        "googleServices": {
          "apiKey": "YOUR_FIREBASE_API_KEY_FOR_ANDROID"
        }
      }
    }
  }
}
```

**⚠️ Important Note about Android API Key:**
The `YOUR_FIREBASE_API_KEY_FOR_ANDROID` is **NOT** the Google OAuth client ID. This is your Firebase API key for Android, which you can find in:

1. Firebase Console → Project Settings → General tab
2. Under "Your apps" section, find your Android app
3. Copy the "API Key" value
4. **OR** use the same API key that's already in your Firebase config: `AIzaSyDFlVbiMMKSOOZHOgFCflsxMOdv-3xvORk`

### 2. Facebook OAuth Setup

#### Step 1: Facebook Developers

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add **Facebook Login** product
4. Configure OAuth Redirect URIs

#### Step 2: Configure OAuth Redirect URIs

Add these redirect URIs in Facebook Login settings:

- `https://auth.expo.io/@thwar077/CaseroApp`
- `caseroapp://` (custom scheme)

#### Step 3: Update Configuration

**Update `src/services/ssoService.ts`:**

```typescript
const FACEBOOK_CONFIG = {
  appId: "YOUR_FACEBOOK_APP_ID",
  appName: "CaseroApp",
};
```

### 3. Firebase Console Configuration

#### Enable Authentication Providers

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Enable **Google** and **Facebook** providers
5. Add your OAuth client IDs and secrets

**Google Provider:**

- Web SDK configuration: Use your Web Client ID
- Web client ID: `YOUR_WEB_CLIENT_ID.apps.googleusercontent.com`
- Web client secret: (from Google Cloud Console)

**Facebook Provider:**

- App ID: `YOUR_FACEBOOK_APP_ID`
- App secret: (from Facebook Developers)

## 📱 Platform-Specific Setup

### iOS

1. **Download GoogleService-Info.plist** from Firebase Console
2. **Place in iOS folder** (create if needed): `ios/CaseroApp/GoogleService-Info.plist`
3. **Update Info.plist** with URL schemes:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.thwar077.CaseroApp</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>caseroapp</string>
      <string>YOUR_IOS_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

### Android

1. **Download google-services.json** from Firebase Console
2. **Place in Android folder**: `android/app/google-services.json`
3. **Update AndroidManifest.xml** with intent filters:

```xml
<activity
  android:name=".MainActivity"
  android:exported="true"
  android:launchMode="singleTask">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="caseroapp" />
  </intent-filter>
</activity>
```

## 🧪 Testing

### Development Testing

```bash
# Start Expo development server
npx expo start

# Test on device/simulator
npx expo run:ios
npx expo run:android
```

### Test Scenarios

1. **New User Registration via Google**

   - Should create Firebase user
   - Should create Firestore user document
   - Should default to "customer" user type
   - Should send welcome email

2. **New User Registration via Facebook**

   - Should create Firebase user
   - Should create Firestore user document
   - Should default to "customer" user type

3. **Existing User Login**
   - Should authenticate with existing account
   - Should not create duplicate user documents

## 🔧 Troubleshooting

### Common Issues

**Google Sign-In "DEVELOPER_ERROR":**

- Check SHA-1 fingerprint matches Android client ID
- Verify bundle ID matches iOS client ID
- Ensure web client ID is correct in config

**Facebook Login Fails:**

- Verify Facebook App ID is correct
- Check redirect URIs are properly configured
- Ensure app is not in development mode for production

**Firebase Authentication Errors:**

- Verify providers are enabled in Firebase Console
- Check OAuth client IDs and secrets are correct
- Ensure Firebase project matches your app

### Debug Commands

```bash
# Check Google Play Services
adb shell pm list packages | grep google

# View Android logs
npx react-native log-android

# View iOS logs
npx react-native log-ios
```

## 🚀 Production Deployment

### Before Going Live

1. **Update OAuth redirect URIs** with production URLs
2. **Switch Facebook app to Live mode**
3. **Update Expo app.json** with production scheme
4. **Test on physical devices**
5. **Verify Firebase quota limits**

### Security Considerations

- Never commit client secrets to repository
- Use environment variables for sensitive config
- Implement proper error handling
- Monitor authentication logs
- Set up Firebase security rules

## 📚 Additional Resources

- [Google Sign-In Documentation](https://developers.google.com/identity)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Expo AuthSession Guide](https://docs.expo.dev/guides/authentication/)
