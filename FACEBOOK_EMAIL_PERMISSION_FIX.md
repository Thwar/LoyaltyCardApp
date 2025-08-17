# Facebook SSO Email Permission Issue - Mobile Fix

## Issue Description

Facebook SSO on mobile was failing when Facebook didn't provide the user's email address, even when explicitly requested in the scopes. This is a common issue with Facebook's API due to various privacy and permission settings.

### Error Logs

```
LOG  Facebook sign-in completed: {"facebookEmail": undefined, "facebookName": "Thomas Rosales", "firebaseDisplayName": "Thomas Rosales", "firebaseEmail": null}
ERROR  Missing required user data: {"displayName": "Thomas Rosales", "email": ""}
ERROR  Facebook Sign-In failed in AuthContext: [Error: No se pudo obtener la información completa del perfil de Facebook. Por favor intenta de nuevo.]
```

## Root Cause Analysis

### Why Facebook Doesn't Always Provide Email

1. **User Privacy Settings**: User has restricted email sharing
2. **Unverified Email**: User's email is not verified on Facebook
3. **App Review Status**: Facebook app may need additional review for email permissions
4. **Regional Restrictions**: Some regions have stricter privacy controls
5. **Account Type**: Business accounts may have different permission models

### Previous Implementation Issues

1. **Strict Email Requirement**: Code required both email and displayName
2. **No Fallback Strategy**: Failed completely when email was missing
3. **Poor Error Handling**: Generic error messages didn't explain the issue
4. **Inconsistent Logging**: Insufficient debug information

## Solution Implemented

### 1. Enhanced Facebook Profile Fetching

**File**: `src/services/ssoService.ts`

#### Improvements Made:

- **Better Error Handling**: Profile fetching errors don't break authentication
- **Enhanced Logging**: More detailed logs about what data is available
- **Graceful Degradation**: Returns empty object if profile fetch fails
- **Email Absence Warning**: Logs when Facebook doesn't provide email

```typescript
// Facebook sometimes doesn't return email even when requested
if (!profile.email) {
  console.warn("Facebook did not provide email address - this is common due to privacy settings");
}
```

### 2. Mobile Authentication Enhancements

**File**: `src/services/ssoService.ts`

#### Key Changes:

- **Re-request Permissions**: Added `auth_type: "rerequest"` to force permission dialog
- **Enhanced Profile Collection**: Better fallback strategy between Facebook and Firebase data
- **Improved Logging**: Track data source (Facebook vs Firebase)

```typescript
extraParams: {
  display: "popup",
  auth_type: "rerequest", // Force re-request of permissions
}
```

### 3. Flexible User Creation Logic

**File**: `src/services/authService.ts`

#### Major Changes:

- **Email Optional**: Only require displayName, make email optional
- **Placeholder Email Generation**: Create valid email for users without one
- **Conditional Welcome Email**: Only send if real email is available
- **Better Error Messages**: More specific error descriptions

```typescript
// For Facebook users without email, we'll use a placeholder email or generate one
let finalEmail = email;
if (!finalEmail) {
  // Generate a placeholder email using the Firebase UID
  finalEmail = `facebook_${firebaseUser.uid}@placeholder.local`;
  console.log("Generated placeholder email for Facebook user without email:", finalEmail);
}
```

## Technical Implementation Details

### Placeholder Email Strategy

When Facebook doesn't provide an email:

1. Generate format: `facebook_{firebaseUID}@placeholder.local`
2. Unique per user (using Firebase UID)
3. Valid email format for database constraints
4. Easily identifiable as placeholder
5. Won't conflict with real email addresses

### Welcome Email Logic

```typescript
// Send welcome email only if we have a real email address
if (email && !email.includes("@placeholder.local")) {
  EmailService.sendWelcomeEmail({...});
} else {
  console.log("Skipping welcome email for Facebook user without email");
}
```

### Data Source Tracking

Enhanced logging to track where user data comes from:

```typescript
console.log("Creating new user with Facebook data:", {
  email,
  displayName,
  hasProfileImage: !!profileImage,
  emailSource: firebaseUser.email ? "firebase" : facebookProfile?.email ? "facebook" : "none",
});
```

## Facebook Permission Configuration

### Required App Configuration

1. **Facebook Developer Console**:

   - Basic Information: App ID, App Secret
   - Facebook Login: Valid OAuth Redirect URIs
   - App Review: Submit for `email` permission if needed

2. **Scopes Requested**:
   - `public_profile` (always granted)
   - `email` (may be denied by user or Facebook)

### App Review Considerations

