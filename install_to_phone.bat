@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================================
echo        Osama Studio - Build and Install to Phone
echo ========================================================
echo.

set ROOT_DIR=%~dp0
set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

if not exist %ADB% (
    where adb >nul 2>&1
    if !errorlevel! EQU 0 (
        set ADB=adb
    ) else (
        echo [ERROR] ADB not found in Android SDK or PATH!
        echo Please ensure Android Studio SDK platform-tools are installed.
        echo.
        pause
        exit /b 1
    )
)

echo [1/4] Building Next.js Web Application...
cd /d "%ROOT_DIR%frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Web build failed. Please check the logs above.
    pause
    exit /b 1
)

echo.
echo [2/4] Syncing web assets with Capacitor Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b 1
)

echo.
echo [3/4] Building Android APK with Gradle...
cd /d "%ROOT_DIR%frontend\android"
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Gradle APK build failed.
    pause
    exit /b 1
)

echo.
echo [4/4] Copying APK to main folder...
copy /y "%ROOT_DIR%frontend\android\app\build\outputs\apk\debug\app-debug.apk" "%ROOT_DIR%Osama_Studio.apk" >nul

echo.
echo ========================================================
echo             Installing APK to Connected Phone
echo ========================================================
echo.
echo Checking connected devices:
%ADB% devices
echo.

echo Installing Osama_Studio.apk to your device...
%ADB% install -r "%ROOT_DIR%Osama_Studio.apk"
set RES=%ERRORLEVEL%

if %RES% EQU 0 (
    echo.
    echo ========================================================
    echo  [SUCCESS] Osama Studio installed successfully!
    echo ========================================================
    echo Launching application on your phone...
    %ADB% shell monkey -p com.osamastudio.app -c android.intent.category.LAUNCHER 1 >nul 2>&1
) else (
    echo.
    echo ========================================================
    echo  [FAILED] Installation did not succeed.
    echo ========================================================
    echo Please verify:
    echo 1. Phone is connected via USB cable.
    echo 2. "USB Debugging" is enabled in Developer Options.
    echo 3. Look at your phone screen and tap "Allow USB debugging".
)

echo.
pause
