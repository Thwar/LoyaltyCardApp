# Push Notifications & Sound Effects Document#### SoundService (`src/services/soundService.ts`)

- Manages audio playback using Expo AV
- Loads and plays custom MP3 sound files from `assets/sounds/`
- Provides `success.mp3` sound for stamp additions
- Provides `complete.mp3` sound for reward redemptions only
- Handles audio initialization and cleanup

## Overview

This document describes the push notification and sound effect features added to the LoyaltyCardApp when stamps are added to customer cards.

## Features Added

### 🔔 Push Notifications

- **Local notifications** sent to customers when stamps are added
- **Completion notifications** when loyalty cards are completed
- **Reward redemption notifications** when rewards are claimed
- **Permission handling** for iOS and Android

### 🔊 Sound Effects

- **Success sound** played when a stamp is added or loyalty card is completed (using `success.mp3`)
- **Completion chime** played only when a reward is redeemed (using `complete.mp3`)
- **Custom MP3 audio files** from `assets/sounds/` directory
- **Cross-platform compatibility** (iOS, Android, Web)
- **Notification sounds** match in-app sound effects for consistent experience

## Technical Implementation

### Dependencies Added

```json
{
  "expo-notifications": "Latest",
  "expo-av": "Latest",
  "expo-device": "Latest",
  "expo-constants": "Latest"
}
```

### Services Created

#### NotificationService (`src/services/notificationService.ts`)

- Handles push notification registration
- Sends local notifications for stamp events
- Manages notification permissions
- Supports both stamp addition and reward redemption notifications

#### SoundService (`src/services/soundService.ts`)

- Manages audio playback
- Programmatically generates simple sound effects
- Provides success and completion sounds
- Handles audio initialization and cleanup

### Integration Points

#### App.tsx

- Initializes notification and sound services on app startup
- Registers for push notifications
- Preloads sound effects

#### CustomerCardService.addStamp()

- Automatically sends notifications when stamps are added
- Plays appropriate sound effects (success or completion)
- Includes business and customer information in notifications

#### AddStampScreen.tsx

- Updated user feedback messages to mention notifications
- Enhanced success/completion messages

## Notification Types

### Stamp Added

- **Title**: "✅ ¡Sello Agregado!"
- **Message**: "Sello agregado en [BusinessName]. Te faltan X sellos para tu recompensa."
- **Sound**: Success beep
- **Vibration**: 250ms pattern

### Card Completed

- **Title**: "🎉 ¡Tarjeta Completada!"
- **Message**: "¡Felicidades! Has completado tu tarjeta de [BusinessName]. ¡Puedes canjear tu recompensa!"
- **Sound**: Success sound (same as stamp added)
- **Vibration**: 250ms pattern

### Reward Redeemed

- **Title**: "🎁 ¡Recompensa Canjeada!"
- **Message**: "¡Has canjeado exitosamente tu recompensa en [BusinessName]! ¡Gracias por tu lealtad!"
- **Sound**: Completion chime
- **Vibration**: 250ms pattern

## Sound Effects

### Success Sound

- **Duration**: 300ms
- **Frequency**: 800Hz sine wave
- **Volume**: 30% of max
- **Format**: WAV (base64 encoded)

### Completion Chime

- **Duration**: 600ms
- **Frequencies**: C note (523.25Hz) → E note (659.25Hz)
- **Volume**: 40% of max
- **Format**: WAV (base64 encoded)

## Configuration

### app.json Updates

```json
{
  "plugins": [
    "expo-dev-client",
    "@react-native-google-signin/google-signin",
    [
      "expo-notifications",
      {
        "icon": "./assets/icon.png",
        "color": "#ffffff",
        "defaultChannel": "default"
      }
    ]
  ],
  "ios": {
    "infoPlist": {
      "NSUserNotificationsUsageDescription": "Esta aplicación necesita enviar notificaciones para informarte sobre sellos agregados a tus tarjetas de lealtad."
    }
  },
  "android": {
    "permissions": ["android.permission.VIBRATE", "android.permission.RECEIVE_BOOT_COMPLETED"]
  }
}
```

## Error Handling

- **Graceful fallbacks**: Notification/sound failures don't prevent stamp addition
- **Permission handling**: Proper handling of denied notification permissions
- **Cross-platform compatibility**: Works on iOS, Android, and Web (with limitations)
- **Logging**: Comprehensive error logging for debugging

## User Experience

### Business Owner Flow

1. Enters customer's card code
2. Confirms stamp addition
3. Sees success message mentioning notification sent to customer
4. Hears confirmation sound

### Customer Experience

1. Receives immediate local notification on their device
2. Notification shows progress toward reward
3. Device plays pleasant sound and vibrates
4. Can tap notification for more details (future enhancement)

## Future Enhancements

- **Remote push notifications** for real-time updates
- **Custom sound selection** per business
- **Rich notifications** with images and action buttons
- **Notification history** in app
- **Push notification analytics**
- **Scheduled reminder notifications**

## Testing

### Development Testing

```bash
# Start the development server
npx expo start

# Test on device (notifications require physical device)
npx expo run:ios
npx expo run:android
```

### Test Scenarios

1. **Add stamp to customer card** → Should show notification and play success sound
2. **Complete loyalty card** → Should show completion notification and play chime
3. **Redeem reward** → Should show redemption notification and play chime
4. **Denied permissions** → Should handle gracefully without breaking functionality
5. **Background app** → Notifications should still appear

## Troubleshooting

### Common Issues

#### No Notifications Appearing

- Check device notification permissions
- Ensure app is running on physical device (simulator limitations)
- Verify notification channel configuration

#### No Sound Playing

- Check device volume settings
- Verify audio permissions
- Check for Do Not Disturb mode

#### Permission Denied

- Guide user to app settings to manually enable notifications
- Provide fallback user experience without notifications

### Debug Logging

Enable console logging to see notification and sound service activity:

```javascript
// Check notification permissions
const status = await NotificationService.getPermissionStatus();
console.log("Notification permission status:", status);

// Test sound playback
await SoundService.playSuccessSound();
```

## Security Considerations

- **Local notifications only** (no external data transmission)
- **No sensitive data** in notification content
- **Permission-based** functionality
- **User control** over notification preferences

This implementation provides a delightful user experience while maintaining security and reliability across all platforms.
