@echo off
REM Generate Production Keystore for Android App
REM This script creates a production keystore for signing your Android APK/AAB

echo ========================================
echo    Production Keystore Generator
echo ========================================
echo.

REM Check if Java/keytool is available
where keytool >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: keytool not found in PATH
    echo Please install Java JDK or add it to your PATH
    echo Download from: https://adoptium.net/
    pause
    exit /b 1
)

echo Java keytool found!
echo.

REM Set keystore parameters
set KEYSTORE_NAME=caseroapp-release.keystore
set KEY_ALIAS=caseroapp
set VALIDITY_DAYS=10000

echo Creating production keystore...
echo Keystore name: %KEYSTORE_NAME%
echo Key alias: %KEY_ALIAS%
echo Validity: %VALIDITY_DAYS% days (~27 years)
echo.

REM Create the keystore directory if it doesn't exist
if not exist "android\app\keystores" mkdir "android\app\keystores"

echo IMPORTANT: You will be prompted for the following information:
echo 1. Keystore password (REMEMBER THIS!)
echo 2. Key password (can be same as keystore password)
echo 3. Your name or organization name
echo 4. Organizational unit (optional, can press Enter)
echo 5. Organization name (your company name)
echo 6. City or locality
echo 7. State or province
echo 8. Two-letter country code (e.g., US, MX, ES)
echo.
echo WARNING: SAVE ALL PASSWORDS SECURELY! You cannot recover them if lost.
echo.
pause

REM Generate the keystore
keytool -genkeypair -v -storetype PKCS12 -keystore "android\app\keystores\%KEYSTORE_NAME%" -alias %KEY_ALIAS% -keyalg RSA -keysize 2048 -validity %VALIDITY_DAYS%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    Keystore created successfully!
    echo ========================================
    echo.
    echo Location: android\app\keystores\%KEYSTORE_NAME%
    echo Alias: %KEY_ALIAS%
    echo.
    echo NEXT STEPS:
    echo 1. BACKUP this keystore file safely
    echo 2. SAVE your passwords in a secure location
    echo 3. Update your gradle.properties with keystore info
    echo 4. Update your app/build.gradle signing config
    echo.
    echo The keystore is now ready for production builds!
) else (
    echo.
    echo ERROR: Failed to create keystore
    echo Please check the error messages above
)

echo.
pause