@echo off
REM Verify Keystore Configuration
REM This script checks if your production keystore is properly configured

echo ========================================
echo    Keystore Configuration Checker
echo ========================================
echo.

REM Check if keystore file exists
set KEYSTORE_PATH=android\app\keystores\caseroapp-release.keystore
if exist "%KEYSTORE_PATH%" (
    echo ✓ Production keystore found: %KEYSTORE_PATH%
) else (
    echo ✗ Production keystore NOT found: %KEYSTORE_PATH%
    echo   Run generate-keystore.bat first
    goto :end
)

REM Check gradle.properties
set GRADLE_PROPS=android\gradle.properties
if exist "%GRADLE_PROPS%" (
    echo ✓ gradle.properties found
    
    REM Check for keystore configuration
    findstr /C:"CASEROAPP_UPLOAD_STORE_FILE" "%GRADLE_PROPS%" >nul
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Keystore configuration found in gradle.properties
    ) else (
        echo ⚠ Keystore configuration NOT found in gradle.properties
        echo   Add the keystore configuration from keystore-config-template.txt
    )
) else (
    echo ✗ gradle.properties not found
)

REM Check if keytool is available
where keytool >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Java keytool is available
    
    REM Show keystore info
    echo.
    echo Keystore information:
    keytool -list -v -keystore "%KEYSTORE_PATH%" -alias caseroapp
) else (
    echo ✗ Java keytool not found in PATH
)

:end
echo.
echo Configuration check complete!
pause