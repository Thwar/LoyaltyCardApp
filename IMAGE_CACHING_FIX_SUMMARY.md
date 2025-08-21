# Image Caching Issue Fix Summary

## Problem

Customers were not seeing updated loyalty card background images after business updates, and "Failed to preload image" warnings were appearing in customer dashboard.

## Root Causes Identified

1. **Local File URI Storage**: The upload condition was checking `startsWith("data:")` which didn't catch mobile file URIs like `file://` or `content://`, causing local paths to be stored in database instead of Firebase Storage URLs.
2. **Cache Stale Data**: React Native's built-in image cache and our custom cache were not being invalidated when loyalty card images were updated.
3. **Same URL Issue**: Firebase Storage was using the same filename for updated images, so even new uploads resulted in the same URL, preventing cache invalidation.
4. **Stale Database Data**: Customer apps were getting stale loyalty card data even after business updates.

## Solutions Implemented

### 1. Fixed Upload Condition

**File**: `src/screens/business/EditLoyaltyCardScreen.tsx`, `src/screens/business/CreateLoyaltyCardScreen.tsx`

- Changed from `startsWith("data:")` to `!startsWith("http")`
- This catches all local file URIs including `file://`, `content://`, `data:`, etc.

### 2. Added Safety Checks

**File**: `src/screens/business/EditLoyaltyCardScreen.tsx`

- Added validation to prevent local file URIs from being stored in database
- Shows error to user if upload fails and local URI would be stored

### 3. Implemented Unique Filenames with Timestamps

**File**: `src/services/imageUpload.ts`

- Changed from `${loyaltyCardId}_background.jpg` to `${loyaltyCardId}_background_${timestamp}.jpg`
- Each upload now generates a unique URL, forcing both React Native cache and our custom cache to reload

### 4. Enhanced Cache Invalidation

**File**: `src/utils/imageCache.ts`, integrated in EditLoyaltyCardScreen.tsx

- Clear old background image from cache when uploading new one
- Clear entire loyalty card images from cache after update
- Added specific methods for loyalty card image clearing

### 5. Improved Storage Cleanup

**File**: `src/screens/business/EditLoyaltyCardScreen.tsx`

- Now deletes old background images from Firebase Storage after successful upload
- Prevents storage bloat from accumulating old image files

### 6. Refresh Flags Integration

**File**: `src/utils/refreshFlags.ts`, integrated across screens

- Trigger `setRefreshForAllScreens()` after loyalty card updates
- Customer screens check and clear refresh flags on focus
- Forces fresh data fetch when loyalty cards are updated

### 7. Enhanced Logging

- Added comprehensive logging throughout upload pipeline
- Track image URLs, upload success, database updates
- Easier debugging for future issues

## Files Modified

1. `src/services/imageUpload.ts` - Unique filename generation
2. `src/screens/business/EditLoyaltyCardScreen.tsx` - Upload logic, safety checks, cache clearing
3. `src/screens/business/CreateLoyaltyCardScreen.tsx` - Upload condition fix
4. `src/utils/imageCache.ts` - Enhanced cache invalidation methods
5. `src/screens/customer/CustomerHomeScreen.tsx` - Refresh flag handling (already existed)
6. `src/components/AnimatedLoyaltyCard.tsx` - Error handling for image loading (already existed)

## Expected Behavior After Fix

1. ✅ Business uploads new loyalty card background image
2. ✅ Image gets unique filename with timestamp
3. ✅ Old image gets deleted from Firebase Storage
4. ✅ New image URL gets stored in database
5. ✅ Old image URLs get cleared from cache
6. ✅ Refresh flags trigger customer data refresh
7. ✅ Customer apps fetch fresh loyalty card data with new image URL
8. ✅ React Native Image component loads new image due to unique URL
9. ✅ No more "Failed to preload image" errors
10. ✅ Customers see updated background images immediately

## Testing Checklist

- [ ] Business can upload new loyalty card background images
- [ ] Firebase Storage URLs are properly generated and stored
- [ ] Local file URIs are never stored in database
- [ ] Old background images are deleted from storage
- [ ] Customer apps refresh and show new background images
- [ ] No "Failed to preload image" errors in customer dashboard
- [ ] Cache invalidation works across app restarts
- [ ] Multiple image updates work correctly
