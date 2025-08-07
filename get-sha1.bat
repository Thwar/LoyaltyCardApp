@echo off
echo ====================================
echo   Getting SHA-1 Certificate Fingerprint
echo ====================================
echo.

echo Looking for keytool...

REM Try common Java locations
if exist "C:\Program Files\Java\jdk*\bin\keytool.exe" (
    echo Found Java JDK, getting SHA-1...
    for /d %%i in ("C:\Program Files\Java\jdk*") do (
        echo Using: %%i\bin\keytool.exe
        "%%i\bin\keytool.exe" -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr "SHA1"
        goto :found
    )
)

if exist "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" (
    echo Found Android Studio JDK, getting SHA-1...
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr "SHA1"
    goto :found
)

REM Try in PATH
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr "SHA1" 2>nul
if %errorlevel% equ 0 goto :found

echo.
echo ❌ keytool not found in common locations.
echo.
echo Try these alternatives:
echo 1. Install Java JDK
echo 2. Install Android Studio
echo 3. Use: npx expo credentials:manager
echo 4. Use the development SHA-1 from the guide for testing
echo.
pause
exit

:found
echo.
echo ✅ Found SHA-1 above! 
echo Copy the SHA-1 value (without "SHA1:") to your Google Cloud Console
echo.
pause
