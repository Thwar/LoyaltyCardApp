# Facebook SSO Web Fix

## Issue Description

The Facebook SSO on web was experiencing issues where:

1. The popup window would not close automatically after successful authentication
2. The access token would remain in the popup window instead of being passed to the parent window
3. Users had to manually close the popup window

## Root Cause

The issue was caused by using Expo's `AuthSession` for web Facebook authentication instead of Firebase's built-in `signInWithPopup` method. `AuthSession` is designed for mobile apps and doesn't handle web popup management properly.

## Solution Implemented

### 1. Updated Facebook Web Authentication Method

**File**: `src/services/ssoService.ts`

**Before**: Used `AuthSession` with custom OAuth flow

```typescript
// Old implementation used AuthSession.AuthRequest and custom redirect handling
const request = new AuthSession.AuthRequest({...});
const result = await request.promptAsync(discovery);
```

**After**: Used Firebase's `signInWithPopup` method

```typescript
// New implementation uses Firebase's built-in popup management
const result = await signInWithPopup(auth, facebookProvider);
```

### 2. Enhanced Error Handling

Added specific error handling for common popup-related issues:

- `auth/popup-closed-by-user`: When user closes popup manually
- `auth/popup-blocked`: When browser blocks the popup
- `auth/cancelled-popup-request`: When authentication is cancelled
- `auth/account-exists-with-different-credential`: When email exists with different provider

### 3. Improved Facebook Provider Configuration

**File**: `src/services/firebase.ts`

Added proper Facebook provider configuration:

```typescript
// Configure Facebook provider
facebookProvider.addScope("email");
facebookProvider.addScope("public_profile");
facebookProvider.setCustomParameters({
  display: "popup",
});
```

## Technical Details

### How Firebase `signInWithPopup` Works

1. Opens a popup window to Facebook's OAuth endpoint
2. Handles the OAuth flow automatically
3. Closes the popup window once authentication is complete
4. Returns the result to the parent window
5. Automatically manages token exchange and credential creation

### Benefits of the New Implementation

1. **Automatic Popup Management**: Firebase handles opening and closing the popup
2. **Proper Token Handling**: Access tokens are properly extracted and used
3. **Better Error Handling**: Specific error messages for different scenarios
4. **Consistent Behavior**: Same behavior across different browsers
5. **Reduced Code Complexity**: Less custom OAuth handling code

## Configuration Requirements

### Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Authentication → Sign-in method
3. Enable Facebook provider
4. Configure with your Facebook App ID and App Secret

### Facebook Developer Console Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. In your app settings, go to Facebook Login → Settings
3. Add your domain to "Valid OAuth Redirect URIs":
   - `https://your-domain.com` (production)
   - `http://localhost:8082` (development)
   - Any other domains where your app will be hosted

### Web Domain Configuration

Make sure your web domain is properly configured in both:

1. Firebase Console → Authentication → Settings → Authorized domains
2. Facebook Developer Console → App Settings → Basic → App Domains

## Testing the Fix

### Development Testing

1. Start the web development server: `npm run web`
2. Navigate to the login page
3. Click "Continuar con Facebook"
4. Verify that:
   - A popup window opens to Facebook
   - After authentication, the popup closes automatically
   - The user is logged in to the main application
   - No manual popup closure is required

### Production Testing

1. Deploy to your production environment
2. Test the same flow as development
3. Verify on different browsers (Chrome, Firefox, Safari, Edge)
4. Test with popup blockers enabled/disabled

## Troubleshooting

### Popup Blocked Error

If you get `auth/popup-blocked` error:

1. Check browser popup settings
2. Add your domain to popup exceptions
3. Inform users to allow popups for your site

### Invalid Domain Error

If Facebook authentication fails with domain errors:

1. Verify domain is added to Facebook App settings
2. Check Firebase authorized domains
3. Ensure URLs match exactly (http vs https, www vs non-www)

### Network Errors

For network-related authentication failures:

1. Check Firebase project configuration
2. Verify Facebook App ID is correct
3. Ensure internet connectivity

## Migration Notes

### Changes Made

1. **No Breaking Changes**: The external API remains the same
2. **Platform Detection**: Web now uses `signInWithPopup`, mobile still uses `AuthSession`
3. **Error Messages**: Improved Spanish error messages for better UX

### Backward Compatibility

- The change only affects web platform
- Mobile platforms (iOS/Android) continue to use the existing `AuthSession` implementation
- All existing authentication flows remain functional

## Security Considerations

### HTTPS Requirements

- Facebook OAuth requires HTTPS in production
- Ensure your production domain uses SSL/TLS

### Domain Validation

- Only add trusted domains to Facebook and Firebase settings
- Use specific domains instead of wildcards when possible

### Token Handling

- Firebase automatically handles token security
- No need to manually store or manage Facebook access tokens
- Tokens are automatically refreshed by Firebase

## Performance Impact

### Improved Performance

1. **Faster Authentication**: Direct Firebase integration reduces latency
2. **Better Caching**: Firebase handles token caching automatically
3. **Reduced Bundle Size**: Less custom OAuth code

### Browser Compatibility

- Works with all modern browsers that support Firebase
- Graceful error handling for unsupported browsers
- No additional polyfills required

## Future Maintenance

### Regular Tasks

1. Monitor Firebase authentication logs
2. Check Facebook App settings for any changes
3. Update error messages if needed
4. Test authentication flow after major browser updates

### When to Update

- If Facebook changes their OAuth endpoints
- If Firebase updates their authentication SDK
- If new browser security features affect popup behavior

## Additional Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth/web/facebook-login)
- [Facebook Login for the Web](https://developers.facebook.com/docs/facebook-login/web)
- [MDN Popup API](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)
