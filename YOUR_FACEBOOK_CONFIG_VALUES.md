# Your Facebook App Configuration Values

## Facebook App Details
- **App ID**: `1119577610065940`
- **Client Token**: `1c3d3fd5ca4c067a37377d3de3fb583f`
- **URL Scheme**: `fb1119577610065940`

## Android Configuration
- **Package Name**: `com.thwar077.LoyaltyCardApp`
- **SHA1 Fingerprint**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **Facebook Key Hash**: `Xo8WBi6jzSxKDVR4drqm84yr9iU=`

## iOS Configuration
- **Bundle ID**: `com.thwar077.LoyaltyCardApp`
- **URL Scheme**: `fb1119577610065940`

## Next Steps for Facebook Developer Console

### 1. Configure Android Platform:
1. Go to Facebook Developer Console > Your App (1119577610065940) > Settings > Basic
2. Click "Add Platform" > "Android"
3. Enter Package Name: `com.thwar077.LoyaltyCardApp`
4. Enter Class Name: `MainActivity`
5. Enter Key Hash: `Xo8WBi6jzSxKDVR4drqm84yr9iU=`
6. Save changes

### 2. Configure iOS Platform:
1. Click "Add Platform" > "iOS"
2. Enter Bundle ID: `com.thwar077.LoyaltyCardApp`
3. Save changes

### 3. Configure OAuth Redirect:
1. Go to Use cases > Authentication and account creation > Customize
2. Add the OAuth redirect URI from Firebase (get this after setting up Firebase)
3. Save changes

## Firebase Configuration Required
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Facebook authentication
3. Enter App ID: `1119577610065940`
4. Enter App Secret: (get this from Facebook Developer Console > Settings > Basic)
5. Copy the OAuth redirect URI
6. Add this URI to Facebook Developer Console (step 3 above)

Your app is fully configured and ready for Facebook Login once you complete these final setup steps! 🚀
