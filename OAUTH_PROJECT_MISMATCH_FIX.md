# 🚨 Google Sign-In "invalid_audience" Error Fix

## 🔍 Problem Identified

**Error**: `invalid_audience: The audience client and the client need to be in the same project.`

**Root Cause**: You have client IDs from **two different Google Cloud projects**:

- **iOS Project**: `853612097033` (Firebase project: `casero-app`)
- **Android Project**: `521869790852` (Firebase project: `loyaltycardapp-b6ddc`)
- **Web Client ID**: Currently using `521869790852` project

## ✅ Solution Required

All OAuth client IDs (web, iOS, Android) must be from the **same Google Cloud project**.

### 🎯 Recommended Fix: Use `casero-app` Project for Everything

1. **Keep iOS configuration** (already correct with `casero-app` project)
2. **Update Android configuration** to use `casero-app` project
3. **Update web client ID** to use `casero-app` project

## 📋 Step-by-Step Fix

### 1. Download New Android Configuration

1. **Go to**: https://console.firebase.google.com/
2. **Select**: `casero-app` project (NOT `loyaltycardapp-b6ddc`)
3. **Add Android app** (if not already added):
   - Package name: `com.thwar077.LoyaltyCardApp`
4. **Download** new `google-services.json`
5. **Replace** current file with new one

### 2. Get Web Client ID from `casero-app` Project

1. **Go to**: https://console.cloud.google.com/
2. **Select**: `casero-app` project
3. **APIs & Services** → **Credentials**
4. **Create/Find** Web Application OAuth 2.0 client ID
5. **Copy** the web client ID

### 3. Update SSO Service Configuration

Replace the web client ID in `src/services/ssoService.ts`:

**Current (WRONG)**:

```typescript
webClientId: "521869790852-72fbi96sk01f8lh0muldice9pqnu711n.apps.googleusercontent.com";
```

**Should be (from casero-app project)**:

```typescript
webClientId: "853612097033-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";
```

## 🎯 Current Status

- ✅ **URL scheme error**: FIXED (new build worked)
- ✅ **iOS client ID**: Correct (using `casero-app` project)
- ❌ **Web client ID**: Wrong project (`521869790852` instead of `853612097033`)
- ❌ **Android config**: Wrong project (`loyaltycardapp-b6ddc` instead of `casero-app`)

## ⚡ Quick Test Option

If you want to test quickly, you can temporarily use **iOS client ID as web client ID**:

```typescript
webClientId: "853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba.apps.googleusercontent.com";
```

**Note**: This might work for testing, but proper setup requires a dedicated web client ID.

---

**Next Steps**: Get all OAuth client IDs from the same `casero-app` Google Cloud project!
