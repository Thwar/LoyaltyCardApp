@echo off
REM AsyncStorage Fix Script for Expo Development Builds (Windows)
REM Run this script to fix AsyncStorage issues

echo 🔧 Fixing AsyncStorage for Expo Development Builds...

REM Step 1: Clean install dependencies
echo 📦 Cleaning and reinstalling dependencies...
if exist node_modules rmdir /s /q node_modules
npm install

REM Step 2: Install AsyncStorage with Expo
echo 📱 Installing AsyncStorage with Expo compatibility...
npx expo install @react-native-async-storage/async-storage

REM Step 3: Clean prebuild
echo 🧹 Cleaning native projects...
npx expo prebuild --clean

REM Step 4: Build development client with EAS
echo ☁️ Building development client with EAS...
echo Run this command manually for iOS: eas build --platform ios --profile development
echo Run this command manually for Android: eas build --platform android --profile development

echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo 1. For iOS: Run 'eas build --platform ios --profile development'
echo 2. For Android: Run 'eas build --platform android --profile development' 
echo 3. Install the built development client on your device
echo 4. Test Firebase Auth persistence

pause
