@echo off
echo === LoyaltyCardApp SSO Configuration Checker ===
echo.

echo 1. Checking app.json configuration...
if exist "app.json" (
    echo ✅ app.json exists
    
    findstr "googleServicesFile" app.json >nul
    if %errorlevel%==0 (
        echo ✅ Google Services file configuration found
    ) else (
        echo ❌ No Google Services file configuration
    )
    
    for /f "tokens=2 delims=:," %%a in ('findstr "bundleIdentifier" app.json') do (
        set BUNDLE_ID=%%a
        set BUNDLE_ID=!BUNDLE_ID:"=!
        set BUNDLE_ID=!BUNDLE_ID: =!
    )
    echo 📱 Bundle ID: %BUNDLE_ID%
    
    for /f "tokens=2 delims=:," %%a in ('findstr "package" app.json') do (
        set PACKAGE_NAME=%%a
        set PACKAGE_NAME=!PACKAGE_NAME:"=!
        set PACKAGE_NAME=!PACKAGE_NAME: =!
    )
    echo 🤖 Package Name: %PACKAGE_NAME%
) else (
    echo ❌ app.json not found
)

echo.
echo 2. Checking Google Services files...

if exist "GoogleService-Info.plist" (
    echo ✅ GoogleService-Info.plist exists
) else (
    echo ❌ GoogleService-Info.plist not found
)

if exist "google-services.json" (
    echo ✅ google-services.json exists
) else (
    echo ❌ google-services.json not found
)

echo.
echo 3. Checking installed packages...

findstr "@react-native-google-signin/google-signin" package.json >nul
if %errorlevel%==0 (
    echo ✅ Google Sign-In package installed
) else (
    echo ❌ Google Sign-In package not installed
)

findstr "expo-auth-session" package.json >nul
if %errorlevel%==0 (
    echo ✅ Expo Auth Session package installed
) else (
    echo ❌ Expo Auth Session package not installed
)

echo.
echo 4. Firebase project info needed:
echo 📝 To fix the Google Sign-In issue, you need to:
echo    1. Go to Firebase Console (https://console.firebase.google.com/)
echo    2. Select your project: loyaltycardapp-b6ddc
echo    3. Download the correct GoogleService-Info.plist for iOS
echo    4. Download the correct google-services.json for Android
echo    5. Replace the placeholder files in your project root
echo.
echo 5. Alternative quick fix:
echo    If you want to test without Google Sign-In:
echo    - Comment out the Google Sign-In plugin in app.json
echo    - Remove Google Sign-In buttons from your login screens
echo    - Use only email/password authentication for now

echo.
echo === End of Configuration Check ===
pause