- **Development Mode**: Email permission works for app developers and testers
- **Live Mode**: May require Facebook App Review for `email` permission
- **Business Apps**: Different review process and requirements
- **Personal Apps**: Usually don't need review for basic permissions

## User Experience Improvements

### Before Fix

1. User attempts Facebook login
2. Facebook doesn't provide email
3. App throws error and signs user out
4. User sees generic error message
5. Authentication fails completely

### After Fix

1. User attempts Facebook login
2. Facebook may or may not provide email
3. App continues with available data
4. Creates user account with displayName
5. Uses placeholder email if needed
6. User successfully authenticated

## Testing Strategy

### Test Cases to Verify

1. **Normal Case**: Facebook provides both name and email
2. **No Email Case**: Facebook provides name but no email
3. **Profile Fetch Failure**: Facebook API call fails
4. **Existing User**: User already exists in database
5. **Network Issues**: Poor connectivity during profile fetch

### Development Testing

```bash
# Test with different Facebook accounts:
# 1. Account with public email
# 2. Account with private email
# 3. Account with unverified email
# 4. Business account
```

### Logging to Monitor

```typescript
console.log("Facebook sign-in completed:", {
  firebaseEmail: firebaseUser.email,
  firebaseDisplayName: firebaseUser.displayName,
  facebookEmail: facebookProfile?.email,
  facebookName: facebookProfile?.name,
  emailSource: firebaseUser.email ? "firebase" : facebookProfile?.email ? "facebook" : "none",
});
```

## Production Considerations

### Database Design

- **Email Field**: Can contain placeholder emails
- **Email Validation**: Check for `@placeholder.local` to identify missing emails
- **User Notifications**: Use Firebase UID for push notifications instead of email
- **Account Updates**: Allow users to add real email later

### Privacy Compliance

- **Data Minimization**: Only request necessary permissions
- **User Consent**: Clear communication about data usage
- **Placeholder Emails**: Don't use for marketing or communication
- **Account Recovery**: Provide alternative recovery methods

### Monitoring and Analytics

```typescript
// Track authentication success rates
Analytics.track("facebook_auth_success", {
  hasEmail: !!finalEmail && !finalEmail.includes("@placeholder.local"),
  emailSource: emailSource,
  platform: Platform.OS,
});
```

## Future Enhancements

### Possible Improvements

1. **Email Collection Flow**: In-app flow to collect email from users who didn't provide it
2. **Alternative Contact Methods**: Phone number collection as backup
3. **Account Linking**: Allow users to link multiple social accounts
4. **Progressive Permissions**: Request additional permissions over time

### Facebook API Changes

- Monitor Facebook Developer changelog
- Test authentication flow with new API versions
- Update Graph API field requests as needed
- Handle deprecated permission scopes

## Troubleshooting Guide

### Common Issues and Solutions

#### "Missing required user data" Error

- **Cause**: Facebook didn't provide email
- **Solution**: Implemented in this fix - uses placeholder email
- **Prevention**: Set user expectations about optional email

#### Profile Fetch Timeout

- **Cause**: Slow network or Facebook API issues
- **Solution**: Enhanced error handling, continue without profile data
- **Prevention**: Implement retry logic with exponential backoff

#### Facebook App Review Rejection

- **Cause**: Insufficient justification for email permission
- **Solution**: Use public_profile only, implement email collection in-app
- **Prevention**: Clear privacy policy and data usage explanation

### Debug Commands

```typescript
// Check what scopes were actually granted
console.log("Facebook access token scopes:", accessToken);

// Verify Facebook API response
console.log("Raw Facebook API response:", profile);

// Check Firebase user data
console.log("Firebase user object:", firebaseUser);
```

## Backward Compatibility

### Migration Notes

- **Existing Users**: No impact on existing accounts
- **New Facebook Users**: Will use new placeholder email system
- **Email Updates**: Users can update email in profile settings
- **Database Queries**: Filter out placeholder emails when needed

### API Compatibility

- **External APIs**: Check for placeholder emails before sending
- **Email Services**: Skip placeholder emails in bulk operations
- **User Exports**: Mark placeholder emails clearly

## Security Considerations

### Placeholder Email Security

- **Format**: `facebook_{uid}@placeholder.local`
- **Uniqueness**: Guaranteed by Firebase UID
- **Domain**: `.local` is safe and won't route externally
- **Identification**: Easy to identify and filter

### Data Protection

- **No Personal Data**: Placeholder emails contain no personal information
- **Reversible**: Can be updated to real email later
- **Compliant**: Meets data minimization requirements
- **Secure**: No security implications for authentication flow
